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
DOMAIN="staging.directhired.com"

cd "$(dirname "$0")/.."

# UNGATED, and that is the point of staging.
#
# This used to run `npm run build`, which fails while any <Tbd> placeholder
# remains in the output. That is right for production and wrong here: staging
# is precisely where an unverified value should be VISIBLE, so it can be
# reviewed and chased. Gating it would block you from previewing the one thing
# you opened staging to look at.
#
# .github/workflows/ci.yml already reasons this way about build:dev — the
# <Tbd> gate is a release check, not a build step. scripts/deploy-production.sh
# keeps the gated build, which is where it belongs.
echo "==> Building (ungated — staging shows <Tbd> placeholders on purpose)"
npm run build:dev

echo
echo "==> Syncing dist/ to s3://$BUCKET"
# Long cache for fingerprinted assets: Astro hashes filenames under _astro/,
# and the font files are stable, so they can be cached hard.
#
# The HTML exclusion is `*.html`, NOT `index.html`. s3 sync matches these
# patterns against the whole key, so `index.html` matches only the key
# `index.html` at the root — `pricing/index.html` does not match it. While
# the site was one page that distinction was invisible; the moment /pricing
# shipped, it would have been served with max-age=31536000,immutable and
# every later deploy would have left visitors on a year-stale page that no
# invalidation could reach, because the browser would never revalidate.
aws s3 sync dist/ "s3://$BUCKET/" --delete --profile "$PROFILE" \
  --exclude "*.html" --exclude "*.xml" --exclude "robots.txt" \
  --cache-control "public,max-age=31536000,immutable" --only-show-errors

# Short cache for anything a deploy is meant to change immediately.
#
# `--delete` HAS TO BE ON THIS PASS TOO, and it was missing until 2026-08-17.
# The AWS CLI documents it as: "Files that exist in the destination but not
# in the source are deleted during sync. Note that files excluded by filters
# are excluded from deletion." Pass 1 above carries --delete but excludes
# *.html, so HTML is excluded from ITS deletion; this pass is the only one
# that sees HTML, and without --delete nothing could ever remove a page.
#
# A page deleted or renamed in src/ therefore stayed live on the bucket
# indefinitely, self-canonical and indexable. No dist/-reading test could see
# it, because by definition it is not in dist/ any more. The staging runbook
# records this bucket once holding "a stale deploy holding only index.html
# and pricing/" — the same shape.
#
# The `--exclude "*"` above is what makes this safe: deletion applies only to
# the filter's included set, so this pass can delete a stale .html, .xml or
# robots.txt and cannot touch a fingerprinted asset under _astro/.
aws s3 sync dist/ "s3://$BUCKET/" --delete --profile "$PROFILE" \
  --exclude "*" --include "*.html" --include "*.xml" --include "robots.txt" \
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
