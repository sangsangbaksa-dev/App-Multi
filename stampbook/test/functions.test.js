/* Cloudflare Pages Function (functions/api/license.js) and the --dist build. The function is ESM in a CJS package, so it is
   loaded from a temp .mjs copy with its import path made absolute. Real behaviour under workerd was also checked with `wrangler pages dev`. */
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), os = require('os'), path = require('path'), { execFileSync } = require('child_process');
const root = path.join(__dirname, '..');
let onRequest;
test.before(async () => {
  const src = fs.readFileSync(path.join(root, 'functions/api/license.js'), 'utf8').replace("'../../lib/license-core.js'", JSON.stringify(path.join(root, 'lib/license-core.js')));
  const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'sbfn-')), 'license.mjs'); fs.writeFileSync(f, src);
  ({ onRequest } = await import('file://' + f));
});
const req = (body, method = 'POST') => new Request('https://x.test/api/license', { method, body: method === 'POST' ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined, headers: { 'content-type': 'application/json' } });
const run = async (r, env) => { const res = await onRequest({ request: r, env }); return { status: res.status, body: await res.json(), headers: res.headers }; };
const ls = (json) => { global.fetch = async () => ({ status: 200, json: async () => json }); };
const ENV = { POLAR_ORGANIZATION_ID: 'org-1', POLAR_BENEFIT_ID: 'ben-1' };

test('unconfigured: {configured:false} and no outbound call', async () => {
  global.fetch = async () => { throw new Error('no call'); };
  assert.deepEqual((await run(req({ key: 'ABCD-1234-EFGH' }), {})).body, { configured: false });
});
test('GET is 405 with Allow: POST', async () => { const r = await run(req(null, 'GET'), ENV); assert.equal(r.status, 405); assert.equal(r.headers.get('allow'), 'POST'); });
test('malformed JSON and oversized bodies are 400', async () => {
  global.fetch = async () => { throw new Error('no call'); };
  assert.equal((await run(req('{not json'), ENV)).status, 400); assert.equal((await run(req(JSON.stringify({ key: 'A'.repeat(5000) })), ENV)).status, 400);
});
test('activates a key for our product, refuses another product', async () => {
  ls({ id: 'inst-123456789', license_key: { status: 'granted', benefit_id: 'ben-1' } });
  const ok = await run(req({ action: 'activate', key: 'ABCD-1234-EFGH' }), ENV); assert.deepEqual(ok.body, { configured: true, ok: true, instanceId: 'inst-123456789' }); assert.equal(ok.headers.get('cache-control'), 'no-store');
  ls({ id: 'x', license_key: { status: 'granted', benefit_id: 'other' } }); assert.equal((await run(req({ key: 'ABCD-1234-EFGH' }), ENV)).body.reason, 'wrong_product');
});
test('provider outage is 502 unreachable', async () => { global.fetch = async () => { throw new Error('down'); }; const r = await run(req({ key: 'ABCD-1234-EFGH' }), ENV); assert.equal(r.status, 502); assert.equal(r.body.reason, 'unreachable'); });
test('validate path forwards the instance id', async () => {
  let seen; global.fetch = async (u, o) => { seen = { u, b: o.body.toString() }; return { status: 200, json: async () => ({ status: 'granted', benefit_id: 'ben-1', activation: { id: 'inst-123456789' } }) }; };
  const r = await run(req({ action: 'validate', key: 'ABCD-1234-EFGH', instanceId: 'inst-123456789' }), ENV);
  assert.equal(r.body.ok, true); assert.ok(seen.u.endsWith('/validate')); assert.ok(JSON.parse(seen.b).activation_id === 'inst-123456789');
});
test('--dist publishes only public files and carries _headers/_redirects', () => {
  execFileSync('node', [path.join(root, 'scripts/build.js'), '--dist']);
  const d = path.join(root, 'dist'), has = p => fs.existsSync(path.join(d, p));
  for (const p of ['index.html', 'ko/index.html', 'app/index.html', 'app/sw.js', 'privacy.html', 'terms.html', 'sitemap.xml', 'robots.txt', 'og.png', '_headers', '_redirects', 'config.js']) assert.ok(has(p), p);
  for (const p of ['scripts', 'test', 'docs', 'api', 'functions', 'lib', 'vercel.json']) assert.ok(!has(p), p + ' must not be published');
  const h = fs.readFileSync(path.join(d, '_headers'), 'utf8'), v = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
  assert.ok(h.includes(v.headers[0].headers.find(x => x.key === 'Content-Security-Policy').value), '_headers CSP matches vercel.json');
});
