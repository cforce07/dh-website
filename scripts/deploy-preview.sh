#!/usr/bin/env bash
#
# Deploy the built site to the S3 + CloudFront preview environment.
#
# This is the PREVIEW stack, not production. It serves from a CloudFront
# domain, not directhired.com. Wiring the real domain needs an ACM
# certificate in us-east-1 and a CNAME on the distribution — neither is
# set up here deliberately, because the production domain still serves
# the old placeholder site.
#
# Usage:  bash scripts/deploy-preview.sh
#
# Runs the GATED build (`npm run build`), so it will refuse to deploy
# while any <Tbd> placeholder remains. That is the point: the preview
# should never show unverified business information either.

set -euo pipefail

BUCKET="directhired-website-preview"
DIST_ID="EQFX1V1KHG4IS"
PROFILE="directhired"
DOMAIN="didceb5na1cjo.cloudfront.net"

cd "$(dirname "$0")/.."

echo "==> Building (gated — fails if any <Tbd> remains)"
npm run build

echo
echo "==> Syncing dist/ to s3://$BUCKET"
# Long cache for fingerprinted assets: Astro hashes filenames under _astro/,
# and the font files are stable, so they can be cached hard.
aws s3 sync dist/ "s3://$BUCKET/" --delete --profile "$PROFILE" \
  --exclude "index.html" --exclude "*.xml" --exclude "robots.txt" \
  --cache-control "public,max-age=31536000,immutable" --only-show-errors

# Short cache for anything a deploy is meant to change immediately.
aws s3 sync dist/ "s3://$BUCKET/" --profile "$PROFILE" \
  --exclude "*" --include "index.html" --include "*.xml" --include "robots.txt" \
  --cache-control "public,max-age=60,must-revalidate" --only-show-errors

echo
echo "==> Invalidating CloudFront"
INVALIDATION=$(aws cloudfront create-invalidation \
  --distribution-id "$DIST_ID" --paths "/*" --profile "$PROFILE" \
  --query 'Invalidation.Id' --output text)
echo "    invalidation: $INVALIDATION"

echo
echo "==> Done: https://$DOMAIN"
echo "    Invalidation takes a minute or two to complete."
