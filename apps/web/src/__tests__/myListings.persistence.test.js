/* eslint-disable */
/**
 * Persistence + account-isolation test for "My Listings".
 *
 * Run from the repo root:  node apps/web/src/__tests__/myListings.persistence.test.js
 *
 * What this verifies (no phone, no real Firebase needed):
 *  - firebaseNative.createItem POSTs the correct snake_case fields + seller_id.
 *  - getActiveItems / getMyItems build the correct Firestore structured queries
 *    and parse the responses back into JS objects.
 *  - A created item is returned by getMyItems (same seller).
 *  - The My-Listings hydration/merge logic (extracted from App.js) makes a
 *    seller's listing reappear after a simulated force-quit relaunch, and a
 *    DIFFERENT account sees NONE of it (account isolation).
 *
 * The real firebaseNative.js source is loaded and transpiled in-process, with
 * ONLY its `./nativeHttp` dependency replaced by an in-memory fake Firestore/
 * Storage REST layer. localStorage is faked too. So the actual production data
 * layer code runs under test.
 */

const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');
const Module = require('module');
const assert = require('assert');

const SERVICES_DIR = path.resolve(__dirname, '../services');

// ---------------------------------------------------------------------------
// In-memory fake of nativeHttp backed by a fake Firestore + Storage.
// ---------------------------------------------------------------------------
function makeFakeBackend() {
  // Firestore documents keyed by collection path.
  const collections = { items: {}, users: {}, interests: {}, chats: {} };
  let autoId = 0;

  // Minimal Firestore value -> JS parser (mirrors what the SDK sends back).
  const parseFields = (fields) => {
    const out = {};
    for (const k of Object.keys(fields || {})) {
      const f = fields[k];
      if (f.stringValue !== undefined) out[k] = f.stringValue;
      else if (f.integerValue !== undefined) out[k] = parseInt(f.integerValue);
      else if (f.doubleValue !== undefined) out[k] = f.doubleValue;
      else if (f.booleanValue !== undefined) out[k] = f.booleanValue;
      else if (f.nullValue !== undefined) out[k] = null;
      else if (f.arrayValue) out[k] = (f.arrayValue.values || []).map(v => v.stringValue);
      else if (f.mapValue) out[k] = parseFields(f.mapValue.fields);
    }
    return out;
  };

  const PROJECT = 'swipecity-marketplace';
  const FS_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;
  const STORAGE_BASE = `https://firebasestorage.googleapis.com/v0/b`;

  function ok(data) { return { ok: true, status: 200, data }; }

  const handler = {
    async request(config) {
      const { url, method = 'GET', data } = config;
      const m = method.toUpperCase();

      // ---- Storage upload (POST .../o/<path>) ----
      if (url.startsWith(STORAGE_BASE)) {
        return ok({ downloadTokens: 'faketoken123' });
      }

      // ---- Firestore runQuery ----
      if (url.includes(':runQuery')) {
        const sq = data.structuredQuery;
        const coll = sq.from[0].collectionId;
        const docs = Object.values(collections[coll] || {});
        let filtered = docs;
        if (sq.where && sq.where.fieldFilter) {
          const { field, value } = sq.where.fieldFilter;
          const wantKey = field.fieldPath;
          const wantVal = value.stringValue;
          filtered = docs.filter(d => parseFields(d.fields)[wantKey] === wantVal);
        }
        return ok(filtered.map(d => ({ document: d })));
      }

      // ---- Firestore create (POST .../items) ----
      if (m === 'POST' && url.includes(`${FS_BASE}/items`)) {
        const id = `auto_${++autoId}`;
        const name = `projects/${PROJECT}/databases/(default)/documents/items/${id}`;
        const doc = { name, fields: data.fields };
        collections.items[id] = doc;
        return ok({ name, fields: data.fields });
      }

      // ---- Firestore delete item (DELETE .../items/<id>) ----
      if (m === 'DELETE' && url.includes(`${FS_BASE}/items/`)) {
        const id = url.split('/items/')[1].split('?')[0];
        delete collections.items[id];
        return ok({});
      }

      // ---- Firestore get user / generic GET ----
      if (m === 'GET' && url.includes(`${FS_BASE}/users/`)) {
        const uid = url.split('/users/')[1].split('?')[0];
        const doc = collections.users[uid];
        if (doc) return ok({ name: doc.name, fields: doc.fields });
        return { ok: false, status: 404, data: {} };
      }

      // ---- Firestore PATCH user ----
      if (m === 'PATCH' && url.includes(`${FS_BASE}/users/`)) {
        const uid = url.split('/users/')[1].split('?')[0];
        const name = `projects/${PROJECT}/databases/(default)/documents/users/${uid}`;
        collections.users[uid] = { name, fields: data.fields };
        return ok({ name, fields: data.fields });
      }

      // Default: succeed quietly.
      return ok({});
    },
    get(url, config = {}) { return this.request({ ...config, url, method: 'GET' }); },
    post(url, d, config = {}) { return this.request({ ...config, url, method: 'POST', data: d }); },
    put(url, d, config = {}) { return this.request({ ...config, url, method: 'PUT', data: d }); },
    delete(url, config = {}) { return this.request({ ...config, url, method: 'DELETE' }); },
    patch(url, d, config = {}) { return this.request({ ...config, url, method: 'PATCH', data: d }); },
    // expose raw store for assertions
    _collections: collections,
    _parseFields: parseFields,
  };
  return handler;
}

