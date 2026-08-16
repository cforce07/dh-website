# DirectHired Website — Production Domain, DNS and CDN

**Design specification, infrastructure**
Date: 2026-08-16
Status: Approved for planning
Relates to: `scripts/deploy-preview.sh`, `scripts/deploy-cloudfront-function.sh`, `infra/cloudfront-directory-index.js`

---

## 1. Scope

Put `https://www.directhired.com` in front of the built Astro site, served from a
new S3 + CloudFront production stack, with DNS authority moved from Exabytes to
AWS Route 53.

`scripts/deploy-preview.sh` already says why this did not happen earlier:

> This is the PREVIEW stack, not production. It serves from a CloudFront
> domain, not directhired.com. Wiring the real domain needs an ACM
> certificate in us-east-1 and a CNAME on the distribution — neither is
> set up here deliberately, because the production domain still serves
> the old placeholder site.

This specification is the missing last mile. It covers the certificate, the
production bucket and distribution, the Route 53 zone, the apex redirect, the
production deploy script, and the cutover procedure.

**Out of scope, deliberately:**

- **Transferring the domain registration.** Registration stays at Exabytes; only
  DNS authority moves. See §3, D-A.
- **Any change to email.** The zone is a like-for-like copy on the mail side.
  See §3, D-E and §8.
- **CI/CD deployment.** Production deploys are a manual script. See §3, D-D.
- **Infrastructure as code.** Resources are created with the AWS CLI and their
  identifiers recorded in a runbook, matching the existing repository style of
  shell scripts with recorded IDs. Converting the whole estate to CloudFormation
  or Terraform is a separate piece of work with its own justification.

---

## 2. Observed state, 2026-08-16

Everything in this section was measured, not assumed. It is recorded because the
migration's safety rests on the claim that the current zone is small and fully
known, and that claim should be checkable by whoever reads this next.

### 2.1 DNS, as served by the authoritative nameservers

Queried directly against `ns135.sgcloudhosting.cloud`, not through a recursive
resolver, so nothing below is a cache artefact.

| Name | Type | Value | TTL |
|---|---|---|---|
| `directhired.com` | `NS` | `ns135.sgcloudhosting.cloud`, `ns136.sgcloudhosting.cloud` | 86400 |
| `directhired.com` | `SOA` | primary `ns135.sgcloudhosting.cloud`, admin `abuse.mschosting.com`, serial `2026070401` | 86400 |
| `directhired.com` | `A` | `103.7.9.45` | 14400 |
| `directhired.com` | `MX` | `1 SMTP.GOOGLE.com` | 3600 |
| `directhired.com` | `TXT` | **none** | — |
| `www` | `CNAME` | `directhired.com` | 14400 |
| `mail` | `CNAME` | `directhired.com` | — |
| `webmail`, `cpanel`, `ftp`, `autodiscover`, `autoconfig` | `A` | `103.7.9.45` | — |

Absent and confirmed absent: `SPF`, `DKIM` (checked at the `google._domainkey`
selector), `DMARC`, `CAA`, and any wildcard record.

**The SOA minimum TTL is 86400.** That is the negative-cache duration, and it has
one operational consequence in §7: a name queried *before* it exists can have its
`NXDOMAIN` cached for a day.

### 2.2 What `directhired.com` serves today

A 793-byte page reading **"UNDER CONSTRUCTION"**, on LiteSpeed, from
`103.7.9.45` (Exabytes cPanel). Apex and `www` both return `200`; neither
redirects to the other. There is no traffic to protect, no ranking to preserve,
and no content to migrate. This is the single biggest reason the cutover risk
here is low, and it is why §7 accepts a mixed-resolution window that a live site
could not.

### 2.3 AWS account

Account `354918409802`. The CLI profile `directhired` authenticates as IAM user
`claude_cli_access`, which holds `AdministratorAccess` via the `Administrator`
group. **No Route 53 hosted zones exist. No ACM certificates exist.** Clean slate,
no permission blockers.

### 2.4 The existing preview stack

| | |
|---|---|
| Bucket | `directhired-website-preview` (`ap-southeast-1`), private, OAC only |
| Distribution | `EQFX1V1KHG4IS` → `didceb5na1cjo.cloudfront.net` |
| Origin Access Control | `E2JJP00VJVN9QQ` |
| Viewer certificate | CloudFront default; `SSLSupportMethod: vip`, `MinimumProtocolVersion: TLSv1` |
| Default behaviour | `redirect-to-https`, `Compress: true`, `GET`/`HEAD`, cache policy `658327ea-…` (CachingOptimized) |
| Response headers policy | **none** |
| Custom error responses | **none** |
| Function | `directhired-directory-index` on `viewer-request` |
| Price class | `PriceClass_200` |
| Aliases | none |

