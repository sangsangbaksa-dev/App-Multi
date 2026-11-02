/* Cloudflare Pages build: regenerate the landing pages, then copy the public files into dist/ (or $OUT). */
const fs = require('fs'), path = require('path'), cp = require('child_process');
const root = path.join(__dirname, '..'), out = path.resolve(process.env.OUT || path.join(root, 'dist'));
cp.execFileSync(process.execPath, [path.join(__dirname, 'build-site.js')], { stdio: 'inherit' });
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
for (const f of ['index.html', 'ko', 'ja', 'zh', 'es', 'app', 'landing.css', 'icon.svg', 'icon-512.png', 'icon-512-maskable.png', 'og.png', 'sitemap.xml', 'robots.txt', '_headers']) fs.cpSync(path.join(root, f), path.join(out, f), { recursive: true });
console.log('pages build ->', out);
