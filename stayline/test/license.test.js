const test = require('node:test'), assert = require('node:assert'), api = require('../api/license.js');
const ENV = { GUMROAD_PRODUCT_ID: 'prod-1' };
const fake = (body, calls) => async (url, opts) => { if (calls) calls.push({ url, opts }); return { json: async () => body }; };
const GOOD = { success: true, uses: 1, purchase: { product_id: 'prod-1', refunded: false, chargebacked: false } };

test('not configured without the product id: no upstream call', async () => {
  const calls = []; const r = await api.verify('ABCD-EFGH-1234', {}, fake({}, calls));
  assert.deepEqual(r, { configured: false }); assert.equal(calls.length, 0);
});
test('paid key for our product is valid', async () => {
  const calls = []; const r = await api.verify('ABCD-EFGH-1234', ENV, fake(GOOD, calls));
  assert.deepEqual(r, { configured: true, valid: true });
  assert.equal(calls[0].url, 'https://api.gumroad.com/v2/licenses/verify');
  assert.deepEqual(Object.fromEntries(new URLSearchParams(calls[0].opts.body)), { product_id: 'prod-1', license_key: 'ABCD-EFGH-1234', increment_uses_count: 'false' });
});
test('refunded, charged-back or unknown keys are not valid', async () => {
  assert.equal((await api.verify('ABCD-EFGH-1234', ENV, fake({ success: true, purchase: { refunded: true } }))).valid, false);
  assert.equal((await api.verify('ABCD-EFGH-1234', ENV, fake({ success: true, purchase: { chargebacked: true } }))).valid, false);
  assert.equal((await api.verify('ABCD-EFGH-1234', ENV, fake({ success: false, message: 'That license does not exist.' }))).valid, false);
});
test('malformed or error responses are not valid', async () => {
  assert.equal((await api.verify('ABCD-EFGH-1234', ENV, async () => ({ json: async () => { throw new Error('x'); } }))).valid, false);
});
function run(req, env) {
  const old = { ...process.env }; Object.assign(process.env, env);
  const out = { headers: {} }, res = { setHeader: (k, v) => { out.headers[k] = v; }, end: b => { out.body = JSON.parse(b); } };
  return api(req, res).then(() => { process.env = old; return Object.assign(out, { status: res.statusCode }); });
}
test('handler: method, missing env, bad key', async () => {
  delete process.env.GUMROAD_PRODUCT_ID;
  assert.equal((await run({ method: 'GET' }, {})).status, 405);
  const a = await run({ method: 'POST', body: { key: 'ABCD-EFGH-1234' } }, {}); assert.deepEqual(a.body, { configured: false }); assert.equal(a.headers['Cache-Control'], 'no-store');
  assert.equal((await run({ method: 'POST', body: { key: 'bad key!' } }, ENV)).status, 400);
  assert.equal((await run({ method: 'POST', body: '{not json' }, ENV)).status, 400);
});
