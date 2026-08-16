# Production Domain, Route 53 DNS and CloudFront — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Serve the built Astro site at `https://www.directhired.com` from a new private S3 + CloudFront production stack, with DNS authority moved from Exabytes to AWS Route 53 and Google Workspace mail carried across untouched.

**Architecture:** A new `directhired-website-prod` bucket in `ap-southeast-1`, private and reachable only through Origin Access Control, sits behind a new CloudFront distribution carrying an ACM certificate from `us-east-1` and both hostnames as aliases. The existing shared `directhired-directory-index` viewer-request function gains a host-guarded 301 from the apex to `www`, placed above its directory-index logic. A Route 53 hosted zone replaces the Exabytes zone, using ALIAS records — the only legal way to point a zone apex at CloudFront — and copies the single Google `MX` record verbatim. The nameserver change at Exabytes is the last step and the only public-facing one.

**Tech Stack:** AWS CLI v2 (profile `directhired`, account `354918409802`), Amazon S3, CloudFront (+ CloudFront Functions, `cloudfront-js-2.0`), AWS Certificate Manager, Route 53, Astro 5 static build, Vitest, Bash.

**Spec:** `docs/superpowers/specs/2026-08-16-dns-route53-cloudfront-production-design.md`

## Global Constraints

- **The ACM certificate MUST be requested in `us-east-1`.** CloudFront reads certificates from that region only, regardless of the origin bucket's region.
- **`SSLSupportMethod` MUST be `sni-only`.** `vip` provisions dedicated IPs and bills approximately **US$600/month**. The preview distribution's inert `vip` value must not be copied.
- **`MinimumProtocolVersion` MUST be `TLSv1.2_2021`.**
- **The `MX` record is copied verbatim: `1 smtp.google.com`, TTL 3600.** It is the domain's entire mail configuration.
- **No `TXT`, `SPF`, `DKIM`, `DMARC` or `CAA` record is created.** Spec §8 (decision D-E). The only `TXT`-adjacent records added are ACM's validation `CNAME`s.
- **The apex host test in the CloudFront Function MUST be an exact equality match**, never a suffix or substring test, so `www.directhired.com` and `didceb5na1cjo.cloudfront.net` never match.
- **Nothing at Exabytes is deleted or cancelled during this work**, and the hosting must remain live for at least one week after the nameserver flip (spec §7.3).
- **Existing resource identifiers** (verified 2026-08-16): preview bucket `directhired-website-preview`, preview distribution `EQFX1V1KHG4IS` (`didceb5na1cjo.cloudfront.net`), OAC `E2JJP00VJVN9QQ`, function `directhired-directory-index`, cache policy `658327ea-f89d-4fab-a63d-7e88639e58f6` (CachingOptimized), response headers policy `67f7725c-6f97-4210-82d7-5512b31e9d03` (Managed-SecurityHeadersPolicy), CloudFront's fixed ALIAS hosted-zone ID `Z2FDTNDATAQYW2`.
- **Old Exabytes nameservers, for rollback:** `ns135.sgcloudhosting.cloud`, `ns136.sgcloudhosting.cloud`.

## File Structure

| File | Responsibility |
|---|---|
| `infra/cloudfront-directory-index.js` | *Modified.* The single viewer-request function shared by both distributions. Gains the apex→www 301 above the existing directory-index rewrite. |
| `tests/infra.test.ts` | *Created.* Executes the function source in-process and asserts both the redirect and the preserved rewrite behaviour, plus that the redirect target cannot drift from `company.siteUrl`. |
| `scripts/deploy-cloudfront-function.sh` | *Modified.* New positive and negative redirect test cases; invalidates both distributions. |
| `scripts/deploy-production.sh` | *Created.* Gated build, two-pass cache-control sync to the prod bucket, invalidation, typed confirmation prompt. |
| `infra/prod-distribution.json` | *Created.* The distribution configuration, kept in the repo so the deployed shape is reviewable and reproducible. |
| `infra/prod-bucket-policy.json` | *Created.* The OAC bucket policy, scoped by `AWS:SourceArn`. |
| `docs/runbooks/2026-08-16-dns-cutover.md` | *Created.* Resource identifiers, the Exabytes zone backup, the verification checklist and the rollback procedure. Appended to as tasks complete. |
| `docs/OPEN-DECISIONS.md` | *Modified.* Records email hardening as an outstanding task. |

**Task dependency order.** Task 1 starts the certificate clock and its wait overlaps Tasks 2–3. Task 4 needs Task 1 issued plus Task 3. Tasks 5–6 need Task 4. Task 7 gates Task 9. Task 8 needs Task 4.

---

### Task 1: Back up the Exabytes zone and request the certificate

Started first because certificate issuance is the longest-latency item on the critical path. Tasks 2 and 3 proceed while it validates.

**Files:**
- Create: `docs/runbooks/2026-08-16-dns-cutover.md`

**Interfaces:**
- Consumes: nothing
- Produces: `CERT_ARN` — the ACM certificate ARN, an `arn:aws:acm:us-east-1:354918409802:certificate/<uuid>` string used by Task 4.

- [ ] **Step 1: Export the Exabytes zone (human action)**

In the Exabytes client area / cPanel **Zone Editor** for `directhired.com`, export or screenshot the complete record list. Save the raw text into the runbook created in Step 2.

This is insurance, not ceremony. A zone transfer is refused to the public, so records can only be found by guessing names. The spec's §2.1 inventory is thorough but cannot prove a negative — a verification `TXT` for some third-party service would be invisible to it.

- [ ] **Step 2: Create the runbook with the measured starting state**

Create `docs/runbooks/2026-08-16-dns-cutover.md`:

