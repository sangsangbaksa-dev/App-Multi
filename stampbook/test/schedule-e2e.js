/* Playwright check for weekly schedules, the Today list, planned days in the calendar, .ics export and the backup nudge.
   Run: NODE_PATH=$(npm root -g) node test/schedule-e2e.js [shots-dir] */
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
  const C = require('../app/core.js'), today = C.todayStr(), dow = C.parse(today).getDay();
  const old = [0, 1, 2, 3, 4].map(i => ({ id: 's' + i, date: C.addDays(today, -20 - i), note: '', kind: '' }));
  const state = { v: 1, teacher: '', pro: false, lang: '', packs: [{ id: 'a', student: 'Mina', total: 10, price: 500, currency: 'USD', start: C.addDays(today, -30), months: 6, expires: C.addMonths(today, 5), paid: true, stamps: old }] };
  const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'en-US', acceptDownloads: true });
  await ctx.addInitScript(s => { if (!localStorage['stampbook.v1']) localStorage['stampbook.v1'] = s; }, JSON.stringify(state));
  const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push(e.message));
  await pg.goto(base + '/app/'); await pg.waitForSelector('.card');
  assert.equal(await pg.locator('.todaybox').count(), 0, 'nothing scheduled yet');
  assert.equal(await pg.locator('.warnbar').count(), 1, 'backup nudge: 5 stamps, never backed up');
  // ics refuses when nothing is scheduled
  await pg.locator('.settings button', { hasText: '.ics' }).click(); await pg.waitForSelector('.toast');
  assert.ok((await pg.locator('.toast').textContent()).includes('weekly schedule'));
  // set schedule for today's weekday
  await pg.locator('.sched summary').click();
  await pg.locator(`.sched .row button[aria-pressed]`).nth((dow - 0 + 7) % 7).click(); // weekStart is Sunday for en
  await pg.fill('.sched input[type=time]', '18:30'); await pg.click('.sched .pri'); await pg.waitForSelector('.todaybox');
  assert.ok((await pg.locator('.todaybox').textContent()).includes('18:30'));
  assert.deepEqual(await pg.evaluate(() => JSON.parse(localStorage['stampbook.v1']).packs[0].schedule), { days: [dow], time: '18:30' });
  await pg.screenshot({ path: out + '/schedule-en.png', fullPage: true });
  // stamp from the Today list: it leaves the list
  await pg.click('.todaybox .stampbtn'); await pg.waitForFunction(() => !document.querySelector('.todaybox'));
  assert.equal(await pg.locator('.slot.on').count(), 6);
  // calendar shows planned lessons on future same-weekday dates
  await pg.click('.tabs button >> nth=1'); await pg.waitForSelector('.calgrid');
  if (!(await pg.locator('.day.plan').count())) await pg.click('.calhead button >> nth=1'); // planned days may fall in next month
  await pg.waitForSelector('.day.plan');
  await pg.locator('.day.plan').first().click(); assert.ok((await pg.locator('.calday').textContent()).includes('Planned'));
  // ics download
  await pg.click('.tabs button >> nth=0'); await pg.waitForSelector('.card');
  const [dl] = await Promise.all([pg.waitForEvent('download'), pg.locator('.settings button', { hasText: '.ics' }).click()]);
  const ics = fs.readFileSync(await dl.path(), 'utf8'); assert.ok(ics.includes('SUMMARY:Mina') && ics.includes('T183000'));
  // month report copies a recap; preset chip prefills the new-pack form
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: base });
  await pg.locator('.foot button', { hasText: 'Month report' }).click(); await pg.waitForSelector('.toast');
  const rep = await pg.evaluate(() => navigator.clipboard.readText()); assert.ok(rep.startsWith('Mina · ') && rep.includes('left'), rep);
  await pg.click('.row .pri'); await pg.waitForSelector('dialog[open] .presets button');
  await pg.click('dialog .presets button >> nth=0'); assert.equal(await pg.inputValue('#f-total'), '10'); assert.equal(await pg.inputValue('#f-price'), '500');
  await pg.locator('#dlg button', { hasText: 'Cancel' }).click();
  // backup clears the nudge
  await pg.locator('.warnbar button').click(); await pg.waitForFunction(() => !document.querySelector('.warnbar'));
  assert.ok(await pg.evaluate(() => JSON.parse(localStorage['stampbook.v1']).lastBackup > 0));
  console.log(errs.length ? 'ERRORS: ' + errs.join('\n') : 'SCHEDULE E2E OK'); await b.close(); srv.close(); process.exit(errs.length ? 1 : 0);
})().catch(e => { console.error('FAIL', e); process.exit(1); });
