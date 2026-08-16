#!/usr/bin/env bash
#
# Map the distribution's 403 and 404 responses to /404.html, with a 404
# status.
#
# WHAT THIS FIXES. The bucket is private and served through Origin Access
# Control, so CloudFront asks S3 for the object key literally and OAC answers
# a missing key with 403 rather than 404 — it will not tell an anonymous
# caller whether an object exists. infra/cloudfront-directory-index.js
# rewrites /whatever to /whatever/index.html, so a mistyped URL asks for a
# key that is not there and the visitor gets a bare XML AccessDenied
# document: no header, no footer, no way back, and a 403 status telling
# search engines the page is forbidden rather than absent.
#
# Run this ONCE, after a deploy that has put dist/404.html into the bucket.
# It is idempotent, so re-running it is safe and does nothing.
#
# Usage:  bash scripts/deploy-cloudfront-error-pages.sh
#
# It does NOT deploy content. scripts/deploy-preview.sh does that, and this
# deliberately does not call it: a distribution-config update and a content
# sync have different blast radii, and `update-distribution` replaces the
# WHOLE configuration of the distribution rather than patching it — which is
# why the patch is applied by a program that verifies nothing else moved
# (scripts/cloudfront-error-responses.mjs), and why that program's self-test
# runs before this script touches AWS at all.
#
set -euo pipefail

DIST_ID="EQFX1V1KHG4IS"
PROFILE="directhired"
DOMAIN="didceb5na1cjo.cloudfront.net"
ERROR_PAGE="dist/404.html"

cd "$(dirname "$0")/.."

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

# ---------------------------------------------------------------------
# Tests. Every one of these runs BEFORE update-distribution is called, and
# any failure exits non-zero with the live distribution untouched.
# ---------------------------------------------------------------------

echo "==> Testing before publishing"

# 1. The transform itself. A broken patch is caught here, before anything is
#    fetched, so a bad edit to the .mjs cannot reach AWS.
echo "  1. the patch program"
node scripts/cloudfront-error-responses.mjs --self-test

# 2. The built artefact this whole change is for. Checked for the property
#    that makes serving it at /404.html safe rather than merely for
#    existence: dist/404.html answers 200 when fetched directly, so without
#    `noindex` the site would be publishing a thin, contentless, indexable
#    page. Built by `npm run build` from src/pages/404.astro.
echo "  2. the built 404 page"
if [ ! -f "$ERROR_PAGE" ]; then
  echo "    FAIL $ERROR_PAGE does not exist. Run: npm run build"
  exit 1
fi
if ! grep -q 'name="robots"' "$ERROR_PAGE"; then
  echo "    FAIL $ERROR_PAGE carries no robots meta — it would be indexable at /404.html"
  exit 1
fi
echo "    ok   $ERROR_PAGE is built and declines indexing"

# 3. THE ONE THAT ACTUALLY MATTERS. The error page must already be IN THE
#    BUCKET. CloudFront fetches ResponsePagePath from the origin like any
#    other object; if the key is missing, every 404 on the site turns into
#    CloudFront's own generic error page instead — strictly worse than the
#    AccessDenied document being replaced, and the mapping would look
#    successfully applied while making things worse.
#
#    Note this URL has a dot in its last path segment, so the directory-index
#    function passes it through untouched (see infra/cloudfront-directory-index.js).
echo "  3. the error page is already served from the origin"
STATUS=$(curl -s -o /dev/null -w '%{http_code}' "https://$DOMAIN/404.html" || echo "000")
if [ "$STATUS" != "200" ]; then
  echo "    FAIL https://$DOMAIN/404.html answered $STATUS, expected 200."
  echo "         Deploy the content first:  bash scripts/deploy-preview.sh"
  echo "         NOT publishing. The distribution is unchanged."
  exit 1
fi
echo "    ok   https://$DOMAIN/404.html -> 200"

# ---------------------------------------------------------------------
# Fetch, patch, verify.
# ---------------------------------------------------------------------

echo
echo "==> Fetching the current distribution config"
aws cloudfront get-distribution-config --id "$DIST_ID" --profile "$PROFILE" \
  --query 'DistributionConfig' --output json > "$TMP/config.json"