```markdown
# DNS cutover runbook — directhired.com

Date: 2026-08-16
Spec: `docs/superpowers/specs/2026-08-16-dns-route53-cloudfront-production-design.md`

## Rollback (read this first)

Set the domain's nameservers at Exabytes back to:

    ns135.sgcloudhosting.cloud
    ns136.sgcloudhosting.cloud

The old zone is intact — nothing at Exabytes is deleted or cancelled by this
work. Propagation applies in reverse, up to 48h for the `.com` delegation TTL.

**Do not cancel Exabytes DNS or hosting until at least 2026-08-23.** Resolvers
still holding the old delegation reach the domain — including its mail — only
through those nameservers.

## Starting state (authoritative, measured 2026-08-16)

| Name | Type | Value | TTL |
|---|---|---|---|
| `directhired.com` | NS | `ns135.sgcloudhosting.cloud`, `ns136.sgcloudhosting.cloud` | 86400 |
| `directhired.com` | A | `103.7.9.45` | 14400 |
| `directhired.com` | MX | `1 SMTP.GOOGLE.com` | 3600 |
| `directhired.com` | TXT | none | — |
| `www` | CNAME | `directhired.com` | 14400 |
| `mail` | CNAME | `directhired.com` | — |
| `webmail`, `cpanel`, `ftp`, `autodiscover`, `autoconfig` | A | `103.7.9.45` | — |

No SPF, DKIM, DMARC, CAA or wildcard record. SOA minimum TTL 86400.

## Exabytes zone export (Task 1, Step 1)

```
PASTE THE EXPORT HERE
```

## Resource identifiers

| Resource | Value |
|---|---|
| AWS account | `354918409802` |
| Certificate ARN | _(Task 1)_ |
| Prod bucket | `directhired-website-prod` (`ap-southeast-1`) |
| Prod distribution ID | _(Task 4)_ |
| Prod distribution domain | _(Task 4)_ |
| Route 53 hosted zone ID | _(Task 8)_ |
| Route 53 nameservers | _(Task 8)_ |
```

- [ ] **Step 3: Request the certificate**

Run:

```bash
CERT_ARN=$(aws acm request-certificate \
  --domain-name directhired.com \
  --subject-alternative-names www.directhired.com \
  --validation-method DNS \
  --region us-east-1 --profile directhired \
  --query CertificateArn --output text)
echo "$CERT_ARN"
```

Expected: an ARN of the form `arn:aws:acm:us-east-1:354918409802:certificate/<uuid>`. Record it in the runbook's identifier table.

- [ ] **Step 4: Read the two validation records**

ACM populates `ResourceRecord` a few seconds after the request, so this may return `None` on the first attempt. Re-run until both rows have values.

```bash
aws acm describe-certificate --certificate-arn "$CERT_ARN" \
  --region us-east-1 --profile directhired \
  --query 'Certificate.DomainValidationOptions[].{Domain:DomainName,Name:ResourceRecord.Name,Value:ResourceRecord.Value}' \
  --output table
```

Expected: two rows — one for `directhired.com`, one for `www.directhired.com` — each with a `_<token>.…` name and a `_<token>.acm-validations.aws.` value.

Record both pairs in the runbook. **Task 8 recreates them in Route 53**; omitting them there breaks automatic renewal silently, roughly eleven months later, and the first symptom is a browser TLS error in production.

- [ ] **Step 5: Add both validation records at Exabytes (human action)**

In the Exabytes Zone Editor add two `CNAME` records, using the exact `Name` and `Value` from Step 4. TTL 300 if the panel allows a choice.

⚠️ **Do not query these names before creating them.** The zone's SOA minimum TTL is 86400, so an `NXDOMAIN` observed now can be cached for 24 hours and stall validation for a day.

Some panels append the zone name automatically. If so, enter only the portion of the record name **before** `.directhired.com`. Verify after saving that the resulting record is not doubled (`_x.directhired.com.directhired.com`).

- [ ] **Step 6: Wait for issuance**

Run:

```bash
aws acm wait certificate-validated --certificate-arn "$CERT_ARN" \
  --region us-east-1 --profile directhired && echo ISSUED
```

Expected: `ISSUED`, typically within 5–30 minutes. The command polls and exits non-zero on timeout; re-run it if it times out while the records are correct.

**Proceed to Tasks 2 and 3 while this runs.** Only Task 4 is blocked on it.

If it stalls beyond ~30 minutes, verify the record resolves:

```bash
nslookup -type=CNAME <validation-name> 8.8.8.8
```

- [ ] **Step 7: Commit**

```bash
git add docs/runbooks/2026-08-16-dns-cutover.md
git commit -m "Runbook: zone backup, starting state and certificate request"
```

---

### Task 2: apex → www redirect in the shared CloudFront Function

Pure local work with a real test cycle. No AWS calls — publishing happens in Task 6, after the production distribution exists.

**Files:**
- Modify: `infra/cloudfront-directory-index.js`
- Create: `tests/infra.test.ts`

**Interfaces:**
- Consumes: `company.siteUrl` from `src/data/company.ts` (value `https://www.directhired.com`)
- Produces: `handler(event)` in `infra/cloudfront-directory-index.js` — returns a **response object** `{statusCode, statusDescription, headers}` for apex requests, and the **mutated request object** for every other host, exactly as before.

- [ ] **Step 1: Write the failing test**

Create `tests/infra.test.ts`:

