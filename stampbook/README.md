# Stampbook

A stamp card for prepaid lessons (tutors, coaches, instructors). Static site, no server, data in localStorage. 5 languages (en, ko, ja, zh, es). Free: 3 active packs. Pro: unlimited packs, balance links, CSV.

- `index.html` landing, `app/` the app, `privacy.html`
- Tabs: Packs, Calendar (month view, tap a day to see who was stamped) and Insights (6-month trend, busiest weekdays, per-student attendance, students gone quiet). Each pack can also have a weekly schedule (days + time): a Today list with one-tap stamping, planned days in the calendar, a `.ics` export, and a backup nudge after 14 days. Packs can be marked unpaid (shown in Insights with the amount awaiting), Insights also forecasts the next 30 days and searches lesson notes. Logic is in `app/core.js` (`monthGrid`, `dayMap`, `monthlyTrend`, `studentStats`, `quiet`, `overview`).
- Tests: `node --test test/*.test.js` (unit), `NODE_PATH=$(npm root -g) node test/e2e.js` and `node test/insights-e2e.js` and `node test/schedule-e2e.js` (Playwright)
- Launch: see `docs/launch-checklist.md`. All launch values live in `config.js`; `node scripts/build.js` (run by Vercel on deploy) regenerates the per-language landing pages, legal pages, sitemap and robots from it.
- Hosting: Cloudflare Pages (`docs/cloudflare-pages.md`; `functions/api/license.js`, `_headers`, `_redirects`, build `node scripts/build.js --dist`). Vercel config (`vercel.json`, `api/license.js`) is kept for the existing deployment. Shared logic: `lib/license-core.js`.
- `api/license.js`: Gumroad licence-key check, enabled by env vars `GUMROAD_PRODUCT_ID` (see `docs/license-server.md`).
- Old note, still true until those env vars are set: placeholders to replace before charging: `config.js` (`checkoutUrl`, `supportEmail`), the Pro link in `index.html`, contact in `privacy.html`. The offline licence check in `app/core.js` is a placeholder scheme (anyone can mint keys) and must be replaced with vendor-issued keys.
