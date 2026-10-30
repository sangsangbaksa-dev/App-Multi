const test = require('node:test'), assert = require('node:assert'), handler = require('../api/license.js');
function call(body, method = 'POST') {
  return new Promise(resolve => { const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(t) { resolve({ status: this.statusCode, body: JSON.parse(t) }); } }; handler({ method, body }, res); });
}
const mockFetch = (json, status = 200) => { let seen; global.fetch = async (url, o) => { seen = { url, body: o.body.toString() }; return { status, json: async () => json }; }; return () => seen; };
const env = (s, p) => { s == null ? delete process.env.LS_STORE_ID : process.env.LS_STORE_ID = s; p == null ? delete process.env.LS_PRODUCT_ID : process.env.LS_PRODUCT_ID = p; };

test('not configured: tells the client to keep the offline check and never calls out', async () => {
  env(null, null); global.fetch = async () => { throw new Error('should not be called'); };
  assert.deepEqual((await call({ action: 'activate', key: 'ABCD-1234-EFGH' })).body, { configured: false });
});
test('only POST', async () => { env('1', '2'); const r = await call({}, 'GET'); assert.equal(r.status, 405); });
test('rejects malformed keys before calling the provider', async () => {
  env('1', '2'); global.fetch = async () => { throw new Error('no'); };
  for (const key of ['', 'short', 'a'.repeat(200), 'has space in it!!', 123, undefined]) assert.equal((await call({ key })).status, 400);
});
test('activates a key for our product', async () => {
  env('11', '22'); const seen = mockFetch({ activated: true, license_key: { status: 'active' }, instance: { id: 'inst-123456789' }, meta: { store_id: 11, product_id: 22 } });
  const r = await call({ action: 'activate', key: ' ABCD-1234-EFGH ' });
  assert.deepEqual(r.body, { configured: true, ok: true, instanceId: 'inst-123456789' });
  assert.ok(seen().url.endsWith('/licenses/activate')); assert.ok(seen().body.includes('license_key=ABCD-1234-EFGH')); assert.ok(seen().body.includes('instance_name='));
});
test('refuses a valid key that belongs to another product or store', async () => {
  env('11', '22'); mockFetch({ activated: true, instance: { id: 'x' }, meta: { store_id: 11, product_id: 99 } });
  assert.equal((await call({ key: 'ABCD-1234-EFGH' })).body.reason, 'wrong_product');
  mockFetch({ activated: true, meta: { store_id: 5, product_id: 22 } }); assert.equal((await call({ key: 'ABCD-1234-EFGH' })).body.reason, 'wrong_product');
});
test('invalid, disabled and expired keys are refused', async () => {
  env('11', '22'); mockFetch({ activated: false, error: 'license_key not found' }, 404); assert.equal((await call({ key: 'ABCD-1234-EFGH' })).body.reason, 'invalid');
  mockFetch({ activated: true, license_key: { status: 'disabled' }, meta: { store_id: 11, product_id: 22 } }); assert.equal((await call({ key: 'ABCD-1234-EFGH' })).body.ok, false);
  mockFetch({ activated: true, license_key: { status: 'expired' }, meta: { store_id: 11, product_id: 22 } }); assert.equal((await call({ key: 'ABCD-1234-EFGH' })).body.ok, false);
});
test('validate needs an instance id and passes it through', async () => {
  env('11', '22'); assert.equal((await call({ action: 'validate', key: 'ABCD-1234-EFGH' })).status, 400);
  const seen = mockFetch({ valid: true, license_key: { status: 'active' }, meta: { store_id: 11, product_id: 22 } });
  const r = await call({ action: 'validate', key: 'ABCD-1234-EFGH', instanceId: 'inst-123456789' });
  assert.equal(r.body.ok, true); assert.equal(r.body.instanceId, 'inst-123456789'); assert.ok(seen().body.includes('instance_id=inst-123456789'));
});
test('provider outage returns 502 so the client can tell it apart from a bad key', async () => {
  env('11', '22'); global.fetch = async () => { throw new Error('down'); };
  const r = await call({ key: 'ABCD-1234-EFGH' }); assert.equal(r.status, 502); assert.equal(r.body.reason, 'unreachable');
});
