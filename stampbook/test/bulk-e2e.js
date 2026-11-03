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
  const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push(e.message)); pg.on('dialog', d => d.accept());
  await pg.goto(base + '/app/');
  const today = new Date(), iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  await pg.evaluate((t) => { localStorage['stampbook.v1'] = JSON.stringify({ v: 1, pro: true, teacher: '', lang: 'en', packs: [
    { id: 'm', student: 'Mina', total: 2, price: 50, currency: 'USD', start: t, expires: '', stamps: [{ id: 's1', date: t, note: '' }], paid: true },
    { id: 'j', student: ' joon ', total: 3, price: 60, currency: 'USD', start: t, expires: '', stamps: [], paid: true }] }); }, iso(today));
  await pg.reload(); await pg.waitForSelector('.card');
  // bulk renew: Mina is one lesson from the end, so one pack is due
  await pg.locator('button', { hasText: /^Renew all due \(1\)$/ }).click();
  await pg.waitForFunction(() => JSON.parse(localStorage['stampbook.v1']).packs.length === 3);
  const after = await pg.evaluate(() => JSON.parse(localStorage['stampbook.v1']).packs);
  assert.equal(after.filter(p => p.renewsFrom === 'm').length, 1, 'one successor for Mina');
  assert.equal(await pg.locator('button', { hasText: /^Renew all due/ }).count(), 0, 'nothing left due');
  // bulk rename: name matching ignores case and spaces, every pack changes
  await pg.locator('button', { hasText: 'Rename a student' }).click(); await pg.waitForSelector('#rendlg[open]');
  await pg.fill('#r-from', 'JOON'); await pg.fill('#r-to', 'Joon Lee'); await pg.click('#rendlg button[type=submit]');
  await pg.waitForFunction(() => JSON.parse(localStorage['stampbook.v1']).packs.filter(p => p.student === 'Joon Lee').length === 1);
  console.log(errs.length ? 'ERRORS: ' + errs.join('\n') : 'BULK E2E OK'); await b.close(); srv.close(); process.exit(errs.length ? 1 : 0);
})().catch(e => { console.error('FAIL', e); process.exit(1); });