// ---------------------------------------------------------------------------
// Load the REAL firebaseNative.js with ./nativeHttp swapped for the fake.
// ---------------------------------------------------------------------------
function loadFirebaseNative(fakeHttp) {
  const src = fs.readFileSync(path.join(SERVICES_DIR, 'firebaseNative.js'), 'utf8');
  const { code } = babel.transformSync(src, {
    filename: 'firebaseNative.js',
    plugins: [require.resolve('@babel/plugin-transform-modules-commonjs')],
    babelrc: false,
    configFile: false,
  });

  // Custom require so `./nativeHttp` resolves to our fake.
  const moduleObj = { exports: {} };
  const fakeRequire = (id) => {
    if (id === './nativeHttp') return { __esModule: true, default: fakeHttp, nativeHttp: fakeHttp };
    return require(id);
  };
  const fn = new Function('module', 'exports', 'require', code);
  fn(moduleObj, moduleObj.exports, fakeRequire);
  return moduleObj.exports.default || moduleObj.exports.firebaseNative;
}

// ---------------------------------------------------------------------------
// Fake localStorage (per-"device").
// ---------------------------------------------------------------------------
function makeLocalStorage() {
  const store = {};
  return {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    _dump: () => ({ ...store }),
  };
}

// ---------------------------------------------------------------------------
// EXTRACTED My-Listings hydration/merge logic — mirrors App.js exactly.
// This is the function the hydration effect runs on relaunch.
// ---------------------------------------------------------------------------
async function hydrateMyListings({ uid, localStorage, seededItems, firebaseNative, currentUserListings = [] }) {
  const byId = new Map();
  const add = (arr) => (arr || []).forEach(i => { if (i && i.id) byId.set(i.id, i); });

  add(currentUserListings);
  try {
    const raw = localStorage.getItem('swipecity_my_listings_' + uid);
    add(raw ? JSON.parse(raw) : []);
  } catch (e) {}
  add((seededItems || []).filter(i => i.seller_id === uid));
  try { add(await firebaseNative.getMyItems(uid)); } catch (e) {}

  const merged = [...byId.values()].sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
  if (merged.length === 0) return { merged: [], latched: false };
  localStorage.setItem('swipecity_my_listings_' + uid, JSON.stringify(merged));
  return { merged, latched: true };
}

