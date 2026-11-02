/* theme x OS scheme x contrast cascade: control borders must reach 3:1 against the card in every combination */
const { chromium } = require('playwright'), path = require('path'), assert = require('assert');
const lum = c => { const v = c.match(/\d+/g).slice(0, 3).map(n => { n /= 255; return n <= .03928 ? n / 12.92 : Math.pow((n + .055) / 1.055, 2.4); }); return .2126 * v[0] + .7152 * v[1] + .0722 * v[2]; };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
(async () => {
  const b = await chromium.launch(), url = 'file://' + path.join(__dirname, '..', 'app', 'index.html');
  for (const theme of ['', 'light', 'dark']) for (const scheme of ['light', 'dark']) for (const contrast of ['no-preference', 'more']) {
    const ctx = await b.newContext({ colorScheme: scheme, contrast });
    const pg = await ctx.newPage();
    await pg.addInitScript(t => { if (t) localStorage.setItem('stayline.v1', JSON.stringify({ v: 1, trackers: [], active: '', theme: t })); }, theme);
    await pg.goto(url); await pg.waitForSelector('.empty'); await pg.click('.empty .ghost'); await pg.waitForSelector('dialog input');
    const r = await pg.evaluate(() => { const i = document.querySelector('dialog input'), d = document.querySelector('dialog'); return { border: getComputedStyle(i).borderTopColor, card: getComputedStyle(d).backgroundColor, mute: getComputedStyle(document.querySelector('dialog label')).color }; });
    const cr = ratio(r.border, r.card), mr = ratio(r.mute, r.card);
    assert.ok(cr >= 3, `control border ${cr.toFixed(2)} theme=${theme || 'auto'} os=${scheme} contrast=${contrast}`);
    assert.ok(mr >= 4.5, `muted text ${mr.toFixed(2)} theme=${theme || 'auto'} os=${scheme} contrast=${contrast}`);
    await ctx.close();
  }
  await b.close(); console.log('THEME OK');
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
