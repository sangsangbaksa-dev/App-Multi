/* Generates the localized landing pages: index.html (en) and ko/ja/zh/es/index.html. Run after editing landing-strings.json. */
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), S = JSON.parse(fs.readFileSync(path.join(__dirname, 'landing-strings.json'), 'utf8'));
const SITE = 'https://marginlog.pages.dev', names = { en: 'English', ko: '한국어', ja: '日本語', zh: '中文', es: 'Español' };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
/* Original line icons (24x24, stroke only), one per feature card. */
const ICONS = ['M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z', 'M12 7v5l3 2M12 3a9 9 0 100 18 9 9 0 000-18z', 'M4 19V9M10 19V5M16 19v-7M21 19H3', 'M5 4h14v16H5zM9 9h6M9 13h6M9 17h3', 'M4 20l4-12 4 8 3-5 5 9', 'M7 3h10l3 3v15H4V3zM8 12h8M8 16h5', 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4', 'M3 12l5 5L21 6', 'M4 4h16v12H8l-4 4z'];
for (const lang of Object.keys(S)) {
  const s = S[lang], pre = lang === 'en' ? '' : '../', dir = lang === 'en' ? root : path.join(root, lang);
  const alt = Object.keys(S).map(l => `<link rel="alternate" hreflang="${l}" href="${SITE}/${l === 'en' ? '' : l + '/'}">`).join('');
  const nav = Object.keys(S).map(l => `<a href="${l === 'en' ? pre || './' : (lang === 'en' ? '' : '../') + l + '/'}"${l === lang ? ' aria-current="page"' : ''} hreflang="${l}">${names[l]}</a>`).join(' ');
  const hashes = ['9c41…e07a', '5be2…31d8', 'f7a0…6c93'];
  const html = `<!doctype html>
<html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(s.title)}</title><meta name="description" content="${esc(s.desc)}"><meta name="theme-color" content="#1f5f5b">
<meta property="og:title" content="${esc(s.title)}"><meta property="og:description" content="${esc(s.desc)}"><meta property="og:image" content="${SITE}/og.png"><meta property="og:type" content="website">
<link rel="canonical" href="${SITE}/${lang === 'en' ? '' : lang + '/'}">${alt}
<link rel="icon" href="${pre}icon.svg" type="image/svg+xml"><link rel="stylesheet" href="${pre}landing.css"></head>
<body><header class="bar"><a class="brand" href="./"><img src="${pre}icon.svg" alt="" width="28" height="28">Marginlog</a><nav aria-label="${esc(s.nav)}">${nav}</nav></header>
<main>
<section class="hero"><div class="hero-t"><p class="eyebrow">${esc(s.eyebrow)}</p><h1>${esc(s.h1)}</h1><p class="lead">${esc(s.lead)}</p><a class="cta" href="${pre}app/">${esc(s.cta)}</a></div>
<figure class="mock" aria-label="${esc(s.demoH)}"><div class="mock-h"><b>${esc(s.demoH)}</b><span class="ok">✓ ${esc(s.demoSeal)}</span></div>
<ol class="mock-l">${s.demo.map((x, i) => `<li><span>${esc(x)}</span><code>#${hashes[i]}</code></li>`).join('')}</ol><figcaption>${esc(s.demoCap)}</figcaption></figure></section>
<section><h2>${esc(s.usesH)}</h2><ul class="uses">${s.uses.map(u => `<li><h3>${esc(u[0])}</h3><p>${esc(u[1])}</p></li>`).join('')}</ul></section>
<section><h2>${esc(s.how)}</h2><ol class="how">${s.steps.map(x => `<li>${esc(x)}</li>`).join('')}</ol></section>
<section><h2>${esc(s.feat)}</h2><ul class="grid">${s.f.map((f, i) => `<li><svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${ICONS[i % ICONS.length]}"/></svg><h3>${esc(f[0])}</h3><p>${esc(f[1])}</p></li>`).join('')}</ul></section>
<section class="priv"><h2>${esc(s.priv)}</h2><p>${esc(s.privb)}</p></section>
<section><h2>${esc(s.faqH)}</h2><div class="faq">${s.faq.map(q => `<details><summary>${esc(q[0])}</summary><p>${esc(q[1])}</p></details>`).join('')}</div></section>
<section class="final"><h2>${esc(s.tryH)}</h2><p>${esc(s.tryB)}</p><a class="cta" href="${pre}app/">${esc(s.cta)}</a></section></main>
<footer><p>${esc(s.disc)}</p></footer></body></html>
`;
  fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(path.join(dir, 'index.html'), html);
}
fs.writeFileSync(path.join(root, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${Object.keys(S).map(l => `<url><loc>${SITE}/${l === 'en' ? '' : l + '/'}</loc></url>`).join('\n')}\n<url><loc>${SITE}/app/</loc></url>\n</urlset>\n`);
fs.writeFileSync(path.join(root, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);
console.log('site built');
