const test = require('node:test'), assert = require('node:assert'), api = require('../api/license.js');
const ENV = { LS_STORE_ID: '11', LS_PRODUCT_ID: '22' };
const fake = (body, calls) => async (url, opts) => { if (calls) calls.push({ url, opts }); return { json: async () => body }; };

test('not configured without env vars: no upstream call', async () => {
  const calls = []; const r = await api.verify('ABCD-EFGH-1234', {}, fake({}, calls));
  assert.deepEqual(r, { configured: false }); assert.equal(calls.length, 0);
  assert.deepEqual(await api.verify('ABCD-EFGH-1234', { LS_STORE_ID: '1' }, fake({})), { configured: false });
});
test('valid key for our store and product', async () => {
  const calls = []; const r = await api.verify('ABCD-EFGH-1234', ENV, fake({ valid: true, meta: { store_id: 11, product_id: 22 } }, calls));
  assert.deepEqual(r, { configured: true, valid: true });
  assert.equal(calls[0].url, 'https://api.lemonsqueezy.com/v1/licenses/validate');
  assert.equal(calls[0].opts.body, 'license_key=ABCD-EFGH-1234');
});
test('valid key from another product or store is rejected', async () => {
  assert.equal((await api.verify('ABCD-EFGH-1234', ENV, fake({ valid: true, meta: { store_id: 11, product_id: 99 } }))).valid, false);
  assert.equal((await api.verify('ABCD-EFGH-1234', ENV, fake({ valid: true, meta: { store_id: 5, product_id: 22 } }))).valid, false);
  assert.equal((await api.verify('ABCD-EFGH-1234', ENV, fake({ valid: true }))).valid, false);
});
test('invalid, malformed or error responses are not valid', async () => {
  assert.equal((await api.verify('ABCD-EFGH-1234', ENV, fake({ valid: false, error: 'license_key not found' }))).valid, false);
  assert.equal((await api.verify('ABCD-EFGH-1234', ENV, async () => ({ json: async () => { throw new Error('x'); } }))).valid, false);
});
function run(req, env) {
  const old = { ...process.env }; Object.assign(process.env, env);
  const out = { headers: {} }, res = { setHeader: (k, v) => { out.headers[k] = v; }, end: b => { out.body = JSON.parse(b); } };
  return api(req, res).then(() => { process.env = old; return Object.assign(out, { status: res.statusCode }); });
}
test('handler: method, missing env, bad key', async () => {
  delete process.env.LS_STORE_ID; delete process.env.LS_PRODUCT_ID;
  assert.equal((await run({ method: 'GET' }, {})).status, 405);
  const a = await run({ method: 'POST', body: { key: 'ABCD-EFGH-1234' } }, {}); assert.deepEqual(a.body, { configured: false }); assert.equal(a.headers['Cache-Control'], 'no-store');
  assert.equal((await run({ method: 'POST', body: { key: 'bad key!' } }, ENV)).status, 400);
  assert.equal((await run({ method: 'POST', body: '{not json' }, ENV)).status, 400);
});
