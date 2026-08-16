# Production Domain, Route 53 DNS and CloudFront — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Serve the built Astro site at `https://www.directhired.com` from a new private S3 + CloudFront production stack, with DNS authority moved from Exabytes to AWS Route 53 and Google Workspace mail carried across untouched.

**Architecture:** DNS authority moves **first**, as a no-op: the initial Route 53 zone reproduces exactly what Exabytes serves today, so the nameserver change alters no answer a resolver can see. Everything afterwards — certificate validation, and the go-live switch itself — happens inside Route 53, under direct control, on short TTLs. A new `directhired-website-prod` bucket in `ap-southeast-1`, private behind Origin Access Control, sits under a new CloudFront distribution carrying an ACM certificate from `us-east-1` and both hostnames as aliases. The shared `directhired-directory-index` viewer-request function gains a host-guarded 301 from apex to `www`. Go-live is one atomic Route 53 batch swapping the placeholder `A` records for CloudFront ALIAS records.

**Tech Stack:** AWS CLI v2 (profile `directhired`, account `354918409802`), Amazon S3, CloudFront (+ CloudFront Functions, `cloudfront-js-2.0`), AWS Certificate Manager, Route 53, Astro 5 static build, Vitest, Bash.

**Spec:** `docs/superpowers/specs/2026-08-16-dns-route53-cloudfront-production-design.md`

## Why this order (supersedes the spec's §7.1)

The spec sequences the nameserver flip **last**, so that flip both moves DNS and takes the site live. This plan inverts it. The spec's decisions (§3) are unchanged; only the ordering is.

Two reasons, either sufficient:

1. **`docs/OPEN-DECISIONS.md` lists launch blockers that are still open** — compliance sign-off on the loan repayment terms, and a production form URL, without which every primary CTA 404s. Publishing the site is therefore *not* today's goal; having the infrastructure ready to publish is. Coupling the two into one event would publish a site its own checklist says is not ready.
2. **Go-live becomes controllable.** Under the spec's order, publication rides on a `.com` delegation change with a 48-hour tail nobody can shorten. Here, publication is a Route 53 record swap on a 300-second TTL, atomic and revertible in five minutes.

The 48-hour delegation tail still exists — it now lands on the step where both nameserver sets return **identical answers**, so it is undetectable. The risk is moved to where it costs nothing.

## Global Constraints

- **The initial Route 53 zone is a byte-identical copy of what Exabytes serves**, with one deliberate exception: web-record TTLs are lowered to 300 so the go-live swap propagates quickly. A TTL affects only how long an answer is cached, never the answer.
- **The ACM certificate MUST be requested in `us-east-1`.** CloudFront reads certificates from that region only, regardless of the origin bucket's region.
- **`SSLSupportMethod` MUST be `sni-only`.** `vip` provisions dedicated IPs and bills approximately **US$600/month**. The preview distribution's inert `vip` value must not be copied.
- **`MinimumProtocolVersion` MUST be `TLSv1.2_2021`.**
- **The `MX` record is copied verbatim: `1 smtp.google.com`, TTL 3600.** It is the domain's entire mail configuration and the only record here with no cheap undo.
- **No `TXT`, `SPF`, `DKIM`, `DMARC` or `CAA` record is created.** Spec §8 (decision D-E). The only `TXT`-adjacent records added are ACM's validation `CNAME`s.
- **The apex host test in the CloudFront Function MUST be an exact equality match**, never a suffix or substring test, so `www.directhired.com` and `didceb5na1cjo.cloudfront.net` never match.
- **Nothing at Exabytes is deleted or cancelled during this work.** Under this ordering the hosting at `103.7.9.45` serves live traffic *through the new zone* until Task 10, so it must stay up until at least one week after go-live.
- **Existing resource identifiers** (verified 2026-08-16): preview bucket `directhired-website-preview`, preview distribution `EQFX1V1KHG4IS` (`didceb5na1cjo.cloudfront.net`), OAC `E2JJP00VJVN9QQ`, function `directhired-directory-index`, cache policy `658327ea-f89d-4fab-a63d-7e88639e58f6` (CachingOptimized), response headers policy `67f7725c-6f97-4210-82d7-5512b31e9d03` (Managed-SecurityHeadersPolicy), CloudFront's fixed ALIAS hosted-zone ID `Z2FDTNDATAQYW2`.
- **Old Exabytes nameservers, for rollback:** `ns135.sgcloudhosting.cloud`, `ns136.sgcloudhosting.cloud`.

## File Structure

