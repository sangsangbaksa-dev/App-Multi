# QuickBill

A small invoicing tool for people who work alone. Static files, no backend: data sits in the
browser's localStorage, so hosting costs nothing and there is no customer data to protect.

Free: 3 invoices/quotes, 2 sheets, 2 documents, every currency and language, print to PDF, JSON backup/restore.
Full license ($19, once): unlimited documents, no footer, logo, repeat billing, tracked-time
billing, CSV export, client ledger and overdue ageing.

## What it does
- Invoices and quotes (QUO- numbering); a quote converts to an invoice in one click.
- Tax, discount, deposits and part-payments; status follows the balance.
- Late fees (per started 30 days) and a copy-paste payment reminder per language.
- Dashboard per currency, ageing buckets, per-client ledger.
- Timer that turns tracked hours into invoice lines.
- Sheets: a formula grid (SUM, AVERAGE, MIN, MAX, COUNT, ROUND, ABS, IF, cell references), CSV import/export, fill from invoices, rows to invoice. `sheet.js` is the engine; formulas are parsed by hand, no eval.
- Documents: proposal, agreement and scope templates with {{client}}/{{from}}/{{date}} fields, own templates, print or save as PDF.
- English, Korean, Japanese, Chinese, Spanish with local currency/date formats.

## Selling it
Put your checkout link in `config.js`, deploy the folder to any static host, and email buyers a key
made with `makeLicense()` in `logic.js`. The key check runs client-side, so treat it as a courtesy lock.

## Development
- `npm test` runs the unit tests (`node --test`).
- `python3 -m http.server 8123` then `node tests/e2e.cjs` runs the browser test (needs Playwright).

## Brand assets

The design lives in Figma (colour variables, type styles, icon, logo lockup and the OG image frame). The wordmark is set in Newsreader (SIL OFL) with a tapered accent underline drawn in `design/build_logo.py`; it is not a copy of any Canva or other third-party template, and no template or stock element is embedded. `node` is not needed for it, `python3 design/build_logo.py` (fonttools, brotli) outlines it into `logo.svg`, `icon.svg` and `icon-maskable.svg`. `design/og.html` is the HTML twin of the OG frame, and `node design/render.cjs` renders `og.png` and the PNG icons from it (needs Playwright). Fonts are Newsreader and Inter, self-hosted in `fonts/` under the SIL OFL, so no request leaves the page.

## Video module

The Video tab tracks edit projects for clients: delivery date, project price (one click to a quote or invoice line), revision rounds included in the quote, timecoded change requests per round (editable in place), delivery links (links only, no files are stored), client approval, and a button that turns extra rounds into invoice lines. Extra rounds count as billed only when that invoice is saved. Projects can be duplicated for repeat clients, and the list sorts past-due work first. Free keeps one project; Pro keeps any number, exports the revision list as CSV and prints a client-ready revision report.

Storage and safety:
- The video module was removed. Any data it saved under `qb.video` stays in the browser untouched; the app no longer reads it.
- `qb.meta` holds the app schema (now 2). On the first run after an upgrade the old keys are copied to `*.bak-v1`. Data from a newer schema is opened read-only and never overwritten.
- Backups are `v: 2` (invoices, logo). Older backups that contain a `video` section still restore the invoices and ignore that section.
- Delivery links must be http(s). CSV cells that start with `= + - @` are quoted so spreadsheets don't run them.

Everyday details:
- With four or more invoices a search box and a status filter (all, unpaid, overdue, paid, quotes) appear above the list. Any invoice can be duplicated as a new draft.
- Invoice and document cards work from the keyboard (Tab, Enter, Space).
- If the browser refuses to save (private window, full storage), a banner says so and points to Backup.
- While `checkoutUrl` in `config.js` is still the placeholder, the upgrade dialog hides the buy button and says purchases are not open, instead of sending people to a dead link.

Tests: `npm test` (logic and storage), `node tests/e2e.cjs`, `node tests/e2e-polish.cjs` against `python3 -m http.server 8123`.

## Launch setup

- `config.js` is the one place for the checkout link, support email, price and site address. Terms, privacy, the landing page and the upgrade dialog read it.
- `landing.src.html` is the landing page source. `node design/seo.cjs` renders it into `index.html` and the language pages (`ko/`, `ja/`, `zh/`, `es/`) with canonical and hreflang links, JSON-LD, `sitemap.xml` and `robots.txt`. Edit the source, not `index.html`, and run the script after changing the source, `i18n.js`, `config.js` or the site address.
- `api/license.js` checks Pro keys with Lemon Squeezy's license API. It needs `LEMONSQUEEZY_PRODUCT_ID (optional)` as an environment variable (Pages Functions read it from `context.env`); without them the app keeps accepting offline keys. `license.js` is the browser side: keys the server accepted are re-checked about once a week, and only a clear refusal switches Pro off (data is never touched).
- `vercel.json` sets the security headers, including the content security policy. `node tests/serve.cjs` serves the folder with the same headers (and runs the license function) for the e2e tests.
- Steps that need the owner (payment account, domain, environment variables, tax questions) are in `../docs/quickbill/launch-checklist.md`; announcement and pilot texts are in `../docs/quickbill/copy.md`.

Tests: also `node tests/e2e-license.cjs` and `node tests/e2e-site.cjs`.