```ts
/**
 * Guards on the CloudFront viewer-request function.
 *
 * The function is uploaded verbatim to a runtime with no module system, so
 * it cannot export anything and cannot be imported. It is evaluated here
 * instead — the same trick, and for the same reason, as the robots.txt test:
 * a file that cannot import `company` still has to agree with it.
 *
 * This matters more than a normal unit test. A viewer-request function runs
 * on EVERY request to both distributions, so a mistake here is not one broken
 * page, it is every page at once — including the ones nobody changed.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { company } from '../src/data/company'

const SRC = readFileSync('infra/cloudfront-directory-index.js', 'utf8')

const CANONICAL_HOST = new URL(company.siteUrl).hostname // www.directhired.com
const APEX_HOST = CANONICAL_HOST.replace(/^www\./, '') // directhired.com
const PREVIEW_HOST = 'didceb5na1cjo.cloudfront.net'

type Qs = Record<string, { value: string; multiValue?: { value: string }[] }>

function loadHandler(): (event: unknown) => any {
  return new Function(`${SRC}; return handler`)()
}

function event(uri: string, host: string, querystring: Qs = {}) {
  return {
    version: '1.0',
    context: { eventType: 'viewer-request' },
    request: { method: 'GET', uri, headers: { host: { value: host } }, querystring, cookies: {} },
  }
}

describe('apex redirect', () => {
  const handler = loadHandler()

  it('301s the bare apex to the canonical host', () => {
    const out = handler(event('/', APEX_HOST))
    expect(out.statusCode).toBe(301)
    expect(out.headers.location.value).toBe(`${company.siteUrl}/`)
  })

  it('preserves the path', () => {
    const out = handler(event('/pricing', APEX_HOST))
    expect(out.headers.location.value).toBe(`${company.siteUrl}/pricing`)
  })

  it('preserves the query string, so campaign parameters survive', () => {
    const out = handler(event('/pricing', APEX_HOST, { utm_source: { value: 'fb' } }))
    expect(out.headers.location.value).toBe(`${company.siteUrl}/pricing?utm_source=fb`)
  })

  it('preserves a valueless query parameter', () => {
    const out = handler(event('/', APEX_HOST, { debug: { value: '' } }))
    expect(out.headers.location.value).toBe(`${company.siteUrl}/?debug`)
  })

  it('does NOT redirect the canonical host — that would be a loop', () => {
    const out = handler(event('/pricing', CANONICAL_HOST))
    expect(out.statusCode).toBeUndefined()
    expect(out.uri).toBe('/pricing/index.html')
  })

  it('does NOT redirect the preview distribution', () => {
    const out = handler(event('/pricing', PREVIEW_HOST))
    expect(out.statusCode).toBeUndefined()
    expect(out.uri).toBe('/pricing/index.html')
  })

  it('matches the apex exactly, not by suffix — a lookalike host must not match', () => {
    const out = handler(event('/', 'notdirecthired.com'))
    expect(out.statusCode).toBeUndefined()
  })

  it('cannot drift from company.siteUrl', () => {
    expect(SRC).toContain(company.siteUrl)
    expect(SRC).toContain(`'${APEX_HOST}'`)
  })
})

describe('directory index rewriting is unchanged', () => {
  const handler = loadHandler()
  const cases: [string, string][] = [
    ['/', '/index.html'],
    ['/pricing', '/pricing/index.html'],
    ['/pricing/', '/pricing/index.html'],
    ['/services/transfer-helper', '/services/transfer-helper/index.html'],
    ['/_astro/style.css', '/_astro/style.css'],
    ['/sitemap-index.xml', '/sitemap-index.xml'],
    ['/robots.txt', '/robots.txt'],
  ]

  it.each(cases)('%s -> %s', (uri, expected) => {
    expect(handler(event(uri, CANONICAL_HOST)).uri).toBe(expected)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/infra.test.ts`

Expected: FAIL. The apex cases fail because `handler` currently returns the request object (so `statusCode` is `undefined`), and the drift test fails because the source contains neither `https://www.directhired.com` nor `'directhired.com'`.

- [ ] **Step 3: Add the redirect to the function**

In `infra/cloudfront-directory-index.js`, extend the header comment and insert the redirect at the top of `handler`, **above** the existing `uri.endsWith('/')` check.

Append to the file's existing block comment:

```
 * APEX REDIRECT. The distribution serving directhired.com carries both
 * hostnames, and company.siteUrl makes www canonical, so the apex has to
 * 301. It lives here rather than in a second function because CloudFront
 * allows exactly one function per event type per cache behaviour.
 *
 * The host test is an EXACT equality match, deliberately. A suffix or
 * substring test would also match www.directhired.com — redirecting the
 * canonical host to itself, forever — and this one function is shared with
 * the preview distribution, which must keep behaving exactly as it did.
 *
 * tests/infra.test.ts asserts both halves of that, and asserts the redirect
 * target still agrees with company.siteUrl.
```

Then the code:

```js
function handler(event) {
  var request = event.request
  var host = request.headers.host ? request.headers.host.value : ''

  // EXACT match. See the note above before changing this to anything looser.
  if (host === 'directhired.com') {
    var keys = Object.keys(request.querystring || {})
    var qs = ''
    if (keys.length > 0) {
      var parts = []
      for (var i = 0; i < keys.length; i++) {
        var key = keys[i]
        var param = request.querystring[key]
        if (param.multiValue) {
          for (var j = 0; j < param.multiValue.length; j++) {
            parts.push(key + '=' + param.multiValue[j].value)
          }
        } else if (param.value === '') {
          parts.push(key)
        } else {
          parts.push(key + '=' + param.value)
        }
      }
      qs = '?' + parts.join('&')
    }
    return {
      statusCode: 301,
      statusDescription: 'Moved Permanently',
      headers: { location: { value: 'https://www.directhired.com' + request.uri + qs } },
    }
  }

  var uri = request.uri

  if (uri.endsWith('/')) {
    request.uri = uri + 'index.html'
    return request
  }

  // No extension in the last path segment => a page route, not an asset.
  var lastSegment = uri.substring(uri.lastIndexOf('/') + 1)
  if (lastSegment.indexOf('.') === -1) {
    request.uri = uri + '/index.html'
  }

  return request
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/infra.test.ts`

Expected: PASS, all cases.

- [ ] **Step 5: Run the full suite for regressions**

Run: `npm test`

Expected: PASS. The suite builds `dist/` once in `tests/global-setup.ts`; this task changes nothing Astro renders, so no other suite should move.

- [ ] **Step 6: Commit**

```bash
git add infra/cloudfront-directory-index.js tests/infra.test.ts
git commit -m "Apex 301 to www in the shared viewer-request function"
```

---

### Task 3: Production bucket

**Files:**
- Modify: `docs/runbooks/2026-08-16-dns-cutover.md`

**Interfaces:**
- Consumes: nothing
- Produces: bucket `directhired-website-prod` in `ap-southeast-1`, private, empty. Its regional endpoint `directhired-website-prod.s3.ap-southeast-1.amazonaws.com` is the origin domain used in Task 4.

- [ ] **Step 1: Create the bucket**

`ap-southeast-1` is not `us-east-1`, so `LocationConstraint` is required — omitting it creates the bucket in the wrong region or errors.

