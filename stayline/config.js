/* The one place to change before launch. Used by the app at runtime, and by the site generator:
   after editing, run `node scripts/build-site.js` to regenerate the landing, privacy and terms pages, sitemap and robots.
   PLACEHOLDERS: checkoutUrl and supportEmail are not real yet. */
(function (root) {
  var CFG = {
    siteUrl: 'https://stayline-family.pages.dev',
    checkoutUrl: 'https://quickbillapp.lemonsqueezy.com/checkout/buy/77e23ea2-67e5-42cf-aa37-640751e9e71d',
    supportEmail: 'sangsangbaksa@gmail.com',
    price: '$19',
    priceAmount: '19',
    priceCurrency: 'USD',
    freeLimit: 1,
    licenseApi: '/api/license',
    /* Optional cloud login/backup (Supabase). Empty strings turn the feature off. The publishable key is public by design; row level security protects the data. */
    supabaseUrl: 'https://fiiljdmbnmvtayffsydb.supabase.co',
    supabaseKey: 'sb_publishable_Ega8x9XFjiT13lh4L6fArQ_by7MILgA'
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = CFG; else root.SL_CONFIG = CFG;
})(typeof window !== 'undefined' ? window : globalThis);
