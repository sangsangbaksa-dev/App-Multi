# Homebrief

Paid web app (PWA) for private tutors and coaches: type messy lesson notes, get a report written in the parent's language (20 languages, correct politeness) plus a copy in the tutor's language to check. Also writes replies to parents and monthly progress letters from saved notes. UI in en, ko, ja, zh, es.

## How the AI and the paywall work
- The browser never sees the AI key. `functions/api/[[route]].js` (Cloudflare Pages Function) calls `lib/core.js`, which validates the licence key with the Lemon Squeezy License API (pinned to `LEMONSQUEEZY_PRODUCT_ID`), enforces a monthly credit cap per licence in KV, then calls the Anthropic Messages API with a forced tool call. The model, system prompt and limits are server-side; the client only sends text.
- Credits: report 1, reply 1, summary 2. Failed AI calls are not charged. Default 300 credits per month (`MONTHLY_CREDITS`).
- Privacy: students and history stay in the browser. Before sending, names are replaced by `[[STUDENT]]`/`[[PARENT]]`/`[[TUTOR]]` (restored on screen), phone numbers and e-mails are removed. The server stores only a hash of the licence key, a monthly counter and a 1 h "licence ok" flag.

## Pages project settings (Cloudflare dashboard > homebrief > Settings)
| Name | Type | Value |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | secret | API key from console.anthropic.com |
| `LEMONSQUEEZY_PRODUCT_ID` | variable | numeric product id of the Homebrief product |
| `HB_KV` | KV namespace binding | namespace `homebrief` |
| `AI_MODEL` | variable, optional | default `claude-haiku-5-5`; `claude-sonnet-5-5` for higher quality |
| `MONTHLY_CREDITS` | variable, optional | default 300 |

Without these the app answers "not configured" and nothing is spent. Launch: set `checkoutUrl` (and `price`) in `config.js`; empty `checkoutUrl` shows "purchases open soon".

## Dev
`node --test test/*.test.js` (unit, fake KV/AI), `node scripts/build.js --dist`, then `NODE_PATH=$(npm root -g) node test/e2e.js [screenshot-dir]` (Playwright, fake Lemon Squeezy and AI). `scripts/make-images.js` renders icons and og.png from `icon.svg`.