```bash
aws s3api create-bucket \
  --bucket directhired-website-prod \
  --region ap-southeast-1 \
  --create-bucket-configuration LocationConstraint=ap-southeast-1 \
  --profile directhired
```

Expected: JSON containing `"Location"`.

- [ ] **Step 2: Block all public access**

The bucket is served only through OAC. Public access is blocked outright rather than merely unused.

```bash
aws s3api put-public-access-block \
  --bucket directhired-website-prod \
  --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true \
  --profile directhired
```

- [ ] **Step 3: Verify the posture**

```bash
aws s3api get-public-access-block --bucket directhired-website-prod --profile directhired
aws s3api get-bucket-location --bucket directhired-website-prod --profile directhired
```

Expected: all four block flags `true`; `LocationConstraint` is `ap-southeast-1`.

- [ ] **Step 4: Record and commit**

Fill the prod bucket row in the runbook's identifier table, then:

```bash
git add docs/runbooks/2026-08-16-dns-cutover.md
git commit -m "Runbook: production bucket created and locked down"
```

---

### Task 4: Production distribution and its bucket policy

Blocked on Task 1 reporting `ISSUED` and on Task 3.

**Files:**
- Create: `infra/prod-distribution.json`, `infra/prod-bucket-policy.json`
- Modify: `docs/runbooks/2026-08-16-dns-cutover.md`

**Interfaces:**
- Consumes: `CERT_ARN` (Task 1), bucket `directhired-website-prod` (Task 3)
- Produces: `PROD_DIST_ID` (a 13–14 character ID like `E1A2B3C4D5E6F7`) and `PROD_DIST_DOMAIN` (`d<hash>.cloudfront.net`), both used by Tasks 5, 6, 7 and 8.

- [ ] **Step 1: Write the distribution configuration**

Create `infra/prod-distribution.json`. Replace `REPLACE_WITH_CERT_ARN` with the Task 1 value before use.

```json
{
  "CallerReference": "directhired-prod-2026-08-16",
  "Comment": "DirectHired production - directhired.com",
  "Enabled": true,
  "Aliases": {
    "Quantity": 2,
    "Items": ["directhired.com", "www.directhired.com"]
  },
  "DefaultRootObject": "index.html",
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "s3-directhired-website-prod",
        "DomainName": "directhired-website-prod.s3.ap-southeast-1.amazonaws.com",
        "OriginPath": "",
        "CustomHeaders": { "Quantity": 0 },
        "S3OriginConfig": { "OriginAccessIdentity": "" },
        "OriginAccessControlId": "E2JJP00VJVN9QQ",
        "ConnectionAttempts": 3,
        "ConnectionTimeout": 10
      }
    ]
  },
  "OriginGroups": { "Quantity": 0 },
  "DefaultCacheBehavior": {
    "TargetOriginId": "s3-directhired-website-prod",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": {
      "Quantity": 2,
      "Items": ["HEAD", "GET"],
      "CachedMethods": { "Quantity": 2, "Items": ["HEAD", "GET"] }
    },
    "Compress": true,
    "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6",
    "ResponseHeadersPolicyId": "67f7725c-6f97-4210-82d7-5512b31e9d03",
    "FunctionAssociations": {
      "Quantity": 1,
      "Items": [
        {
          "FunctionARN": "arn:aws:cloudfront::354918409802:function/directhired-directory-index",
          "EventType": "viewer-request"
        }
      ]
    },
    "LambdaFunctionAssociations": { "Quantity": 0 },
    "FieldLevelEncryptionId": "",
    "SmoothStreaming": false
  },
  "CacheBehaviors": { "Quantity": 0 },
  "CustomErrorResponses": {
    "Quantity": 2,
    "Items": [
      {
        "ErrorCode": 403,
        "ResponsePagePath": "/404.html",
        "ResponseCode": "404",
        "ErrorCachingMinTTL": 10
      },
      {
        "ErrorCode": 404,
        "ResponsePagePath": "/404.html",
        "ResponseCode": "404",
        "ErrorCachingMinTTL": 10
      }
    ]
  },
  "ViewerCertificate": {
    "ACMCertificateArn": "REPLACE_WITH_CERT_ARN",
    "SSLSupportMethod": "sni-only",
    "MinimumProtocolVersion": "TLSv1.2_2021"
  },
  "Restrictions": {
    "GeoRestriction": { "RestrictionType": "none", "Quantity": 0 }
  },
  "PriceClass": "PriceClass_200",
  "HttpVersion": "http2and3",
  "IsIPV6Enabled": true
}
```

The `403 → /404.html` mapping is the load-bearing one. A private S3 origin behind OAC is granted `s3:GetObject` but not `s3:ListBucket`, so S3 answers a missing key with `403 AccessDenied` rather than `404 NoSuchKey`. Without this, `src/pages/404.astro` never renders however correct it is, and search engines see an access-denied page instead of a 404.

- [ ] **Step 2: Create the distribution**

```bash
sed "s|REPLACE_WITH_CERT_ARN|$CERT_ARN|" infra/prod-distribution.json > /tmp/dist.json

aws cloudfront create-distribution \
  --distribution-config "file:///tmp/dist.json" \
  --profile directhired \
  --query 'Distribution.{Id:Id,Domain:DomainName,Status:Status}' --output table
```

Expected: an `Id`, a `d<hash>.cloudfront.net` domain, `Status: InProgress`.

Export them:

```bash
PROD_DIST_ID=<the Id>
PROD_DIST_DOMAIN=<the Domain>
```

- [ ] **Step 3: Verify `sni-only` took effect**

This check exists because the alternative costs approximately US$600/month.

```bash
aws cloudfront get-distribution-config --id "$PROD_DIST_ID" --profile directhired \
  --query 'DistributionConfig.ViewerCertificate' --output json
```

Expected: `"SSLSupportMethod": "sni-only"`, `"MinimumProtocolVersion": "TLSv1.2_2021"`, and the ACM ARN. **If it reads `vip`, delete the distribution and recreate it before going further.**

- [ ] **Step 4: Write and apply the bucket policy**

