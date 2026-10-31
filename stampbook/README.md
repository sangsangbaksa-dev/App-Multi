# Stampbook

A stamp card for prepaid lessons (tutors, coaches, instructors). Static site, no server, data in localStorage. 5 languages (en, ko, ja, zh, es). Free: 3 active packs. Pro: unlimited packs, balance links, CSV.

- `index.html` landing, `app/` the app, `privacy.html`
- Tests: `node --test test/core.test.js` (unit), `NODE_PATH=$(npm root -g) node test/e2e.js` (Playwright)
- Launch: see `docs/launch-checklist.md`. All launch values live in `config.js`; `node scripts/build.js` (run by Vercel on deploy) regenerates the per-language landing pages, legal pages, sitemap and robots from it.
- Hosting: Cloudflare Pages (`docs/cloudflare-pages.md`; `functions/api/license.js`, `_headers`, `_redirects`, build `node scripts/build.js --dist`). Vercel config (`vercel.json`, `api/license.js`) is kept for the existing deployment. Shared logic: `lib/license-core.js`.
- `api/license.js`: Polar licence-key check, enabled by env vars `POLAR_ORGANIZATION_ID` and `POLAR_BENEFIT_ID` (see `docs/license-server.md`).
- Old note, still true until those env vars are set: placeholders to replace before charging: `config.js` (`checkoutUrl`, `supportEmail`), the Pro link in `index.html`, contact in `privacy.html`. The offline licence check in `app/core.js` is a placeholder scheme (anyone can mint keys) and must be replaced with vendor-issued keys.
