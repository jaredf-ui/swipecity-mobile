// Usage: node scripts/live-e2e.js   (needs scripts/test-accounts.local.json)
// Live end-to-end check against the real Firebase project with two test accounts.
const fs = require('fs'), path = require('path');
const REPO = path.resolve(__dirname, '..');
const babel = require(REPO + '/node_modules/@babel/core');
const store = {};
global.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
global.window = { localStorage: global.localStorage };

const http = {
  async request({ url, method = 'GET', data, headers = {} }) {
    const h = {}; for (const [k, v] of Object.entries(headers)) if (v !== undefined) h[k] = v;
    const r = await fetch(url, { method, headers: h, body: data === undefined ? undefined : (typeof data === 'string' ? data : JSON.stringify(data)) });
    const t = await r.text(); let d; try { d = JSON.parse(t); } catch { d = t; }
    return { ok: r.ok, status: r.status, data: d };
  },
  get(u, c = {}) { return this.request({ ...c, url: u, method: 'GET' }); },
  post(u, d, c = {}) { return this.request({ ...c, url: u, method: 'POST', data: d }); },
  put(u, d, c = {}) { return this.request({ ...c, url: u, method: 'PUT', data: d }); },
  patch(u, d, c = {}) { return this.request({ ...c, url: u, method: 'PATCH', data: d }); },
  delete(u, c = {}) { return this.request({ ...c, url: u, method: 'DELETE' }); },
};
function load() {
  const src = fs.readFileSync(REPO + '/apps/web/src/services/firebaseNative.js', 'utf8');
  const { code } = babel.transformSync(src, { filename: 'f.js', plugins: [require.resolve(REPO + '/node_modules/@babel/plugin-transform-modules-commonjs')], babelrc: false, configFile: false });
  const m = { exports: {} };
  new Function('module', 'exports', 'require', code)(m, m.exports, id => id === './nativeHttp' ? { __esModule: true, default: http, nativeHttp: http } : require(id));
  return m.exports.default || m.exports.firebaseNative;
}
const log = (ok, msg, extra) => console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}${extra ? '  -> ' + JSON.stringify(extra).slice(0, 300) : ''}`);

(async () => {
  const ACC = JSON.parse(fs.readFileSync(REPO + '/scripts/test-accounts.local.json', 'utf8'));
  const PW = ACC.seller.password;
  const seller = load(), buyer = load();
  const login = async (svc, email, name) => {
    let r = await svc.signIn(email, PW);
    if (!r?.success && !svc.currentUser) r = await svc.signUp(email, PW, name);
    return !!svc.currentUser?.uid;
  };
  log(await login(seller, 'test-seller@swipecity.test', 'Test Seller'), 'seller signed in', seller.currentUser?.uid);
  log(await login(buyer, 'test-buyer@swipecity.test', 'Test Buyer'), 'buyer signed in', buyer.currentUser?.uid);
  if (!seller.currentUser || !buyer.currentUser) process.exit(1);
  const S = seller.currentUser.uid, B = buyer.currentUser.uid;

  const item = await seller.createItem({ title: 'TEST listing (delete me)', price: 1, condition: 'good', city: 'Raleigh', description: 'automated test', seller_name: 'Test Seller', image_url: '' });
  log(item.success, 'seller creates listing (items create rule)', item.error);
  if (!item.success) process.exit(1);
  const itemId = item.item.id;
  const feed = await buyer.getActiveItems(300);
  log(feed.some(i => i.id === itemId), 'listing appears in buyer feed');

  const intr = await buyer.createInterest({ itemId, sellerId: S, buyerName: 'Test Buyer', sellerName: 'Test Seller', itemTitle: 'TEST listing' });
  log(intr.success, 'buyer sends interest (interests create rule)', intr.error);
  const inbox = await seller.getIncomingInterests(S);
  log(inbox.some(i => i.item_id === itemId && i.buyer_id === B), 'interest reaches seller inbox (interests read rule)', inbox.length);
  const acc = await seller.updateInterestStatus(intr.interest?.id, 'accepted');
  log(acc.success, 'seller accepts (status-only update rule)', acc.error);
  const mine = await buyer.getMyInterests(B);
  log(mine.some(i => i.item_id === itemId && i.status === 'accepted'), 'buyer sees accepted');

  const chatId = seller.chatIdFor(B, S, itemId);
  const chat = await seller.createChatDoc(chatId, [B, S], { item_id: itemId, item_title: 'TEST listing', buyer_id: B, buyer_name: 'Test Buyer', seller_id: S, seller_name: 'Test Seller' });
  log(chat.success, 'seller creates shared chat (chats create rule)', chat.error);
  const bChats = await buyer.loadUserChats(B);
  log(bChats.some(c => c.id === chatId), 'chat shows on buyer side (chats list query)', bChats.length);
  const m1 = await buyer.sendChatMessage(chatId, { text: 'hi from buyer' });
  log(m1.success, 'buyer sends message (messages create rule)', m1.error);
  const m2 = await seller.sendChatMessage(chatId, { text: 'hi from seller' });
  log(m2.success, 'seller sends message', m2.error);
  await new Promise(r => setTimeout(r, 1500));
  const msgs = await seller.loadChatMessages(chatId);
  log(msgs.map(m => m.text).join('|') .includes('hi from buyer|hi from seller'), 'messages readable in order (runQuery orderBy)', msgs.map(m => m.text));
  const sChats = await seller.loadUserChats(S);
  log((sChats.find(c => c.id === chatId) || {}).last_message === 'hi from seller', 'chat preview updated (chat update rule)', (sChats.find(c => c.id === chatId) || {}).last_message);

  const del = await seller.deleteItem(itemId);
  log(del.success, 'cleanup: test listing deleted', del.error);
})().catch(e => { console.error('CRASH', e); process.exit(1); });
