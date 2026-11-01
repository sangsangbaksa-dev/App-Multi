/* Playwright check for the Calendar and Insights tabs. Run: NODE_PATH=$(npm root -g) node test/insights-e2e.js [shots-dir] */
const { chromium } = require('playwright'), http = require('http'), fs = require('fs'), path = require('path'), assert = require('assert');
const root = path.join(__dirname, '..'), types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, r) => {
  let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(root, p); if (!f.startsWith(root) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); r.end(fs.readFileSync(f));
}).listen(0);
(async () => {
  const base = `http://localhost:${srv.address().port}`, out = process.argv[2] || '/tmp/shots', errs = [];
  fs.mkdirSync(out, { recursive: true });
  const C = require('../app/core.js'), today = C.todayStr(), ym = today.slice(0, 7);
  const mkPack = (id, student, dates) => ({ id, student, total: 10, price: 500, currency: 'USD', start: ym + '-01', months: 3, expires: C.addMonths(today, 2), paid: true,
    stamps: dates.map((d, i) => ({ id: id + i, date: d, note: i === 0 ? 'scales' : '', kind: d[0] === '!' ? '' : '' })) });
  const d = (n) => C.addDays(today, -n);
  const state = { v: 1, teacher: '', pro: false, lang: '', packs: [mkPack('a', 'Mina', [d(0), d(7), d(14), d(40)]), mkPack('b', 'Joon', [d(30)])] };
  state.packs[0].stamps[1].kind = 'noshow'; state.packs[0].stamps[2].kind = 'excused';
  const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'en-US' });
  await ctx.addInitScript(s => { if (!localStorage['stampbook.v1']) localStorage['stampbook.v1'] = s; }, JSON.stringify(state));
  const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push(e.message));
  await pg.goto(base + '/app/'); await pg.waitForSelector('.tabs');
  assert.equal(await pg.locator('.card').count() >= 2, true, 'packs tab by default');
  await pg.click('.tabs button >> nth=1'); await pg.waitForSelector('.calgrid');
  assert.equal(await pg.locator('.day:not(.blank)').count(), new Date(+ym.slice(0, 4), +ym.slice(5), 0).getDate());
  assert.equal(await pg.locator('.day.today').count(), 1);
  await pg.click('.day.today'); await pg.waitForSelector('.calday');
  assert.ok((await pg.locator('.calday').textContent()).includes('Mina'));
  await pg.click('.calhead button >> nth=0'); await pg.click('.calhead button >> nth=2'); // back and forth lands on this month
  assert.equal(await pg.locator('.day.today').count(), 1);
  await pg.screenshot({ path: out + '/calendar-en.png', fullPage: true });
  await pg.click('.tabs button >> nth=2'); await pg.waitForSelector('.ins .bars');
  assert.equal(await pg.locator('.bars.wk .bar').count(), 7); assert.equal(await pg.locator('.ins .bar').count(), 13);
  assert.ok((await pg.locator('.ins').textContent()).includes('Joon'));
  await pg.screenshot({ path: out + '/insights-en.png', fullPage: true });
  await pg.selectOption('select', 'ko'); await pg.waitForSelector('.ins .bars');
  assert.ok((await pg.locator('.tabs').textContent()).includes('통계'));
  await pg.screenshot({ path: out + '/insights-ko.png', fullPage: true });
  console.log(errs.length ? 'ERRORS: ' + errs.join('\n') : 'INSIGHTS E2E OK'); await b.close(); srv.close(); process.exit(errs.length ? 1 : 0);
})().catch(e => { console.error('FAIL', e); process.exit(1); });
