/* Generates static, per-language landing pages, legal pages, sitemap and robots from config.js.
   Run: node scripts/build.js   (Vercel runs it on deploy via vercel.json). No dependencies. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const sandbox = { window: {} }; vm.runInNewContext(fs.readFileSync(path.join(root, 'config.js'), 'utf8'), sandbox);
const SITE = sandbox.window.SB_SITE, base = SITE.siteUrl.replace(/\/+$/, '');
const D = require('./landing-i18n.js'), LAW = require('./legal.js');
const LOC = { en: 'en_US', ko: 'ko_KR', ja: 'ja_JP', zh: 'zh_CN', es: 'es_ES' };
const TERMS = { en: 'Terms', ko: '이용약관', ja: '利用規約', zh: '服务条款', es: 'Términos' };
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const pathOf = l => (l === 'en' ? '/' : `/${l}/`), langs = Object.keys(D);
const tpl = fs.readFileSync(path.join(__dirname, 'landing.template.html'), 'utf8');
const priceNum = (SITE.price.match(/[\d.]+/) || ['19'])[0];

function put(rel, text) { const f = path.join(root, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, text); }
const alternates = langs.map(l => `<link rel="alternate" hreflang="${l}" href="${base}${pathOf(l)}">`).join('\n') + `\n<link rel="alternate" hreflang="x-default" href="${base}/">`;

for (const l of langs) {
  const d = D[l], url = base + pathOf(l);
  const jsonld = JSON.stringify({ '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'Stampbook', applicationCategory: 'BusinessApplication', operatingSystem: 'Any (web browser)', inLanguage: l,
    description: d.lede, url, offers: [{ '@type': 'Offer', name: 'Free', price: '0', priceCurrency: 'USD' }, { '@type': 'Offer', name: 'Pro', price: priceNum, priceCurrency: 'USD' }] }).replace(/</g, '\\u003c');
  const vars = Object.assign({}, d, { lang: l, title: `${d.app} · ${d.h1}`, url, siteUrl: base, alternates, locale: LOC[l], jsonld, home: pathOf(l), terms: TERMS[l],
    options: langs.map(k => `<option value="${k}" data-href="${pathOf(k)}"${k === l ? ' selected' : ''}>${esc(D[k].name)}</option>`).join(''),
    checkoutUrl: SITE.checkoutUrl, supportEmail: SITE.supportEmail, proAmt: d.proAmt.replace('$19', SITE.price) });
  const raw = new Set(['alternates', 'jsonld', 'options']);
  const html = tpl.replace(/\{\{(\w+)\}\}/g, (m, k) => { if (!(k in vars)) throw new Error('missing key ' + k + ' for ' + l); return raw.has(k) ? vars[k] : esc(vars[k]); });
  put(l === 'en' ? 'index.html' : `${l}/index.html`, html);
}
for (const page of ['privacy', 'terms']) put(`${page}.html`, LAW.render(page, SITE, base));
put('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n` +
  langs.map(l => `<url><loc>${base}${pathOf(l)}</loc>${langs.map(k => `<xhtml:link rel="alternate" hreflang="${k}" href="${base}${pathOf(k)}"/>`).join('')}<xhtml:link rel="alternate" hreflang="x-default" href="${base}/"/></url>`).join('\n') +
  `\n<url><loc>${base}/privacy</loc></url>\n<url><loc>${base}/terms</loc></url>\n</urlset>\n`);
put('robots.txt', `User-agent: *\nAllow: /\nDisallow: /app/\n\nSitemap: ${base}/sitemap.xml\n`);
console.log('built', langs.length, 'landing pages for', base);
