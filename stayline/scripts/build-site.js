/* Generates the static marketing pages from strings + config.js:
   /, /privacy, /terms (English) and /<lang>/ , /<lang>/privacy, /<lang>/terms, plus sitemap.xml and robots.txt.
   Run from anywhere: node stayline/scripts/build-site.js */
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const CFG = require('../config.js'), L = require('./landing-strings.json'), X = require('./site-i18n.js');
const LANGS = ['en', 'ko', 'ja', 'zh', 'es'], NAMES = { en: 'English', ko: '한국어', ja: '日本語', zh: '中文', es: 'Español' };
const LOCALE = { en: 'en_US', ko: 'ko_KR', ja: 'ja_JP', zh: 'zh_CN', es: 'es_ES' };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const site = CFG.siteUrl.replace(/\/+$/, '');
const rel = (l, page) => (l === 'en' ? '/' : '/' + l + '/') + (page || '');           // '/ko/privacy'
const abs = (l, page) => site + rel(l, page);
const file = (l, page) => path.join(root, l === 'en' ? '' : l, (page || 'index') + '.html');
const fill = s => s.split('{email}').join(CFG.supportEmail);

function head(l, page, title, desc, extra) {
  const alts = LANGS.map(a => `<link rel="alternate" hreflang="${a}" href="${abs(a, page)}">`).join('\n') +
    `\n<link rel="alternate" hreflang="x-default" href="${abs('en', page)}">`;
  return `<!doctype html>
<html lang="${l}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${abs(l, page)}">
${alts}
<meta property="og:type" content="website"><meta property="og:site_name" content="Stayline"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${abs(l, page)}"><meta property="og:image" content="${site}/og.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="${esc(X[l].ogAlt)}"><meta property="og:locale" content="${LOCALE[l]}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(desc)}"><meta name="twitter:image" content="${site}/og.png">
<meta name="theme-color" content="#14171a"><link rel="icon" href="/icon.svg" type="image/svg+xml"><link rel="stylesheet" href="/landing.css">${extra || ''}</head>`;
}
function top(l, page) {
  const links = LANGS.map(a => `<a href="${rel(a, page)}" hreflang="${a}" lang="${a}"${a === l ? ' aria-current="true"' : ''}>${NAMES[a]}</a>`).join('');
  return `<header class="top"><a class="brand" href="${rel(l)}"><span>▸</span> Stayline</a><nav class="langs" aria-label="Language">${links}</nav><a class="btn small" href="/app/">${esc(L[l].cta)}</a></header>`;
}
function foot(l) {
  return `<footer><div class="in"><span>${esc(L[l].foot)}</span> · <a href="${rel(l, 'privacy')}">${esc(X[l].privacy)}</a> · <a href="${rel(l, 'terms')}">${esc(X[l].terms)}</a> · <a href="mailto:${esc(CFG.supportEmail)}">${esc(CFG.supportEmail)}</a></div></footer>`;
}
function jsonld(l) {
  const s = Object.fromEntries(Object.entries(L[l]).map(([k, v]) => [k, String(v).split('{price}').join(CFG.price)]));
  const app = { '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'Stayline', applicationCategory: 'TravelApplication', operatingSystem: 'Any (web browser)', inLanguage: l, url: abs(l), description: X[l].metaDesc, image: site + '/og.png',
    offers: { '@type': 'Offer', price: CFG.priceAmount, priceCurrency: CFG.priceCurrency, availability: 'https://schema.org/InStock' } };
  const faq = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [1, 2, 3, 4].map(i => ({ '@type': 'Question', name: s['q' + i], acceptedAnswer: { '@type': 'Answer', text: s['a' + i] } })) };
  return [app, faq].map(o => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`).join('');
}

function home(l) {
  const s = L[l], t = X[l];
  return head(l, '', t.metaTitle, t.metaDesc, jsonld(l)) + `
<body>
${top(l, '')}
<main>
<section class="hero"><div class="in">
  <div class="copy"><h1>${esc(s.h1)}</h1><p class="lead">${esc(s.lead)}</p>
    <p class="ctas"><a class="btn" href="/app/">${esc(s.cta)}</a> <a class="btn ghost" href="#features">${esc(s.cta2)}</a></p><p class="note">${esc(s.ctaNote)}</p>
    <ul class="trust">${[1, 2, 3, 4].map(i => `<li>${esc(s['trust' + i])}</li>`).join('')}</ul></div>
  <div class="demo" aria-hidden="true"><div class="flaps"><b>6</b><b>2</b></div><div class="unit">${esc(s.demoUnit)}</div>
    <div class="bar"><i class="in" style="--w:50%"></i><i style="--w:8%"></i><i class="in" style="--w:22%"></i><i style="--w:20%"></i></div>
    <div class="dnote">${esc(s.demoNote)}</div></div></div></section>
<section class="paper" id="how"><div class="in"><h2>${esc(s.howH)}</h2>
  <ol class="steps"><li><b>${esc(s.s1h)}</b><span>${esc(s.s1)}</span></li><li><b>${esc(s.s2h)}</b><span>${esc(s.s2)}</span></li><li><b>${esc(s.s3h)}</b><span>${esc(s.s3)}</span></li></ol></div></section>
<section class="paper alt" id="features"><div class="in"><h2>${esc(s.featH)}</h2>
  <ul class="feats">${[1, 2, 3, 4, 5, 6, 7, 8].map(i => `<li><b>${esc(s['ft' + i])}</b><span>${esc(s['fx' + i])}</span></li>`).join('')}</ul></div></section>
<section class="paper"><div class="in"><h2>${esc(s.whyH)}</h2>
  <div class="cols"><p>${esc(s.why1)}</p><p>${esc(s.why2)}</p><p>${esc(s.why3)}</p></div></div></section>
<section class="paper alt"><div class="in"><h2>${esc(s.priceH)}</h2>
  <div class="plans">
    <div class="plan pro"><h3>Stayline Pro</h3><p class="price">${esc(CFG.price)} <small>${esc(s.once)}</small></p><ul><li>${esc(s.p0)}</li><li>${esc(s.p1)}</li><li>${esc(s.p2)}</li><li>${esc(s.p3)}</li></ul><a class="btn" href="${esc(CFG.checkoutUrl)}" rel="noopener">${esc(s.proCta)}</a><p class="fine">${esc(s.payNote)}</p></div>
  </div></div></section>
<section class="paper"><div class="in"><h2>${esc(s.faqH)}</h2>
${[1, 2, 3, 4].map(i => `  <details><summary>${esc(s['q' + i])}</summary><p>${esc(s['a' + i])}</p></details>`).join('\n')}</div></section>
<section class="endcta"><div class="in"><h2>${esc(s.endH)}</h2><p>${esc(s.endB)}</p><a class="btn" href="/app/">${esc(s.cta)}</a></div></section>
</main>
${foot(l)}
</body></html>
`;
}
function legal(l, page) {
  const t = X[l], paras = page === 'privacy' ? t.priv : t.term, h = page === 'privacy' ? t.privH : t.termsH;
  return head(l, page, h + ' | Stayline', t.metaDesc) + `
<body>
${top(l, page)}
<main class="paper"><div class="in doc"><h1>${esc(h)}</h1><p class="muted">${esc(t.updated)}</p>
${paras.map(p => `<p>${esc(fill(p))}</p>`).join('\n')}
<p><a href="${rel(l)}">← ${esc(t.home)}</a></p></div></main>
${foot(l)}
</body></html>
`;
}

for (const l of LANGS) {
  if (l !== 'en') fs.mkdirSync(path.join(root, l), { recursive: true });
  fs.writeFileSync(file(l), home(l));
  for (const p of ['privacy', 'terms']) fs.writeFileSync(file(l, p), legal(l, p));
}
const urls = [];
for (const p of ['', 'privacy', 'terms']) for (const l of LANGS) {
  const alts = LANGS.map(a => `<xhtml:link rel="alternate" hreflang="${a}" href="${abs(a, p)}"/>`).join('') + `<xhtml:link rel="alternate" hreflang="x-default" href="${abs('en', p)}"/>`;
  urls.push(`<url><loc>${abs(l, p)}</loc>${alts}</url>`);
}
urls.push(`<url><loc>${site}/app/</loc></url>`);
fs.writeFileSync(path.join(root, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`);
fs.writeFileSync(path.join(root, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${site}/sitemap.xml\n`);
console.log('built', LANGS.length * 3, 'pages');
