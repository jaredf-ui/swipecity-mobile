/* eslint-disable */
/**
 * Cross-device interest inbox + shared chat test (Steps 5 & 6).
 *
 * Run from the repo root:  node apps/web/src/__tests__/interestsChat.crossdevice.test.js
 *
 * Two separate firebaseNative instances (= two phones, two accounts) talk to one
 * in-memory fake Firestore that ENFORCES the same auth checks as firestore.rules
 * for interests and chats. The real firebaseNative.js source runs under test;
 * only ./nativeHttp is swapped. Verifies:
 *  - buyer's interest lands in the seller's inbox (and repeat swipes don't dupe)
 *  - only the seller can accept, and only the status field changes
 *  - both phones compute the same chat id; accept creates the shared chat
 *  - messages sync both ways, in order; chat-list preview updates
 *  - an outsider can't read or post into the chat
 */

const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');
const assert = require('assert');

const SERVICES_DIR = path.resolve(__dirname, '../services');
const PROJECT = 'swipecity-marketplace';
const FS_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

// ---------------------------------------------------------------------------
// Fake Firestore REST with rules. The bearer token IS the uid (test shortcut).
// ---------------------------------------------------------------------------
function makeFakeBackend() {
  const docs = {}; // full doc path (e.g. "chats/abc/messages/m1") -> { name, fields }
  let autoId = 0;

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

  const ok = (data) => ({ ok: true, status: 200, data });
  const denied = () => ({ ok: false, status: 403, data: { error: { status: 'PERMISSION_DENIED', message: 'Missing or insufficient permissions.' } } });
  const exists = () => ({ ok: false, status: 409, data: { error: { status: 'ALREADY_EXISTS', message: 'Document already exists' } } });
  const fullName = (p) => `projects/${PROJECT}/databases/(default)/documents/${p}`;
  const authUid = (config) => ((config.headers || {}).Authorization || '').replace('Bearer ', '') || null;

  // ---- firestore.rules, for the collections under test ----
  const canRead = (p, d, uid) => {
    if (!uid) return false;
    const parts = p.split('/');
    if (parts[0] === 'interests') return uid === d.buyer_id || uid === d.seller_id;
    if (parts[0] === 'chats' && parts.length === 2) return (d.participants || []).includes(uid);
    if (parts[0] === 'chats' && parts[2] === 'messages') {
      const chat = docs[`chats/${parts[1]}`];
      return !!chat && (parseFields(chat.fields).participants || []).includes(uid);
    }
    return true;
  };
  const canCreate = (p, d, uid) => {
    if (!uid) return false;
    const parts = p.split('/');
    if (parts[0] === 'interests') return uid === d.buyer_id;
    if (parts[0] === 'chats' && parts.length === 2) return (d.participants || []).includes(uid);
    if (parts[0] === 'chats' && parts[2] === 'messages') return canRead(p, d, uid);
    return true;
  };
  const canUpdate = (p, before, after, uid) => {
    if (!uid) return false;
    const parts = p.split('/');
    if (parts[0] === 'interests') {
      const changed = Object.keys({ ...before, ...after }).filter(k => JSON.stringify(before[k]) !== JSON.stringify(after[k]));
      return uid === before.seller_id && changed.every(k => k === 'status');
    }
    if (parts[0] === 'chats' && parts.length === 2) return (before.participants || []).includes(uid);
    return false;
  };

  const handler = {
    async request(config) {
      const { url, method = 'GET', data } = config;
      const m = method.toUpperCase();
      const uid = authUid(config);
      const [pathPart, query = ''] = url.replace(FS_BASE + '/', '').replace(FS_BASE, '').split('?');
      const params = new URLSearchParams(query);

      // runQuery: "<parent>:runQuery" or ":runQuery"
      if (pathPart.endsWith(':runQuery')) {
        const parent = pathPart.replace(':runQuery', '').replace(/^\//, '');
        const sq = data.structuredQuery;
        const coll = sq.from[0].collectionId;
        const prefix = parent ? `${parent}/${coll}/` : `${coll}/`;
        let rows = Object.entries(docs)
          .filter(([p]) => p.startsWith(prefix) && p.slice(prefix.length).indexOf('/') === -1)
          .map(([p, d]) => ({ p, d, v: parseFields(d.fields) }));
        if (sq.where && sq.where.fieldFilter) {
          const { field, op, value } = sq.where.fieldFilter;
          rows = rows.filter(r => op === 'ARRAY_CONTAINS'
            ? (r.v[field.fieldPath] || []).includes(value.stringValue)
            : r.v[field.fieldPath] === value.stringValue);
        }
        // A query is denied if ANY possible result is unreadable (rules are not filters).
        if (rows.some(r => !canRead(r.p, r.v, uid))) return denied();
        if (sq.orderBy) {
          const { field, direction } = sq.orderBy[0];
          rows.sort((a, b) => (a.v[field.fieldPath] - b.v[field.fieldPath]) * (direction === 'DESCENDING' ? -1 : 1));
        }
        if (sq.limit) rows = rows.slice(0, sq.limit);
        return ok(rows.map(r => ({ document: { name: fullName(r.p), fields: r.d.fields } })));
      }

      if (m === 'POST') {
        const id = params.get('documentId') || `auto_${++autoId}`;
        const p = `${pathPart}/${id}`;
        if (docs[p]) return exists();
        if (!canCreate(p, parseFields(data.fields), uid)) return denied();
        docs[p] = { name: fullName(p), fields: data.fields };
        return ok(docs[p]);
      }

      if (m === 'PATCH') {
        const existing = docs[pathPart];
        const mask = params.getAll('updateMask.fieldPaths');
        const merged = existing ? { ...existing.fields } : {};
        if (mask.length) mask.forEach(k => { if (data.fields[k]) merged[k] = data.fields[k]; else delete merged[k]; });
        else Object.assign(merged, data.fields);
        const allowed = existing
          ? canUpdate(pathPart, parseFields(existing.fields), parseFields(merged), uid)
          : canCreate(pathPart, parseFields(merged), uid);
        if (!allowed) return denied();
        docs[pathPart] = { name: fullName(pathPart), fields: merged };
        return ok(docs[pathPart]);
      }

      if (m === 'GET') {
        const d = docs[pathPart];
        if (!d) return { ok: false, status: 404, data: {} };
        if (!canRead(pathPart, parseFields(d.fields), uid)) return denied();
        return ok(d);
      }
      return ok({});
    },
    get(url, c = {}) { return this.request({ ...c, url, method: 'GET' }); },
    post(url, d, c = {}) { return this.request({ ...c, url, method: 'POST', data: d }); },
    put(url, d, c = {}) { return this.request({ ...c, url, method: 'PUT', data: d }); },
    delete(url, c = {}) { return this.request({ ...c, url, method: 'DELETE' }); },
    patch(url, d, c = {}) { return this.request({ ...c, url, method: 'PATCH', data: d }); },
    _docs: docs,
    _parse: parseFields,
  };
  return handler;
}

function loadFirebaseNative(fakeHttp) {
  const src = fs.readFileSync(path.join(SERVICES_DIR, 'firebaseNative.js'), 'utf8');
  const { code } = babel.transformSync(src, {
    filename: 'firebaseNative.js',
    plugins: [require.resolve('@babel/plugin-transform-modules-commonjs')],
    babelrc: false,
    configFile: false,
  });
  const moduleObj = { exports: {} };
  const fakeRequire = (id) => {
    if (id === './nativeHttp') return { __esModule: true, default: fakeHttp, nativeHttp: fakeHttp };
    return require(id);
  };
  new Function('module', 'exports', 'require', code)(moduleObj, moduleObj.exports, fakeRequire);
  return moduleObj.exports.default || moduleObj.exports.firebaseNative;
}

const store = {};
global.localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
};