| File | Responsibility |
|---|---|
| `infra/cloudfront-directory-index.js` | *Modified.* The single viewer-request function shared by both distributions. Gains the apex→www 301 above the existing directory-index rewrite. |
| `tests/infra.test.ts` | *Created.* Executes the function source in-process; asserts the redirect, the preserved rewrite behaviour, and that the redirect target cannot drift from `company.siteUrl`. |
| `scripts/deploy-cloudfront-function.sh` | *Modified.* New positive and negative redirect test cases; invalidates both distributions. |
| `scripts/deploy-production.sh` | *Created.* Gated build, two-pass cache-control sync, invalidation, typed confirmation prompt. |
| `infra/prod-distribution.json` | *Created.* Distribution configuration, kept in-repo so the deployed shape is reviewable. |
| `infra/prod-bucket-policy.json` | *Created.* OAC bucket policy, scoped by `AWS:SourceArn`. |
| `infra/route53-zone-initial.json` | *Created.* The verbatim record copy applied in Task 1. |
| `infra/route53-golive.json` | *Created.* The atomic go-live batch applied in Task 10. |
| `docs/runbooks/2026-08-16-dns-cutover.md` | *Created.* Identifiers, zone backup, verification results, rollback. Appended to as tasks complete. |
| `docs/OPEN-DECISIONS.md` | *Modified.* Records email hardening as outstanding, and go-live as a pending trigger. |

**Dependency order.** Tasks 1–2 move DNS (invisible). Task 3 starts the certificate clock; Tasks 4–5 run during its wait. Task 6 needs Task 3 issued plus Task 5. Tasks 7–8 need Task 6. Task 9 gates Task 10. Task 10 is go-live and may be deferred indefinitely.

---

### Task 1: Route 53 zone — a verbatim copy of today

Creating the zone changes nothing publicly; the domain is still delegated to Exabytes throughout this task.

**Files:**
- Create: `docs/runbooks/2026-08-16-dns-cutover.md`, `infra/route53-zone-initial.json`

**Interfaces:**
- Consumes: nothing
- Produces: `ZONE_ID`, and the four Route 53 nameservers used in Task 2.

- [ ] **Step 1: Export the Exabytes zone (human action)**

In **cPanel → Zone Editor → Manage** for `directhired.com`, export or copy the complete record list.

This is insurance. A zone transfer is refused to the public, so records can only be found by guessing names. The spec's §2.1 inventory is thorough but cannot prove a negative — a verification `TXT` for some third-party service would be invisible to it. **If the export shows any record not in the table below, stop and tell me before continuing.**

- [ ] **Step 2: Create the runbook**

Create `docs/runbooks/2026-08-16-dns-cutover.md`:

```markdown
# DNS cutover runbook — directhired.com

Date: 2026-08-16
Spec: `docs/superpowers/specs/2026-08-16-dns-route53-cloudfront-production-design.md`
Plan: `docs/superpowers/plans/2026-08-16-dns-route53-cloudfront-production.md`

## Rollback (read this first)

Set the domain's nameservers at Exabytes back to:

    ns135.sgcloudhosting.cloud
    ns136.sgcloudhosting.cloud

The old zone is intact — nothing at Exabytes is deleted or cancelled by this
work. Propagation applies in reverse, up to 48h for the `.com` delegation TTL.

**After go-live (Task 10), the faster rollback is a Route 53 record swap, not a
nameserver change:** re-point the apex and `www` A records at `103.7.9.45`.
TTL is 300, so that takes effect in five minutes.

**Do not cancel Exabytes DNS or hosting until at least one week after go-live.**
Under this ordering `103.7.9.45` serves live traffic through the new zone until
Task 10, and resolvers still holding the old delegation reach the domain —
including its mail — only through the old nameservers.

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
| Route 53 hosted zone ID | _(Task 1)_ |
| Route 53 nameservers | _(Task 1)_ |
| Certificate ARN | _(Task 3)_ |
| Prod bucket | `directhired-website-prod` (`ap-southeast-1`) |
| Prod distribution ID | _(Task 6)_ |
| Prod distribution domain | _(Task 6)_ |
```

- [ ] **Step 3: Create the hosted zone**

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

Expected: a zone ID, and four `ns-*.awsdns-*.{com,net,org,co.uk}` nameservers. Record all five in the runbook — **the four nameservers are what goes into Exabytes in Task 2.**

- [ ] **Step 4: Write the verbatim record copy**

Create `infra/route53-zone-initial.json`:

