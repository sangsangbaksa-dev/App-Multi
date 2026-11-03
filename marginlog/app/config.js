/* The one place to change before launch. Used by the app at runtime and by scripts/build-site.js.
   checkoutUrl is a placeholder until the Lemon Squeezy product exists; while it contains "example.com" the buy buttons stay hidden.
   Paid access switches on when the server has LEMONSQUEEZY_PRODUCT_ID set (see functions/api/license.js). */
(function (root) {
  var CFG = {
    siteUrl: 'https://marginlog.pages.dev',
    checkoutUrl: 'https://example.com/checkout/marginlog',
    licenseApi: '/api/license'
  };
  CFG.checkoutLive = !/example\.com/.test(CFG.checkoutUrl);
  if (typeof module !== 'undefined' && module.exports) module.exports = CFG; else root.ML_CONFIG = CFG;
})(typeof window !== 'undefined' ? window : globalThis);
