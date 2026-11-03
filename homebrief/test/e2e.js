/* Browser test: serves the built site plus /api backed by lib/core.js with a fake Lemon Squeezy and a fake AI.
   NODE_PATH=$(npm root -g) node test/e2e.js [screenshot-dir]   (run `node scripts/build.js --dist` first) */
const http = require('http'), fs = require('fs'), path = require('path'), assert = require('assert');
const { chromium } = require('playwright'), core = require('../lib/core.js');
const dist = path.join(__dirname, '..', 'dist'), shots = process.argv[2];
const kv = new Map(), env = { HB_KV: { get: async k => kv.get(k) || null, put: async (k, v) => kv.set(k, v) }, LEMONSQUEEZY_PRODUCT_ID: '1', ANTHROPIC_API_KEY: 'sk-fake', MONTHLY_CREDITS: '20' };
const GOOD = 'GOOD1234-GOOD-1234', seen = [];
const fetchFn = async (url, init) => {
  if (url.includes('lemonsqueezy')) { const ok = String(init.body).includes(GOOD); return { status: 200, json: async () => ok ? { valid: true, license_key: { status: 'active' }, meta: { product_id: 1 } } : { valid: false } }; }
  const b = JSON.parse(init.body), name = b.tool_choice.name; seen.push(b.messages[0].content);
  const out = { write_report: { subject: 'Lesson report', parent_message: '안녕하세요 [[PARENT]]님, [[STUDENT]] 학생은 오늘 분수 덧셈을 잘했습니다. - [[TUTOR]]', short_message: '[[STUDENT]] 오늘 잘했어요', tutor_copy: 'Hello [[PARENT]], [[STUDENT]] did well today.', flags: ['No homework was mentioned'] },
    write_reply: { reply: '네 [[PARENT]]님, 가능합니다.', tutor_copy: 'Yes, possible.', parent_message_translation: 'Can we move it?', flags: [] },
    write_summary: { subject: 'Progress', parent_message: '[[STUDENT]] 학생 성장 요약', tutor_copy: 'Progress for [[STUDENT]]', highlights: ['Fractions'], next_focus: ['Denominators'], flags: [] } }[name];
  return { ok: true, status: 200, json: async () => ({ content: [{ type: 'tool_use', name, input: out }] }) };
};
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain', '.xml': 'application/xml' };
const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  if (u.pathname.startsWith('/api/')) {
    let raw = ''; for await (const c of req) raw += c; let body = null; try { body = JSON.parse(raw); } catch (e) {}
    const r = await core.handle({ route: u.pathname.slice(5), method: req.method, body, auth: req.headers.authorization || '', env, fetchFn });
    res.writeHead(r.status, { 'content-type': 'application/json' }); return res.end(JSON.stringify(r.body));
  }
  let p = path.join(dist, decodeURIComponent(u.pathname)); if (u.pathname.endsWith('/')) p = path.join(p, 'index.html');
  if (!fs.existsSync(p) && fs.existsSync(p + '.html')) p += '.html';
  if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end('nf'); }
  res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res);
});
(async () => {
  await new Promise(r => server.listen(0, r)); const base = 'http://localhost:' + server.address().port;
  const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'en-US', serviceWorkers: 'block' }), pg = await ctx.newPage();
  const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  const shot = async n => { if (shots) { fs.mkdirSync(shots, { recursive: true }); await pg.screenshot({ path: path.join(shots, n + '.png'), fullPage: true }); } };
  // landing in all five languages
  await pg.goto(base + '/'); await shot('landing-en');
  for (const l of ['ko', 'ja', 'zh', 'es']) { await pg.selectOption('#lang', l); assert.ok((await pg.textContent('h1')).length > 8); }
  await pg.selectOption('#lang', 'ko'); await shot('landing-ko'); assert.ok(!(await pg.textContent('#price')).includes('undefined'));
  // gate
  await pg.goto(base + '/app/'); await pg.waitForSelector('input[placeholder^="XXXX"]');
  assert.ok((await pg.textContent('body')).includes('Purchases open soon') || (await pg.textContent('body')).includes('soon'));
  await shot('gate');
  await pg.fill('input[placeholder^="XXXX"]', 'BADKEY12-BAD'); await pg.click('button:has-text("Unlock")'); await pg.waitForSelector('.err:not(:empty)'); assert.ok((await pg.textContent('.err')).includes('not accepted'));
  await pg.fill('input[placeholder^="XXXX"]', GOOD); await pg.click('button:has-text("Unlock")'); await pg.waitForSelector('nav.tabs');
  assert.ok((await pg.textContent('.meter')).includes('20 / 20'));
  // student
  await pg.click('text=+ Add student'); await pg.fill('label:has-text("Student name") + input', 'Kim Minjun'); await pg.fill('label:has-text("Parent name") + input', 'Park Sora');
  await pg.selectOption('label:has-text("Write to the family in") + select', 'ko'); await pg.click('button:has-text("Save")'); await pg.waitForSelector('text=Kim Minjun');
  // settings: my name
  await pg.click('nav button:has-text("Settings")'); await pg.fill('label:has-text("My name") + input', 'Waldo'); await pg.press('label:has-text("My name") + input', 'Tab');
  // report
  await pg.click('nav button:has-text("Report")'); await pg.fill('textarea', 'Minjun did fractions with Sora watching. Call 010-1234-5678. Waldo thinks denominators are hard.');
  await pg.click('.pills >> nth=0 >> button:has-text("4")'); await pg.click('button:has-text("Write the report")'); await pg.waitForSelector('.out textarea');
  const sent = seen[0]; assert.ok(!/Minjun|Sora|Waldo|1234/.test(sent), 'real names/phone must not be sent: ' + sent); assert.ok(sent.includes('[[STUDENT]]'));
  assert.ok((await pg.inputValue('.out textarea')).includes('Park Sora님') && (await pg.inputValue('.out textarea')).includes('Kim Minjun 학생'), 'names restored on screen');
  assert.ok((await pg.textContent('.flag')).includes('No homework'));
  assert.ok((await pg.textContent('.meter')).includes('19 / 20')); await shot('report');
  await pg.click('.out button:has-text("In my language")'); assert.ok((await pg.inputValue('.out textarea')).includes('Hello Park Sora'));
  await pg.click('.out button:has-text("Save to history")');
  // reply + summary
  await pg.click('nav button:has-text("Reply")'); await pg.fill('textarea >> nth=0', 'Can we move Friday?'); await pg.click('button:has-text("Write the reply")'); await pg.waitForSelector('.out textarea'); assert.ok((await pg.inputValue('.out textarea')).includes('Park Sora님'));
  await pg.click('nav button:has-text("Progress")'); await pg.click('button:has-text("Write the summary")'); await pg.waitForSelector('.out textarea'); assert.ok((await pg.textContent('.meter')).includes('16 / 20'));
  await pg.click('.out button:has-text("Save to history")'); await shot('summary');
  await pg.click('nav button:has-text("History")'); assert.equal(await pg.locator('.hist').count(), 2); await shot('history');
  // language switch + persistence + backup
  await pg.click('nav button:has-text("Settings")'); await pg.selectOption('label:has-text("App language") + select', 'ko'); await pg.waitForSelector('nav.tabs button:has-text("설정")');
  await pg.reload(); await pg.waitForSelector('nav.tabs'); await pg.click('nav button:has-text("학생")'); assert.ok((await pg.textContent('body')).includes('Kim Minjun')); await shot('students-ko');
  const stored = await pg.evaluate(() => localStorage.getItem('homebrief.v1')); assert.ok(stored.includes('Kim Minjun'));
  // sign out returns to gate
  await pg.click('nav button:has-text("설정")'); await pg.click('button:has-text("라이선스 제거")'); await pg.waitForSelector('input[placeholder^="XXXX"]');
  assert.deepEqual(errs.filter(e => !/favicon|404|401|Failed to load resource/.test(e)), [], 'console errors');
  await b.close(); server.close(); console.log('e2e ok');
})().catch(e => { console.error(e); process.exit(1); });