Create `infra/prod-bucket-policy.json`, replacing `REPLACE_WITH_DIST_ID`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontServicePrincipalReadOnly",
      "Effect": "Allow",
      "Principal": { "Service": "cloudfront.amazonaws.com" },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::directhired-website-prod/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::354918409802:distribution/REPLACE_WITH_DIST_ID"
        }
      }
    }
  ]
}
```

The `AWS:SourceArn` condition names the production distribution specifically, so the preview distribution cannot read the production bucket.

```bash
sed "s|REPLACE_WITH_DIST_ID|$PROD_DIST_ID|" infra/prod-bucket-policy.json > /tmp/policy.json
aws s3api put-bucket-policy --bucket directhired-website-prod \
  --policy "file:///tmp/policy.json" --profile directhired
```

- [ ] **Step 5: Wait for deployment**

```bash
aws cloudfront wait distribution-deployed --id "$PROD_DIST_ID" --profile directhired && echo DEPLOYED
```

Expected: `DEPLOYED`, typically 5–15 minutes.

- [ ] **Step 6: Record and commit**

Fill the distribution rows in the runbook, then:

```bash
git add infra/prod-distribution.json infra/prod-bucket-policy.json docs/runbooks/2026-08-16-dns-cutover.md
git commit -m "Production CloudFront distribution and OAC bucket policy"
```

---

### Task 5: Production deploy script and first deploy

**Files:**
- Create: `scripts/deploy-production.sh`
- Modify: `docs/runbooks/2026-08-16-dns-cutover.md`

**Interfaces:**
- Consumes: `PROD_DIST_ID` (Task 4)
- Produces: the built site in `s3://directhired-website-prod/`

- [ ] **Step 1: Write the script**

Create `scripts/deploy-production.sh`. Replace `REPLACE_WITH_DIST_ID` with the Task 4 value.

The cache-control split is copied deliberately from `deploy-preview.sh`, including its `*.html` exclusion — that script's comment explains that `index.html` as a pattern matches only the root key and would leave every other page cached `immutable` for a year, unreachable by any invalidation.

```bash
#!/usr/bin/env bash
#
# Deploy the built site to PRODUCTION — https://www.directhired.com
#
# This is the public site. scripts/deploy-preview.sh is the one that is safe
# to run without thinking; this one asks first, which is the only meaningful
# difference in the sync logic below.
#
# Runs the GATED build (`npm run build`), so it refuses to deploy while any
# <Tbd> placeholder remains in the rendered output.
#
# Usage:  bash scripts/deploy-production.sh
#
set -euo pipefail

BUCKET="directhired-website-prod"
DIST_ID="REPLACE_WITH_DIST_ID"
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
# The HTML exclusion is `*.html`, NOT `index.html` — see the note in
# scripts/deploy-preview.sh for why that distinction is load-bearing.
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
```

- [ ] **Step 2: Verify the confirmation gate refuses**

Run: `printf 'no\n' | bash scripts/deploy-production.sh`

Expected: `Aborted. Nothing was changed.` and exit status 1. Nothing is built and nothing is uploaded. Confirm with:

```bash
aws s3 ls "s3://directhired-website-prod/" --profile directhired
```

Expected: no output — the bucket is still empty.

- [ ] **Step 3: Deploy**

Run: `bash scripts/deploy-production.sh` and type `deploy production` at the prompt.

Expected: the gated build succeeds, two sync passes run, an invalidation ID prints.

- [ ] **Step 4: Verify the objects and their cache headers**

```bash
aws s3 ls "s3://directhired-website-prod/" --recursive --profile directhired | head -20

aws s3api head-object --bucket directhired-website-prod --key index.html \
  --profile directhired --query 'CacheControl' --output text

aws s3api head-object --bucket directhired-website-prod --key pricing/index.html \
  --profile directhired --query 'CacheControl' --output text
```

Expected: `404.html`, `index.html`, `pricing/index.html` and the rest present; **both** HTML keys report `public,max-age=60,must-revalidate`. The second check is the one that matters — it proves the `*.html` pattern caught a nested page, not just the root.

- [ ] **Step 5: Commit**

```bash
git add scripts/deploy-production.sh docs/runbooks/2026-08-16-dns-cutover.md
git commit -m "Production deploy script, with a typed confirmation gate"
```

---

### Task 6: Publish the function and extend its deploy gate

**Files:**
- Modify: `scripts/deploy-cloudfront-function.sh`

**Interfaces:**
- Consumes: `PROD_DIST_ID` (Task 4), the function source from Task 2
- Produces: the redirect live on both distributions

- [ ] **Step 1: Extend the deploy script**

In `scripts/deploy-cloudfront-function.sh`, replace the single `DIST_ID` variable with both distributions, replacing `REPLACE_WITH_DIST_ID`:

```bash
FN_NAME="directhired-directory-index"
PREVIEW_DIST_ID="EQFX1V1KHG4IS"
PROD_DIST_ID="REPLACE_WITH_DIST_ID"
PROFILE="directhired"
SRC="infra/cloudfront-directory-index.js"
```

The existing `check()` helper reads only the rewritten `uri`, which is `None` for a redirect response, so add a second helper beside it:

```bash
# The redirect returns a RESPONSE, not a request, so there is no rewritten
# uri to read. Assert on the Location header instead.
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
```

The existing `check()` calls send no `host` header, which would now take the non-apex path and behave as before — but relying on an absent header to select a code path is exactly the kind of accident this suite exists to catch. Update `check()` to send a host explicitly:

```bash
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
```

Add these cases after the existing ones, keeping the file's habit of explaining why a case exists:

```bash
# The apex redirect. The negative cases below are the important half: this
# one function serves the preview distribution too, and a host test that
# matched by suffix would redirect www to itself forever.
check_redirect "/"        "directhired.com" "https://www.directhired.com/"
check_redirect "/pricing" "directhired.com" "https://www.directhired.com/pricing"

check "/pricing"          "/pricing/index.html"   # www: rewritten, never redirected
```

Finally, invalidate both distributions instead of one:

