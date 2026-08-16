#!/usr/bin/env bash
#
# Deploy the built site to PRODUCTION — https://www.directhired.com
#
# scripts/deploy-preview.sh is the one that is safe to run without thinking.
# This one asks first. That confirmation prompt is the only meaningful
# difference in the logic below, and it is deliberate: the sync itself is
# identical, so the thing that separates a preview deploy from publishing to
# the public site is a human saying so out loud.
#
# Runs the GATED build (`npm run build`), so it refuses to deploy while any
# <Tbd> placeholder remains in the rendered output.
#
# NOTE ON WHAT THIS DOES AND DOES NOT DO. This uploads to the production
# bucket and invalidates the production distribution. Until the Route 53
# go-live swap has run, directhired.com still resolves to the old Exabytes
# host, so this publishes to a distribution the public is not yet pointed
# at. That is intentional — it is what lets the site be verified under its
# real hostname before anyone can reach it. See
# docs/runbooks/2026-08-16-dns-cutover.md.
#
# Usage:  bash scripts/deploy-production.sh
#
set -euo pipefail

BUCKET="directhired-website-prod"
DIST_ID="E3R68EGASPTMJ3"
PROFILE="directhired"
SITE="https://www.directhired.com"

cd "$(dirname "$0")/.."

echo "==> TARGET: PRODUCTION  ($SITE)"
echo "    bucket:       s3://$BUCKET"
echo "    distribution: $DIST_ID"
echo
read -r -p "Type 'deploy production' to continue: " CONFIRM
if [ "$CONFIRM" != "deploy production" ]; then
  echo "Aborted. Nothing was changed."
  exit 1
fi

echo
echo "==> Building (gated — fails if any <Tbd> remains)"
npm run build

echo
echo "==> Syncing dist/ to s3://$BUCKET"
# Long cache for fingerprinted assets: Astro hashes filenames under _astro/,
# and the font files are stable, so they can be cached hard.
#
# The HTML exclusion is `*.html`, NOT `index.html`. s3 sync matches these
# patterns against the whole key, so `index.html` would match only the key
# `index.html` at the root — `pricing/index.html` would not match it, and
# every page except the homepage would be served immutable for a year with
# no invalidation able to reach it. scripts/deploy-preview.sh carries the
# same note; it is repeated rather than referenced because getting it wrong
# here is unrecoverable for a year of cached browsers.
aws s3 sync dist/ "s3://$BUCKET/" --delete --profile "$PROFILE" \
  --exclude "*.html" --exclude "*.xml" --exclude "robots.txt" \
  --cache-control "public,max-age=31536000,immutable" --only-show-errors

# Short cache for anything a deploy is meant to change immediately.
aws s3 sync dist/ "s3://$BUCKET/" --profile "$PROFILE" \
  --exclude "*" --include "*.html" --include "*.xml" --include "robots.txt" \
  --cache-control "public,max-age=60,must-revalidate" --only-show-errors

echo
echo "==> Invalidating CloudFront"
INVALIDATION=$(aws cloudfront create-invalidation \
  --distribution-id "$DIST_ID" --paths "/*" --profile "$PROFILE" \
  --query 'Invalidation.Id' --output text)
echo "    invalidation: $INVALIDATION"

echo
echo "==> Done: $SITE"
echo "    Invalidation takes a minute or two to complete."