// Realistic 28-char uids (App.js only notifies sellers with real-looking uids).
const SELLER = 'S'.repeat(27) + '1';
const BUYER = 'B'.repeat(27) + '2';
const OUTSIDER = 'X'.repeat(27) + '3';

function phone(http, uid) {
  const svc = loadFirebaseNative(http);
  svc.currentUser = { uid };
  svc.idToken = uid; // fake backend reads the uid from the bearer token
  svc.refreshToken = 'r';
  svc.tokenTimestamp = Date.now();
  return svc;
}

let passed = 0, failed = 0;
async function test(name, fn) {
  try { await fn(); console.log('  PASS  ' + name); passed++; }
  catch (e) { console.log('  FAIL  ' + name + '\n        ' + (e && e.message)); failed++; }
}

(async () => {
  console.log('Cross-device interests + chat tests\n');

  const http = makeFakeBackend();
  const sellerPhone = phone(http, SELLER);
  const buyerPhone = phone(http, BUYER);
  const outsiderPhone = phone(http, OUTSIDER);
  const ITEM = 'item_abc';
  let interestId;

  await test('buyer interest reaches the seller inbox on another phone', async () => {
    const res = await buyerPhone.createInterest({
      itemId: ITEM, buyerName: 'Bea', sellerId: SELLER, sellerName: 'Sam', itemTitle: 'Bike', itemImage: 'https://x/y.jpg'
    });
    assert.ok(res.success, 'createInterest: ' + res.error);
    interestId = res.interest.id;
    assert.strictEqual(interestId, `${ITEM}_${BUYER}`);
    const inbox = await sellerPhone.getIncomingInterests(SELLER);
    assert.strictEqual(inbox.length, 1);
    assert.strictEqual(inbox[0].buyer_id, BUYER);
    assert.strictEqual(inbox[0].buyer_name, 'Bea');
    assert.strictEqual(inbox[0].item_id, ITEM);
    assert.strictEqual(inbox[0].status, 'pending');
  });

  await test('swiping the same item again does not create a duplicate', async () => {
    const res = await buyerPhone.createInterest({ itemId: ITEM, sellerId: SELLER });
    assert.ok(res.success && res.duplicate);
    assert.strictEqual((await sellerPhone.getIncomingInterests(SELLER)).length, 1);
    assert.strictEqual((await sellerPhone.getIncomingInterests(SELLER))[0].buyer_name, 'Bea', 'original kept');
  });

  await test('buyer cannot accept their own interest; outsider cannot either', async () => {
    assert.strictEqual((await buyerPhone.updateInterestStatus(interestId, 'accepted')).success, false);
    assert.strictEqual((await outsiderPhone.updateInterestStatus(interestId, 'accepted')).success, false);
  });

  await test('seller accepts; buyer sees status accepted', async () => {
    const res = await sellerPhone.updateInterestStatus(interestId, 'accepted');
    assert.ok(res.success, 'accept: ' + res.error);
    const mine = await buyerPhone.getMyInterests(BUYER);
    assert.strictEqual(mine.length, 1);
    assert.strictEqual(mine[0].status, 'accepted');
    assert.strictEqual(mine[0].buyer_name, 'Bea', 'other fields untouched');
  });

  const chatId = sellerPhone.chatIdFor(BUYER, SELLER, ITEM);

  await test('both phones derive the same chat id', () => {
    assert.strictEqual(buyerPhone.chatIdFor(SELLER, BUYER, ITEM), chatId);
  });

  await test('accept creates the shared chat; it shows up on the buyer phone', async () => {
    const res = await sellerPhone.createChatDoc(chatId, [BUYER, SELLER], {
      item_id: ITEM, item_title: 'Bike', buyer_id: BUYER, buyer_name: 'Bea', seller_id: SELLER, seller_name: 'Sam'
    });
    assert.ok(res.success, 'createChatDoc: ' + res.error);
    const again = await sellerPhone.createChatDoc(chatId, [BUYER, SELLER], { item_id: ITEM });
    assert.ok(again.success, 'second create is a no-op success');
    const buyerChats = await buyerPhone.loadUserChats(BUYER);
    assert.strictEqual(buyerChats.length, 1);
    assert.strictEqual(buyerChats[0].id, chatId);
    assert.strictEqual(buyerChats[0].seller_name, 'Sam');
    assert.strictEqual(buyerChats[0].item_title, 'Bike', 'repeat create did not clobber fields');
  });

  await test('messages sync both ways, oldest first, with chat preview', async () => {
    const realNow = Date.now;
    let t = realNow();
    Date.now = () => ++t; // distinct, increasing timestamps
    try {
      assert.ok((await buyerPhone.sendChatMessage(chatId, { text: 'Is it available?' })).success);
      assert.ok((await sellerPhone.sendChatMessage(chatId, { text: 'Yes! Pickup tonight?' })).success);
      assert.ok((await buyerPhone.sendChatMessage(chatId, { text: 'Deal' })).success);
    } finally { Date.now = realNow; }
    await new Promise(r => setTimeout(r, 10)); // let the best-effort preview PATCH land

    const onSeller = await sellerPhone.loadChatMessages(chatId);
    const onBuyer = await buyerPhone.loadChatMessages(chatId);
    assert.deepStrictEqual(onSeller.map(m => m.text), ['Is it available?', 'Yes! Pickup tonight?', 'Deal']);
    assert.deepStrictEqual(onBuyer.map(m => m.text), onSeller.map(m => m.text));
    assert.deepStrictEqual(onSeller.map(m => m.sender_id), [BUYER, SELLER, BUYER]);

    const sellerChats = await sellerPhone.loadUserChats(SELLER);
    assert.strictEqual(sellerChats[0].last_message, 'Deal');
  });

  await test('loadChatMessages returns the NEWEST messages when over the limit', async () => {
    const msgs = await buyerPhone.loadChatMessages(chatId, 2);
    assert.deepStrictEqual(msgs.map(m => m.text), ['Yes! Pickup tonight?', 'Deal']);
  });

  await test('outsider cannot read or post into the chat', async () => {
    assert.strictEqual((await outsiderPhone.sendChatMessage(chatId, { text: 'hi' })).success, false);
    assert.deepStrictEqual(await outsiderPhone.loadChatMessages(chatId), []);
    assert.deepStrictEqual(await outsiderPhone.loadUserChats(OUTSIDER), []);
  });

  await test('seller decline: status-only update succeeds for a second buyer', async () => {
    const other = phone(http, 'C'.repeat(27) + '4');
    const res = await other.createInterest({ itemId: ITEM, sellerId: SELLER, buyerName: 'Cal' });
    assert.ok(res.success);
    assert.ok((await sellerPhone.updateInterestStatus(res.interest.id, 'rejected')).success);
    const inbox = await sellerPhone.getIncomingInterests(SELLER);
    assert.deepStrictEqual(inbox.map(i => i.status).sort(), ['accepted', 'rejected']);
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})();
