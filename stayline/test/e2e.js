const { chromium } = require('playwright'), http = require('http'), fs = require('fs'), path = require('path'), assert = require('assert');
const root = path.join(__dirname, '..'), types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json' };
const srv = http.createServer((q, r) => {
  let p = decodeURIComponent(q.url.split('?')[0].split('#')[0]); if (p.endsWith('/')) p += 'index.html'; if (p === '/privacy') p = '/privacy.html';
  const f = path.join(root, p); if (!f.startsWith(root) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-security-policy': "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'", 'content-type': types[path.extname(f)] || 'text/plain' }); fs.createReadStream(f).pipe(r);
}).listen(0);
const ymd = d => d.toISOString().slice(0, 10), add = (n) => ymd(new Date(Date.now() + n * 864e5));
(async () => {
  const port = srv.address().port, base = `http://localhost:${port}`, out = process.argv[2] || '/tmp/shots';
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch(), errs = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'en-US', timezoneId: 'UTC' });
  const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => m.type() === 'error' && errs.push(m.text()));
  pg.on('dialog', d => d.accept());
  await pg.goto(base + '/app/'); await pg.waitForSelector('.empty');
  await pg.screenshot({ path: out + '/app-empty.png', fullPage: true });
  // create default Schengen counter with an HTML-ish name
  await pg.click('.empty .ghost'); await pg.fill('#f-exp', add(20)); await pg.fill('#f-name', 'Ana <b>x</b>'); await pg.click('dialog button[type=submit]'); await pg.waitForSelector('.board');
  assert.equal(await pg.locator('.tab.on').textContent(), 'Ana <b>x</b>'); assert.equal(await pg.locator('.tab b').count(), 0, 'no HTML injection');
  // add a past trip: 40 days ending 10 days ago -> 40 used, 50 left
  await pg.click('.rowhead .pri'); await pg.fill('#f-place', 'Lisbon'); await pg.fill('#f-from', add(-49)); await pg.fill('#f-to', add(-10)); await pg.click('dialog button[type=submit]');
  await pg.waitForSelector('.trips li');
  assert.equal(await pg.locator('.digits').textContent(), '50'); assert.ok((await pg.locator('.line').textContent()).includes('40 of 90'));
  // bad range rejected
  await pg.click('.rowhead .pri'); await pg.fill('#f-from', add(-1)); await pg.fill('#f-to', add(-5)); await pg.click('dialog button[type=submit]');
  assert.ok((await pg.locator('dialog .err').textContent()).length > 5); await pg.click('dialog .ghost');
  // ongoing trip counts through today
  await pg.click('.rowhead .pri'); await pg.fill('#f-from', add(-4)); await pg.check('#f-on'); await pg.click('dialog button[type=submit]');
  assert.equal(await pg.locator('.digits').textContent(), '45'); assert.ok((await pg.locator('.sub').textContent()).includes('inside'));
  await pg.locator('.rowbtns .ghost:not(.x)').first().click(); // mark left today
  assert.equal(await pg.locator('.digits').textContent(), '45');
  // planner: arrive next month for 60 days is impossible to fit in full; max stay reported
  await pg.fill('#p-arrive', add(30)); await pg.fill('#p-days', '60');
  const planTxt = await pg.locator('#plan-out').textContent(); assert.ok(/up to \d+ days/.test(planTxt), planTxt);
  await pg.reload(); assert.equal(await pg.locator('.digits').textContent(), '45', 'persisted');
  await pg.screenshot({ path: out + '/app-en.png', fullPage: true });
  // permit chip, edit trip, planner permit warning
  assert.ok((await pg.locator('.permit').textContent()).includes('20 days'));
  await pg.locator('.trips li').nth(1).locator('.ghost', { hasText: 'Edit' }).click(); assert.equal(await pg.inputValue('#f-place'), 'Lisbon');
  await pg.fill('#f-place', 'Porto'); await pg.click('dialog button[type=submit]'); await pg.waitForSelector('.trips li:has-text("Porto")');
  assert.equal(await pg.locator('.digits').textContent(), '45');
  await pg.fill('#p-arrive', add(15)); await pg.fill('#p-days', '10'); assert.ok((await pg.locator('#plan-out').textContent()).includes('past your permit'));
  // restore tolerates a malformed file
  await pg.locator('input[type=file]').setInputFiles({ name: 'b.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ trackers: [{ name: 'Z', rule: { kind: 'rolling', limit: 99999 }, trips: [{ from: 'x' }, { from: '2026-01-01', to: '2026-01-02' }] }] })) });
  await pg.waitForSelector('.tab:has-text("Z")'); assert.equal(await pg.locator('.trips li').count(), 1);
  await pg.evaluate(() => { localStorage.clear(); }); await pg.reload(); await pg.waitForSelector('.empty');
  await pg.click('.empty .pri'); await pg.waitForSelector('.board'); assert.equal(await pg.locator('.digits').textContent(), '90', 'quick start');
  await pg.click('.rowhead .pri'); await pg.fill('#f-from', add(-49)); await pg.fill('#f-to', add(-10)); await pg.click('dialog button[type=submit]'); await pg.waitForSelector('.trips li');
  // free limit: 2nd counter blocked
  await pg.click('.tab.add'); await pg.waitForSelector('dialog a.pri'); assert.ok((await pg.locator('dialog h2').textContent()).includes('free limit')); await pg.keyboard.press('Escape'); await pg.waitForSelector('dialog', { state: 'detached' });
  // pro gating
  await pg.waitForTimeout(2300);
  await pg.click('text=CSV (Pro)'); assert.ok((await pg.locator('.toast').last().textContent()).includes('Pro'));
  await pg.waitForTimeout(2300);
  await pg.fill('#lic', 'SL-AAAA-AAAA-ZZZ'); await pg.click('.settings .pri'); assert.equal(await pg.evaluate(() => JSON.parse(localStorage['stayline.v1']).pro), false);
  await pg.waitForTimeout(2300);
  await pg.fill('#lic', require('../app/core.js').makeKey('TESTKEY1')); await pg.click('.settings .pri');
  await pg.waitForFunction(() => JSON.parse(localStorage['stayline.v1']).pro === true);
  // 2nd counter with a year rule now allowed
  await pg.click('.tab.add'); await pg.selectOption('#f-rule', 'tax183'); await pg.click('dialog button[type=submit]'); await pg.waitForSelector('.tab >> nth=1');
  assert.equal(await pg.locator('.digits').textContent(), '183');
  // custom rolling rule form shows window field
  await pg.click('.tab.add'); await pg.selectOption('#f-rule', 'custom'); assert.equal(await pg.locator('#f-winl').isVisible(), true); await pg.click('dialog .ghost');
  // csv + backup downloads
  const [dl] = await Promise.all([pg.waitForEvent('download'), pg.click('text=CSV (Pro)')]); assert.equal(dl.suggestedFilename(), 'stayline.csv');
  const [bk] = await Promise.all([pg.waitForEvent('download'), pg.click('text=Back up')]); const data = JSON.parse(fs.readFileSync(await bk.path(), 'utf8')); assert.equal(data.trackers.length, 2);
  // over-limit state
  await pg.click('.tab >> nth=0'); await pg.click('.rowhead .pri'); await pg.fill('#f-from', add(-100)); await pg.fill('#f-to', add(-50)); await pg.click('dialog button[type=submit]');
  assert.ok((await pg.locator('.board').getAttribute('class')).includes('st-over')); assert.ok((await pg.locator('.line').textContent()).includes('Over the limit'));
  await pg.screenshot({ path: out + '/app-over.png', fullPage: true });
  // languages
  for (const l of ['ko', 'ja', 'zh', 'es']) { await pg.selectOption('header select', l); await pg.waitForTimeout(100); await pg.screenshot({ path: `${out}/app-${l}.png`, fullPage: true }); }
  assert.equal(await pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'app: no horizontal scroll');
  // landing
  const lp = await ctx.newPage(); lp.on('pageerror', e => errs.push(e.message)); lp.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await lp.goto(base + '/'); for (const l of ['en', 'ko', 'ja', 'zh', 'es']) { await lp.selectOption('#lang', l); await lp.screenshot({ path: `${out}/landing-${l}.png`, fullPage: true }); }
  assert.equal(await lp.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'landing: no horizontal scroll');
  assert.equal(await lp.evaluate(() => [...document.querySelectorAll('[data-i]')].filter(e => !e.textContent.trim()).length), 0, 'every landing slot filled');
  const pv = await ctx.newPage(); assert.equal((await pv.goto(base + '/privacy')).status(), 200);
  console.log(errs.length ? 'ERRORS: ' + errs.join('\n') : 'E2E OK'); await b.close(); srv.close(); process.exit(errs.length ? 1 : 0);
})().catch(e => { console.error('FAIL', e); process.exit(1); });
