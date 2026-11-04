// Browser check for "Stamp all", "Copy list" and moving a lesson date. Run: NODE_PATH=$(npm root -g) node test/lesson-tools-e2e.js
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
  pg.on('dialog', d => d.accept(d.type() === 'prompt' ? (globalThis.__answer || '') : undefined));
  const today = new Date(), iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const dow = today.getDay(), ago = n => { const d = new Date(today); d.setDate(d.getDate() - n); return iso(d); };
  const exp = new Date(today); exp.setMonth(exp.getMonth() + 3);
  await pg.goto(base + '/app/');
  await pg.evaluate(([dw, st, ex]) => { localStorage['stampbook.v1'] = JSON.stringify({ v: 1, pro: true, teacher: '', lang: 'en', packs: [
    { id: 'a', student: 'Ann', total: 10, price: 100, currency: 'USD', start: st, months: 3, expires: ex, paid: true, schedule: { days: [dw], time: '18:00' }, stamps: [{ id: 'x1', date: st, note: 'ch1', kind: '' }] },
    { id: 'b', student: 'Ben', total: 10, price: 100, currency: 'USD', start: st, months: 3, expires: ex, paid: true, schedule: { days: [dw], time: '09:30' }, stamps: [] }] }); }, [dow, ago(30), iso(exp)]);
  await pg.reload(); await pg.waitForSelector('.todaybox');
  // copy list
  await pg.locator('.todaybox button', { hasText: 'Copy list' }).click();
  const copied = await pg.evaluate(() => navigator.clipboard.readText());
  assert.equal(copied, '09:30  Ben\n18:00  Ann');
  // stamp all today
  await pg.locator('.todaybox button', { hasText: 'Stamp all' }).click();
  await pg.waitForSelector('.toast');
  const counts = await pg.evaluate(() => { const d = JSON.parse(localStorage['stampbook.v1']); return d.packs.map(p => p.stamps.length); });
  assert.deepEqual(counts, [2, 1], 'both scheduled lessons stamped once');
  assert.equal(await pg.locator('.todaybox').count(), 0, 'today list is empty once stamped');
  // move Ann's first lesson to another day via the history log
  globalThis.__answer = iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 3));
  const ann = pg.locator('section.card[aria-label="Ann"]');
  await ann.locator('details.log summary').click();
  await ann.locator('button', { hasText: 'Move' }).first().click();
  await pg.waitForTimeout(200);
  const moved = await pg.evaluate(() => JSON.parse(localStorage['stampbook.v1']).packs[0].stamps.map(s => s.date).sort());
  assert.ok(moved.includes(globalThis.__answer), 'lesson now dated ' + globalThis.__answer + ' in ' + moved);
  assert.equal(moved.length, 2);
  assert.ok(await pg.evaluate(() => JSON.parse(localStorage['stampbook.v1']).packs[0].stamps.some(s => s.note === 'ch1')), 'note kept after move');
  assert.deepEqual(errs, [], 'no page errors');
  console.log('LESSON TOOLS E2E OK');
  await b.close(); srv.close(); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
