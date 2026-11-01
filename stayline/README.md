# Stayline

A day counter for stay limits: Schengen 90/180, the 183-day tax rule, or a custom limit. Shows days left, a 180-day strip, and plans a trip (longest stay from an arrival date, or the earliest arrival for N days). Static site, no server, no account, no location access; data in localStorage. 5 languages (en, ko, ja, zh, es). Per-counter permit/visa expiry warning, trip editing, restore from backup is sanitised. Also: a what-if itinerary (replay several future trips against the rule, with the break day, a trim and an earliest start for each), a key-dates list (last allowed day, breach ahead, room again, permit end), a 6-month days-left forecast, a group planner (one trip for several counters) a 12-month usage chart, arrival-date windows, paste-to-import trips an urgent-items banner, a month calendar view, a 3-year overstay audit and undo for deletions and bulk adds, auto-fill of the earliest fitting itinerary, and opt-in open-time reminders (Notification API). Free: 1 counter. Pro: unlimited counters, CSV, calendar (.ics) export, printable summary.

- `config.js` the one place for checkout link, support email, price, site URL (read by the app and by the site generator)
- `app/` the app; `api/license.js` serverless licence check (Gumroad; env `GUMROAD_PRODUCT_ID`; without them the app falls back to the offline placeholder key check)
- `scripts/build-site.js` generates the landing, privacy and terms pages for 5 languages, `sitemap.xml`, `robots.txt` from `scripts/landing-strings.json` and `scripts/site-i18n.js`. Run it after editing `config.js` or any string.
- `functions/api/license.js`, `_headers`, `scripts/build-pages.js`: Cloudflare Pages version of the same site (see `docs/cloudflare-pages.md`)
- `docs/` launch checklist, copy and post drafts, outreach plan, calculation verification
- Tests: `node --test test/core.test.js test/license.test.js` (unit, incl. Cloudflare function and dist build), `NODE_PATH=$(npm root -g) node test/e2e.js [shots-dir]` (Playwright)
- Rules: first and last day count as full days; overlapping trips count once; arithmetic on UTC day numbers.
- Placeholders to replace before charging: `config.js` (`checkoutUrl`, `supportEmail`, `price`, `siteUrl`), then rebuild the site. The offline licence check in `app/core.js` is a placeholder scheme (anyone can mint keys) and must be replaced with vendor-issued keys.
- Estimates only, not legal advice. Not verified against any official calculator.

## Why this niche
See `docs/why.md`.
