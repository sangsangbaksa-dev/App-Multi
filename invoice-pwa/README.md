# QuickBill

A small invoicing tool for people who work alone. Static files, no backend: data sits in the
browser's localStorage, so hosting costs nothing and there is no customer data to protect.

Free: 3 documents, every currency and language, print to PDF, JSON backup/restore.
Full license ($19, once): unlimited documents, no footer, logo, repeat billing, tracked-time
billing, CSV export, client ledger and overdue ageing.

## What it does
- Invoices and quotes (QUO- numbering); a quote converts to an invoice in one click.
- Tax, discount, deposits and part-payments; status follows the balance.
- Late fees (per started 30 days) and a copy-paste payment reminder per language.
- Dashboard per currency, ageing buckets, per-client ledger.
- Timer that turns tracked hours into invoice lines.
- English, Korean, Japanese, Chinese, Spanish with local currency/date formats.

## Selling it
Put your checkout link in `config.js`, deploy the folder to any static host, and email buyers a key
made with `makeLicense()` in `logic.js`. The key check runs client-side, so treat it as a courtesy lock.

## Development
- `npm test` runs the unit tests (`node --test`).
- `python3 -m http.server 8123` then `node tests/e2e.cjs` runs the browser test (needs Playwright).
