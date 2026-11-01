# App-Multi

Apps made by Claude. Each app is a static site (with a small Cloudflare Pages Function for the licence check) and lives in its own folder.

| App | What it is | Live (Cloudflare Pages) | Folder |
| --- | --- | --- | --- |
| QuickBill | Invoices, quotes, sheets and documents for solo workers | https://quickbill-app.pages.dev | [`invoice-pwa/`](invoice-pwa) |
| Stampbook | Stamp card for prepaid lessons (tutors, coaches) | https://stampbook-5kf.pages.dev | [`stampbook/`](stampbook) |
| Stayline | Day counter for stay limits (Schengen 90/180, 183-day rule) | https://stayline-family.pages.dev | [`stayline/`](stayline) |

## Tests

```sh
(cd invoice-pwa && npm test)
(cd stampbook && node --test test/*.test.js)
(cd stayline && node --test test/*.test.js)
```

See each folder's `README.md` for build, deploy and launch notes. QuickBill's Cloudflare notes are in [`docs/quickbill/`](docs/quickbill).

## Deploying

`.github/workflows/deploy-cloudflare.yml` tests, builds and deploys each app to its existing Cloudflare Pages project when its folder changes on `main`. Add two repository secrets (Settings → Secrets and variables → Actions): `CLOUDFLARE_API_TOKEN` (a token with the "Cloudflare Pages: Edit" permission) and `CLOUDFLARE_ACCOUNT_ID`. Until they exist the deploy step is skipped.

Licence checks need `GUMROAD_PRODUCT_ID` set as an environment variable on each Pages project (Cloudflare dashboard → the project → Settings → Variables and Secrets). Deploys from this workflow keep those variables.