`dist/404.html` exists at the build root — Astro special-cases `404.astro` and does
not give it a directory.

---

## 3. Decisions

| # | Decision | Chosen | Reasoning |
|---|---|---|---|
| **D-A** | Move registration, or only DNS? | **Only DNS.** Registration stays at Exabytes; nameservers change to Route 53 | A `.com` registrar transfer takes 5–7 days, needs an unlock and EPP code, and is refused within 60 days of registration or a prior transfer. Delegation achieves everything this project needs, completes the same day, and reverts in minutes. Transfer remains available later at any time |
| **D-B** | Keep the Exabytes cPanel records? | **Drop all six.** The hosting is being retired | `mail`, `webmail`, `cpanel`, `ftp`, `autodiscover`, `autoconfig` are stock cPanel entries pointing at a box that was never the mail server — mail is Google's. Retiring the hosting makes them dead names |
| **D-C** | Attach the domain to the preview stack, or build a new one? | **New production stack; preview survives unchanged** | The build is content-gated (`npm run build` fails on any `<Tbd>`) and `docs/OPEN-DECISIONS.md` lists compliance copy awaiting client sign-off. Somewhere to look at gated content that is not the public internet has real value. Cost of a second stack at this traffic is negligible |
| **D-D** | Manual deploy or CI/CD? | **Manual script**, modelled on `deploy-preview.sh` | Matches the existing repository pattern, introduces no new credentials, and preserves a human pause before publishing while compliance items are open. OIDC-based CI is a reasonable later step |
| **D-E** | Add SPF/DKIM/DMARC during the migration? | **No. Zero email changes today** | See §8. Bundling a deliverability change into a nameserver move destroys the ability to attribute any subsequent mail problem to one or the other |
| **D-F** | Eliminate the mixed-resolution window? | **No. Accept it** | The mitigation — pointing Exabytes' `www` at CloudFront before the flip — means touching the Exabytes zone an extra time on the riskiest day, to protect visitors of a placeholder page. See §7.3 |

---

## 4. Target architecture

```
                    Route 53 hosted zone: directhired.com
                                  │
        ┌─────────────────────────┼──────────────────────────┐
        │                         │                          │
  A/AAAA ALIAS              A/AAAA ALIAS                    MX
  directhired.com          www.directhired.com        1 smtp.google.com
        │                         │                          │
        └──────────┬──────────────┘                    Google Workspace
                   ▼                                    (unchanged)
        CloudFront production distribution
        aliases: directhired.com, www.directhired.com
        cert: ACM us-east-1, sni-only, TLSv1.2_2021
        viewer-request fn: apex→www 301, then directory index
        403/404 → /404.html as 404
        response headers: Managed-SecurityHeadersPolicy
                   │
                   ▼  Origin Access Control (SigV4)
        s3://directhired-website-prod  (ap-southeast-1, private)
```

`ALIAS` is the load-bearing reason Route 53 is used rather than a `CNAME` left at
Exabytes: DNS forbids a `CNAME` at a zone apex, and `directhired.com` must resolve
to CloudFront in order to serve the redirect to `www`.

---

## 5. Components

### 5.1 ACM certificate

Region **`us-east-1`**, without exception — CloudFront reads certificates from
that region only, irrespective of where the origin bucket lives.

- `DomainName`: `directhired.com`
- `SubjectAlternativeNames`: `www.directhired.com`
- `ValidationMethod`: `DNS`

Validation produces two `_<token>` `CNAME` records, one per name. **Both are
created twice:** at Exabytes during §7 so the certificate issues while Exabytes is
still authoritative, and permanently in the Route 53 zone.

The permanent Route 53 copy is not redundant. ACM re-checks these records to
renew the certificate automatically. If they exist only at Exabytes and that zone
is later retired, renewal fails silently roughly eleven months later, and the
first symptom is a browser TLS error on the production site.

### 5.2 Production bucket

`directhired-website-prod`, region `ap-southeast-1` — same region as preview and
closest to the Singapore audience.

- Block Public Access: fully enabled
- S3 static website hosting: **off**
- Access: OAC only, reusing `E2JJP00VJVN9QQ` (an OAC is a request-signing
  configuration, not a bucket-bound resource, so sharing it across distributions
  is correct rather than a shortcut)