ETAG=$(aws cloudfront get-distribution-config --id "$DIST_ID" --profile "$PROFILE" \
  --query 'ETag' --output text)
echo "    etag: $ETAG"

echo
echo "==> Patching"
# Writes $TMP/patched.json. Exit 3 means the distribution already carries
# exactly this mapping; exit 1 means the result would carry the wrong
# mapping, a soft 404, or a change to a part of the config this script has no
# business touching — in which case nothing is sent to AWS at all.
#
# `if cmd` rather than a bare call, because `set -e` would abort on the
# non-zero exit before it could be read. The comparison is made in the
# program rather than here for the reason recorded in its header: the AWS
# CLI's JSON formatting and the program's differ in whitespace, so `cmp` on
# the two files would report a change on every single run.
if node scripts/cloudfront-error-responses.mjs "$TMP/config.json" "$TMP/patched.json"; then
  :
else
  rc=$?
  if [ "$rc" -eq 3 ]; then
    echo
    echo "==> Nothing to do: the distribution already carries this mapping."
    exit 0
  fi
  echo
  echo "Patch refused — NOT publishing. The distribution is unchanged."
  exit "$rc"
fi

# ---------------------------------------------------------------------
# Publish.
# ---------------------------------------------------------------------

echo
echo "==> Publishing to distribution $DIST_ID"
aws cloudfront update-distribution --id "$DIST_ID" --if-match "$ETAG" \
  --distribution-config "file://$TMP/patched.json" --profile "$PROFILE" \
  --query 'Distribution.Status' --output text

echo
echo "==> Invalidating"
# /404.html itself, and the root pattern, because any path that previously
# answered 403 may be cached as such at an edge.
aws cloudfront create-invalidation --distribution-id "$DIST_ID" \
  --paths "/404.html" "/*" --profile "$PROFILE" \
  --query 'Invalidation.Id' --output text

echo
echo "==> Waiting for the distribution to deploy (this takes a few minutes)"
aws cloudfront wait distribution-deployed --id "$DIST_ID" --profile "$PROFILE"

# ---------------------------------------------------------------------
# Verify what actually shipped. Cannot refuse to publish at this point —
# it already has — but a mapping that did not take effect must not be
# reported as done.
# ---------------------------------------------------------------------

echo
echo "==> Verifying against the live distribution"
fail=0
check() { # url, expected-status
  got=$(curl -s -o "$TMP/body.html" -w '%{http_code}' "$1" || echo "000")
  if [ "$got" = "$2" ]; then
    echo "    ok   $1 -> $got"
  else
    echo "    FAIL $1 -> $got (expected $2)"
    fail=1
  fi
}

# A route that does not exist, in both shapes the directory-index function
# handles: extensionless and trailing-slash.
check "https://$DOMAIN/no-such-page"  "404"
check "https://$DOMAIN/no-such-page/" "404"
# ...and a nested one, which takes the same code path as /services/<slug>
# will when sub-project 3 ships.
check "https://$DOMAIN/services/no-such-service" "404"
# The pages that DO exist must be unaffected. A CustomErrorResponse that
# swallowed real pages would be the worst possible outcome of this change,
# and it is exactly the kind of thing nobody checks after a green deploy.
check "https://$DOMAIN/"         "200"
check "https://$DOMAIN/pricing/" "200"
check "https://$DOMAIN/contact/" "200"
check "https://$DOMAIN/404.html" "200"

# The body of a 404 must be OUR page, not CloudFront's generic one. Without
# this, a mapping pointing at a missing key would report four clean 404s.
if curl -s "https://$DOMAIN/no-such-page" | grep -q "That page isn"; then
  echo "    ok   the 404 body is the DirectHired page"
else
  echo "    FAIL the 404 body is not the DirectHired page"
  fail=1
fi

echo
if [ "$fail" -ne 0 ]; then
  echo "Live verification failed. The config WAS updated — inspect it with:"
  echo "  aws cloudfront get-distribution-config --id $DIST_ID --profile $PROFILE"
  exit 1
fi

echo "==> Done. Missing pages now answer 404 with the DirectHired 404 page."
