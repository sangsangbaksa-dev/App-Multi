/* Generates the localized landing pages: index.html (en) and ko/ja/zh/es/index.html. Run after editing landing-strings.json. */
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), S = JSON.parse(fs.readFileSync(path.join(__dirname, 'landing-strings.json'), 'utf8'));
const SITE = 'https://marginlog.pages.dev', names = { en: 'English', ko: '한국어', ja: '日本語', zh: '中文', es: 'Español' };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
for (const lang of Object.keys(S)) {
  const s = S[lang], pre = lang === 'en' ? '' : '../', dir = lang === 'en' ? root : path.join(root, lang);
  const alt = Object.keys(S).map(l => `<link rel="alternate" hreflang="${l}" href="${SITE}/${l === 'en' ? '' : l + '/'}">`).join('');
  const html = `<!doctype html>
<html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(s.title)}</title><meta name="description" content="${esc(s.desc)}"><meta name="theme-color" content="#1f5f5b">
<meta property="og:title" content="${esc(s.title)}"><meta property="og:description" content="${esc(s.desc)}"><meta property="og:image" content="${SITE}/og.png"><meta property="og:type" content="website">
<link rel="canonical" href="${SITE}/${lang === 'en' ? '' : lang + '/'}">${alt}
<link rel="icon" href="${pre}icon.svg" type="image/svg+xml"><link rel="stylesheet" href="${pre}landing.css"></head>
<body><header class="bar"><a class="brand" href="./">Marginlog</a><nav aria-label="${esc(s.nav)}">${Object.keys(S).map(l => `<a href="${l === 'en' ? pre || './' : (lang === 'en' ? '' : '../') + l + '/'}"${l === lang ? ' aria-current="page"' : ''} hreflang="${l}">${names[l]}</a>`).join(' ')}</nav></header>
<main><section class="hero"><h1>${esc(s.h1)}</h1><p class="lead">${esc(s.lead)}</p><a class="cta" href="${pre}app/">${esc(s.cta)}</a></section>
<section><h2>${esc(s.how)}</h2><ol class="how">${s.steps.map(x => `<li>${esc(x)}</li>`).join('')}</ol></section>
<section><h2>${esc(s.feat)}</h2><ul class="grid">${s.f.map(f => `<li><h3>${esc(f[0])}</h3><p>${esc(f[1])}</p></li>`).join('')}</ul></section>
<section class="priv"><h2>${esc(s.priv)}</h2><p>${esc(s.privb)}</p></section></main>
<footer><p>${esc(s.disc)}</p></footer></body></html>
`;
  fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(path.join(dir, 'index.html'), html);
}
fs.writeFileSync(path.join(root, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${Object.keys(S).map(l => `<url><loc>${SITE}/${l === 'en' ? '' : l + '/'}</loc></url>`).join('\n')}\n<url><loc>${SITE}/app/</loc></url>\n</urlset>\n`);
fs.writeFileSync(path.join(root, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);
console.log('site built');