// ---------------------------------------------------------------------------
// EXTRACTED account-isolation reset condition — mirrors the prevUidRef effect
// in App.js. Returns true when the previous account's in-memory state must be
// CLEARED and the hydration latches re-armed. The rule: clear whenever the
// previous uid was a REAL account and it differs from the current uid. This
// fires on the sign-out leg (seller1 -> null) AND on a direct switch
// (seller1 -> buyer1), but NOT on a cold launch (undefined/null -> uid).
// ---------------------------------------------------------------------------
function shouldResetOnUidChange(prevUid, nextUid) {
  return !!(prevUid && prevUid !== nextUid);
}

// In-memory model of the App's per-account React state + hydration latches,
// driven through uid transitions exactly like App.js does, so a test can assert
// what "My Listings" (userListings) holds after sign-out -> sign-in.
function makeAppStateMachine() {
  return {
    prevUid: undefined,
    userListings: [], savedItems: [], chats: [], buyerInterests: [],
    savedItemsHydrated: false,
    myListingsHydratedUid: null,
    // Apply a uid transition (sign-in/out/switch), running the reset effect.
    setUid(nextUid) {
      const uid = nextUid || null;
      if (shouldResetOnUidChange(this.prevUid, uid)) {
        this.userListings = []; this.savedItems = []; this.chats = []; this.buyerInterests = [];
        this.savedItemsHydrated = false;
        this.myListingsHydratedUid = null;
      }
      this.prevUid = uid;
    },
    // Run the My-Listings hydration for the current account (uid-guarded).
    async hydrate({ uid, localStorage, seededItems, firebaseNative }) {
      if (!uid) return;
      if (this.myListingsHydratedUid === uid) return;
      const r = await hydrateMyListings({
        uid, localStorage, seededItems, firebaseNative,
        currentUserListings: this.userListings,
      });
      if (r.latched) {
        this.myListingsHydratedUid = uid;
        this.userListings = r.merged;
      }
    },
  };
}

// ---------------------------------------------------------------------------
// EXTRACTED delete-listing logic — mirrors App.js handleDeleteListing.
// Deletes from Firestore, removes from in-memory listings, and updates the
// persisted per-user localStorage copy.
// ---------------------------------------------------------------------------
async function deleteListing({ uid, deletedId, localStorage, firebaseNative, currentUserListings = [] }) {
  let backendOk = false;
  try {
    const res = await firebaseNative.deleteItem(deletedId);
    backendOk = !!(res && res.success);
  } catch (e) { backendOk = false; }

  const updatedListings = (currentUserListings || []).filter(l => l.id !== deletedId);
  localStorage.setItem('swipecity_my_listings_' + uid, JSON.stringify(updatedListings));
  return { updatedListings, backendOk };
}

// ---------------------------------------------------------------------------
// Test runner.
// ---------------------------------------------------------------------------
let passed = 0, failed = 0;
async function test(name, fn) {
  try { await fn(); console.log('  PASS  ' + name); passed++; }
  catch (e) { console.log('  FAIL  ' + name + '\n        ' + (e && e.message)); failed++; }
}

