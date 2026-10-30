// Renders og.png and the PNG app icons from the sources in this repo.
const { chromium } = require("playwright");
const path = require("path");
const root = path.resolve(__dirname, "..");
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
  await p.goto("file://" + path.join(__dirname, "og.html"));
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: path.join(root, "og.png") });
  for (const [src, size, out] of [["icon.svg",180,"icon-180.png"],["icon.svg",192,"icon-192.png"],["icon.svg",512,"icon-512.png"],["icon-maskable.svg",512,"icon-maskable-512.png"]]) {
    const q = await b.newPage({ viewport: { width: 512, height: 512 }, deviceScaleFactor: size / 512 });
    await q.goto("file://" + path.join(root, src));
    await q.screenshot({ path: path.join(root, out), omitBackground: true });
  }
  await b.close();
})();
