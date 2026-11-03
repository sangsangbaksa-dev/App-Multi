# Marginlog

A paid, sealed incident log for disputes you may have to prove later: a noisy neighbour, a landlord who ignores repairs, a contractor who misses deadlines, a colleague crossing a line. One-time purchase, no subscription. Data stays in the browser (localStorage + IndexedDB for photos); no account. 5 languages (en, ko, ja, zh, es), installable PWA, works offline.

Live: https://marginlog.pages.dev

## What makes it different
- **Sealed entries**: each entry is SHA-256 fingerprinted together with the previous one (hash chain). Entries cannot be edited, only annotated or voided with a reason. Editing stored data outside the app breaks the chain and the report says where. Photos are hashed into the entry too. This shows the log was not rewritten; it is not a notarised timestamp.
- **Happening-now timer** (survives reload) that pre-fills start time and duration.
- **Pattern finder**: weekday x hour heat map, 8-week trend, quiet-hour breaches, longest calm stretch, "recorded late" flags (>48 h).
- **Evidence strength** score per entry with concrete tips.
- **Escalation ladder** per case type (talk, written notice, complaint, mediation, authority/legal) with answer deadlines and overdue warnings.
- **Report**: copy, print/PDF, Markdown, CSV (formula-injection safe), photos, and the seal check.
- Backup/restore (JSON incl. photos, seals re-checked on restore), search/filters, archive, delete with undo.
- Optional encrypted backup: AES-GCM with a passphrase (PBKDF2-SHA256, 310k iterations, WebCrypto). A lost passphrase cannot be recovered.
- All-cases overview: entries, last entry, overdue deadlines and evidence score per case, one tap to open.

## Paid access
- `app/config.js`: `checkoutUrl` (Lemon Squeezy checkout). While it contains `example.com` the buy buttons stay hidden.
- `functions/api/license.js` (Cloudflare Pages Function, logic in `api/license.js`): `GET /api/license` reports whether paid access is on; `POST { key }` validates a key with the Lemon Squeezy License API.
- Paid access turns on when the Pages project has `LEMONSQUEEZY_PRODUCT_ID` set. Until then the app stays open (launch mode). When on, the app locks until a valid key is entered, rechecks it every 7 days, and keeps working offline with the last known answer.
- The lock is a client-side check, the same model as the sister apps. It stops casual use, not a determined one.

## Layout
- `app/` the PWA (`core.js` pure logic, `i18n.js`, `app.js` UI, `license.js` paid-access check, `config.js`, `sw.js`, `manifest.json`)
- `scripts/build-site.js` (reads `app/config.js`) generates the localized landing pages from `scripts/landing-strings.json`; `scripts/build.js` produces `dist/` for Cloudflare Pages (project `marginlog`, no server functions)
- Tests: `node --test test/*.test.js` (unit, i18n parity, site build); `NODE_PATH=$(npm root -g) node test/e2e.js [shots-dir]` (Playwright)
- Not legal advice. Evidence rules differ by country.
