# Stayline launch checklist (things only you can do)

The code is ready; these steps need your accounts or decisions. Nothing here has been done for you.

## 1. Decide
- [ ] Price: `$19` once (set by the owner). Not market-tested. Decide whether a launch price is wanted.
- [ ] Refund policy. Terms draft says "refund within 14 days on request". Change `scripts/site-i18n.js` (`term[2]`) if you want something else.
- [ ] Business status. Whether you need a business registration or tax registration to sell depends on your country and income. Not checked here. If unsure, ask a tax adviser. A merchant-of-record platform handles sales tax/VAT collection for you, which is the usual reason to pick one (verify the current terms yourself).

## 2. Payments (Gumroad; the serverless function is written for Gumroad's license API)
- [ ] Sign up at https://gumroad.com and connect a payout method (PayPal etc.). Korean residents' sign-up conditions and payouts were not checked from here: confirm on the sign-up screen (확인 필요).
- [ ] Create a digital product "Stayline Pro", price `$19` one-time, and turn on the **License key** option in the product settings (menu name to confirm on screen).
- [ ] Copy the product link (`https://<you>.gumroad.com/l/<permalink>`) into `config.js` → `checkoutUrl`.
- [ ] Note the product ID (Product ID) for the environment variable below.
- [ ] On the host that serves the live site, add `GUMROAD_PRODUCT_ID` (the product ID) as an environment variable, then redeploy (Cloudflare Pages: Settings → Variables and Secrets; see `cloudflare-pages.md`. Vercel Hobby is not allowed for commercial use, so use Cloudflare Pages for selling.) Until it is set, the app uses the old placeholder offline key check, which **anyone can bypass** (do not sell before this is set).
- [ ] Buy your own product once (Gumroad test purchase or a 100% discount code) and activate the key in the app to see it work. This path has only been tested with mocks.

## 3. Email and domain
- [ ] Create a real support address, put it in `config.js` → `supportEmail`.
- [ ] Buy a domain (optional) and connect it in Cloudflare Pages → Custom domains (see `cloudflare-pages.md`). Then set `config.js` → `siteUrl` to it.
- [ ] After any change to `config.js`, run `node scripts/build-site.js` (regenerates pages, sitemap, canonical and hreflang URLs), commit and deploy.

## 3b. Hosting
- [ ] Move to Cloudflare Pages by following `cloudflare-pages.md` (account, GitHub connection, settings, variables). Do this before taking payments.

## 4. Before announcing
- [ ] Merge PR #3 into `main` (or point the Vercel production branch at your release branch). Vercel project settings for the other two apps need a root-directory fix; see the PR thread.
- [ ] Search Console: add the site, submit `/sitemap.xml`.
- [ ] Open the site on your own phone, add to home screen, try offline.
- [ ] Re-read Terms and Privacy once. They are plain-language drafts, not lawyer-reviewed.
- [ ] Decide whether to keep the "estimate only, not legal advice" notices exactly as they are. Recommended: yes.

## 5. After launch
- [ ] Watch for the first support emails and refund requests; note repeated questions and fold them into the FAQ.
- [ ] No analytics are installed on purpose. If you want numbers, use Vercel Web Analytics or Plausible and update the Privacy page to match.