```json
{
  "Comment": "Verbatim copy of the Exabytes zone as measured 2026-08-16. Web TTLs lowered to 300 so the go-live swap propagates quickly; every VALUE is unchanged.",
  "Changes": [
    { "Action": "CREATE", "ResourceRecordSet": {
        "Name": "directhired.com", "Type": "A", "TTL": 300,
        "ResourceRecords": [{ "Value": "103.7.9.45" }] } },
    { "Action": "CREATE", "ResourceRecordSet": {
        "Name": "www.directhired.com", "Type": "CNAME", "TTL": 300,
        "ResourceRecords": [{ "Value": "directhired.com" }] } },
    { "Action": "CREATE", "ResourceRecordSet": {
        "Name": "directhired.com", "Type": "MX", "TTL": 3600,
        "ResourceRecords": [{ "Value": "1 smtp.google.com" }] } },
    { "Action": "CREATE", "ResourceRecordSet": {
        "Name": "mail.directhired.com", "Type": "CNAME", "TTL": 14400,
        "ResourceRecords": [{ "Value": "directhired.com" }] } },
    { "Action": "CREATE", "ResourceRecordSet": {
        "Name": "webmail.directhired.com", "Type": "A", "TTL": 14400,
        "ResourceRecords": [{ "Value": "103.7.9.45" }] } },
    { "Action": "CREATE", "ResourceRecordSet": {
        "Name": "cpanel.directhired.com", "Type": "A", "TTL": 14400,
        "ResourceRecords": [{ "Value": "103.7.9.45" }] } },
    { "Action": "CREATE", "ResourceRecordSet": {
        "Name": "ftp.directhired.com", "Type": "A", "TTL": 14400,
        "ResourceRecords": [{ "Value": "103.7.9.45" }] } },
    { "Action": "CREATE", "ResourceRecordSet": {
        "Name": "autodiscover.directhired.com", "Type": "A", "TTL": 14400,
        "ResourceRecords": [{ "Value": "103.7.9.45" }] } },
    { "Action": "CREATE", "ResourceRecordSet": {
        "Name": "autoconfig.directhired.com", "Type": "A", "TTL": 14400,
        "ResourceRecords": [{ "Value": "103.7.9.45" }] } }
  ]
}
```

The six cPanel names are reproduced rather than dropped, even though spec D-B retires them. Dropping them here would make the Task 2 nameserver change a *behaviour* change, and the entire safety argument for flipping first is that it is not one. They are removed in Task 10, once nothing depends on being able to compare the two zones.

- [ ] **Step 5: Apply**

```bash
aws route53 change-resource-record-sets --hosted-zone-id "$ZONE_ID" \
  --change-batch "file://infra/route53-zone-initial.json" --profile directhired \
  --query 'ChangeInfo.{Id:Id,Status:Status}' --output table
```

Expected: a change ID with status `PENDING`.

- [ ] **Step 6: Prove the new zone answers identically to the old one**

This is the gate on Task 2. The zone is not yet delegated, so a normal resolver still answers from Exabytes — querying each nameserver **by name** compares them directly.

```bash
NS_AWS=$(aws route53 get-hosted-zone --id "$ZONE_ID" --profile directhired \
  --query 'DelegationSet.NameServers[0]' --output text)
NS_OLD="ns135.sgcloudhosting.cloud"

for Q in "MX directhired.com" "A directhired.com" "CNAME www.directhired.com"; do
  set -- $Q
  echo "--- $1 $2 ---"
  echo -n "  exabytes: "; nslookup -type=$1 $2 $NS_OLD | tail -4 | tr -s ' \n' ' '; echo
  echo -n "  route53 : "; nslookup -type=$1 $2 $NS_AWS | tail -4 | tr -s ' \n' ' '; echo
done
```

Expected: the two lines agree on every value for all three queries. TTLs may differ — that is the deliberate exception in Step 4.

**The `MX` comparison is the one that matters.** It must read preference `1`, exchange `smtp.google.com`. If it does not, fix the zone before Task 2 — flipping delegation with a wrong `MX` takes email down, and it is the only step here with no cheap undo.

- [ ] **Step 7: Commit**

```bash
git add docs/runbooks/2026-08-16-dns-cutover.md infra/route53-zone-initial.json
git commit -m "Route 53 zone: verbatim copy of the Exabytes zone, verified record by record"
```

---

### Task 2: Nameserver change — the invisible flip

Every answer is already identical (Task 1, Step 6), so this changes *who* replies, not *what* they reply.

**Files:**
- Modify: `docs/runbooks/2026-08-16-dns-cutover.md`

**Interfaces:**
- Consumes: the four Route 53 nameservers (Task 1)
- Produces: `directhired.com` delegated to Route 53

- [ ] **Step 1: Change the nameservers at Exabytes (human action)**

