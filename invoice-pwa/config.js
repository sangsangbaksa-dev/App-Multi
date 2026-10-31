// The only file to edit before launch. Landing page, app, terms and privacy pages all read from here.
// Placeholder values contain "example.com"; while they are in place the app hides the buy button and
// the legal pages show the address as "[support email]".
export const CONFIG = {
  appName: "QuickBill",
  // Public address of the site, no trailing slash. Also used by `node design/seo.cjs` for canonical links and the sitemap.
  siteUrl: "https://quickbill-app.pages.dev",
  // Checkout link of the payment platform (a Polar checkout link, Stripe Payment Link ...).
  checkoutUrl: "https://example.com/buy-quickbill-pro",
  price: "$19 one-time",
  priceShort: "$19", // shown on the landing page and in the comparison table
  // After changing the price, run `node design/seo.cjs` so the static pages and the structured data follow.
  // Where buyers write for help and refunds.
  supportEmail: "support@example.com",
  refundDays: 14,
  // Serverless function that checks license keys with Polar. It reports "not configured" until the
  // POLAR_ORGANIZATION_ID and POLAR_BENEFIT_ID environment variables are set; the app then keeps using offline keys.
  licenseApi: "/api/license",
};

export const isPlaceholder = (v) => /example\.com/.test(String(v || ""));
export const checkoutLive = () => !isPlaceholder(CONFIG.checkoutUrl);
export const emailLive = () => !isPlaceholder(CONFIG.supportEmail);
