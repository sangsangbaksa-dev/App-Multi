/* Renders og.png and icon-512.png (needs Playwright). Not part of the Pages build. */
const { chromium } = require('playwright'), path = require('path');
(async () => {
  const root = path.join(__dirname, '..'), b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1200, height: 630 } });
  await p.goto('file://' + path.join(root, 'design/og.html')); await p.screenshot({ path: path.join(root, 'og.png') });
  await p.setViewportSize({ width: 512, height: 512 }); await p.goto('file://' + path.join(root, 'icon.svg')); await p.screenshot({ path: path.join(root, 'icon-512.png') });
  await p.goto('file://' + path.join(root, 'design/maskable.html')); await p.screenshot({ path: path.join(root, 'icon-512-maskable.png') });
  await b.close();
})();
