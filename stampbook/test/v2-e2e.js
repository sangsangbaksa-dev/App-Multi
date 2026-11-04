// Browser check for v2 features: next lesson line, progress bar, duplicate, skip dates, sort by name, duplicate-stamp warning, student suggestions.
// Run: NODE_PATH=$(npm root -g) node test/v2-e2e.js
const { chromium } = require('playwright'), http = require('http'), fs = require('fs'), path = require('path'), assert = require('assert');
const root = path.join(__dirname, '..'), types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const srv = http.createServer((q, r) => {
  let p = decodeURIComponent(q.url.split('?')[0].split('#')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(root, p); if (!f.startsWith(root) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[path.extname(f)] || 'text/plain' }); fs.createReadStream(f).pipe(r);
}).listen(0);
(async () => {
  const base = `http://localhost:${srv.address().port}`, b = await chromium.launch(), errs = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'en-US', permissions: ['clipboard-read', 'clipboard-write'] });
  const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => m.type() === 'error' && errs.push(m.text()));
  globalThis.__answer = '';
  pg.on('dialog', d => d.accept(d.type() === 'prompt' ? globalThis.__answer : undefined));
  const today = new Date(), iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const ago = n => { const d = new Date(today); d.setDate(d.getDate() - n); return iso(d); };
  const exp = new Date(today); exp.setMonth(exp.getMonth() + 3);
  await pg.goto(base + '/app/');
  await pg.evaluate(([st, ex]) => { localStorage['stampbook.v1'] = JSON.stringify({ v: 1, pro: true, teacher: '', lang: 'en', packs: [
    { id: 'z', student: 'Zed', total: 4, price: 80, currency: 'USD', start: st, months: 3, expires: ex, paid: true, stamps: [{ id: 'a1', date: st, note: '', kind: '' }, { id: 'a2', date: st, note: '', kind: '' }] },
    { id: 'a', student: 'Ann', total: 10, price: 100, currency: 'USD', start: st, months: 3, expires: ex, paid: true, schedule: { days: [1, 2, 3, 4, 5, 6, 0], time: '' }, stamps: [{ id: 'b1', date: st, note: '', kind: '' }] }] }); }, [ago(20), iso(exp)]);
  await pg.reload(); await pg.waitForSelector('section.card');
  // progress bar and next lesson line
  const ann = pg.locator('section.card[aria-label="Ann"]');
  assert.equal(await ann.locator('.pctbar').getAttribute('aria-valuenow'), '10');
  assert.ok((await ann.textContent()).includes('Next:'), 'next lesson line shown');
  // duplicate warning on Insights (Zed has a date stamped twice)
  await pg.locator('[role=tab]').nth(2).click();
  assert.ok((await pg.locator('.warnbar').allTextContents()).some(t => t.includes('stamped twice')), 'duplicate warning');
  await pg.locator('[role=tab]').nth(0).click();
  // sort by name toggles
  await pg.locator('button', { hasText: 'Sort by name' }).click();
  assert.equal(await pg.locator('section.card').first().getAttribute('aria-label'), 'Ann');
  await pg.locator('button', { hasText: 'Sort by status' }).click();
  // duplicate Ann
  await ann.locator('button', { hasText: 'Duplicate' }).click(); await pg.waitForTimeout(150);
  assert.equal(await pg.locator('section.card[aria-label="Ann"]').count(), 2, 'duplicate created');
  // skip dates on Ann (schedule every day): skip the next two days
  globalThis.__answer = iso(new Date(today.getTime() + 86400000)) + ' ' + iso(new Date(today.getTime() + 2 * 86400000));
  await pg.locator('section.card[aria-label="Ann"]').first().locator('button', { hasText: 'Skip dates' }).click(); await pg.waitForTimeout(150);
  const skips = await pg.evaluate(() => JSON.parse(localStorage['stampbook.v1']).packs.map(p => (p.schedule && p.schedule.skip || []).length));
  assert.ok(skips.includes(2), 'two dates skipped on the pack that was used: ' + skips);
  // export button and student suggestions in the new-pack dialog
  assert.ok(await pg.locator('button', { hasText: 'Export this pack' }).count() >= 1);
  assert.ok(await pg.locator('#f-names option').count() === 2, 'two known students offered');
  assert.deepEqual(errs, [], 'no page errors');
  console.log('V2 E2E OK');
  await b.close(); srv.close(); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
