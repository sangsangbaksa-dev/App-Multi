/* The ONE place to change before launch. Used by the app, the landing pages, the legal pages and scripts/build.js.
   Everything marked PLACEHOLDER must be replaced with real values. */
window.SB_SITE = {
  siteUrl: 'https://stampbook-5kf.pages.dev', /* change when a custom domain is connected */
  checkoutUrl: 'https://quickbillapp.lemonsqueezy.com/checkout/buy/bb6de2a5-9e61-41f6-b5f6-00296a9302b6', /* Lemon Squeezy checkout link */
  supportEmail: 'sangsangbaksa@gmail.com', /* also the refund contact */
  price: '$19',
  freeLimit: 3,
  /* Optional cloud login/backup (Supabase). Empty strings turn the feature off. The publishable key is public by design; row level security protects the data. */
  supabaseUrl: 'https://fiiljdmbnmvtayffsydb.supabase.co',
  supabaseKey: 'sb_publishable_Ega8x9XFjiT13lh4L6fArQ_by7MILgA'
};
