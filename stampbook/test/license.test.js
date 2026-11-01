const test = require('node:test'), assert = require('node:assert'), handler = require('../api/license.js');
function call(body, method = 'POST') {
  return new Promise(resolve => { const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(t) { resolve({ status: this.statusCode, body: JSON.parse(t) }); } }; handler({ method, body }, res); });
}
const mockFetch = (json, status = 200) => { let seen; global.fetch = async (url, o) => { seen = { url, body: o.body.toString() }; return { status, json: async () => json }; }; return () => seen; };
const env = (p) => { p == null ? delete process.env.GUMROAD_PRODUCT_ID : process.env.GUMROAD_PRODUCT_ID = p; };
const GOOD = { success: true, uses: 1, purchase: { product_id: 'prod-1', refunded: false, chargebacked: false } };

test('not configured: tells the client to keep the offline check and never calls out', async () => {
  env(null); global.fetch = async () => { throw new Error('should not be called'); };
  assert.deepEqual((await call({ action: 'activate', key: 'ABCD-1234-EFGH' })).body, { configured: false });
});
test('only POST', async () => { env('prod-1'); const r = await call({}, 'GET'); assert.equal(r.status, 405); });
test('rejects malformed keys before calling the provider', async () => {
  env('prod-1'); global.fetch = async () => { throw new Error('no'); };
  for (const key of ['', 'short', 'a'.repeat(200), 'has space in it!!', 123, undefined]) assert.equal((await call({ key })).status, 400);
});
test('activates a paid key for our product', async () => {
  env('prod-1'); const seen = mockFetch(GOOD);
  const r = await call({ action: 'activate', key: ' ABCD-1234-EFGH ' });
  assert.deepEqual(r.body, { configured: true, ok: true, instanceId: '' });
  assert.equal(seen().url, 'https://api.gumroad.com/v2/licenses/verify');
  assert.deepEqual(Object.fromEntries(new URLSearchParams(seen().body)), { product_id: 'prod-1', license_key: 'ABCD-1234-EFGH', increment_uses_count: 'false' });
});
test('unknown keys are refused', async () => {
  env('prod-1'); mockFetch({ success: false, message: 'That license does not exist for the provided product.' }, 404);
  assert.equal((await call({ key: 'ABCD-1234-EFGH' })).body.reason, 'invalid');
});
test('refunded and charged-back purchases are refused', async () => {
  env('prod-1');
  for (const p of [{ refunded: true }, { chargebacked: true }]) {
    mockFetch({ success: true, purchase: { ...GOOD.purchase, ...p } });
    const r = await call({ key: 'ABCD-1234-EFGH' }); assert.equal(r.body.ok, false); assert.equal(r.body.reason, 'refunded');
  }
});
test('validate passes the key through and needs no instance id', async () => {
  env('prod-1'); const seen = mockFetch(GOOD);
  const r = await call({ action: 'validate', key: 'ABCD-1234-EFGH' });
  assert.equal(r.body.ok, true); assert.ok(seen().body.includes('license_key=ABCD-1234-EFGH'));
});
test('provider outage returns 502 so the client can tell it apart from a bad key', async () => {
  env('prod-1'); global.fetch = async () => { throw new Error('down'); };
  const r = await call({ key: 'ABCD-1234-EFGH' }); assert.equal(r.status, 502); assert.equal(r.body.reason, 'unreachable');
});