In the Exabytes **domain management** area — *not* the Zone Editor — replace:

```
ns135.sgcloudhosting.cloud
ns136.sgcloudhosting.cloud
```

with the four Route 53 nameservers from Task 1. Enter all four.

**Change nothing else. Do not cancel or delete the hosting, the DNS zone, or the domain.** `103.7.9.45` still serves the site through the new zone, and resolvers on the old delegation still need the old zone.

- [ ] **Step 2: Confirm the registry has the change**

```bash
nslookup -type=NS directhired.com 8.8.8.8
```

Expected: the four `ns-*.awsdns-*` servers. Typically 5–60 minutes. Re-run until it changes; a stale answer is a cache, not a failure.

- [ ] **Step 3: Confirm nothing visibly changed**

```bash
nslookup -type=MX directhired.com 8.8.8.8
nslookup -type=MX directhired.com 1.1.1.1
curl -sS -o /dev/null -w 'site %{http_code}\n' https://www.directhired.com/
```

Expected: `MX` returns `1 smtp.google.com` from both resolvers; the site returns `200` and still shows the placeholder. **Anything else means roll back** (runbook, top).

- [ ] **Step 4: Send and receive a real test message (human action)**

Send a message **to** `hello@directhired.com` from an outside address and confirm arrival. Reply **from** it and confirm the reply arrives.

DNS answers prove the record; only a delivered message proves mail. Record the result in the runbook.

- [ ] **Step 5: Commit**

```bash
git add docs/runbooks/2026-08-16-dns-cutover.md
git commit -m "Delegation moved to Route 53; mail and site verified unchanged"
```

---

### Task 3: Certificate

Now that Route 53 is authoritative, validation records are ours to create — no Exabytes involvement.

**Files:**
- Modify: `docs/runbooks/2026-08-16-dns-cutover.md`

**Interfaces:**
- Consumes: `ZONE_ID` (Task 1)
- Produces: `CERT_ARN` — `arn:aws:acm:us-east-1:354918409802:certificate/<uuid>`, used by Task 6.

- [ ] **Step 1: Request the certificate**

```bash
CERT_ARN=$(aws acm request-certificate \
  --domain-name directhired.com \
  --subject-alternative-names www.directhired.com \
  --validation-method DNS \
  --region us-east-1 --profile directhired \
  --query CertificateArn --output text)
echo "$CERT_ARN"
```

Expected: an ARN. Record it in the runbook.

- [ ] **Step 2: Read the validation records**

ACM populates `ResourceRecord` a few seconds after the request, so this may return `None` first. Re-run until both rows have values.

```bash
aws acm describe-certificate --certificate-arn "$CERT_ARN" \
  --region us-east-1 --profile directhired \
  --query 'Certificate.DomainValidationOptions[].{Domain:DomainName,Name:ResourceRecord.Name,Value:ResourceRecord.Value}' \
  --output table
```

Expected: two rows, each with a `_<token>.…` name and a `_<token>.acm-validations.aws.` value.

- [ ] **Step 3: Create them in Route 53**

Write `/tmp/validation.json`, substituting the four values from Step 2:

```json
{
  "Comment": "ACM validation records. PERMANENT - ACM re-reads these to auto-renew.",
  "Changes": [
    { "Action": "CREATE", "ResourceRecordSet": {
        "Name": "VALIDATION_NAME_1", "Type": "CNAME", "TTL": 300,
        "ResourceRecords": [{ "Value": "VALIDATION_VALUE_1" }] } },
    { "Action": "CREATE", "ResourceRecordSet": {
        "Name": "VALIDATION_NAME_2", "Type": "CNAME", "TTL": 300,
        "ResourceRecords": [{ "Value": "VALIDATION_VALUE_2" }] } }
  ]
}
```

```bash
aws route53 change-resource-record-sets --hosted-zone-id "$ZONE_ID" \
  --change-batch "file:///tmp/validation.json" --profile directhired \
  --query 'ChangeInfo.Status' --output text
```

**These records are permanent, not temporary.** ACM re-reads them to renew the certificate automatically. Deleting them after issuance breaks renewal silently, roughly eleven months later, and the first symptom is a browser TLS error in production.

- [ ] **Step 4: Wait for issuance**

```bash
aws acm wait certificate-validated --certificate-arn "$CERT_ARN" \
  --region us-east-1 --profile directhired && echo ISSUED
```

Expected: `ISSUED`, typically 5–30 minutes. The command polls and exits non-zero on timeout; re-run it if the records are correct.

**Proceed to Tasks 4 and 5 while this runs.** Only Task 6 is blocked on it.

- [ ] **Step 5: Commit**

