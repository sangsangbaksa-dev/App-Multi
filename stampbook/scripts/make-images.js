/* Regenerates icon-192.png, icon-512.png and og.png. Needs Playwright (dev only): NODE_PATH=$(npm root -g) node scripts/make-images.js */
const { chromium } = require('playwright'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), svg = fs.readFileSync(path.join(root, 'icon.svg'), 'utf8');
const og = `<html><body style="margin:0;width:1200px;height:630px;background:#f3ead6;font-family:Georgia,'Iowan Old Style',serif;color:#1c2a44;position:relative;overflow:hidden">
<div style="position:absolute;inset:0;background-image:radial-gradient(#d9cdb0 2px,transparent 2px);background-size:34px 34px"></div>
<div style="position:absolute;left:80px;top:96px;width:620px"><div style="font:700 22px system-ui;letter-spacing:.14em;color:#b8402c">STAMPBOOK</div>
<div style="font-weight:700;font-size:78px;line-height:1.05;margin-top:18px;letter-spacing:-.02em">Every lesson stamped.<br>Nobody argues<br>about the count.</div>
<div style="font:400 26px system-ui;color:#625f55;margin-top:28px">Prepaid lesson packs for tutors and coaches. No account, no server.</div></div>
<div style="position:absolute;left:720px;top:130px;display:grid;grid-template-columns:repeat(4,86px);gap:22px;transform:rotate(-3deg)">
${[0,1,2,3,4,5,6,7].map(i=>i<5?`<div style="width:86px;height:86px;border-radius:50%;border:5px solid #b8402c;color:#b8402c;display:grid;place-items:center;font:700 20px Georgia;transform:rotate(${[-7,5,-4,8,-6][i]}deg)">${['9/2','9/9','9/16','9/23','9/30'][i]}</div>`:`<div style="width:86px;height:86px;border-radius:50%;border:4px dashed #d2c5a6;display:grid;place-items:center;font:600 20px system-ui;color:#9a927c">${i+1}</div>`).join('')}
</div></body></html>`;
(async () => {
  const b = await chromium.launch(), p = await b.newPage();
  for (const n of [192, 512]) { await p.setViewportSize({ width: n, height: n }); await p.setContent(`<body style="margin:0">${svg.replace('<svg ', `<svg width="${n}" height="${n}" `)}</body>`); await p.screenshot({ path: path.join(root, `icon-${n}.png`) }); }
  await p.setViewportSize({ width: 1200, height: 630 }); await p.setContent(og); await p.screenshot({ path: path.join(root, 'og.png') });
  await b.close();
})();
