const test = require('node:test'), assert = require('node:assert/strict');
const srv = require('../api/license.js'), L = require('../app/license.js'), CFG = require('../app/config.js');
const mem = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) }; };
const resp = (status, body) => ({ ok: status < 400, status, json: async () => body });
const env = { LEMONSQUEEZY_PRODUCT_ID: '42' };

test('server: launch mode without a product id, and keys must match the product', async () => {
  assert.equal(srv.configured({}), false);
  assert.deepEqual(await srv.verify('ABCD-1234-EFGH', {}, async () => { throw new Error('no call'); }), { configured: false });
  const ok = async () => resp(200, { valid: true, license_key: { status: 'active' }, meta: { product_id: 42 } });
  assert.deepEqual(await srv.verify('ABCD-1234-EFGH', env, ok), { configured: true, valid: true });
  const other = async () => resp(200, { valid: true, license_key: { status: 'active' }, meta: { product_id: 7 } });
  assert.equal((await srv.verify('ABCD-1234-EFGH', env, other)).valid, false);
  const refunded = async () => resp(200, { valid: false, license_key: { status: 'disabled' }, meta: { product_id: 42 } });
  assert.equal((await srv.verify('ABCD-1234-EFGH', env, refunded)).valid, false);
  await assert.rejects(srv.verify('ABCD-1234-EFGH', env, async () => resp(503, {})));
});

test('client: launch mode stays open; paid mode locks until a key is activated', async () => {
  const store = mem(), fetchOff = async () => resp(200, { configured: false });
  assert.equal((await L.status({ store, fetch: fetchOff, api: '/api/license' })).locked, false);
  const on = async (url, o) => (o && o.method === 'POST' ? resp(200, JSON.parse(o.body).key === 'ABCD-1234-EFGH' ? { configured: true, valid: true } : { configured: true, valid: false }) : resp(200, { configured: true }));
  assert.equal((await L.status({ store, fetch: on, api: '/api/license' })).locked, true);
  assert.equal((await L.activate({ store, fetch: on, api: '/api/license', key: 'WRONG-KEY-0000' })).reason, 'invalid');
  assert.equal((await L.activate({ store, fetch: on, api: '/api/license', key: ' ABCD-1234-EFGH ' })).ok, true);
  assert.equal((await L.status({ store, fetch: on, api: '/api/license' })).locked, false);
});

test('client: offline keeps a paying user in, and a refund locks again after recheck', async () => {
  const store = mem(), now = Date.now();
  store.setItem(L.KEY, JSON.stringify({ key: 'ABCD-1234-EFGH', checkedAt: now }));
  store.setItem('marginlog:gate', '1');
  const offline = async () => { throw new TypeError('offline'); };
  assert.equal((await L.status({ store, fetch: offline, api: '/api/license', now })).locked, false);
  const refunded = async (u, o) => (o && o.method === 'POST' ? resp(200, { configured: true, valid: false }) : resp(200, { configured: true }));
  assert.equal((await L.status({ store, fetch: refunded, api: '/api/license', now: now + L.RECHECK_MS + 1 })).locked, true);
});

test('config: checkout stays hidden while it is a placeholder', () => {
  assert.equal(CFG.checkoutLive, false);
});
