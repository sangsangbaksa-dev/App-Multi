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
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'en-US', permissions: ['clipboard-read', 'clipboard-write'] });
  const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => m.type() === 'error' && errs.push(m.text()));
  const today = new Date(), iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const ago = n => { const d = new Date(today); d.setDate(d.getDate() - n); return iso(d); };
  const soon = new Date(today); soon.setDate(soon.getDate() + 20);
  await pg.goto(base + '/app/');
  await pg.evaluate(([a, b2, c, exp, t]) => { localStorage['stampbook.v1'] = JSON.stringify({ v: 1, pro: false, teacher: 'Prof. Park', lang: 'en', packs: [
    { id: 'p1', student: 'Slow Sam', total: 10, price: 200, currency: 'USD', start: a, months: 3, expires: exp, paid: true, stamps: [
      { id: 's1', date: a, note: '', kind: '' }, { id: 's2', date: b2, note: '', kind: '' }, { id: 's3', date: c, note: '', kind: '' }] },
    { id: 'p2', student: 'Cara', total: 4, price: 80, currency: 'USD', start: a, months: 3, expires: '', paid: true, stamps: [] }] }); }, [ago(28), ago(14), ago(1), iso(soon)]);
  await pg.reload(); await pg.waitForSelector('.card');
  const sam = pg.locator('section.card', { hasText: 'Slow Sam' });
  assert.ok(await sam.locator('.warnbar', { hasText: 'May not fit' }).count() === 1, 'pace warning shows for a slow pack');
  // excused -> make-up owed -> make-up lesson
  await sam.locator('button', { hasText: 'Excused' }).click();
  await sam.locator('button', { hasText: /Make-up lesson \(1 owed\)/ }).click();
  assert.equal(await sam.locator('button', { hasText: /Make-up lesson/ }).count(), 0, 'owed is paid back');
  await sam.locator('details.log summary').click(); assert.equal(await sam.locator('.tag.t-mk').count(), 1);
  assert.equal(await pg.evaluate(() => JSON.parse(localStorage['stampbook.v1']).packs[0].stamps.filter(s => s.mk).length), 1);
  // insights lists make-ups and pace
  await pg.click('[role=tab]:has-text("Insights")'); await pg.waitForSelector('.ins');
  assert.ok((await pg.locator('.ins').textContent()).includes('No make-ups owed'));
  await pg.click('[role=tab]:has-text("Packs")');
  // receipt
  await pg.locator('section.card', { hasText: 'Cara' }).locator('button', { hasText: 'Receipt' }).click();
  const rc = await pg.evaluate(() => navigator.clipboard.readText()); assert.ok(rc.includes('Cara') && rc.includes('4 lessons') && rc.includes('$20') && rc.includes('Prof. Park'), rc);
  // delete with undo (no confirm dialog)
  pg.on('dialog', d => { errs.push('unexpected dialog'); d.dismiss(); });
  await pg.locator('section.card', { hasText: 'Cara' }).locator('button', { hasText: 'Delete pack' }).click();
  assert.equal(await pg.locator('section.card').count(), 1); await pg.locator('.toast button').click();
  assert.equal(await pg.locator('section.card').count(), 2, 'undo brings the pack back');
  assert.equal(await pg.evaluate(() => JSON.parse(localStorage['stampbook.v1']).packs.length), 2);
  // every language renders the new strings without leftovers
  for (const l of ['ko', 'ja', 'zh', 'es']) { await pg.selectOption('header select', l); assert.ok(!(await pg.locator('#root').textContent()).includes('undefined'), l); }
  console.log(errs.length ? 'ERRORS: ' + errs.join('\n') : 'FEATURES E2E OK'); await b.close(); srv.close(); process.exit(errs.length ? 1 : 0);
})().catch(e => { console.error('FAIL', e); process.exit(1); });