```bash
git add docs/runbooks/2026-08-16-dns-cutover.md
git commit -m "Runbook: certificate requested and validated via Route 53"
```

---

### Task 4: apex → www redirect in the shared CloudFront Function

Pure local work with a real test cycle. No AWS calls; publishing happens in Task 8.

**Files:**
- Modify: `infra/cloudfront-directory-index.js`
- Create: `tests/infra.test.ts`

**Interfaces:**
- Consumes: `company.siteUrl` from `src/data/company.ts` (value `https://www.directhired.com`)
- Produces: `handler(event)` — returns a **response object** `{statusCode, statusDescription, headers}` for apex requests, and the **mutated request object** for every other host, exactly as before.

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

In `infra/cloudfront-directory-index.js`, append to the existing block comment:

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

Then replace `handler` with:

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

Expected: PASS. This task changes nothing Astro renders, so no other suite should move.

- [ ] **Step 6: Commit**

```bash
git add infra/cloudfront-directory-index.js tests/infra.test.ts
git commit -m "Apex 301 to www in the shared viewer-request function"
```

---

### Task 5: Production bucket

**Files:**
- Modify: `docs/runbooks/2026-08-16-dns-cutover.md`

**Interfaces:**
- Consumes: nothing
- Produces: bucket `directhired-website-prod` in `ap-southeast-1`, private and empty. Its regional endpoint `directhired-website-prod.s3.ap-southeast-1.amazonaws.com` is the origin domain used in Task 6.

- [ ] **Step 1: Create the bucket**

`ap-southeast-1` is not `us-east-1`, so `LocationConstraint` is required.

```bash
aws s3api create-bucket \
  --bucket directhired-website-prod \
  --region ap-southeast-1 \
  --create-bucket-configuration LocationConstraint=ap-southeast-1 \
  --profile directhired
```

Expected: JSON containing `"Location"`.

- [ ] **Step 2: Block all public access**

```bash
aws s3api put-public-access-block \
  --bucket directhired-website-prod \
  --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true \
  --profile directhired
```

- [ ] **Step 3: Verify**

```bash
aws s3api get-public-access-block --bucket directhired-website-prod --profile directhired
aws s3api get-bucket-location --bucket directhired-website-prod --profile directhired
```

Expected: all four block flags `true`; `LocationConstraint` is `ap-southeast-1`.

- [ ] **Step 4: Record and commit**

```bash
git add docs/runbooks/2026-08-16-dns-cutover.md
git commit -m "Runbook: production bucket created and locked down"
```

---

### Task 6: Production distribution and its bucket policy

Blocked on Task 3 reporting `ISSUED` and on Task 5.

**Files:**
- Create: `infra/prod-distribution.json`, `infra/prod-bucket-policy.json`
- Modify: `docs/runbooks/2026-08-16-dns-cutover.md`

**Interfaces:**
- Consumes: `CERT_ARN` (Task 3), bucket `directhired-website-prod` (Task 5)
- Produces: `PROD_DIST_ID` and `PROD_DIST_DOMAIN` (`d<hash>.cloudfront.net`), used by Tasks 7, 8, 9 and 10.

- [ ] **Step 1: Write the distribution configuration**

Create `infra/prod-distribution.json`:

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

The `403 → /404.html` mapping is load-bearing. A private S3 origin behind OAC is granted `s3:GetObject` but not `s3:ListBucket`, so S3 answers a missing key with `403 AccessDenied` rather than `404 NoSuchKey`. Without it, `src/pages/404.astro` never renders however correct it is, and search engines see an access-denied page instead of a 404.

Adding the aliases now is safe: the DNS records still point at `103.7.9.45`, so nothing routes here until Task 10.

- [ ] **Step 2: Create the distribution**

```bash
sed "s|REPLACE_WITH_CERT_ARN|$CERT_ARN|" infra/prod-distribution.json > /tmp/dist.json

aws cloudfront create-distribution \
  --distribution-config "file:///tmp/dist.json" \
  --profile directhired \
  --query 'Distribution.{Id:Id,Domain:DomainName,Status:Status}' --output table
```

Expected: an `Id`, a `d<hash>.cloudfront.net` domain, `Status: InProgress`. Export both:

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

Create `infra/prod-bucket-policy.json`:

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

```bash
git add infra/prod-distribution.json infra/prod-bucket-policy.json docs/runbooks/2026-08-16-dns-cutover.md
git commit -m "Production CloudFront distribution and OAC bucket policy"
```

---

### Task 7: Production deploy script and first deploy

**Files:**
- Create: `scripts/deploy-production.sh`
- Modify: `docs/runbooks/2026-08-16-dns-cutover.md`

