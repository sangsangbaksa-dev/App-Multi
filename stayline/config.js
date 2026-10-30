/* The one place to change before launch. Used by the app at runtime, and by the site generator:
   after editing, run `node scripts/build-site.js` to regenerate the landing, privacy and terms pages, sitemap and robots.
   PLACEHOLDERS: checkoutUrl and supportEmail are not real yet. */
(function (root) {
  var CFG = {
    siteUrl: 'https://stayline-days.vercel.app',
    checkoutUrl: 'https://example.com/PLACEHOLDER-checkout',
    supportEmail: 'support@example.com',
    price: '$12',
    priceAmount: '12',
    priceCurrency: 'USD',
    freeLimit: 1,
    licenseApi: '/api/license'
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = CFG; else root.SL_CONFIG = CFG;
})(typeof window !== 'undefined' ? window : globalThis);
