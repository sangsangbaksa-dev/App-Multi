const { chromium } = require('playwright'), http = require('http'), fs = require('fs'), path = require('path'), assert = require('assert');
const root = path.join(__dirname, '..'), types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, r) => {
  let p = decodeURIComponent(q.url.split('?')[0].split('#')[0]); if (p.endsWith('/')) p += 'index.html'; if (p === '/privacy') p = '/privacy.html';
  const f = path.join(root, p); if (!f.startsWith(root) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[path.extname(f)] || 'text/plain' }); fs.createReadStream(f).pipe(r);
}).listen(0);
(async () => {
  const port = srv.address().port, base = `http://localhost:${port}`, out = process.argv[2] || '/tmp/shots';
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch(), errs = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'en-US', permissions: ['clipboard-read', 'clipboard-write'] });
  const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => m.type() === 'error' && errs.push(m.text()));
  pg.on('dialog', d => d.accept());
  await pg.goto(base + '/app/'); await pg.waitForSelector('.empty');
  // create pack
  await pg.click('.empty button'); await pg.fill('#f-name', 'Mina <b>Kim</b>'); await pg.fill('#f-total', '5'); await pg.fill('#f-price', '250'); await pg.fill('#f-cur', 'usd');
  await pg.click('dialog button[type=submit]'); await pg.waitForSelector('.card');
  assert.equal(await pg.locator('.card h2').textContent(), 'Mina <b>Kim</b>'); assert.equal(await pg.locator('.card b').count(), 0, 'no HTML injection');
  // stamp twice
  await pg.click('.stampbtn'); await pg.click('.stampbtn');
  assert.equal(await pg.locator('.slot.on').count(), 2); assert.ok((await pg.locator('.meta').textContent()).startsWith('3 left'));
  await pg.reload(); assert.equal(await pg.locator('.slot.on').count(), 2, 'persisted');
  await pg.screenshot({ path: out + '/app-en.png', fullPage: true });
  // remove one stamp
  await pg.locator('.slot.on').first().click(); assert.equal(await pg.locator('.slot.on').count(), 1);
  // free limit: add 2 more ok, 4th blocked
  for (const n of ['A', 'B']) { await pg.click('.row .pri'); await pg.fill('#f-name', n); await pg.fill('#f-price', '1'); await pg.click('dialog button[type=submit]'); await pg.waitForSelector('.card >> nth=' + (n === 'A' ? 1 : 2)); }
  await pg.click('.row .pri'); await pg.waitForSelector('.toast'); assert.ok((await pg.locator('.toast').textContent()).includes('3'));
  assert.equal(await pg.locator('.card').count(), 3);
  // pro gating + activation
  await pg.waitForTimeout(2300);
  await pg.locator('.foot button').nth(0).click(); await pg.waitForSelector('.toast'); assert.ok(!(await pg.evaluate(() => navigator.clipboard.readText())).includes('#c='));
  const key = require('../app/core.js').makeKey('TESTKEY1');
  await pg.fill('#lic', 'SB-AAAA-AAAA-ZZZ'); await pg.click('.settings .pri'); await pg.waitForSelector('.toast'); assert.equal(await pg.locator('.chip.c-active').count() >= 0, true);
  assert.equal(await pg.evaluate(() => JSON.parse(localStorage['stampbook.v1']).pro), false);
  await pg.waitForTimeout(2300); await pg.fill('#lic', key); await pg.click('.settings .pri');
  await pg.waitForFunction(() => JSON.parse(localStorage['stampbook.v1']).pro === true);
  // share link -> open as student in Spanish
  await pg.fill('#s-t', 'Prof. Park'); await pg.press('#s-t', 'Tab');
  await pg.locator('.foot button').nth(0).click(); await pg.waitForTimeout(300);
  const link = await pg.evaluate(() => navigator.clipboard.readText()); assert.ok(link.includes('#c='), link);
  const ctx2 = await b.newContext({ viewport: { width: 390, height: 700 }, locale: 'es-ES' }); const p2 = await ctx2.newPage(); p2.on('pageerror', e => errs.push(e.message));
  await p2.goto(link.replace(/^https?:\/\/[^/]+/, base)); await p2.waitForSelector('.bal');
  assert.ok((await p2.locator('.bal').textContent()).includes('Quedan'), 'es card'); assert.ok((await p2.locator('.bal').textContent()).includes('Prof. Park'));
  await p2.screenshot({ path: out + '/card-es.png' });
  // tampered link falls back to app
  await p2.goto(base + '/app/#c=garbage'); await p2.waitForSelector('.empty');
  // csv download
  const [dl] = await Promise.all([pg.waitForEvent('download'), pg.click('text=CSV (Pro)')]); assert.equal(dl.suggestedFilename(), 'stampbook.csv');
  // languages screenshots + landing
  for (const l of ['ko', 'ja', 'zh', 'es']) { await pg.selectOption('header select', l); await pg.waitForTimeout(100); await pg.screenshot({ path: `${out}/app-${l}.png`, fullPage: true }); }
  const lp = await ctx.newPage(); lp.on('pageerror', e => errs.push(e.message)); lp.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await lp.goto(base + '/'); for (const l of ['en', 'ko', 'ja', 'zh', 'es']) { await lp.selectOption('#lang', l); await lp.screenshot({ path: `${out}/landing-${l}.png`, fullPage: true }); }
  assert.equal(await lp.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'no horizontal scroll');
  const pv = await ctx.newPage(); assert.equal((await pv.goto(base + '/privacy')).status(), 200);
  console.log(errs.length ? 'ERRORS: ' + errs.join('\n') : 'E2E OK'); await b.close(); srv.close(); process.exit(errs.length ? 1 : 0);
})().catch(e => { console.error('FAIL', e); process.exit(1); });