**Interfaces:**
- Consumes: `PROD_DIST_ID` (Task 6)
- Produces: the built site in `s3://directhired-website-prod/`

- [ ] **Step 1: Write the script**

Create `scripts/deploy-production.sh`, replacing `REPLACE_WITH_DIST_ID`.

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

Expected: `Aborted. Nothing was changed.` and exit status 1. Confirm nothing uploaded:

```bash
aws s3 ls "s3://directhired-website-prod/" --profile directhired
```

Expected: no output — the bucket is still empty.

- [ ] **Step 3: Deploy**

Run: `bash scripts/deploy-production.sh` and type `deploy production`.

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

### Task 8: Publish the function and extend its deploy gate

**Files:**
- Modify: `scripts/deploy-cloudfront-function.sh`

**Interfaces:**
- Consumes: `PROD_DIST_ID` (Task 6), the function source from Task 4
- Produces: the redirect live on both distributions

- [ ] **Step 1: Extend the deploy script**

Replace the single `DIST_ID` variable with both distributions:

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

The existing `check()` calls send no `host` header. They would still pass — an empty host fails to match the apex branch — but relying on an *absent* header to select a code path is exactly the kind of accident this suite exists to catch. Update `check()` to send one explicitly:

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

Add these cases after the existing ones:

```bash
# The apex redirect. The negative case below is the important half: this one
# function serves the preview distribution too, and a host test that matched
# by suffix would redirect www to itself forever.
check_redirect "/"        "directhired.com" "https://www.directhired.com/"
check_redirect "/pricing" "directhired.com" "https://www.directhired.com/pricing"

check "/pricing"          "/pricing/index.html"   # www: rewritten, never redirected
```

Finally, invalidate both distributions:

```bash
echo
echo "==> Invalidating both distributions"
for D in "$PREVIEW_DIST_ID" "$PROD_DIST_ID"; do
  echo -n "    $D: "
  aws cloudfront create-invalidation --distribution-id "$D" --paths "/*" \
    --profile "$PROFILE" --query 'Invalidation.Id' --output text
done
```

- [ ] **Step 2: Confirm the production association**

Already configured in `infra/prod-distribution.json`. Confirm:

```bash
aws cloudfront get-distribution-config --id "$PROD_DIST_ID" --profile directhired \
  --query 'DistributionConfig.DefaultCacheBehavior.FunctionAssociations' --output json
```

Expected: `Quantity: 1`, the `directhired-directory-index` ARN, `viewer-request`.

- [ ] **Step 3: Publish**

Run: `bash scripts/deploy-cloudfront-function.sh`

Expected: every `check` and `check_redirect` line prints `ok`, then the function publishes to LIVE and both distributions are invalidated. **If any line prints `FAIL`, the script exits without publishing and the live function is unchanged.**

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

### Task 9: Verify under the real hostnames — the gate on go-live

Everything is proven under the production hostnames while public DNS still points at `103.7.9.45`.

`curl --connect-to` opens the connection to the CloudFront endpoint while sending the real SNI and `Host` header — exercising the certificate, the aliases, the redirect and the error mapping exactly as a browser will, with **no `hosts` file edit and no administrator rights**.

**Files:**
- Modify: `docs/runbooks/2026-08-16-dns-cutover.md`

**Interfaces:**
- Consumes: `PROD_DIST_DOMAIN` (Task 6)
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

- [ ] **Step 6: Security and cache headers**

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

Paste the outputs into the runbook under "Pre-go-live verification".

**Task 10 must not begin unless every check above passed.**

```bash
git add docs/runbooks/2026-08-16-dns-cutover.md
git commit -m "Runbook: production stack verified under the real hostnames"
```

---

### Task 10: Go live

**This is the only step the public sees, and it is deliberately separable from everything above.** Infrastructure is complete and verified after Task 9; this task may run immediately or weeks later.

**Hold until `docs/OPEN-DECISIONS.md` "Blocks launch" is clear** — compliance sign-off on the loan repayment terms, and a production form URL, without which every primary CTA 404s. That is a business decision, not a technical one. The infrastructure does not care when it is taken.

**Files:**
- Create: `infra/route53-golive.json`
- Modify: `docs/runbooks/2026-08-16-dns-cutover.md`, `docs/OPEN-DECISIONS.md`

**Interfaces:**
- Consumes: `ZONE_ID` (Task 1), `PROD_DIST_DOMAIN` (Task 6)
- Produces: `https://www.directhired.com` serving the Astro site

- [ ] **Step 1: Confirm the site is ready to be public (human decision)**

