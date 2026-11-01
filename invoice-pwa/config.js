// The only file to edit before launch. Landing page, app, terms and privacy pages all read from here.
// Placeholder values contain "example.com"; while they are in place the app hides the buy button and
// the legal pages show the address as "[support email]".
export const CONFIG = {
  appName: "QuickBill",
  // Public address of the site, no trailing slash. Also used by `node design/seo.cjs` for canonical links and the sitemap.
  siteUrl: "https://quickbill-app.pages.dev",
  // Lemon Squeezy checkout link of the product.
  checkoutUrl: "https://quickbillapp.lemonsqueezy.com/checkout/buy/4dd416db-616b-49ee-8092-dd861e74ebec",
  price: "$19 one-time",
  priceShort: "$19", // shown on the landing page and in the comparison table
  // After changing the price, run `node design/seo.cjs` so the static pages and the structured data follow.
  // Where buyers write for help and refunds.
  supportEmail: "sangsangbaksa@gmail.com",
  refundDays: 14,
  // Serverless function that checks license keys with the Lemon Squeezy License API (no secret needed).
  licenseApi: "/api/license",
  // Optional cloud login/backup (Supabase). Empty strings turn the feature off. The publishable key is public by design; row level security protects the data.
  supabaseUrl: "https://fiiljdmbnmvtayffsydb.supabase.co",
  supabaseKey: "sb_publishable_Ega8x9XFjiT13lh4L6fArQ_by7MILgA",
};

export const isPlaceholder = (v) => /example\.com/.test(String(v || ""));
export const checkoutLive = () => !isPlaceholder(CONFIG.checkoutUrl);
export const emailLive = () => !isPlaceholder(CONFIG.supportEmail);
