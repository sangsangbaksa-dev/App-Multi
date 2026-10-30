# Hosting Stayline on Cloudflare Pages

Why: Vercel's free Hobby plan does not allow commercial use, so a paid product should not run there. The existing Vercel deployment (`stayline-days`) was left untouched; this adds a Cloudflare Pages setup alongside it. Cloudflare's own free-plan terms were **not** checked here: read them before selling.

## What was added
| File | Purpose |
|---|---|
| `functions/api/license.js` | Pages Function for `POST /api/license` (same URL and behaviour as `api/license.js` on Vercel; shares its `verify()` code) |
| `_headers` | Same security headers and CSP as `vercel.json`, plus `no-cache` for `/app/sw.js` |
| `scripts/build-pages.js` | Regenerates the site and copies only public files into `dist/` |
| `.gitignore` | Ignores `dist/`, `node_modules/`, `.wrangler/` |

`vercel.json` had no redirects, only `cleanUrls` and headers. Pages serves `/privacy` for `privacy.html` and `/app/` for `app/index.html` by default, so no `_redirects` file is needed. Add one only if you later need a redirect.

## Pages project settings
| Setting | Value |
|---|---|
| Production branch | the branch you release from (after merging PR #3, `main`) |
| Framework preset | None |
| Root directory | `stayline` |
| Build command | `node scripts/build-pages.js` |
| Build output directory | `dist` |
| Environment variable | `NODE_VERSION` = `22` |
| Environment variables (production) | `LS_STORE_ID`, `LS_PRODUCT_ID` (Lemon Squeezy numeric IDs) |

`functions/` is picked up from the root directory (`stayline/functions`). No `package.json` or install step is needed.

## Checked locally (2026-10-30)
Ran `wrangler pages dev dist` (wrangler 4.156.0, local workerd), with `dist/` built by `scripts/build-pages.js`:
- `/`, `/privacy`, `/ko/`, `/ko/privacy`, `/app/`, `/app/sw.js`, `/sitemap.xml` return 200; CSP, nosniff and referrer headers present on pages; `no-cache` on `sw.js`.
- `POST /api/license` without env vars returns `{"configured":false}`; with the two variables set, a malformed key returns 400; a well-formed key returns 502 because the sandbox blocks outbound calls to Lemon Squeezy (so the success path was only tested with mocks).
- Unit tests (`test/cf-pages.test.js`) cover the function logic with a mocked Lemon Squeezy and check `dist/` contents and that the CSP equals the one in `vercel.json`.

**Not checked:** a real deploy on Cloudflare, behaviour with your domain, and a real licence validation.

## Your steps (no account has been created for you)
1. [ ] Create a Cloudflare account (free plan) and read its terms for commercial use.
2. [ ] Workers & Pages → Create → Pages → Connect to Git → authorise the GitHub app for `sangsangbaksa-dev/App-Multi` (select only this repository).
3. [ ] Enter the settings in the table above. Save and deploy. You get `https://<project>.pages.dev`.
4. [ ] In the project → Settings → Variables and Secrets add `NODE_VERSION`, `LS_STORE_ID`, `LS_PRODUCT_ID`. Redeploy.
5. [ ] Open `https://<project>.pages.dev/app/` and the landing pages; check the Pro key flow with a real test purchase.
6. [ ] Custom domain: Pages project → Custom domains → add. If the domain's DNS is on Cloudflare this is one click; otherwise follow the CNAME instructions shown. Then set `siteUrl` in `config.js`, run `node scripts/build-site.js`, commit.
7. [ ] Only after the Pages site works: decide whether to delete the Vercel project `stayline-days`, and set `siteUrl` to the new address so canonical and sitemap URLs do not point at Vercel.
