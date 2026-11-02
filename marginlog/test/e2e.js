/* Browser test: node test/e2e.js [shots-dir]  (needs Playwright + Chromium) */
const { chromium } = require('playwright'), http = require('http'), fs = require('fs'), path = require('path'), assert = require('assert');
const root = path.join(__dirname, '..'), types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png' };
const srv = http.createServer((q, r) => {
  let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = path.join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-security-policy': "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; img-src 'self' data: blob:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'", 'content-type': types[path.extname(f)] || 'text/plain' }); fs.createReadStream(f).pipe(r);
}).listen(0);
const pad = n => String(n).padStart(2, '0'), stamp = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const ago = (days, h = 22, m = 30) => { const d = new Date(); d.setDate(d.getDate() - days); d.setHours(h, m, 0, 0); return stamp(d); };
(async () => {
  const base = `http://localhost:${srv.address().port}`, out = process.argv[2] || '/tmp/ml-shots'; fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch(), errs = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'en-US', timezoneId: 'UTC', permissions: ['clipboard-read', 'clipboard-write'], acceptDownloads: true });
  const pg = await ctx.newPage(); pg.on('pageerror', e => { console.log('PAGEERR', e.message); errs.push(e.message); }); pg.on('console', m => m.type() === 'error' && errs.push(m.text()));
  const log = async (o) => {
    await pg.click('[data-act=log]'); await pg.fill('#e-at', o.at); await pg.fill('#e-text', o.text);
    if (o.sev) await pg.check(`input[name=sev][value="${o.sev}"]`, { force: true });
    if (o.dur) await pg.fill('#e-dur', String(o.dur)); if (o.tags) await pg.fill('#e-tags', o.tags); if (o.wit) await pg.fill('#e-wit', o.wit);
    await pg.click('dialog button[type=submit]'); await pg.waitForSelector('dialog', { state: 'detached' });
  };
  // empty state
  await pg.goto(base + '/app/'); await pg.waitForSelector('.empty .kind'); await pg.screenshot({ path: out + '/01-empty.png' });
  assert.equal(await pg.locator('.kind').count(), 5);
  // create case (noise preset turns quiet hours on)
  await pg.click('.kind[data-kind=noise]'); assert.ok(await pg.isChecked('#c-qon'));
  await pg.click('dialog button[type=submit]'); assert.ok((await pg.locator('dialog .err').textContent()).length > 3, 'name required');
  await pg.fill('#c-name', 'Flat <b>3B</b> noise'); await pg.fill('#c-who', 'Upstairs'); await pg.click('dialog button[type=submit]');
  await pg.waitForSelector('.hero'); assert.equal(await pg.locator('.caserow option:checked').textContent(), 'Flat <b>3B</b> noise'); assert.equal(await pg.locator('.caserow b').count(), 0, 'no HTML injection');
  assert.ok((await pg.locator('.big').textContent()).includes('Nothing logged')); assert.ok((await pg.locator('.logempty, .empty.small').first().textContent()).includes('No incidents'));
  // validation
  await pg.click('[data-act=log]'); await pg.fill('#e-text', 'x'); await pg.click('dialog button[type=submit]'); assert.ok((await pg.locator('dialog .err').textContent()).length > 3);
  const future = new Date(Date.now() + 36e5 * 5); await pg.fill('#e-at', stamp(future)); await pg.fill('#e-text', 'long enough text'); await pg.click('dialog button[type=submit]'); assert.ok((await pg.locator('dialog .err').textContent()).includes('future'));
  await pg.fill('#e-at', ago(1)); await pg.fill('#e-dur', '99999'); await pg.click('dialog button[type=submit]'); assert.ok((await pg.locator('dialog .err').textContent()).includes('14400'));
  await pg.click('dialog [data-close]'); await pg.waitForSelector('dialog', { state: 'detached' });
  // entries (several, to build a pattern)
  await log({ at: ago(1), text: 'Loud bass music from upstairs, windows shaking <script>alert(1)</script>', sev: 4, dur: 90, tags: 'bass, music', wit: 'Partner' });
  assert.equal(await pg.locator('.entry').count(), 1); assert.equal(await pg.locator('.entry script').count(), 0); assert.ok((await pg.locator('.digits').textContent()) === '1');
  await log({ at: ago(3, 23, 10), text: 'Stomping and shouting after midnight again', sev: 3, dur: 40, tags: 'voices' });
  await log({ at: ago(8, 22, 45), text: 'Party noise with a crowd in the stairwell', sev: 5, dur: 180, tags: 'party' });
  await log({ at: ago(15, 14, 0), text: 'Drilling during the afternoon on a Sunday', sev: 2 });
  assert.equal(await pg.locator('.entry').count(), 4); assert.ok((await pg.locator('.sugg').textContent()).length > 10);
  await pg.screenshot({ path: out + '/02-log.png', fullPage: true });
  // tag suggestion button + live timer
  await pg.click('[data-act=livestart]'); await pg.waitForSelector('#live-clock'); await pg.waitForTimeout(1200); assert.notEqual(await pg.locator('#live-clock').textContent(), '00:00');
  await pg.reload(); await pg.waitForSelector('#live-clock'); // survives reload
  await pg.click('[data-act=livestop]'); assert.ok(Number(await pg.inputValue('#e-dur')) >= 1); await pg.click('[data-tagadd=bass]'); assert.equal(await pg.inputValue('#e-tags'), 'bass');
  await pg.fill('#e-text', 'Started the timer while the music was on'); await pg.click('dialog button[type=submit]'); await pg.waitForSelector('dialog', { state: 'detached' });
  assert.equal(await pg.locator('#live-clock').count(), 0, 'live cleared'); assert.equal(await pg.locator('.entry').count(), 5);
  // filters
  await pg.fill('#fq', 'stomping'); assert.equal(await pg.locator('.entry').count(), 1); assert.equal(await pg.inputValue('#fq'), 'stomping'); await pg.fill('#fq', 'zzzz'); assert.ok((await pg.locator('.empty').textContent()).includes('No entries')); await pg.click('[data-act=clearf]'); assert.equal(await pg.locator('.entry').count(), 5);
  await pg.selectOption('#fsev', '4'); assert.equal(await pg.locator('.entry').count(), 2); await pg.selectOption('#fsev', '0'); await pg.selectOption('#ftag', 'party'); assert.equal(await pg.locator('.entry').count(), 1); await pg.selectOption('#ftag', '');
  // note + void
  await pg.locator('.entry [data-act=note]').first().click(); await pg.fill('#n-text', 'Neighbour admitted it'); await pg.click('dialog button[type=submit]'); await pg.waitForSelector('dialog', { state: 'detached' }); assert.ok((await pg.locator('.note').first().textContent()).includes('Neighbour admitted'));
  await pg.locator('.entry [data-act=void]').last().click(); await pg.click('dialog button[type=submit]'); assert.ok((await pg.locator('dialog .err').textContent()).length > 3); await pg.fill('#v-text', 'Wrong date'); await pg.click('dialog button[type=submit]'); await pg.waitForSelector('dialog', { state: 'detached' });
  assert.equal(await pg.locator('.entry').count(), 4); await pg.check('#fvoid'); assert.equal(await pg.locator('.entry.voided').count(), 1); await pg.uncheck('#fvoid');
  await log({ at: ago(5, 23, 5), text: 'Late night noise again from the same flat' });
  // patterns
  await pg.click('#tab-patterns'); await pg.waitForSelector('.hm'); assert.ok((await pg.locator('.insight').textContent()).includes('%')); assert.equal(await pg.locator('.hmrow i.hc').count(), 7 * 24); await pg.screenshot({ path: out + '/03-patterns.png', fullPage: true });
  // steps
  await pg.click('#tab-steps'); assert.equal(await pg.locator('.ladder li').count(), 5);
  const due = new Date(Date.now() - 864e5 * 2); await pg.click('.ladder li >> nth=1 >> button');
  await pg.fill('#s-note', 'Letter under the door'); await pg.fill('#s-due', `${due.getFullYear()}-${pad(due.getMonth() + 1)}-${pad(due.getDate())}`);
  await pg.fill('#s-at', `${due.getFullYear()}-${pad(due.getMonth() + 1)}-${pad(due.getDate() - (due.getDate() > 1 ? 1 : 0))}`); await pg.click('dialog button[type=submit]'); await pg.waitForSelector('.steps li');
  assert.ok((await pg.locator('.sugg').textContent()).toLowerCase().includes('answered by')); assert.ok((await pg.locator('.steps .pill.warn').textContent()).includes('overdue'));
  await pg.click('.steps [data-act=stepdel]'); assert.equal(await pg.locator('.steps li').count(), 0); await pg.click('#toast-act'); assert.equal(await pg.locator('.steps li').count(), 1, 'undo restores step');
  await pg.screenshot({ path: out + '/04-steps.png', fullPage: true });
  // report + seal
  await pg.click('#tab-report'); await pg.waitForFunction(() => document.querySelector('#chainline').classList.contains('good')); const rep = await pg.textContent('#repview');
  assert.ok(rep.includes('# Flat <b>3B</b> noise') && rep.includes('Seal intact') && rep.includes('Timeline')); assert.ok(rep.includes('VOIDED') && rep.includes('Wrong date'), 'voided entry kept in report');
  await pg.click('[data-act=copyrep]'); assert.ok((await pg.evaluate(() => navigator.clipboard.readText())).includes('Seal intact'));
  const [dl] = await Promise.all([pg.waitForEvent('download'), pg.click('[data-act=dlcsv]')]); assert.ok(dl.suggestedFilename().endsWith('.csv'));
  await pg.screenshot({ path: out + '/05-report.png', fullPage: true });
  // tamper: change stored text outside the app -> seal must break
  await pg.evaluate(() => { const d = JSON.parse(localStorage.getItem('marginlog:v1')); d.cases[0].entries[0].text = 'Quietly rewritten'; localStorage.setItem('marginlog:v1', JSON.stringify(d)); });
  await pg.reload(); await pg.click('#tab-report'); await pg.waitForFunction(() => document.querySelector('#chainline').classList.contains('bad')); assert.ok((await pg.textContent('#chainline')).includes('record 1')); assert.ok((await pg.textContent('#repview')).includes('Seal check failed'));
  await pg.screenshot({ path: out + '/06-tampered.png', fullPage: true });
  await pg.evaluate(() => { const d = JSON.parse(localStorage.getItem('marginlog:v1')); d.cases[0].entries[0].text = 'Loud bass music from upstairs, windows shaking <script>alert(1)</script>'; localStorage.setItem('marginlog:v1', JSON.stringify(d)); });
  // tail truncation is caught by the checkpoint
  const saved = await pg.evaluate(() => localStorage.getItem('marginlog:v1'));
  await pg.evaluate(() => { const d = JSON.parse(localStorage.getItem('marginlog:v1')); d.cases[0].entries.pop(); localStorage.setItem('marginlog:v1', JSON.stringify(d)); });
  await pg.reload(); await pg.click('#tab-report'); await pg.waitForFunction(() => document.querySelector('#chainline').classList.contains('bad')); assert.ok((await pg.textContent('#chainline')).includes('missing'));
  await pg.selectOption('#lang', 'ko'); await pg.selectOption('#lang', 'en'); await pg.click('#tab-report'); await pg.waitForFunction(() => document.querySelector('#chainline').classList.contains('bad')); assert.ok((await pg.textContent('#chainline')).includes('missing'), 'unrelated save must not re-baseline the checkpoint');
  await pg.evaluate(s => localStorage.setItem('marginlog:v1', s), saved);
  // photo: attach, hash sealed, survives reload
  await pg.reload(); await pg.click('[data-act=log]');
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR4nGP4z8Dwn+E/A8N/BgYGAB8UBAH8bX0xAAAAAElFTkSuQmCC', 'base64'); fs.writeFileSync(out + '/p.png', png);
  await pg.fill('#e-at', ago(0, 8, 0)); await pg.fill('#e-text', 'Photo of the scuffed ceiling after the stomping'); await pg.setInputFiles('#e-ph', out + '/p.png'); await pg.waitForSelector('#e-phl img');
  await pg.click('dialog button[type=submit]'); await pg.waitForSelector('dialog', { state: 'detached' }); await pg.waitForFunction(() => { const i = document.querySelector('.entry .thumb img'); return i && i.src.startsWith('data:image/jpeg'); });
  await pg.reload(); await pg.waitForFunction(() => { const i = document.querySelector('.entry .thumb img'); return i && i.src.startsWith('data:image/jpeg'); });
  await pg.click('.entry .thumb'); await pg.waitForSelector('.big-ph', { state: 'visible' }); await pg.click('dialog [data-close]');
  await pg.click('#tab-report'); await pg.waitForFunction(() => document.querySelector('#chainline').classList.contains('good')); assert.equal(await pg.locator('#repphotos img').count(), 1);
  // backup + restore into a fresh context
  await pg.click('[data-act=data]'); const [bk] = await Promise.all([pg.waitForEvent('download'), pg.click('#d-exp')]); const bkPath = out + '/backup.json'; await bk.saveAs(bkPath); await pg.click('dialog [data-close]');
  const ctx2 = await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'ko-KR' }); const p2 = await ctx2.newPage(); p2.on('pageerror', e => errs.push(e.message));
  await p2.goto(base + '/app/'); await p2.waitForSelector('.empty'); assert.equal(await p2.locator('html').getAttribute('lang'), 'ko', 'browser language picked');
  await p2.click('[data-act=data]'); await p2.setInputFiles('#d-imp', bkPath); await p2.waitForSelector('.hero'); assert.ok((await p2.locator('.entry').count()) >= 5);
  await p2.waitForFunction(() => { const i = document.querySelector('.entry .thumb img'); return i && i.src.startsWith('data:image'); });
  await p2.screenshot({ path: out + '/07-ko.png', fullPage: true });
  // bad backup is rejected
  fs.writeFileSync(out + '/bad.json', '{"nope":1}'); await p2.click('[data-act=data]'); await p2.setInputFiles('#d-imp', out + '/bad.json'); await p2.waitForSelector('dialog .err:not([hidden])'); await p2.click('dialog [data-close]');
  // language switch on first page, all 5 render the same screen without raw keys
  for (const l of ['ko', 'ja', 'zh', 'es', 'en']) { await pg.selectOption('#lang', l); const txt = await pg.textContent('body'); assert.ok(!/\b(tab_|sg_|kind_|stepHint_)/.test(txt), l + ' raw key'); assert.equal(await pg.locator('html').getAttribute('lang'), l); }
  // delete case + undo
  await pg.click('#tab-case'); await pg.click('[data-act=delcase]'); await pg.click('dialog button[type=submit]'); await pg.waitForSelector('.empty .kind'); await pg.click('#toast-act'); await pg.waitForSelector('.hero');
  // archive keeps the case reachable
  await pg.click('[data-act=newcase][data-kind=""]'); await pg.fill('#c-name', 'Second'); await pg.click('dialog button[type=submit]'); await pg.waitForSelector('.hero');
  await pg.click('#tab-case'); await pg.click('[data-act=archive]'); assert.ok((await pg.locator('#casesel option:checked').textContent()).includes('Second'));
  await pg.selectOption('#casesel', { index: 0 }); await pg.click('#tab-case'); await pg.click('[data-act=archive]');
  await pg.selectOption('#casesel', { label: 'Second (archived)' }).catch(() => {}); 
  // landing pages render
  for (const l of ['', 'ko/', 'ja/', 'zh/', 'es/']) { const r = await pg.goto(base + '/' + l); assert.equal(r.status(), 200); assert.ok(await pg.locator('h1').count() === 1 && await pg.locator('a.cta').count() === 1, l); }
  await pg.goto(base + '/'); await pg.screenshot({ path: out + '/08-landing.png', fullPage: true });
  assert.deepEqual(errs, [], 'console/page errors');
  await b.close(); srv.close(); console.log('e2e ok');
})().catch(e => { console.error(e); process.exit(1); });
