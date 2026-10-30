# Stayline

A day counter for stay limits: Schengen 90/180, the 183-day tax rule, or a custom limit. Shows days left, a 180-day strip, and plans a trip (longest stay from an arrival date, or the earliest arrival for N days). Static site, no server, no account, no location access; data in localStorage. 5 languages (en, ko, ja, zh, es). Per-counter permit/visa expiry warning, trip editing, restore from backup is sanitised. Free: 1 counter. Pro: unlimited counters, CSV, printable summary.

- `index.html` landing, `app/` the app, `privacy.html`
- Tests: `node --test test/core.test.js` (20 unit), `NODE_PATH=$(npm root -g) node test/e2e.js [shots-dir]` (Playwright)
- Rules: first and last day count as full days; overlapping trips count once; arithmetic on UTC day numbers.
- Placeholders to replace before charging: `app/config.js` (`checkoutUrl`, `supportEmail`), the Pro link and `$12` price in `index.html`, contact in `privacy.html`. The offline licence check in `app/core.js` is a placeholder scheme (anyone can mint keys) and must be replaced with vendor-issued keys.
- Estimates only, not legal advice. Not verified against any official calculator.

## Why this niche
See `docs/why.md`.