- Bucket policy: `s3:GetObject` for principal `cloudfront.amazonaws.com`,
  conditioned on `AWS:SourceArn` equal to the production distribution ARN — so
  the preview distribution cannot read the production bucket

### 5.3 Production distribution

Inherits preview's behaviour, with four deliberate departures.

| Setting | Value | Same as preview? |
|---|---|---|
| Aliases | `directhired.com`, `www.directhired.com` | New |
| Viewer certificate | ACM ARN, **`SSLSupportMethod: sni-only`**, **`MinimumProtocolVersion: TLSv1.2_2021`** | **Changed** |
| Custom error responses | `403 → /404.html` as **404**; `404 → /404.html` as **404**; `ErrorCachingMinTTL: 10` | **New** |
| Response headers policy | `Managed-SecurityHeadersPolicy` (`67f7725c-6f97-4210-82d7-5512b31e9d03`) | **New** |
| Origin | `directhired-website-prod.s3.ap-southeast-1.amazonaws.com` + OAC | Same shape |
| Viewer protocol policy | `redirect-to-https` | Same |
| Allowed methods | `GET`, `HEAD` | Same |
| Cache policy | `658327ea-f89d-4fab-a63d-7e88639e58f6` (CachingOptimized) | Same |
| Compress | `true` | Same |
| Default root object | `index.html` | Same |
| Price class | `PriceClass_200` | Same |
| IPv6 | enabled | Same |

Three of those four departures need their reasoning on the record.

**`sni-only` is mandatory and is the most expensive mistake available in this
project.** The preview distribution reads `SSLSupportMethod: vip`, which is inert
while it uses the CloudFront default certificate. Attaching a *custom* certificate
with `vip` provisions dedicated IP addresses and bills approximately **US$600 per
month**. The production distribution is created with `sni-only` from the outset.

**The custom error responses are not cosmetic.** The bucket is private and served
through OAC, so CloudFront's request to S3 is signed for `s3:GetObject` only.
Without `s3:ListBucket`, S3 answers a missing key with **`403 AccessDenied`**, not
`404 NoSuchKey`. Consequently a mistyped URL currently yields a raw CloudFront
access-denied page, and `src/pages/404.astro` would never render however correct
it is. Mapping `403` to `/404.html` with a response code of `404` is what connects
the built 404 page to reality — and returning the *correct status* matters for
search engines, which must not index a soft-404. `404` is mapped as well, for the
cases where CloudFront itself originates one.

**`Managed-SecurityHeadersPolicy` was verified before adoption**, not assumed. It
sets `Strict-Transport-Security: max-age=31536000` **without** `includeSubDomains`
and **without** `preload`, plus `X-Content-Type-Options: nosniff`,
`X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`
and `X-XSS-Protection: 1; mode=block`. It sets no Content-Security-Policy. The
absence of `includeSubDomains` is what makes it safe here: it cannot strand a
future subdomain on plain HTTP, and it does not obstruct the rollback in §7.4,
because the Exabytes host already serves valid HTTPS.

### 5.4 The shared viewer-request function

CloudFront permits one function per event type per cache behaviour, so the apex
redirect cannot be a second function. It is added to the existing
`directhired-directory-index`, which both distributions share.

The redirect returns early, before the directory-index logic, guarded on an
**exact** host match:

```js
if (host === 'directhired.com') {
  return {
    statusCode: 301,
    statusDescription: 'Moved Permanently',
    headers: { location: { value: 'https://www.directhired.com' + request.uri + qs } },
  }
}
```

Requirements on this change:

1. **Exact match, never a suffix or substring test.** `www.directhired.com` and
   `didceb5na1cjo.cloudfront.net` must not match, so preview behaviour stays
   bit-identical and `www` is never caught in a redirect loop.
2. **Path and query string are preserved**, so `directhired.com/pricing?utm_source=x`
   arrives intact. Campaign parameters that silently vanish at a redirect are a
   reporting bug nobody notices until a campaign is being measured.
3. **The redirect target derives from the same value as `company.siteUrl`.** A test
   enforces this; see §6.

`scripts/deploy-cloudfront-function.sh` already refuses to publish unless its test
cases pass, and its header explains why: *"a viewer-request function runs on EVERY
request, so a broken one 500s the whole site."* That gate gains cases for the
redirect — apex, apex with a path, apex with a query string — and, at least as
importantly, **negative cases proving that `www` and the preview host do not
redirect**. The script currently invalidates one distribution; it must invalidate
both, since one function now serves both.

---

## 6. Repository changes