Re-read the "Blocks launch" table in `docs/OPEN-DECISIONS.md`. Proceed only if it is clear, or if you are knowingly accepting what remains. Record which.

- [ ] **Step 2: Write the atomic swap**

Create `infra/route53-golive.json`, substituting `PROD_DIST_DOMAIN`. Route 53 applies a change batch atomically — there is no instant where the apex resolves nowhere.

`Z2FDTNDATAQYW2` is CloudFront's fixed hosted-zone ID for ALIAS targets. It is the same for every CloudFront distribution in every account, and is **not** the zone from Task 1.

```json
{
  "Comment": "Go live: placeholder A records become CloudFront ALIAS; retire dead cPanel names.",
  "Changes": [
    { "Action": "DELETE", "ResourceRecordSet": {
        "Name": "directhired.com", "Type": "A", "TTL": 300,
        "ResourceRecords": [{ "Value": "103.7.9.45" }] } },
    { "Action": "DELETE", "ResourceRecordSet": {
        "Name": "www.directhired.com", "Type": "CNAME", "TTL": 300,
        "ResourceRecords": [{ "Value": "directhired.com" }] } },

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

    { "Action": "DELETE", "ResourceRecordSet": {
        "Name": "mail.directhired.com", "Type": "CNAME", "TTL": 14400,
        "ResourceRecords": [{ "Value": "directhired.com" }] } },
    { "Action": "DELETE", "ResourceRecordSet": {
        "Name": "webmail.directhired.com", "Type": "A", "TTL": 14400,
        "ResourceRecords": [{ "Value": "103.7.9.45" }] } },
    { "Action": "DELETE", "ResourceRecordSet": {
        "Name": "cpanel.directhired.com", "Type": "A", "TTL": 14400,
        "ResourceRecords": [{ "Value": "103.7.9.45" }] } },
    { "Action": "DELETE", "ResourceRecordSet": {
        "Name": "ftp.directhired.com", "Type": "A", "TTL": 14400,
        "ResourceRecords": [{ "Value": "103.7.9.45" }] } },
    { "Action": "DELETE", "ResourceRecordSet": {
        "Name": "autodiscover.directhired.com", "Type": "A", "TTL": 14400,
        "ResourceRecords": [{ "Value": "103.7.9.45" }] } },
    { "Action": "DELETE", "ResourceRecordSet": {
        "Name": "autoconfig.directhired.com", "Type": "A", "TTL": 14400,
        "ResourceRecords": [{ "Value": "103.7.9.45" }] } }
  ]
}
```

The `MX` record is **not** in this batch. Mail is untouched by go-live.

A `DELETE` must match the existing record exactly — same type, TTL and value — or Route 53 rejects the whole batch. That is a feature: a mismatch means the zone is not what this plan assumes, and the batch failing is the correct outcome.

- [ ] **Step 3: Apply**

```bash
aws route53 change-resource-record-sets --hosted-zone-id "$ZONE_ID" \
  --change-batch "file://infra/route53-golive.json" --profile directhired \
  --query 'ChangeInfo.{Id:Id,Status:Status}' --output table
```

Expected: a change ID, status `PENDING`. Live within about 60 seconds; up to 300 for resolvers holding the old `A` record.

- [ ] **Step 4: Verify the live site**

```bash
sleep 60
nslookup -type=A www.directhired.com 8.8.8.8
curl -sS -o /dev/null -w 'www   %{http_code}\n' https://www.directhired.com/
curl -sS -o /dev/null -w 'apex  %{http_code} %{redirect_url}\n' https://directhired.com/
curl -sS -o /dev/null -w '404   %{http_code}\n' https://www.directhired.com/no-such-page
```

Expected: CloudFront addresses, `200`, `301` to `https://www.directhired.com/`, `404`.

If it still shows "UNDER CONSTRUCTION", either a resolver is holding the old record (wait out the 300s TTL) or it is still on the old delegation from Task 2 — check with `nslookup -type=NS directhired.com 8.8.8.8`.

- [ ] **Step 5: Verify mail again**

Go-live does not touch `MX`, which is exactly why it is worth confirming.

```bash
nslookup -type=MX directhired.com 8.8.8.8
```

Expected: `1 smtp.google.com`. Send one more test message to `hello@directhired.com`.

- [ ] **Step 6: Record the outstanding email work**

Add to `docs/OPEN-DECISIONS.md`, under *Housekeeping*:

