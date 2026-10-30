/* Cloudflare Pages build: regenerate the site, then copy only the public files into dist/ (or $OUT).
   Pages settings: root directory "stayline", build command "node scripts/build-pages.js", output "dist".
   functions/ stays in the root directory and is compiled by Pages itself. */
const fs = require('fs'), path = require('path'), cp = require('child_process');
const root = path.join(__dirname, '..'), out = path.resolve(process.env.OUT || path.join(root, 'dist'));
cp.execFileSync(process.execPath, [path.join(__dirname, 'build-site.js')], { stdio: 'inherit' });
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
const PUBLIC = ['index.html', 'privacy.html', 'terms.html', 'ko', 'ja', 'zh', 'es', 'app', 'config.js', 'landing.css', 'icon.svg', 'og.png', 'sitemap.xml', 'robots.txt', '_headers'];
for (const f of PUBLIC) fs.cpSync(path.join(root, f), path.join(out, f), { recursive: true });
console.log('pages build ->', out);
