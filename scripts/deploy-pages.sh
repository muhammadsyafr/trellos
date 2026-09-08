#!/usr/bin/env bash
# Deploy to Cloudflare Pages (trellos.pages.dev).
#
# The repo's wrangler.jsonc is Workers-shaped (`main`), which Pages rejects, and
# `wrangler pages deploy` refuses `-c/--config` ("Pages does not support custom paths for
# the Wrangler configuration file"). So the Pages config is kept in wrangler.pages.jsonc
# and swapped into place for the duration of the deploy. The trap restores the Workers
# config on any exit path, including Ctrl-C.
set -euo pipefail
cd "$(dirname "$0")/.."

[ -f wrangler.pages.jsonc ] || { echo "missing wrangler.pages.jsonc" >&2; exit 1; }

restore() {
  [ -f .wrangler.workers.bak ] && mv -f .wrangler.workers.bak wrangler.jsonc
}
trap restore EXIT INT TERM

npm run build
cp wrangler.jsonc .wrangler.workers.bak
cp wrangler.pages.jsonc wrangler.jsonc
npx wrangler pages deploy --branch=master --commit-dirty=true "$@"
