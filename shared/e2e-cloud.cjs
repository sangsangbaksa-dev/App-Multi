// Browser test: for each app, sign up, sync, then a second empty browser profile logs in and receives the data.
// Supabase is replaced by shared/fake-supabase.js through request interception; the app's real CSP header is enforced.
// Run: node shared/e2e-cloud.cjs   (needs playwright)
const { chromium } = require('playwright'), http = require('http'), fs = require('fs'), path = require('path'), assert = require('assert');
const { fakeServer, URL_, KEY } = require('./fake-supabase.js');
const repo = path.join(__dirname, '..'), types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };
const REAL_URL = 'https://fiiljdmbnmvtayffsydb.supabase.co';

const APPS = [
  { name: 'stampbook', root: 'stampbook', page: '/app/', csp: () => /Content-Security-Policy: (.*)/.exec(fs.readFileSync(path.join(repo, 'stampbook/_headers'), 'utf8'))[1],
    key: 'stampbook.v1', seed: { v: 1, packs: [{ id: 'p1', student: 'Mina', total: 5, stamps: [], price: 100, cur: 'USD' }], teacher: 'T', pro: false, lang: 'en' },
    open: async (pg) => { await pg.goto(pg.base + '/app/#/settings').catch(() => {}); await pg.waitForSelector('.cloud-panel', { timeout: 3000 }).catch(async () => { await pg.click('text=/Settings|settings|⚙/').catch(() => {}); await pg.waitForSelector('.cloud-panel'); }); } },
  { name: 'stayline', root: 'stayline', page: '/app/', csp: () => /Content-Security-Policy: (.*)/.exec(fs.readFileSync(path.join(repo, 'stayline/_headers'), 'utf8'))[1],
    key: 'stayline.v1', seed: { v: 1, trackers: [{ id: 't1', name: 'Me', rule: { max: 90, window: 180 }, expires: '', trips: [] }], active: 't1', pro: false, lang: 'en' },
    open: async (pg) => { await pg.waitForSelector('.cloud-panel'); } },
  { name: 'quickbill', root: 'invoice-pwa', page: '/app', csp: () => JSON.parse(fs.readFileSync(path.join(repo, 'invoice-pwa/vercel.json'), 'utf8')).headers[0].headers.find((h) => h.key === 'Content-Security-Policy').value,
    key: 'qb.invoices', seed: [{ id: 'i1', type: 'invoice', number: 'INV-0001', from: 'Me', client: 'Acme', currency: 'USD', issueDate: '2026-01-01', dueDate: '2026-01-15', taxRate: 0, discount: 0, paid: 0, status: 'draft', notes: '', payinfo: '', recur: '', nextRun: '', items: [{ desc: 'Work', qty: 1, price: 10 }], lateFeePct: 0 }],
    open: async (pg) => { await pg.click('#btn-account'); await pg.waitForSelector('.cloud-panel', { timeout: 3000 }); } },
];

(async () => {
  const srv = fakeServer();
  const b = await chromium.launch();
  for (const app of APPS) {
    const csp = app.csp(); assert.ok(csp.includes(REAL_URL), app.name + ' CSP must allow the Supabase project');
    const web = http.createServer((q, r) => {
      let p = decodeURIComponent(q.url.split('?')[0].split('#')[0]); if (p.endsWith('/')) p += 'index.html'; if (p === '/app') p = '/app.html';
      const f = path.join(repo, app.root, p); if (!f.startsWith(path.join(repo, app.root)) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
      r.writeHead(200, { 'content-security-policy': csp, 'content-type': types[path.extname(f)] || 'text/plain' }); fs.createReadStream(f).pipe(r);
    }).listen(0);
    const base = `http://localhost:${web.address().port}`;
    async function mkPage(seed) {
      const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'en-US' }), pg = await ctx.newPage(); pg.base = base; pg.errs = [];
      pg.on('pageerror', (e) => pg.errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && pg.errs.push(m.text()));
      await ctx.route(REAL_URL + '/**', async (route) => {
        const req = route.request(), url = req.url().replace(REAL_URL, URL_);
        const res = await srv.fn(url, { method: req.method(), headers: { ...req.headers(), apikey: KEY }, body: req.postData() });
        await route.fulfill({ status: res.status, body: await res.text(), headers: { 'access-control-allow-origin': '*', 'content-type': 'application/json' } });
      });
      if (seed) await ctx.addInitScript(([k, v]) => { if (!localStorage.getItem(k)) localStorage.setItem(k, JSON.stringify(v)); }, [app.key, seed]);
      await pg.goto(base + app.page); return pg;
    }
    // Device A (with data): sign up
    const A = await mkPage(app.seed); await app.open(A);
    await A.click('.cloud-form button[type=button]'); // switch to "Create account"
    await A.fill('.cloud-form input[type=email]', app.name + '@test.co'); await A.fill('.cloud-form input[type=password]', 'secret123');
    await A.click(".cloud-form button[type=submit]"); await A.waitForSelector('.cloud-panel >> text=Saved to the cloud');
    const rows = Object.values(srv.rows).filter((r) => r.app === app.name); assert.equal(rows.length, 1, app.name + ' row uploaded');
    assert.ok(!JSON.stringify(rows[0].data).includes('pro'), 'no licence fields uploaded');
    // Device B (empty): log in, page reloads with the data
    const B = await mkPage(null); await app.open(B);
    await B.fill('.cloud-form input[type=email]', app.name + '@test.co'); await B.fill('.cloud-form input[type=password]', 'secret123');
    await Promise.all([B.waitForNavigation({ waitUntil: 'load' }), B.click('.cloud-form button[type=submit]')]);
    const got = JSON.parse(await B.evaluate((k) => localStorage.getItem(k), app.key));
    const pick = app.name === 'quickbill' ? (x) => x : app.name === 'stampbook' ? (x) => x.packs : (x) => x.trackers.map((t) => t.id);
    assert.deepEqual(pick(got), pick(app.seed));
    for (const pg of [A, B]) assert.deepEqual(pg.errs.filter((e) => !/Failed to load resource/.test(e)), [], app.name + ' console errors');
    console.log('ok', app.name); web.close();
  }
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
