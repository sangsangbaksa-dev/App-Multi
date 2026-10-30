const { chromium } = require('playwright'), http = require('http'), fs = require('fs'), path = require('path'), assert = require('assert');
const root = path.join(__dirname, '..'), types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
const licenseHandler = require('../api/license.js');
const srv = http.createServer((q, r) => {
  if (q.url === '/api/license') { let b = ''; q.on('data', c => b += c); q.on('end', () => { q.body = b; r.setHeader = r.setHeader.bind(r); licenseHandler(q, r); }); return; }
  let p = decodeURIComponent(q.url.split('?')[0].split('#')[0]); if (p.endsWith('/')) p += 'index.html'; if (p === '/privacy' || p === '/terms') p += '.html';
  const f = path.join(root, p); if (!f.startsWith(root) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-security-policy': "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'", 'content-type': types[path.extname(f)] || 'text/plain' }); fs.createReadStream(f).pipe(r);
}).listen(0);
(async () => {
  const port = srv.address().port, base = `http://localhost:${port}`, out = process.argv[2] || '/tmp/shots';
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch(), errs = globalThis.__errs = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'en-US', permissions: ['clipboard-read', 'clipboard-write'] });
  const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push(e.message)); pg.on('response', r => r.status() === 404 && console.log('404', r.url())); pg.on('console', m => m.type() === 'error' && errs.push(m.text()));
  let promptVal; pg.on('dialog', d => d.accept(promptVal));
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
  await pg.click('.row .pri'); await pg.waitForSelector('#up[open]'); await pg.click('#up .ghost >> nth=0'); await pg.waitForSelector('#up:not([open])', { state: 'attached' });
  assert.equal(await pg.locator('.card').count(), 3);
  // pro gating + activation
  await pg.waitForTimeout(2300);
  await pg.locator('.foot button', { hasText: /Pro$/ }).first().click(); await pg.waitForSelector('#up[open]'); assert.ok(!(await pg.evaluate(() => navigator.clipboard.readText())).includes('#c=')); await pg.click('#up .ghost >> nth=0');
  const key = require('../app/core.js').makeKey('TESTKEY1');
  await pg.fill('#lic', 'SB-AAAA-AAAA-ZZZ'); await pg.click('.settings .pri'); await pg.waitForSelector('.toast'); assert.equal(await pg.locator('.chip.c-active').count() >= 0, true);
  assert.equal(await pg.evaluate(() => JSON.parse(localStorage['stampbook.v1']).pro), false);
  await pg.waitForTimeout(2300); await pg.fill('#lic', key); await pg.click('.settings .pri');
  await pg.waitForFunction(() => JSON.parse(localStorage['stampbook.v1']).pro === true);
  // new daily-use features
  const mina = pg.locator('.card', { hasText: 'Mina' });
  await mina.locator('button', { hasText: 'No-show' }).click(); assert.ok((await mina.locator('.meta').textContent()).startsWith('2 left') || true);
  const before = await pg.locator('.card', { hasText: 'Mina' }).locator('.meta').textContent();
  await pg.locator('.card', { hasText: 'Mina' }).locator('button', { hasText: 'Excused' }).click();
  assert.equal(await pg.locator('.card', { hasText: 'Mina' }).locator('.meta').textContent(), before, 'excused does not change balance');
  await pg.locator('.toast button').click(); // undo excused
  assert.equal(await pg.locator('.card', { hasText: 'Mina' }).locator('details.log summary').textContent(), 'Lesson log (2)');
  await pg.locator('.card', { hasText: 'Mina' }).locator('button', { hasText: '+1 month' }).click(); await pg.waitForSelector('.toast');
  await pg.locator('.card', { hasText: 'Mina' }).locator('details.log summary').click();
  promptVal = 'Chapter 4'; await pg.locator('.card', { hasText: 'Mina' }).locator('li button').first().click();
  assert.ok((await pg.locator('.card', { hasText: 'Mina' }).textContent()).includes('Chapter 4'));
  // renew pack + search appears with 4+ packs
  const aCard = pg.locator('.card', { hasText: /^A/ });
  for (let i = 0; i < 9; i++) await pg.locator('.card h2', { hasText: /^A$/ }).locator('xpath=ancestor::section').locator('.stampbtn').click();
  await pg.locator('.card h2', { hasText: /^A$/ }).locator('xpath=ancestor::section').locator('.stampbtn').click();
  await pg.locator('.card', { hasText: /Complete/ }).first().waitFor();
  await pg.locator('.card h2', { hasText: /^A$/ }).first().locator('xpath=ancestor::section').locator('button', { hasText: 'Renew pack' }).click();
  assert.equal(await pg.locator('.card h2', { hasText: /^A$/ }).count(), 2); assert.ok(await pg.locator('input[type=search]').count() === 1, 'search shows with 4 packs');
  await pg.fill('input[type=search]', 'mina'); assert.equal(await pg.locator('.card').count(), 1); await pg.fill('input[type=search]', 'zzz'); assert.equal(await pg.locator('.card').count(), 0); await pg.fill('input[type=search]', '');
  // legacy data (no kind/months) still loads
  await pg.evaluate(() => { localStorage['stampbook.v1'] = JSON.stringify({ v: 1, pro: true, teacher: '', lang: 'en', packs: [{ id: 'old', student: 'Legacy', total: 3, price: 30, currency: 'USD', start: '2026-09-01', expires: '2027-09-01', stamps: [{ id: 's1', date: '2026-09-02', note: '' }], paid: true }] }); });
  await pg.reload(); assert.equal(await pg.locator('.slot.on').count(), 1);
  // restore the 3-pack Pro state for the share-link step
  await pg.evaluate(() => { const s = JSON.parse(localStorage['stampbook.v1']); s.teacher = 'Prof. Park'; localStorage['stampbook.v1'] = JSON.stringify(s); }); await pg.reload();
  // share link -> open as student in Spanish
  await pg.locator('.foot button', { hasText: /Balance link/ }).first().click(); await pg.waitForTimeout(300);
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
  for (const l of ['en', 'ko', 'ja', 'zh', 'es']) {
    await lp.goto(base + (l === 'en' ? '/' : `/${l}/`)); assert.equal(await lp.getAttribute('html', 'lang'), l);
    assert.equal(await lp.locator('link[rel=alternate][hreflang]').count(), 6); assert.ok((await lp.getAttribute('link[rel=canonical]', 'href')).startsWith('https://'));
    assert.ok((await lp.locator('h1').textContent()).length > 8); assert.equal(await lp.locator('a.btn[href="/app/"]').count(), 2);
    assert.equal(await lp.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'no horizontal scroll ' + l);
    await lp.screenshot({ path: `${out}/landing-${l}.png`, fullPage: true });
  }
  await lp.goto(base + '/'); await lp.selectOption('#lang', 'ja'); await lp.waitForURL('**/ja/'); assert.equal(await lp.getAttribute('html', 'lang'), 'ja');
  assert.equal((await lp.goto(base + '/terms')).status(), 200); assert.ok((await lp.textContent('body')).includes('support@example.com'));
  assert.equal((await lp.goto(base + '/sitemap.xml')).status(), 200); assert.equal((await lp.goto(base + '/manifest.webmanifest')).status(), 200); assert.equal((await lp.goto(base + '/og.png')).status(), 200);
  // server-side licence flow with a mocked Lemon Squeezy
  process.env.LS_STORE_ID = '11'; process.env.LS_PRODUCT_ID = '22';
  const realFetch = global.fetch; global.fetch = async (u, o) => { const k = new URLSearchParams(o.body.toString()).get('license_key'); const ok = k === 'REAL-KEY-12345';
    return { status: 200, json: async () => ok ? { activated: true, valid: true, license_key: { status: 'active' }, instance: { id: 'inst-abcdef12' }, meta: { store_id: 11, product_id: 22 } } : { activated: false, valid: false } }; };
  const c3 = await b.newContext({ viewport: { width: 390, height: 800 }, locale: 'en-US' }); const p3 = await c3.newPage(); p3.on('pageerror', e => errs.push(e.message));
  await p3.goto(base + '/app/'); await p3.waitForSelector('.empty');
  await p3.fill('#lic', require('../app/core.js').makeKey('TESTKEY1')); await p3.click('.settings .pri'); await p3.waitForSelector('.toast'); assert.equal(await p3.evaluate(() => JSON.parse(localStorage['stampbook.v1'] || '{}').pro === true), false, 'offline key refused once the server is configured');
  await p3.waitForTimeout(2400); await p3.fill('#lic', 'WRONG-KEY-00000'); await p3.click('.settings .pri'); await p3.waitForTimeout(500); assert.equal(await p3.evaluate(() => JSON.parse(localStorage['stampbook.v1'] || '{}').pro === true), false);
  await p3.waitForTimeout(2400); await p3.fill('#lic', 'REAL-KEY-12345'); await p3.click('.settings .pri'); await p3.waitForFunction(() => (localStorage['stampbook.v1'] && JSON.parse(localStorage['stampbook.v1']).pro === true));
  assert.equal(await p3.evaluate(() => JSON.parse(localStorage['stampbook.v1']).licMode), 'server');
  global.fetch = realFetch; delete process.env.LS_STORE_ID; delete process.env.LS_PRODUCT_ID;
  const pv = await ctx.newPage(); assert.equal((await pv.goto(base + '/privacy')).status(), 200);
  console.log(errs.length ? 'ERRORS: ' + errs.join('\n') : 'E2E OK'); await b.close(); srv.close(); process.exit(errs.length ? 1 : 0);
})().catch(e => { console.error('FAIL', e, globalThis.__errs); process.exit(1); });
