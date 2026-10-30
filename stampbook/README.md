# Stampbook

A stamp card for prepaid lessons (tutors, coaches, instructors). Static site, no server, data in localStorage. 5 languages (en, ko, ja, zh, es). Free: 3 active packs. Pro: unlimited packs, balance links, CSV.

- `index.html` landing, `app/` the app, `privacy.html`
- Tests: `node --test test/core.test.js` (unit), `NODE_PATH=$(npm root -g) node test/e2e.js` (Playwright)
- Placeholders to replace before charging: `app/config.js` (`checkoutUrl`, `supportEmail`), the Pro link in `index.html`, contact in `privacy.html`. The offline licence check in `app/core.js` is a placeholder scheme (anyone can mint keys) and must be replaced with vendor-issued keys.