| File | Change |
|---|---|
| `infra/cloudfront-directory-index.js` | Add the host-guarded apex→www 301 above the existing rewrite logic |
| `scripts/deploy-cloudfront-function.sh` | Add positive and negative redirect test cases; invalidate both distributions |
| `scripts/deploy-production.sh` | **New.** Gated `npm run build`, the same two-pass cache-control sync as preview, invalidation, plus a typed confirmation prompt because this target is public |
| `tests/infra.test.ts` | **New.** Assert the function's redirect target matches `company.siteUrl`, so the two cannot drift |
| `docs/runbooks/2026-08-16-dns-cutover.md` | **New.** Resource identifiers, the verification checklist, and the rollback procedure |
| `docs/OPEN-DECISIONS.md` | Record email hardening as an outstanding task, preserving the reasoning in §8 |

`src/data/company.ts` needs **no change**. `siteUrl` is already
`https://www.directhired.com`; this work is what makes that true rather than
aspirational. `public/robots.txt` and the sitemap already reference the production
domain and become correct at cutover without editing.

The new test follows a pattern the repository already uses. `company.ts` notes that
`robots.txt` is "verified by a test, since a static `.txt` file cannot import this
value". A CloudFront Function is subject to the same constraint — it is uploaded as
a standalone file to a runtime with no module system — so the same remedy applies.

---

## 7. Cutover

### 7.1 Order

Steps 0–7 are reversible and invisible to the public. **Step 8 is the only step
that changes what a visitor sees.**

| # | Step | Where |
|---|---|---|
| 0 | Export the full Exabytes zone as a backup | Exabytes |
| 1 | Request the ACM certificate in `us-east-1` | AWS |
| 2 | Add both validation `CNAME`s | Exabytes |
| 3 | Create the production bucket, policy and distribution (concurrent with step 2) | AWS |
| 4 | Attach certificate, aliases, custom error responses, function association | AWS |
| 5 | Deploy the built site to the production bucket | AWS |
| 6 | Verify against the real hostname via a local `hosts` override | local |
| 7 | Create the Route 53 zone and every record in §7.2 | AWS |
| 8 | **Change the nameservers at Exabytes to the four Route 53 servers** | Exabytes |
| 9 | Verify resolution, mail and site | — |

Step 0 is insurance, not ceremony. A zone transfer is refused to the public, so
records can only be enumerated by guessing their names. §2.1 is thorough but
cannot prove a negative — a verification `TXT` for some third-party service would
be invisible to it. An export from the panel is authoritative and costs minutes.

### 7.2 Zone contents

**Carried across unchanged — the mail lifeline:**

| Type | Name | Value | TTL |
|---|---|---|---|
| `MX` | `directhired.com` | `1 smtp.google.com` | 3600 |

**Replaced — the web records:**

| Type | Name | Value |
|---|---|---|
| `A` ALIAS | `directhired.com` | production distribution |
| `AAAA` ALIAS | `directhired.com` | production distribution |
| `A` ALIAS | `www.directhired.com` | production distribution |
| `AAAA` ALIAS | `www.directhired.com` | production distribution |

`AAAA` records are new; the Exabytes zone had none. CloudFront serves IPv6 and the
audience is mobile-heavy, so there is no reason to withhold it.

**Added:** the two ACM validation `CNAME`s, permanently (§5.1).

**Dropped:** `mail`, `webmail`, `cpanel`, `ftp`, `autodiscover`, `autoconfig` (D-B),
and the apex `A` record to `103.7.9.45`, which the ALIAS replaces.

**Not added:** any `TXT`, `SPF`, `DKIM`, `DMARC` or `CAA` record (D-E, §8).

### 7.3 The propagation window

`.com` delegation records are cached by resolvers for up to **48 hours**, on a TTL
set by the registry rather than by Exabytes or by us. For up to two days after
step 8, some resolvers answer from Route 53 and others from Exabytes.

This is a tail, not a wait. Once the registry reflects the change — typically
within minutes to an hour — most resolvers see the new nameservers. The remainder
continue to receive **valid** answers from the old zone: the placeholder page, and
crucially the unchanged Google `MX`. Nothing is broken for anyone during the
window; some people simply see the old page for a while.

Two consequences bind:

1. **Exabytes DNS and hosting must not be cancelled for at least one week after
   step 8.** Cancelling during the window would break resolution for everyone
   still delegated there — including mail.
2. The window is accepted rather than mitigated (D-F). A live site with traffic
   would warrant pointing Exabytes' `www` at CloudFront beforehand so both
   nameserver sets served the new content. Here it would mean an extra change to
   the Exabytes zone on the day of the flip, to protect visitors of an "UNDER
   CONSTRUCTION" page.