```bash
echo
echo "==> Invalidating both distributions"
for D in "$PREVIEW_DIST_ID" "$PROD_DIST_ID"; do
  echo -n "    $D: "
  aws cloudfront create-invalidation --distribution-id "$D" --paths "/*" \
    --profile "$PROFILE" --query 'Invalidation.Id' --output text
done
```

- [ ] **Step 2: Associate the function with the production distribution**

Already done — `infra/prod-distribution.json` includes the `FunctionAssociations` block, so the production distribution runs the function from creation. No action; confirm with:

```bash
aws cloudfront get-distribution-config --id "$PROD_DIST_ID" --profile directhired \
  --query 'DistributionConfig.DefaultCacheBehavior.FunctionAssociations' --output json
```

Expected: `Quantity: 1`, the `directhired-directory-index` ARN, `viewer-request`.

- [ ] **Step 3: Publish**

Run: `bash scripts/deploy-cloudfront-function.sh`

Expected: every `check` and `check_redirect` line prints `ok`, then the function publishes to LIVE and both distributions are invalidated. **If any line prints `FAIL`, the script exits without publishing and the live function is unchanged** — fix the source and re-run.

- [ ] **Step 4: Confirm the preview distribution is unharmed**

The function is shared, so a regression here breaks a stack this task never intended to touch.

```bash
curl -sS -o /dev/null -w '%{http_code}\n' https://didceb5na1cjo.cloudfront.net/pricing
curl -sS -o /dev/null -w '%{http_code}\n' https://didceb5na1cjo.cloudfront.net/
```

Expected: `200` for both. Allow a minute or two for the invalidation.

- [ ] **Step 5: Commit**

```bash
git add scripts/deploy-cloudfront-function.sh
git commit -m "Function deploy gate covers the apex redirect; invalidate both distributions"
```

---

### Task 7: Verify against the real hostname, before any DNS changes

The gate on Task 9. Everything is proven under the production hostnames while the public DNS still points at Exabytes.

`curl --connect-to` opens the connection to the CloudFront endpoint while sending the real SNI and `Host` header — so this exercises the certificate, the aliases, the redirect and the error mapping exactly as a browser will, with **no `hosts` file edit and no administrator rights**.

**Files:**
- Modify: `docs/runbooks/2026-08-16-dns-cutover.md`

**Interfaces:**
- Consumes: `PROD_DIST_DOMAIN` (Task 4)
- Produces: a recorded pass/fail checklist

- [ ] **Step 1: Certificate and canonical host**

```bash
CF="$PROD_DIST_DOMAIN"
curl -sS -o /dev/null -w 'www  %{http_code}  tls=%{ssl_verify_result}\n' \
  --connect-to "www.directhired.com:443:$CF:443" https://www.directhired.com/
```

Expected: `www  200  tls=0`. `ssl_verify_result=0` means the chain validated against the real hostname — the certificate is correct and `sni-only` is working.

- [ ] **Step 2: Apex redirects to www, preserving path and query**

```bash
for U in "/" "/pricing" "/pricing?utm_source=fb"; do
  curl -sS -o /dev/null -w "apex $U -> %{http_code} %{redirect_url}\n" \
    --connect-to "directhired.com:443:$CF:443" "https://directhired.com$U"
done
```

Expected:
```
apex / -> 301 https://www.directhired.com/
apex /pricing -> 301 https://www.directhired.com/pricing
apex /pricing?utm_source=fb -> 301 https://www.directhired.com/pricing?utm_source=fb
```

- [ ] **Step 3: HTTP redirects to HTTPS**

```bash
curl -sS -o /dev/null -w 'http -> %{http_code} %{redirect_url}\n' \
  --connect-to "www.directhired.com:80:$CF:80" http://www.directhired.com/pricing
```

Expected: `301` to `https://www.directhired.com/pricing`.

- [ ] **Step 4: Every built page returns 200**

```bash
for P in / /pricing /find-your-helper /why-directhired /about /faq /contact; do
  curl -sS -o /dev/null -w "$P -> %{http_code}\n" \
    --connect-to "www.directhired.com:443:$CF:443" "https://www.directhired.com$P"
done
```

Expected: `200` for all seven.

- [ ] **Step 5: A missing page returns the rendered 404 with status 404**

This is the check that justifies the custom error responses. Before them it returned `403` with a CloudFront access-denied body.

```bash
curl -sS -w '\nstatus=%{http_code}\n' \
  --connect-to "www.directhired.com:443:$CF:443" \
  https://www.directhired.com/no-such-page | tail -5
```

Expected: `status=404`, and the body is the site's own 404 page — not CloudFront's XML `AccessDenied`.

- [ ] **Step 6: Security headers and cache headers**

```bash
curl -sSI --connect-to "www.directhired.com:443:$CF:443" https://www.directhired.com/ \
  | grep -iE 'strict-transport|x-content-type|x-frame|referrer-policy|cache-control'

ASSET=$(aws s3 ls s3://directhired-website-prod/_astro/ --profile directhired \
  | head -1 | awk '{print $4}')
curl -sSI --connect-to "www.directhired.com:443:$CF:443" \
  "https://www.directhired.com/_astro/$ASSET" | grep -i 'cache-control'
```

Expected: `strict-transport-security: max-age=31536000`, `x-content-type-options: nosniff`, `x-frame-options: SAMEORIGIN`, `referrer-policy: strict-origin-when-cross-origin`; HTML `cache-control: public,max-age=60,must-revalidate`; the `_astro` asset `public,max-age=31536000,immutable`.

- [ ] **Step 7: Record the results and commit**

Paste the outputs into the runbook under a "Pre-flip verification" heading.

**Do not begin Task 9 unless every check above passed.**

```bash
git add docs/runbooks/2026-08-16-dns-cutover.md
git commit -m "Runbook: pre-flip verification against the production hostnames"
```

---

### Task 8: Route 53 hosted zone

Creating the zone changes nothing publicly — the domain is still delegated to Exabytes. The zone is built and verified before it is ever authoritative.

**Files:**
- Modify: `docs/runbooks/2026-08-16-dns-cutover.md`

**Interfaces:**
- Consumes: `PROD_DIST_DOMAIN` (Task 4), the two validation record pairs (Task 1)
- Produces: `ZONE_ID`, and the four Route 53 nameservers used in Task 9