```markdown
**Your domain has no SPF, DKIM or DMARC record, and the DNS migration
deliberately did not add one.** `directhired.com` runs Google Workspace, and as
of 2026-08-16 it publishes no sender-authentication records at all. Mail from
`hello@directhired.com` is therefore easier to spoof and more likely to be
filtered. This is a real weakness and it is written here so it is not mistaken
for an oversight.

It was left out on purpose. Publishing `v=spf1 include:_spf.google.com ~all` is
**not** an additive change: with no SPF record, receivers treat unlisted senders
neutrally; the moment one exists, every sender not on the list begins to
soft-fail. Your requirement form lives on a separate site that may well send
notification mail as this domain, and nobody has yet enumerated every system
that does. Bundling it into the migration would also have made any mail problem
the next morning impossible to attribute — the nameserver move and the new
policy would be indistinguishable.

**Recommended order when this is picked up.** Publish `_dmarc` at `p=none` with
a reporting address first; it is monitoring-only and cannot affect delivery, and
it makes receivers report every system sending as your domain. After about a
week those reports are a factual inventory, and SPF can be written from evidence
instead of guessed. DKIM is generated in the Google Admin console. Only once SPF
and DKIM are confirmed passing should DMARC move past `p=none`.

This is now easier than it was: the records live in Route 53 under your own AWS
account, so adding them is a change you control rather than a third-party panel.
```

- [ ] **Step 7: Final suite run and commit**

Run: `npm test`

Expected: PASS.

```bash
git add infra/route53-golive.json docs/runbooks/2026-08-16-dns-cutover.md docs/OPEN-DECISIONS.md
git commit -m "Go live: www.directhired.com serves from CloudFront"
```

- [ ] **Step 8: Two dated follow-ups — do not skip**

1. **One week after go-live:** Exabytes hosting and DNS may be cancelled. Not before — `103.7.9.45` was serving live traffic until Step 3, and resolvers on the old delegation still need the old zone.
2. **Before ~2027-07:** nothing to do if Task 3's validation records are still in the zone. Confirm they are.

---

## Self-Review

**Spec coverage.** Spec §5.1 certificate → Task 3. §5.2 bucket → Task 5. §5.3 distribution, including `sni-only`, custom error responses and the security headers policy → Task 6. §5.4 function and its deploy gate → Tasks 4 and 8. §6 repository changes → Tasks 4, 7, 8, 10 (all files covered, plus two new Route 53 batch files this ordering requires). §7.2 zone contents → reached in two stages: Task 1 reproduces the old zone, Task 10 converts it to the spec's target set; the spec's "dropped" list is executed in Task 10 Step 2 and its "not added" list holds throughout. §7.3 propagation window → Task 2 (now invisible) and Task 10 Step 4. §7.4 verification → Task 9 pre-go-live, Task 10 post. §7.5 rollback → runbook, written in Task 1 Step 2 before anything can go wrong, and extended with the faster post-go-live route. §8 email deferral → Task 10 Step 6. §10 success criteria → 1–4 in Task 9 and re-confirmed in Task 10 Step 4; 5 in Tasks 1, 2, 10; 6 in Task 8 Step 4; 7 in Task 7; 8 in Task 4 Step 5; 9 in Task 1 Step 2.

**Deviation from the spec, declared.** The spec's §7.1 puts the nameserver flip last; this plan puts it second. Justified at the top of this document. No decision in spec §3 changes. The spec should be amended, or this plan cited as superseding it, before either is read as authoritative on ordering.

**Placeholder scan.** `REPLACE_WITH_*`, `VALIDATION_*` and `PROD_DIST_DOMAIN` tokens are deliberate: they mark values that cannot exist until an earlier task runs, and each is named in the consuming task's **Interfaces** block with the task that produces it. No step says "handle errors appropriately", "add tests", or "similar to Task N".

**Type consistency.** `ZONE_ID` (Task 1 → 3, 10), `CERT_ARN` (Task 3 → 6), `PROD_DIST_ID` (Task 6 → 7, 8), `PROD_DIST_DOMAIN` (Task 6 → 9, 10) are spelled identically throughout. The function's contract — a response object for the apex, the mutated request for every other host — is asserted in `tests/infra.test.ts` (Task 4), re-asserted against the deployed function by `check`/`check_redirect` (Task 8), and exercised end-to-end over HTTPS (Task 9).

**Two gaps found and closed during review.** (1) Task 1's verbatim copy originally dropped the six cPanel names, which would have made the Task 2 nameserver change a behaviour change and destroyed the entire safety argument for flipping first; they are now reproduced and retired in Task 10 instead. (2) Task 8 originally left `check()` sending no `host` header — it would have passed, but only because an empty host fails to match the apex branch, leaving the directory-index cases relying on an absent header to select their path.
