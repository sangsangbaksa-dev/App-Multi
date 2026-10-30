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

## v2 additions
- 5 languages (en/ko/ja/zh/es): auto-detected, switchable, localized currency + date formats.
- Landing page (`index.html`); the app lives at `app.html`.
- Positioning vs. subscription invoice tools: private (data never leaves the device), pay once, no account,
  usable free plan (3 invoices, PDF print, JSON backup/restore), 30-day refund.
- Pro features: logo, recurring invoices (weekly/monthly, drafts auto-created), CSV export, no watermark.

## Dev
- `npm test` – unit tests (node:test)
- `python3 -m http.server 8123` then `node tests/e2e.cjs` – browser e2e (Playwright)
