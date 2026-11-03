#!/usr/bin/env bash
# Splits each app folder into its own git repository, keeping that folder's history.
# Usage: scripts/split-apps.sh <output-dir>
# Creates <output-dir>/<repo>/ with main = the app folder as repo root, a deploy workflow
# (manual trigger only) and, for QuickBill, its docs/quickbill copied in. Nothing in this
# repo is changed except the new output folder. Push each one after creating its GitHub repo.
set -euo pipefail

SRC="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${1:?usage: split-apps.sh <output-dir>}"
mkdir -p "$OUT"
GIT_ID=(-c user.name="Claude" -c user.email="noreply@anthropic.com")

# repo | folder in App-Multi | Cloudflare Pages project | test command | build command
SPECS=(
  "quickbill|invoice-pwa|quickbill-app|npm test|npm run build"
  "stampbook|stampbook|stampbook|node --test test/*.test.js|node scripts/build.js --dist"
  "stayline|stayline|stayline-family|node --test test/*.test.js|node scripts/build-pages.js"
  "marginlog|marginlog|marginlog|node --test test/*.test.js|node scripts/build.js"
  "lendnest|lendnest|lendnest|node --test test/*.test.js|node scripts/build.js --dist"
  "quotanest|quotanest|quotanest|node --test test/*.test.js|node scripts/build.js --dist"
  "shadepad|shadepad|shadepad|node --test test/*.test.js|node scripts/build.js --dist"
)

for spec in "${SPECS[@]}"; do
  IFS='|' read -r repo dir project test_cmd build_cmd <<< "$spec"
  dest="$OUT/$repo"
  rm -rf "$dest"
  mkdir -p "$dest"
  git -C "$dest" init -q -b main

  # History of this folder only, with the folder prefix removed.
  sha="$(git -C "$SRC" subtree split --prefix="$dir" HEAD)"
  git -C "$dest" fetch -q --no-tags "$SRC" "$sha:refs/heads/imported"
  git -C "$dest" checkout -q -B main imported && git -C "$dest" branch -q -D imported

  # Deploy workflow: same steps as App-Multi's deploy-cloudflare.yml, for this repo only.
  # Manual trigger only, so it cannot race the App-Multi workflow on the same Pages project.
  mkdir -p "$dest/.github/workflows"
  cat > "$dest/.github/workflows/deploy-cloudflare.yml" <<YAML
# Deploys this app to its existing Cloudflare Pages project ($project). Runs only from the
# Actions tab (workflow_dispatch) until the App-Multi workflow is retired. Needs repository
# secrets CLOUDFLARE_API_TOKEN ("Cloudflare Pages: Edit") and CLOUDFLARE_ACCOUNT_ID; without
# them the deploy step is skipped.
name: Deploy to Cloudflare Pages

on:
  workflow_dispatch:

permissions:
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    env:
      CLOUDFLARE_API_TOKEN: \${{ secrets.CLOUDFLARE_API_TOKEN }}
      CLOUDFLARE_ACCOUNT_ID: \${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - name: Test
        run: $test_cmd
      - name: Build
        run: $build_cmd
      - name: Deploy
        if: \${{ env.CLOUDFLARE_API_TOKEN != '' && env.CLOUDFLARE_ACCOUNT_ID != '' }}
        run: npx --yes wrangler@4 pages deploy dist --project-name=$project --branch=main --commit-dirty=true
      - name: Note when skipped
        if: \${{ env.CLOUDFLARE_API_TOKEN == '' || env.CLOUDFLARE_ACCOUNT_ID == '' }}
        run: echo "::notice::Deploy skipped - add CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID repository secrets."
YAML
  git -C "$dest" add -A
  git -C "$dest" "${GIT_ID[@]}" commit -q --allow-empty -m "Add Cloudflare Pages deploy workflow (manual trigger)" \
    -m "Claude-Session: https://claude.ai/code/session_01CBN3FT2iWKczg37Pa5wDa7"

  if [ "$repo" = "quickbill" ]; then
    # README links to ../docs/quickbill, which only existed in App-Multi. Copy it in and fix the links.
    mkdir -p "$dest/docs/quickbill"
    cp "$SRC"/docs/quickbill/*.md "$dest/docs/quickbill/"
    sed -i 's#\.\./docs/quickbill/#docs/quickbill/#g' "$dest/README.md"
    git -C "$dest" add -A
    git -C "$dest" "${GIT_ID[@]}" commit -q -m "Copy QuickBill launch docs from App-Multi docs/quickbill" \
      -m "Claude-Session: https://claude.ai/code/session_01CBN3FT2iWKczg37Pa5wDa7"
  fi

  echo "$repo: $(git -C "$dest" rev-list --count HEAD) commits -> $dest"
done
