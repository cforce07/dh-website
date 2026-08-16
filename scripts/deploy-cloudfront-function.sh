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
# ONE function, TWO distributions. Both associate it on viewer-request, so a
# publish here changes preview and production simultaneously and both have to
# be invalidated. This used to be a single DIST_ID.
PREVIEW_DIST_ID="EQFX1V1KHG4IS"
PROD_DIST_ID="E3R68EGASPTMJ3"
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
# A repo-relative temp dir, deliberately NOT `mktemp -d`.
#
# On Windows the AWS CLI is a native .exe while this script runs under Git
# Bash, and the two disagree about what `/tmp/...` means. mktemp -d returns a
# POSIX path the shell can write to and the CLI cannot read, so every
# test-function call died on "Unable to load paramfile ... No such file or
# directory" while the file plainly existed. A relative path resolves
# identically under both, and under Linux CI.
TMP=".tmp-cf-fn"
rm -rf "$TMP"
mkdir -p "$TMP"
trap 'rm -rf "$TMP"' EXIT
fail=0
# Sends the CANONICAL host explicitly. It used to send no host header at all,
# which still passed once the apex redirect landed — but only because an empty
# host fails to match the apex branch. Letting a rewrite case select its code
# path via an ABSENT header is exactly the kind of accident this suite exists
# to catch, so the header is now stated rather than assumed.
check() { # uri, expected-rewritten-uri
  printf '{"version":"1.0","context":{"eventType":"viewer-request"},"viewer":{"ip":"1.2.3.4"},"request":{"method":"GET","uri":"%s","headers":{"host":{"value":"www.directhired.com"}},"querystring":{},"cookies":{}}}' "$1" > "$TMP/ev.json"
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

# The apex branch returns a RESPONSE, not a request, so there is no rewritten
# uri for check() to read — it would see an empty string and report a
# meaningless failure. Assert on the Location header instead.
check_redirect() { # uri, host, expected-location
  printf '{"version":"1.0","context":{"eventType":"viewer-request"},"viewer":{"ip":"1.2.3.4"},"request":{"method":"GET","uri":"%s","headers":{"host":{"value":"%s"}},"querystring":{},"cookies":{}}}' "$1" "$2" > "$TMP/ev.json"
  got=$(aws cloudfront test-function --name "$FN_NAME" --if-match "$NEW_ETAG" \
    --stage DEVELOPMENT --event-object "fileb://$TMP/ev.json" --profile "$PROFILE" \
    --query 'TestResult.FunctionOutput' --output text | grep -o '"location":{"value":"[^"]*"' | cut -d'"' -f6)
  if [ "$got" = "$3" ]; then
    echo "    ok   $2$1 -> $got"
  else
    echo "    FAIL $2$1 -> $got (expected $3)"
    fail=1
  fi
}

# Proves a host does NOT redirect: the function must return a request with a
# rewritten uri, and no Location header at all. A redirect that fired on the
# wrong host would send the canonical name to itself forever, and would do it
# on the preview distribution too, since one function serves both.
check_no_redirect() { # uri, host, expected-rewritten-uri
  printf '{"version":"1.0","context":{"eventType":"viewer-request"},"viewer":{"ip":"1.2.3.4"},"request":{"method":"GET","uri":"%s","headers":{"host":{"value":"%s"}},"querystring":{},"cookies":{}}}' "$1" "$2" > "$TMP/ev.json"
  out=$(aws cloudfront test-function --name "$FN_NAME" --if-match "$NEW_ETAG" \
    --stage DEVELOPMENT --event-object "fileb://$TMP/ev.json" --profile "$PROFILE" \
    --query 'TestResult.FunctionOutput' --output text)
  got=$(echo "$out" | grep -o '"uri":"[^"]*"' | cut -d'"' -f4)
  loc=$(echo "$out" | grep -o '"location"' || true)
  if [ "$got" = "$3" ] && [ -z "$loc" ]; then
    echo "    ok   $2$1 -> $got (no redirect)"
  else
    echo "    FAIL $2$1 -> uri=$got location=${loc:-none} (expected uri=$3, no location)"
    fail=1
  fi
}

check "/"                  "/index.html"
check "/pricing"           "/pricing/index.html"
check "/pricing/"          "/pricing/index.html"
check "/_astro/style.css"  "/_astro/style.css"
check "/sitemap-index.xml" "/sitemap-index.xml"
check "/robots.txt"        "/robots.txt"

# Nested routes. The function is generic and these take the same code path
# as /pricing, but this project has now shipped FIVE separate pieces of
# machinery written when the site had one page and silently wrong at two:
# a link allowlist, an accessibility script, this suite's cache patterns,
# the distribution itself, and a Lighthouse config that dropped pages past
# a default cap. Proving two route shapes out of the eventual seven is how
# that list got to five. Sub-project 3 ships /services/<slug> and
# /helpers/<slug>; they are tested here before they exist, not after they
# break.
check "/services/transfer-helper"   "/services/transfer-helper/index.html"
check "/services/transfer-helper/"  "/services/transfer-helper/index.html"
check "/helpers/indonesia"          "/helpers/indonesia/index.html"

# THE APEX REDIRECT.
#
# The negative cases below are the half that actually protects something. The
# positive case is obvious and would be noticed within minutes of a bad
# deploy; a host test that matched too broadly would redirect the canonical
# host to itself forever, and would do the same on the preview distribution,
# which shares this function and has nothing to do with the apex.
check_redirect "/"                       "directhired.com" "https://www.directhired.com/"
check_redirect "/pricing"                "directhired.com" "https://www.directhired.com/pricing"
check_redirect "/services/transfer-helper" "directhired.com" "https://www.directhired.com/services/transfer-helper"

check_no_redirect "/pricing" "www.directhired.com"           "/pricing/index.html"
check_no_redirect "/pricing" "didceb5na1cjo.cloudfront.net"  "/pricing/index.html"
check_no_redirect "/"        "notdirecthired.com"            "/index.html"

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
echo "==> Invalidating BOTH distributions"
# One function serves both, so publishing changes both. Invalidating only one
# would leave the other serving cached responses produced by the old code.
for D in "$PREVIEW_DIST_ID" "$PROD_DIST_ID"; do
  printf '    %s: ' "$D"
  aws cloudfront create-invalidation --distribution-id "$D" --paths "/*" \
    --profile "$PROFILE" --query 'Invalidation.Id' --output text
done
