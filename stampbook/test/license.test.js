const test = require('node:test'), assert = require('node:assert'), handler = require('../api/license.js');
function call(body, method = 'POST') {
  return new Promise(resolve => { const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(t) { resolve({ status: this.statusCode, body: JSON.parse(t) }); } }; handler({ method, body }, res); });
}
const mockFetch = (json, status = 200) => { let seen; global.fetch = async (url, o) => { seen = { url, body: o.body.toString() }; return { status, json: async () => json }; }; return () => seen; };
const env = (o, b) => { o == null ? delete process.env.POLAR_ORGANIZATION_ID : process.env.POLAR_ORGANIZATION_ID = o; b == null ? delete process.env.POLAR_BENEFIT_ID : process.env.POLAR_BENEFIT_ID = b; };
const GOOD = { id: 'inst-123456789', license_key: { status: 'granted', benefit_id: 'ben-1' } };

test('not configured: tells the client to keep the offline check and never calls out', async () => {
  env(null, null); global.fetch = async () => { throw new Error('should not be called'); };
  assert.deepEqual((await call({ action: 'activate', key: 'ABCD-1234-EFGH' })).body, { configured: false });
});
test('only POST', async () => { env('org-1', 'ben-1'); const r = await call({}, 'GET'); assert.equal(r.status, 405); });
test('rejects malformed keys before calling the provider', async () => {
  env('org-1', 'ben-1'); global.fetch = async () => { throw new Error('no'); };
  for (const key of ['', 'short', 'a'.repeat(200), 'has space in it!!', 123, undefined]) assert.equal((await call({ key })).status, 400);
});
test('activates a key for our product', async () => {
  env('org-1', 'ben-1'); const seen = mockFetch(GOOD);
  const r = await call({ action: 'activate', key: ' ABCD-1234-EFGH ' });
  assert.deepEqual(r.body, { configured: true, ok: true, instanceId: 'inst-123456789' });
  assert.equal(seen().url, 'https://api.polar.sh/v1/customer-portal/license-keys/activate');
  assert.deepEqual(JSON.parse(seen().body), { key: 'ABCD-1234-EFGH', organization_id: 'org-1', label: 'stampbook-browser' });
});
test('refuses a valid key that belongs to another product (benefit)', async () => {
  env('org-1', 'ben-1'); mockFetch({ id: 'x', license_key: { status: 'granted', benefit_id: 'other' } });
  assert.equal((await call({ key: 'ABCD-1234-EFGH' })).body.reason, 'wrong_product');
  mockFetch({ id: 'x', license_key: { status: 'granted' } }); assert.equal((await call({ key: 'ABCD-1234-EFGH' })).body.reason, 'wrong_product');
});
test('invalid, disabled and expired keys are refused', async () => {
  env('org-1', 'ben-1'); mockFetch({ detail: 'Not found' }, 404); assert.equal((await call({ key: 'ABCD-1234-EFGH' })).body.reason, 'invalid');
  mockFetch({ detail: 'Activation limit reached' }, 403); assert.equal((await call({ key: 'ABCD-1234-EFGH' })).body.ok, false);
  mockFetch({ id: 'x', license_key: { status: 'disabled', benefit_id: 'ben-1' } }); assert.equal((await call({ key: 'ABCD-1234-EFGH' })).body.ok, false);
  mockFetch({ id: 'x', license_key: { status: 'revoked', benefit_id: 'ben-1' } }); assert.equal((await call({ key: 'ABCD-1234-EFGH' })).body.ok, false);
  mockFetch({ id: 'x', license_key: { status: 'granted', benefit_id: 'ben-1', expires_at: '2000-01-01T00:00:00Z' } }); assert.equal((await call({ key: 'ABCD-1234-EFGH' })).body.ok, false);
});
test('validate needs an instance id and passes it through', async () => {
  env('org-1', 'ben-1'); assert.equal((await call({ action: 'validate', key: 'ABCD-1234-EFGH' })).status, 400);
  const seen = mockFetch({ status: 'granted', benefit_id: 'ben-1', activation: { id: 'inst-123456789' } });
  const r = await call({ action: 'validate', key: 'ABCD-1234-EFGH', instanceId: 'inst-123456789' });
  assert.equal(r.body.ok, true); assert.equal(r.body.instanceId, 'inst-123456789'); assert.ok(JSON.parse(seen().body).activation_id === 'inst-123456789');
});
test('provider outage returns 502 so the client can tell it apart from a bad key', async () => {
  env('org-1', 'ben-1'); global.fetch = async () => { throw new Error('down'); };
  const r = await call({ key: 'ABCD-1234-EFGH' }); assert.equal(r.status, 502); assert.equal(r.body.reason, 'unreachable');
});