(async () => {
  console.log('My Listings persistence + isolation tests\n');

  // ===== A) firebaseNative data-layer unit tests =====
  await test('createItem POSTs snake_case fields with seller_id', async () => {
    const http = makeFakeBackend();
    const svc = loadFirebaseNative(http);
    svc.currentUser = { uid: 'sellerA' };
    svc.idToken = 'tok';
    svc.refreshToken = 'rtok';
    svc.tokenTimestamp = Date.now();

    const res = await svc.createItem({
      id: 'listing_1', title: 'Bike', price: '50', status: 'active', created_at: 111,
    });
    assert(res.success, 'createItem should succeed');
    assert(res.item.id, 'created item has an id');

    // Inspect what was stored in fake Firestore.
    const stored = Object.values(http._collections.items)[0];
    const parsed = http._parseFields(stored.fields);
    assert.strictEqual(parsed.seller_id, 'sellerA', 'seller_id must equal auth uid');
    assert.strictEqual(parsed.status, 'active', 'status stored');
    assert.strictEqual(parsed.title, 'Bike', 'title stored');
    assert.strictEqual(parsed.created_at, 111, 'created_at stored as integer');
  });

  await test('getActiveItems builds status==active query and parses results', async () => {
    const http = makeFakeBackend();
    const svc = loadFirebaseNative(http);
    svc.currentUser = { uid: 'sellerA' }; svc.idToken = 'tok'; svc.refreshToken = 'r'; svc.tokenTimestamp = Date.now();
    await svc.createItem({ id: 'l1', title: 'Active', status: 'active', created_at: 1 });
    await svc.createItem({ id: 'l2', title: 'Sold', status: 'sold', created_at: 2 });

    const active = await svc.getActiveItems();
    assert.strictEqual(active.length, 1, 'only the active item is returned');
    assert.strictEqual(active[0].title, 'Active');
    assert(active[0].id, 'parsed doc has id');
  });

  await test('getMyItems returns the seller’s created item (same seller)', async () => {
    const http = makeFakeBackend();
    const svc = loadFirebaseNative(http);
    svc.currentUser = { uid: 'sellerA' }; svc.idToken = 'tok'; svc.refreshToken = 'r'; svc.tokenTimestamp = Date.now();
    await svc.createItem({ id: 'l1', title: 'Mine', status: 'active', created_at: 1 });

    const mine = await svc.getMyItems('sellerA');
    assert.strictEqual(mine.length, 1, 'getMyItems returns the created listing');
    assert.strictEqual(mine[0].seller_id, 'sellerA');

    const none = await svc.getMyItems('sellerB');
    assert.strictEqual(none.length, 0, 'a different seller gets none');
  });

  // ===== B) End-to-end persistence across a simulated force-quit relaunch =====
  await test('seller listing reappears in My Listings after force-quit relaunch', async () => {
    const http = makeFakeBackend(); // shared backend = Firestore survives relaunch
    const ls = makeLocalStorage();   // shared localStorage = same device

    // ----- SESSION 1: signed in, create a listing -----
    const svc1 = loadFirebaseNative(http);
    svc1.currentUser = { uid: 'sellerA' }; svc1.idToken = 'tok'; svc1.refreshToken = 'r'; svc1.tokenTimestamp = Date.now();

    const listing = { id: 'listing_999', title: 'Couch', price: '200', seller_id: 'sellerA', status: 'active', created_at: 5000, image_url: 'https://x/y.jpg' };
    const createRes = await svc1.createItem(listing);
    assert(createRes.success, 'listing created in Firestore');
    // App.js does: savedListing = { ...newListing, ...res.item } — the id becomes
    // the Firestore-assigned doc id (so it matches what getMyItems returns later).
    const savedListing = { ...listing, ...createRes.item };
    const storedId = savedListing.id;

    // App.js create handler persists to localStorage (snake_case key by uid).
    const session1UserListings = [savedListing];
    ls.setItem('swipecity_my_listings_sellerA', JSON.stringify(session1UserListings));

    // ----- FORCE QUIT: all React state gone. localStorage + Firestore persist. -----

    // ----- SESSION 2: fresh launch, same account. -----
    // Simulate the WORST case: the cross-device feed load returned EMPTY this
    // launch (stale-token race), so seededItems has no remote items. Hydration
    // must STILL recover the listing from localStorage and/or getMyItems.
    const svc2 = loadFirebaseNative(http);
    svc2.currentUser = { uid: 'sellerA' }; svc2.idToken = 'tok'; svc2.refreshToken = 'r'; svc2.tokenTimestamp = Date.now();

    const seededItemsEmptyFeed = []; // worst case
    const r = await hydrateMyListings({
      uid: 'sellerA', localStorage: ls, seededItems: seededItemsEmptyFeed,
      firebaseNative: svc2, currentUserListings: [],
    });

    assert(r.latched, 'hydration latched on a real result');
    assert.strictEqual(r.merged.length, 1, 'My Listings has exactly the listing');
    assert.strictEqual(r.merged[0].id, storedId, 'it is the right listing (matches Firestore doc id)');
    assert.strictEqual(r.merged[0].title, 'Couch');
  });

  await test('hydration recovers from feed even if localStorage was lost', async () => {
    const http = makeFakeBackend();
    const ls = makeLocalStorage(); // empty (simulate localStorage wiped/quota)

    const svc1 = loadFirebaseNative(http);
    svc1.currentUser = { uid: 'sellerA' }; svc1.idToken = 'tok'; svc1.refreshToken = 'r'; svc1.tokenTimestamp = Date.now();
    await svc1.createItem({ id: 'listing_777', title: 'Lamp', seller_id: 'sellerA', status: 'active', created_at: 10 });

    // Relaunch: localStorage empty, but the feed (getActiveItems) loaded the item.
    const svc2 = loadFirebaseNative(http);
    svc2.currentUser = { uid: 'sellerA' }; svc2.idToken = 'tok'; svc2.refreshToken = 'r'; svc2.tokenTimestamp = Date.now();
    const feed = await svc2.getActiveItems();

    const r = await hydrateMyListings({ uid: 'sellerA', localStorage: ls, seededItems: feed, firebaseNative: svc2, currentUserListings: [] });
    assert.strictEqual(r.merged.length, 1, 'recovered from feed');
    assert.strictEqual(r.merged[0].title, 'Lamp');
    // And it re-persisted to localStorage for next time.
    assert(ls.getItem('swipecity_my_listings_sellerA'), 're-persisted to localStorage');
  });

  await test('empty result does NOT latch (so it retries next time)', async () => {
    const http = makeFakeBackend();
    const ls = makeLocalStorage();
    const svc = loadFirebaseNative(http);
    svc.currentUser = { uid: 'sellerNew' }; svc.idToken = 'tok'; svc.refreshToken = 'r'; svc.tokenTimestamp = Date.now();

    const r = await hydrateMyListings({ uid: 'sellerNew', localStorage: ls, seededItems: [], firebaseNative: svc, currentUserListings: [] });
    assert.strictEqual(r.merged.length, 0, 'no listings yet');
    assert.strictEqual(r.latched, false, 'must NOT latch on empty so a later pass retries');
  });

  // ===== B2) Delete persists across a force-quit relaunch =====
  await test('deleting a listing removes it from Firestore (deleteItem)', async () => {
    const http = makeFakeBackend();
    const svc = loadFirebaseNative(http);
    svc.currentUser = { uid: 'sellerA' }; svc.idToken = 'tok'; svc.refreshToken = 'r'; svc.tokenTimestamp = Date.now();

    const made = await svc.createItem({ id: 'del_1', title: 'Trash', status: 'active', created_at: 1 });
    assert.strictEqual(Object.keys(http._collections.items).length, 1, 'one item before delete');

    const res = await svc.deleteItem(made.item.id);
    assert(res.success, 'deleteItem returns success');
    assert.strictEqual(Object.keys(http._collections.items).length, 0, 'item gone from Firestore');
  });

  await test('a deleted listing does NOT reappear after force-quit relaunch', async () => {
    const http = makeFakeBackend(); // shared backend survives relaunch
    const ls = makeLocalStorage();   // shared device

    // SESSION 1: create + persist a listing, then delete it.
    const svc1 = loadFirebaseNative(http);
    svc1.currentUser = { uid: 'sellerA' }; svc1.idToken = 'tok'; svc1.refreshToken = 'r'; svc1.tokenTimestamp = Date.now();

    const listing = { id: 'will_delete', title: 'Old Chair', seller_id: 'sellerA', status: 'active', created_at: 7000 };
    const made = await svc1.createItem(listing);
    const saved = { ...listing, ...made.item };
    ls.setItem('swipecity_my_listings_sellerA', JSON.stringify([saved]));

    // Delete it (Firestore + state + localStorage), as the App.js handler does.
    const del = await deleteListing({
      uid: 'sellerA', deletedId: saved.id, localStorage: ls, firebaseNative: svc1,
      currentUserListings: [saved],
    });
    assert(del.backendOk, 'backend delete succeeded');
    assert.strictEqual(del.updatedListings.length, 0, 'removed from in-memory listings');

    // FORCE QUIT — React state gone; localStorage + Firestore persist.

    // SESSION 2: relaunch, same account, feed reloads from Firestore.
    const svc2 = loadFirebaseNative(http);
    svc2.currentUser = { uid: 'sellerA' }; svc2.idToken = 'tok'; svc2.refreshToken = 'r'; svc2.tokenTimestamp = Date.now();
    const feed = await svc2.getActiveItems(); // should NOT contain the deleted item

    assert(!feed.some(i => i.id === saved.id), 'deleted item not in the buy feed after relaunch');

    const r = await hydrateMyListings({
      uid: 'sellerA', localStorage: ls, seededItems: feed, firebaseNative: svc2, currentUserListings: [],
    });
    assert(!r.merged.some(i => i.id === saved.id), 'deleted listing does NOT reappear in My Listings');
    assert.strictEqual(r.merged.length, 0, 'no listings remain after delete + relaunch');
  });

  // ===== C) Account isolation =====
  await test('a brand-new account sees NONE of another account’s listings', async () => {
    const http = makeFakeBackend();
    const ls = makeLocalStorage(); // same device, two accounts

    // Account A creates + persists a listing.
    const svcA = loadFirebaseNative(http);
    svcA.currentUser = { uid: 'sellerA' }; svcA.idToken = 'tok'; svcA.refreshToken = 'r'; svcA.tokenTimestamp = Date.now();
    const made = await svcA.createItem({ id: 'listing_A', title: 'A item', seller_id: 'sellerA', status: 'active', created_at: 1 });
    const aItemId = made.item.id; // Firestore-assigned id
    ls.setItem('swipecity_my_listings_sellerA', JSON.stringify([made.item]));

    // Account B signs in on the same device. Hydration is keyed by uid, and the
    // account-switch reset clears in-memory state. B's My Listings query is by
    // seller_id == B, and B's localStorage key is different.
    const svcB = loadFirebaseNative(http);
    svcB.currentUser = { uid: 'sellerB' }; svcB.idToken = 'tok'; svcB.refreshToken = 'r'; svcB.tokenTimestamp = Date.now();

    // B's feed shows A's item (active, cross-device) — but it must be FILTERED by
    // seller_id during My-Listings hydration.
    const feed = await svcB.getActiveItems(); // contains A's active item
    assert(feed.some(i => i.id === aItemId), 'B can SEE A item in the buy feed (expected)');

    const r = await hydrateMyListings({
      uid: 'sellerB', localStorage: ls, seededItems: feed, firebaseNative: svcB,
      currentUserListings: [], // account-switch reset cleared A's in-memory listings
    });
    assert.strictEqual(r.merged.length, 0, 'B has ZERO listings in My Listings');
    assert.strictEqual(r.latched, false, 'B did not latch (nothing of B exists)');

    // And B's getMyItems returns nothing of A's.
    const bItems = await svcB.getMyItems('sellerB');
    assert.strictEqual(bItems.length, 0, 'getMyItems(B) is empty');
  });

  // The exact bug repro: sign OUT of account A, sign IN as account B (with no
  // listings). B's My Listings must be EMPTY and contain NONE of A's items.
  // Then sign back into A and confirm A's listing still shows (no over-clear).
  await test('sign-out(A)->sign-in(B): B sees none of A; signing back into A still shows A', async () => {
    const http = makeFakeBackend();
    const ls = makeLocalStorage(); // one device, two accounts

    // ----- SESSION as account A: create + persist a listing, hydrate -----
    const svcA = loadFirebaseNative(http);
    svcA.currentUser = { uid: 'sellerA' }; svcA.idToken = 'tok'; svcA.refreshToken = 'r'; svcA.tokenTimestamp = Date.now();
    const made = await svcA.createItem({ id: 'A_only', title: 'A Sofa', seller_id: 'sellerA', status: 'active', created_at: 100 });
    const aItemId = made.item.id;
    ls.setItem('swipecity_my_listings_sellerA', JSON.stringify([made.item]));

    const app = makeAppStateMachine();
    app.setUid('sellerA');                       // initial sign-in (cold) -> no reset
    await app.hydrate({ uid: 'sellerA', localStorage: ls, seededItems: await svcA.getActiveItems(), firebaseNative: svcA });
    assert.strictEqual(app.userListings.length, 1, 'A has its listing in My Listings');
    assert.strictEqual(app.userListings[0].id, aItemId);

    // ----- SIGN OUT (sellerA -> null): this MUST clear A's in-memory state -----
    app.setUid(null);
    assert.strictEqual(app.userListings.length, 0, 'sign-out clears in-memory My Listings');
    assert.strictEqual(app.myListingsHydratedUid, null, 'hydration latch re-armed on sign-out');

    // ----- SIGN IN as account B (null -> sellerB), B has listed nothing -----
    const svcB = loadFirebaseNative(http);
    svcB.currentUser = { uid: 'sellerB' }; svcB.idToken = 'tok'; svcB.refreshToken = 'r'; svcB.tokenTimestamp = Date.now();
    app.setUid('sellerB');                        // null -> B: no clear needed, already empty
    const bFeed = await svcB.getActiveItems();    // B's feed CAN see A's active item
    assert(bFeed.some(i => i.id === aItemId), 'B can see A item in the buy feed (expected)');
    await app.hydrate({ uid: 'sellerB', localStorage: ls, seededItems: bFeed, firebaseNative: svcB });

    assert.strictEqual(app.userListings.length, 0, "B's My Listings is EMPTY");
    assert(!app.userListings.some(i => i.id === aItemId), "B's My Listings contains NONE of A's items");
    // And B did not inherit A's localStorage copy under B's key.
    assert(!ls.getItem('swipecity_my_listings_sellerB'), 'no B-keyed listings were written');

    // ----- SIGN BACK INTO A (sellerB -> sellerA): A's listing must reappear -----
    app.setUid('sellerA');                        // B -> A: clears (B had nothing), re-arms latch
    const svcA2 = loadFirebaseNative(http);
    svcA2.currentUser = { uid: 'sellerA' }; svcA2.idToken = 'tok'; svcA2.refreshToken = 'r'; svcA2.tokenTimestamp = Date.now();
    await app.hydrate({ uid: 'sellerA', localStorage: ls, seededItems: await svcA2.getActiveItems(), firebaseNative: svcA2 });
    assert.strictEqual(app.userListings.length, 1, 'A still has its listing (fix did not over-clear)');
    assert.strictEqual(app.userListings[0].id, aItemId, 'it is A’s original listing');
  });

  await test('shouldResetOnUidChange: clears on real-account leave, not on cold launch', () => {
    // Cold launch legs: no clear.
    assert.strictEqual(shouldResetOnUidChange(undefined, 'u1'), false, 'undefined -> uid (cold) does not clear');
    assert.strictEqual(shouldResetOnUidChange(null, 'u1'), false, 'null -> uid (restore) does not clear');
    // Real account leaving: clear.
    assert.strictEqual(shouldResetOnUidChange('u1', null), true, 'sign-out (uid -> null) clears');
    assert.strictEqual(shouldResetOnUidChange('u1', 'u2'), true, 'direct switch (uid -> uid) clears');
    // No-op same uid.
    assert.strictEqual(shouldResetOnUidChange('u1', 'u1'), false, 'same uid does not clear');
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})();