### 7.4 Verification

**Before step 8**, against the real hostname via a `hosts` override:

- TLS chain valid for both `directhired.com` and `www.directhired.com`
- `http://` redirects to `https://`
- Apex 301s to `www`, preserving path and query string
- `www` does **not** redirect
- All built pages return `200`
- A nonexistent path returns the rendered 404 page **with status 404**, not 403
- Security headers present
- `_astro/*` served with `max-age=31536000, immutable`; HTML with `max-age=60`

**Before step 8**, against the Route 53 nameservers directly, so it is proven
rather than hoped:

- `MX` returns exactly `1 smtp.google.com`
- Both ALIAS records resolve to the production distribution

**After step 8:**

- The registry returns the four Route 53 nameservers
- `MX` is unchanged from a normal recursive resolver
- Send and receive a test message on `@directhired.com`
- The site loads over the real domain

### 7.5 Rollback

Restore the two Exabytes nameservers, `ns135.sgcloudhosting.cloud` and
`ns136.sgcloudhosting.cloud`, at the registrar. Minutes to submit; the same
propagation tail applies in reverse. The old zone is intact throughout because
nothing at Exabytes is deleted or cancelled during this work.

HSTS does not obstruct rollback: `max-age` is set without `includeSubDomains`, and
the Exabytes host already serves valid HTTPS, so a browser pinned to HTTPS still
loads the placeholder correctly.

---

## 8. Email: what is deliberately not done, and why

`directhired.com` runs Google Workspace with **no SPF, no DKIM and no DMARC
record**. Mail from `hello@directhired.com` is therefore easier to spoof and more
likely to be filtered. This is a real weakness and it is recorded here so it is
not mistaken for an oversight.

It is nevertheless **out of scope for this migration**, for a reason specific to
SPF rather than a general preference for caution.

Publishing `v=spf1 include:_spf.google.com ~all` is not a purely additive change.
Today, with no SPF record, receivers apply neutral heuristics to anything sending
as `@directhired.com`. The moment an SPF record exists, every sender **not** on
that list begins to soft-fail. `docs/OPEN-DECISIONS.md` records that the employer
requirement form lives on a **separate site**, which may well send notification
mail as this domain. Publishing SPF without first enumerating every sending system
risks degrading exactly the mail path that carries new business enquiries.

Bundling it into cutover day compounds the problem: if mail misbehaves the
following morning, there is no way to attribute the fault to the nameserver move
or to the new policy. Two changes to one system on one day cannot be told apart.

**Recommended sequence when this is picked up.** Publish `_dmarc` at `p=none` with
an `rua` address first. It is monitoring-only and cannot affect delivery, and it
causes receivers to report every system sending as the domain. After roughly a
week those reports constitute a factual inventory of senders, and an SPF record
can be written from evidence rather than guessed. DKIM is generated in the Google
Admin console and its public key published as a `TXT` record. Only once SPF and
DKIM are confirmed passing should DMARC move beyond `p=none`.

This becomes materially easier after the migration, which is a point in favour of
the ordering rather than an argument against the deferral: adding these records
becomes a Route 53 change under direct AWS control rather than a visit to a
third-party control panel.

---

## 9. Cost

| Item | Approximate monthly |
|---|---|
| Route 53 hosted zone | US$0.50 |
| Route 53 queries | cents at this volume |
| ACM certificate | free |
| S3 storage + requests | cents |
| CloudFront (`PriceClass_200`) | within or near the perpetual free tier at this traffic |
| **`SSLSupportMethod: vip` if set in error** | **~US$600** |

The last row is in this table on purpose.

---

## 10. Success criteria

1. `https://www.directhired.com` serves the built Astro site over a valid
   certificate, from CloudFront, with the production bucket private.
2. `https://directhired.com` 301s to `https://www.directhired.com`, preserving
   path and query string.
3. `http://` on either name redirects to `https://`.
4. A nonexistent path renders `404.astro` with HTTP status **404**.
5. Google Workspace mail is unaffected: `MX` resolves to `1 smtp.google.com` from
   the Route 53 nameservers, and a test message round-trips.
6. The preview stack is unchanged and still reachable at its CloudFront domain.
7. `scripts/deploy-production.sh` deploys and invalidates, with the `<Tbd>` gate
   intact.
8. `npm test` passes, including the new drift test in §6.
9. The runbook records every resource identifier and the rollback procedure.
