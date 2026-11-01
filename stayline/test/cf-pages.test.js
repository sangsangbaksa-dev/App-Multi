const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), os = require('os'), path = require('path'), cp = require('child_process');
const ENV = { GUMROAD_PRODUCT_ID: 'prod-1' };
const post = (body, raw) => new Request('https://x.test/api/license', { method: 'POST', headers: { 'content-type': 'application/json' }, body: raw || JSON.stringify(body) });

test('Pages Function mirrors the Vercel one', async () => {
  const { onRequest } = await import('../functions/api/license.js');
  let r = await onRequest({ request: new Request('https://x.test/api/license'), env: ENV });
  assert.equal(r.status, 405); assert.equal(r.headers.get('allow'), 'POST');
  r = await onRequest({ request: post({ key: 'ABCD-EFGH-1234' }), env: {} });
  assert.deepEqual(await r.json(), { configured: false }); assert.equal(r.headers.get('cache-control'), 'no-store');
  r = await onRequest({ request: post({ key: 'bad key!' }), env: ENV }); assert.equal(r.status, 400);
  r = await onRequest({ request: post(null, '{nope'), env: ENV }); assert.equal(r.status, 400);
  const real = globalThis.fetch;
  try {
    globalThis.fetch = async (url, o) => { assert.equal(url, 'https://api.gumroad.com/v2/licenses/verify'); assert.ok(o.body.includes('license_key=ABCD-EFGH-1234')); return { json: async () => ({ success: true, purchase: { refunded: false, chargebacked: false } }) }; };
    r = await onRequest({ request: post({ key: 'ABCD-EFGH-1234' }), env: ENV }); assert.deepEqual(await r.json(), { configured: true, valid: true });
    globalThis.fetch = async () => ({ json: async () => ({ success: true, purchase: { refunded: true } }) });
    r = await onRequest({ request: post({ key: 'ABCD-EFGH-1234' }), env: ENV }); assert.equal((await r.json()).valid, false);
    globalThis.fetch = async () => { throw new Error('down'); };
    r = await onRequest({ request: post({ key: 'ABCD-EFGH-1234' }), env: ENV }); assert.equal(r.status, 502);
  } finally { globalThis.fetch = real; }
});

test('build-pages copies only public files and the headers', () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'stayline-dist-'));
  cp.execFileSync(process.execPath, [path.join(__dirname, '../scripts/build-pages.js')], { env: { ...process.env, OUT: out }, stdio: 'pipe' });
  const top = fs.readdirSync(out).sort();
  for (const f of ['_headers', 'app', 'index.html', 'ko', 'robots.txt', 'sitemap.xml', 'config.js', 'og.png', 'privacy.html', 'terms.html']) assert.ok(top.includes(f), f);
  for (const f of ['docs', 'test', 'scripts', 'functions', 'api', 'design', 'README.md', 'vercel.json']) assert.ok(!top.includes(f), 'must not ship ' + f);
  const h = fs.readFileSync(path.join(out, '_headers'), 'utf8');
  assert.ok(h.includes("Content-Security-Policy: default-src 'self'") && h.includes('/app/sw.js') && h.includes('no-cache'));
  const v = JSON.parse(fs.readFileSync(path.join(__dirname, '../vercel.json'), 'utf8')), csp = v.headers[0].headers.find(x => x.key === 'Content-Security-Policy').value;
  assert.ok(h.includes(csp), '_headers CSP must equal vercel.json CSP');
  assert.ok(fs.existsSync(path.join(out, 'app', 'sw.js')) && fs.existsSync(path.join(out, 'ja', 'terms.html')));
});
