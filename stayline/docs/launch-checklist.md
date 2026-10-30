# Stayline launch checklist (things only you can do)

The code is ready; these steps need your accounts or decisions. Nothing here has been done for you.

## 1. Decide
- [ ] Price. `$12 once` is a guess, not market-tested. Also decide whether a launch price is wanted.
- [ ] Refund policy. Terms draft says "refund within 14 days on request". Change `scripts/site-i18n.js` (`term[2]`) if you want something else.
- [ ] Business status. Whether you need a business registration or tax registration to sell depends on your country and income. Not checked here. If unsure, ask a tax adviser. A merchant-of-record platform handles sales tax/VAT collection for you, which is the usual reason to pick one (verify the current terms yourself).

## 2. Payments (Lemon Squeezy was the assumed platform; Paddle or others also work but the serverless function is written for Lemon Squeezy)
- [ ] Create a store, create a product "Stayline Pro" with **licence keys enabled**, set the price.
- [ ] Copy the checkout link into `config.js` → `checkoutUrl`.
- [ ] Note the Store ID and Product ID (numeric).
- [ ] In Vercel project `stayline-days` → Settings → Environment Variables add `LS_STORE_ID` and `LS_PRODUCT_ID`, then redeploy. Until both are set, the app uses the old placeholder offline key check, which **anyone can bypass** (do not sell before this is set).
- [ ] Buy your own product once (test mode if available) and activate the key in the app to see it work. This path has only been tested with mocks.

## 3. Email and domain
- [ ] Create a real support address, put it in `config.js` → `supportEmail`.
- [ ] Buy a domain (optional) and connect it in Vercel → Domains. Then set `config.js` → `siteUrl` to it.
- [ ] After any change to `config.js`, run `node scripts/build-site.js` (regenerates pages, sitemap, canonical and hreflang URLs), commit and deploy.

## 4. Before announcing
- [ ] Merge PR #3 into `main` (or point the Vercel production branch at your release branch). Vercel project settings for the other two apps need a root-directory fix; see the PR thread.
- [ ] Search Console: add the site, submit `/sitemap.xml`.
- [ ] Open the site on your own phone, add to home screen, try offline.
- [ ] Re-read Terms and Privacy once. They are plain-language drafts, not lawyer-reviewed.
- [ ] Decide whether to keep the "estimate only, not legal advice" notices exactly as they are. Recommended: yes.

## 5. After launch
- [ ] Watch for the first support emails and refund requests; note repeated questions and fold them into the FAQ.
- [ ] No analytics are installed on purpose. If you want numbers, use Vercel Web Analytics or Plausible and update the Privacy page to match.
