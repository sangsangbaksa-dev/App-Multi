const { chromium } = require('playwright'), http = require('http'), fs = require('fs'), path = require('path'), assert = require('assert');
const root = path.join(__dirname, '..'), types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
const licenseHandler = require('../api/license.js');
// Never reach the real Lemon Squeezy from tests (offline sandboxes hang): unknown keys answer "not found" straight away.
process.env.LEMONSQUEEZY_DISABLED = '1'; // the offline-key part runs as if no payment provider is configured
global.fetch = async () => ({ status: 404, json: async () => ({ valid: false, error: 'license_key not found' }) });
const srv = http.createServer((q, r) => {
  if (q.url === '/api/license') { let b = ''; q.on('data', c => b += c); q.on('end', () => { q.body = b; r.setHeader = r.setHeader.bind(r); licenseHandler(q, r); }); return; }
  let p = decodeURIComponent(q.url.split('?')[0].split('#')[0]); if (p.endsWith('/')) p += 'index.html'; if (p === '/privacy' || p === '/terms') p += '.html';
  const f = path.join(root, p); if (!f.startsWith(root) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-security-policy': "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'", 'content-type': types[path.extname(f)] || 'text/plain' }); fs.createReadStream(f).pipe(r);
}).listen(0);
(async () => {
  const base = `http://localhost:${srv.address().port}`, b = await chromium.launch(), errs = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'en-US' });
  const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push(e.message));
  await pg.goto(base + '/app/');
  await pg.evaluate(() => { localStorage['stampbook.v1'] = JSON.stringify({ v: 1, pro: true, teacher: '', lang: 'en', packs: [] }); });
  await pg.reload(); await pg.waitForSelector('.wl');
  await pg.fill('#wl-name', 'Hana Choi'); await pg.fill('#wl-note', 'Tue evenings'); await pg.click('.wl button[type=submit]');
  await pg.waitForFunction(() => (JSON.parse(localStorage['stampbook.v1']).waitlist || []).length === 1);
  await pg.locator('.wl button', { hasText: 'Start a pack' }).click(); await pg.waitForSelector('#dlg[open]');
  assert.equal(await pg.inputValue('#f-name'), 'Hana Choi');
  await pg.click('#dlg button[type=button]');
  await pg.fill('#cl-date', '2026-12-25');
  await pg.locator('form', { has: pg.locator('#cl-date') }).locator('button[type=submit]').click();
  await pg.waitForFunction(() => (JSON.parse(localStorage['stampbook.v1']).closures || []).includes('2026-12-25'));
  console.log(errs.length ? 'ERRORS: ' + errs.join('\n') : 'NEWFEAT E2E OK'); await b.close(); srv.close(); process.exit(errs.length ? 1 : 0);
})().catch(e => { console.error('FAIL', e); process.exit(1); });
