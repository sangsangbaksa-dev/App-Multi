# Marginlog

A sealed incident log for disputes you may have to prove later: a noisy neighbour, a landlord who ignores repairs, a contractor who misses deadlines, a colleague crossing a line. Static site, no server, no account; data stays in the browser (localStorage + IndexedDB for photos). 5 languages (en, ko, ja, zh, es), installable PWA, works offline.

Live: https://marginlog.pages.dev

## What makes it different
- **Sealed entries**: each entry is SHA-256 fingerprinted together with the previous one (hash chain). Entries cannot be edited, only annotated or voided with a reason. Editing stored data outside the app breaks the chain and the report says where. Photos are hashed into the entry too. This shows the log was not rewritten; it is not a notarised timestamp.
- **Happening-now timer** (survives reload) that pre-fills start time and duration.
- **Pattern finder**: weekday x hour heat map, 8-week trend, quiet-hour breaches, longest calm stretch, "recorded late" flags (>48 h).
- **Evidence strength** score per entry with concrete tips.
- **Escalation ladder** per case type (talk, written notice, complaint, mediation, authority/legal) with answer deadlines and overdue warnings.
- **Report**: copy, print/PDF, Markdown, CSV (formula-injection safe), photos, and the seal check.
- Backup/restore (JSON incl. photos, seals re-checked on restore), search/filters, archive, delete with undo.

## Layout
- `app/` the PWA (`core.js` pure logic, `i18n.js`, `app.js` UI, `sw.js`, `manifest.json`)
- `scripts/build-site.js` generates the localized landing pages from `scripts/landing-strings.json`; `scripts/build.js` produces `dist/` for Cloudflare Pages (project `marginlog`, no server functions)
- Tests: `node --test test/*.test.js` (unit, i18n parity, site build); `NODE_PATH=$(npm root -g) node test/e2e.js [shots-dir]` (Playwright)
- Not legal advice. Evidence rules differ by country.