- [ ] **Step 1: Create the hosted zone**

```bash
ZONE_ID=$(aws route53 create-hosted-zone \
  --name directhired.com \
  --caller-reference "directhired-2026-08-16-01" \
  --hosted-zone-config Comment="DirectHired production" \
  --profile directhired \
  --query 'HostedZone.Id' --output text | sed 's|/hostedzone/||')
echo "$ZONE_ID"

aws route53 get-hosted-zone --id "$ZONE_ID" --profile directhired \
  --query 'DelegationSet.NameServers' --output table
```

Expected: a zone ID, and four `ns-*.awsdns-*.{com,net,org,co.uk}` nameservers. Record all five in the runbook — **the nameservers are what you paste into Exabytes in Task 9.**

- [ ] **Step 2: Write the record change batch**

Create `/tmp/records.json`. Substitute `PROD_DIST_DOMAIN` and both validation pairs from the runbook.

`Z2FDTNDATAQYW2` is CloudFront's fixed hosted-zone ID for ALIAS targets — it is the same for every CloudFront distribution in every account, and is not the zone created in Step 1.

```json
{
  "Comment": "Production web records, mail carried across verbatim",
  "Changes": [
    { "Action": "CREATE", "ResourceRecordSet": {
        "Name": "directhired.com", "Type": "A",
        "AliasTarget": { "HostedZoneId": "Z2FDTNDATAQYW2", "DNSName": "PROD_DIST_DOMAIN", "EvaluateTargetHealth": false } } },
    { "Action": "CREATE", "ResourceRecordSet": {
        "Name": "directhired.com", "Type": "AAAA",
        "AliasTarget": { "HostedZoneId": "Z2FDTNDATAQYW2", "DNSName": "PROD_DIST_DOMAIN", "EvaluateTargetHealth": false } } },
    { "Action": "CREATE", "ResourceRecordSet": {
        "Name": "www.directhired.com", "Type": "A",
        "AliasTarget": { "HostedZoneId": "Z2FDTNDATAQYW2", "DNSName": "PROD_DIST_DOMAIN", "EvaluateTargetHealth": false } } },
    { "Action": "CREATE", "ResourceRecordSet": {
        "Name": "www.directhired.com", "Type": "AAAA",
        "AliasTarget": { "HostedZoneId": "Z2FDTNDATAQYW2", "DNSName": "PROD_DIST_DOMAIN", "EvaluateTargetHealth": false } } },
    { "Action": "CREATE", "ResourceRecordSet": {
        "Name": "directhired.com", "Type": "MX", "TTL": 3600,
        "ResourceRecords": [{ "Value": "1 smtp.google.com" }] } },
    { "Action": "CREATE", "ResourceRecordSet": {
        "Name": "VALIDATION_NAME_1", "Type": "CNAME", "TTL": 300,
        "ResourceRecords": [{ "Value": "VALIDATION_VALUE_1" }] } },
    { "Action": "CREATE", "ResourceRecordSet": {
        "Name": "VALIDATION_NAME_2", "Type": "CNAME", "TTL": 300,
        "ResourceRecords": [{ "Value": "VALIDATION_VALUE_2" }] } }
  ]
}
```

The `MX` line is the domain's entire mail configuration. It must read exactly `1 smtp.google.com`.

The two validation records are **not optional and not temporary**. ACM re-reads them to renew the certificate. Once Exabytes stops being authoritative, these Route 53 copies are the only ones that exist.

- [ ] **Step 3: Apply**

```bash
aws route53 change-resource-record-sets --hosted-zone-id "$ZONE_ID" \
  --change-batch "file:///tmp/records.json" --profile directhired \
  --query 'ChangeInfo.{Id:Id,Status:Status}' --output table
```

Expected: a change ID with status `PENDING`.

- [ ] **Step 4: Verify the zone contents**

```bash
aws route53 list-resource-record-sets --hosted-zone-id "$ZONE_ID" --profile directhired \
  --query 'ResourceRecordSets[].{Name:Name,Type:Type,TTL:TTL,Alias:AliasTarget.DNSName,Value:ResourceRecords[0].Value}' \
  --output table
```

Expected exactly: `NS` and `SOA` (auto-created), four ALIAS records, one `MX`, two validation `CNAME`s — eleven in total. **No `A` record for `103.7.9.45`, and no `mail`, `webmail`, `cpanel`, `ftp`, `autodiscover` or `autoconfig` record.**

- [ ] **Step 5: Query the Route 53 nameservers directly — the mail check**

The zone is not yet delegated, so a normal resolver still answers from Exabytes. Querying an AWS nameserver by name proves what the zone will serve **before** it serves it. This is the single most important verification in the plan.

```bash
NS1=$(aws route53 get-hosted-zone --id "$ZONE_ID" --profile directhired \
  --query 'DelegationSet.NameServers[0]' --output text)

nslookup -type=MX directhired.com "$NS1"
nslookup -type=A www.directhired.com "$NS1"
nslookup -type=A directhired.com "$NS1"
```

Expected: `MX` returns preference `1`, exchange `smtp.google.com`; both `A` queries return CloudFront addresses.

**If the `MX` answer is anything other than `1 smtp.google.com`, stop and fix the zone before Task 9.** Flipping the nameservers with a wrong `MX` takes email down.

- [ ] **Step 6: Commit**

```bash
git add docs/runbooks/2026-08-16-dns-cutover.md
git commit -m "Runbook: Route 53 zone built and verified before delegation"
```

---

### Task 9: Nameserver flip and post-flip verification

The only public-facing step. Do not start it until Task 7 passed every check and Task 8 Step 5 confirmed the `MX`.

**Files:**
- Modify: `docs/runbooks/2026-08-16-dns-cutover.md`, `docs/OPEN-DECISIONS.md`

**Interfaces:**
- Consumes: the four Route 53 nameservers (Task 8)
- Produces: `directhired.com` delegated to Route 53

- [ ] **Step 1: Change the nameservers at Exabytes (human action)**

In the Exabytes **domain management** area — not the Zone Editor — replace:

```
ns135.sgcloudhosting.cloud
ns136.sgcloudhosting.cloud
```

with the four Route 53 nameservers from Task 8. Enter all four.

**Change nothing else. Do not cancel or delete the hosting, the DNS zone, or the domain.** Spec §7.3: resolvers still holding the old delegation reach the domain — including its mail — only through the old zone, for up to 48 hours.

- [ ] **Step 2: Confirm the registry has the change**

```bash
nslookup -type=NS directhired.com 8.8.8.8
```

Expected: the four `ns-*.awsdns-*` servers. Typically within 5–60 minutes. Re-run until it changes; a stale answer here is a cache, not a failure.

- [ ] **Step 3: Verify mail from a normal resolver**

```bash
nslookup -type=MX directhired.com 8.8.8.8
nslookup -type=MX directhired.com 1.1.1.1
```

Expected: preference `1`, exchange `smtp.google.com`, from both.

- [ ] **Step 4: Send and receive a real test message (human action)**

Send a message **to** `hello@directhired.com` from an outside address and confirm it arrives. Reply **from** it and confirm the reply arrives.

DNS answers prove the record; only a delivered message proves mail. Record the result in the runbook.

- [ ] **Step 5: Verify the live site**

```bash
curl -sS -o /dev/null -w 'www   %{http_code}\n' https://www.directhired.com/
curl -sS -o /dev/null -w 'apex  %{http_code} %{redirect_url}\n' https://directhired.com/
curl -sS -o /dev/null -w '404   %{http_code}\n' https://www.directhired.com/no-such-page
```

Expected: `200`; `301` to `https://www.directhired.com/`; `404`.

If these still show the "UNDER CONSTRUCTION" page, your resolver is still on the old delegation. That is the expected propagation tail, not a failure — re-check with `nslookup -type=NS directhired.com 8.8.8.8`.

- [ ] **Step 6: Record the outstanding email work**

Add to `docs/OPEN-DECISIONS.md`, under *Housekeeping*:

```markdown
**Your domain has no SPF, DKIM or DMARC record, and this migration deliberately
did not add one.** `directhired.com` runs Google Workspace, and as of 2026-08-16
it publishes no sender-authentication records at all. Mail from
`hello@directhired.com` is therefore easier to spoof and more likely to be
filtered. This is a real weakness and it is written here so it is not mistaken
for an oversight.

It was left out of the DNS migration on purpose. Publishing
`v=spf1 include:_spf.google.com ~all` is **not** an additive change: with no SPF
record, receivers treat unlisted senders neutrally; the moment one exists, every
sender not on the list begins to soft-fail. Your requirement form lives on a
separate site that may well send notification mail as this domain, and nobody
has yet enumerated every system that does. Bundling it into cutover day would
also have made any mail problem the next morning impossible to attribute — the
nameserver move and the new policy would be indistinguishable.

**Recommended order when this is picked up.** Publish `_dmarc` at `p=none` with
a reporting address first; it is monitoring-only and cannot affect delivery, and
it makes receivers report every system sending as your domain. After about a
week those reports are a factual inventory, and SPF can be written from evidence
instead of guessed. DKIM is generated in the Google Admin console. Only once SPF
and DKIM are confirmed passing should DMARC move past `p=none`.

This is now easier than it was: the records live in Route 53 under your own AWS
account, so adding them is a change you control rather than a third-party panel.
```

- [ ] **Step 7: Final full-suite run and commit**

Run: `npm test`

Expected: PASS.

```bash
git add docs/runbooks/2026-08-16-dns-cutover.md docs/OPEN-DECISIONS.md
git commit -m "Cutover complete: directhired.com delegated to Route 53"
```

- [ ] **Step 8: Set a reminder — do not skip**

Two dated follow-ups, both easy to lose:

1. **On or after 2026-08-23:** Exabytes hosting and DNS may be cancelled. Not before.
2. **Before the certificate renews (~2027-07):** nothing to do if Task 8's validation records are in the zone. Confirm they are still present.

---

## Self-Review

**Spec coverage.** Spec §5.1 certificate → Task 1. §5.2 bucket → Task 3. §5.3 distribution, including `sni-only`, custom error responses and the security headers policy → Task 4. §5.4 function and its deploy gate → Tasks 2 and 6. §6 repository changes → Tasks 2, 5, 6 and 9 (all seven files covered). §7.1 cutover order → Tasks 1–9 in sequence. §7.2 zone contents → Task 8 Step 2, with the drops verified in Step 4. §7.3 propagation window → Task 9 Steps 1 and 8. §7.4 verification → Task 7 (pre-flip) and Task 9 (post-flip). §7.5 rollback → runbook, written in Task 1 Step 2 so it exists before anything can go wrong. §8 email deferral → Task 9 Step 6. §10 success criteria → criteria 1–4 in Task 7, 5 in Tasks 8 and 9, 6 in Task 6 Step 4, 7 in Task 5, 8 in Task 2 Step 5, 9 in Task 1 Step 2.

**Placeholder scan.** The `REPLACE_WITH_*` and `VALIDATION_*` tokens are deliberate: they mark values that cannot exist until an earlier task runs, and each is named in the consuming task's **Interfaces** block with the task that produces it. No step says "handle errors appropriately", "add tests", or "similar to Task N".

**Type consistency.** `CERT_ARN` (Task 1 → 4), `PROD_DIST_ID` (Task 4 → 5, 6, 8), `PROD_DIST_DOMAIN` (Task 4 → 7, 8), `ZONE_ID` (Task 8) are spelled identically throughout. The function's contract — a response object for the apex, the mutated request for every other host — is asserted in `tests/infra.test.ts` (Task 2), re-asserted against the deployed function by `check`/`check_redirect` (Task 6), and exercised end-to-end over HTTPS (Task 7).

**One gap found and closed during review.** The original Task 6 kept the existing `check()` helper unchanged, which sends no `host` header. That would have passed — the apex branch would not match an empty host — but only by accident, leaving the suite's directory-index cases dependent on an absent header to select their code path. Task 6 Step 1 now updates `check()` to send `www.directhired.com` explicitly.
