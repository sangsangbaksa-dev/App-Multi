# QuickBill – freelancer invoice PWA

**Why this idea:** every freelancer needs invoices, demand is evergreen, the app is
100% client-side (no server, no hosting cost, no user data liability), and it's
installable as a PWA. One person can maintain it.

**Monetization:** Free = 3 invoices + footer watermark. Pro (one-time ~$19) = unlimited,
no watermark, CSV export. Sell via Stripe Payment Link / Lemon Squeezy / Gumroad and
email the buyer a key made with `makeLicense()` (see `logic.js`).
The key check is offline (soft gate); move to server validation if piracy matters.

**Launch checklist:** set `checkoutUrl`/`price` in `config.js`, host the folder on any
static host (Vercel, Netlify, GitHub Pages), list on Product Hunt / r/freelance.
Ideas next: recurring invoices, client list, multi-language, Stripe pay-link on invoice.

## Dev
- `npm test` – unit tests (node:test)
- `python3 -m http.server 8123` then `node tests/e2e.cjs` – browser e2e (Playwright)
