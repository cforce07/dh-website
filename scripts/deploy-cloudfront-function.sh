#!/usr/bin/env bash
#
# Publish infra/cloudfront-directory-index.js to the preview distribution.
#
# Run this only when that file changes. `scripts/deploy-preview.sh` does NOT
# call it — content deploys and edge-function deploys have different blast
# radii, and a routing function that breaks takes down every page at once,
# so it should never ride along with a routine content sync.
#
# Usage:  bash scripts/deploy-cloudfront-function.sh
#
set -euo pipefail

FN_NAME="directhired-directory-index"
DIST_ID="EQFX1V1KHG4IS"
PROFILE="directhired"
SRC="infra/cloudfront-directory-index.js"

cd "$(dirname "$0")/.."

ETAG=$(aws cloudfront describe-function --name "$FN_NAME" --profile "$PROFILE" \
  --query 'ETag' --output text)

echo "==> Updating DEVELOPMENT stage"
NEW_ETAG=$(aws cloudfront update-function --name "$FN_NAME" --if-match "$ETAG" \
  --function-config Comment="Rewrite directory paths to index.html for the private S3+OAC origin",Runtime=cloudfront-js-2.0 \
  --function-code "fileb://$SRC" --profile "$PROFILE" --query 'ETag' --output text)

# Test before publishing. A viewer-request function runs on EVERY request, so
# a broken one 500s the whole site — including the pages that were fine.
echo
echo "==> Testing"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
fail=0
check() { # uri, expected-rewritten-uri
  printf '{"version":"1.0","context":{"eventType":"viewer-request"},"viewer":{"ip":"1.2.3.4"},"request":{"method":"GET","uri":"%s","headers":{},"querystring":{},"cookies":{}}}' "$1" > "$TMP/ev.json"
  got=$(aws cloudfront test-function --name "$FN_NAME" --if-match "$NEW_ETAG" \
    --stage DEVELOPMENT --event-object "fileb://$TMP/ev.json" --profile "$PROFILE" \
    --query 'TestResult.FunctionOutput' --output text | grep -o '"uri":"[^"]*"' | cut -d'"' -f4)
  if [ "$got" = "$2" ]; then
    echo "    ok   $1 -> $got"
  else
    echo "    FAIL $1 -> $got (expected $2)"
    fail=1
  fi
}

check "/"                  "/index.html"
check "/pricing"           "/pricing/index.html"
check "/pricing/"          "/pricing/index.html"
check "/_astro/style.css"  "/_astro/style.css"
check "/sitemap-index.xml" "/sitemap-index.xml"
check "/robots.txt"        "/robots.txt"

if [ "$fail" -ne 0 ]; then
  echo
  echo "Tests failed — NOT publishing. The live function is unchanged."
  exit 1
fi

echo
echo "==> Publishing to LIVE"
aws cloudfront publish-function --name "$FN_NAME" --if-match "$NEW_ETAG" \
  --profile "$PROFILE" --query 'FunctionSummary.FunctionMetadata.FunctionARN' --output text

echo
echo "==> Invalidating CloudFront"
aws cloudfront create-invalidation --distribution-id "$DIST_ID" --paths "/*" \
  --profile "$PROFILE" --query 'Invalidation.Id' --output text
