const { chromium } = require('playwright'), http = require('http'), fs = require('fs'), path = require('path'), assert = require('assert');
const root = path.join(__dirname, '..'), types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, r) => {
  let p = decodeURIComponent(q.url.split('?')[0].split('#')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(root, p); if (!f.startsWith(root) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[path.extname(f)] || 'text/plain' }); fs.createReadStream(f).pipe(r);
}).listen(0);
(async () => {
  const base = `http://localhost:${srv.address().port}`, b = await chromium.launch(), errs = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'en-US' });
  const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push(e.message));
  await pg.addInitScript(() => { window.print = () => {}; }); // headless: capture the text instead of opening the print dialog
  await pg.goto(base + '/app/');
  await pg.evaluate(() => { localStorage['stampbook.v1'] = JSON.stringify({ v: 1, pro: true, teacher: '', lang: 'en', packs: [
    { id: 'a', student: 'Mina', total: 5, price: 250, currency: 'USD', start: '2026-10-01', expires: '2027-01-01', stamps: [{ id: 's1', date: '2026-10-05', note: 'Chapter 2' }, { id: 's2', date: '2026-10-12', note: '', kind: 'noshow' }], paid: true },
    { id: 'b', student: 'mina ', total: 3, price: 90, currency: 'USD', start: '2026-11-01', expires: '', stamps: [], paid: false }] }); });
  await pg.reload(); await pg.waitForSelector('.card');
  await pg.locator('.card button', { hasText: 'Save as PDF' }).first().click();
  const txt = await pg.evaluate(() => document.getElementById('print-receipt').textContent);
  assert.ok(txt.includes('Activity report: Mina'), txt);
  assert.ok(txt.includes('2026-10-05 Chapter 2') && txt.includes('[No-show]'), txt);
  assert.ok(txt.includes('Lessons used: 2 / 5') && txt.includes('unpaid'), txt);
  assert.ok(txt.includes('Total paid: $250'), txt);
  console.log(errs.length ? 'ERRORS: ' + errs.join('\n') : 'PDF E2E OK'); await b.close(); srv.close(); process.exit(errs.length ? 1 : 0);
})().catch(e => { console.error('FAIL', e); process.exit(1); });
