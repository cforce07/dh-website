# DNS cutover runbook — directhired.com

Date: 2026-08-16
Spec: `docs/superpowers/specs/2026-08-16-dns-route53-cloudfront-production-design.md`
Plan: `docs/superpowers/plans/2026-08-16-dns-route53-cloudfront-production.md`

---

## Rollback (read this first)

**Before go-live (Task 10):** set the domain's nameservers at Exabytes back to

```
ns135.sgcloudhosting.cloud
ns136.sgcloudhosting.cloud
```

The old zone is intact — nothing at Exabytes is deleted or cancelled by this
work. Propagation applies in reverse, up to 48h for the `.com` delegation TTL.

**After go-live, the faster rollback is a Route 53 record swap, not a nameserver
change:** re-point the apex and `www` `A` records at `103.7.9.45`. TTL is 300, so
that takes effect in about five minutes.

**Do not cancel Exabytes DNS or hosting until at least one week after go-live.**
Under this ordering `103.7.9.45` serves live traffic *through the new zone* until
Task 10, and resolvers still holding the old delegation reach the domain —
including its mail — only through the old nameservers.

---

## Starting state (authoritative, measured 2026-08-16)

Queried directly against `ns135.sgcloudhosting.cloud`, not through a recursive
resolver, so none of this is a cache artefact.

| Name | Type | Value | TTL |
|---|---|---|---|
| `directhired.com` | NS | `ns135.sgcloudhosting.cloud`, `ns136.sgcloudhosting.cloud` | 86400 |
| `directhired.com` | SOA | primary `ns135.sgcloudhosting.cloud`, admin `abuse.mschosting.com`, serial `2026070401` | 86400 |
| `directhired.com` | A | `103.7.9.45` | 14400 |
| `directhired.com` | MX | `1 SMTP.GOOGLE.com` | 3600 |
| `directhired.com` | TXT | **none** | — |
| `www` | CNAME | `directhired.com` | 14400 |
| `mail` | CNAME | `directhired.com` | 14400 |
| `webmail`, `cpanel`, `ftp`, `autodiscover`, `autoconfig` | A | `103.7.9.45` | 14400 |

No SPF, DKIM (checked at the `google._domainkey` selector), DMARC, CAA or
wildcard record. **SOA minimum TTL is 86400**, so a name queried before it exists
can have its `NXDOMAIN` cached for a day.

What the domain served: a 793-byte **"UNDER CONSTRUCTION"** page on LiteSpeed.
Apex and `www` both returned `200`; neither redirected to the other.

---

## Exabytes zone export (Task 1, Step 1)

```
PASTE THE EXPORT HERE
```

> Purpose: a zone transfer is refused to the public, so the table above was built
> by guessing record names. It is thorough but cannot prove a negative — a
> verification `TXT` for some third-party service would be invisible to it.
> **If the export shows any record not in the table above, stop and resolve it
> before the nameserver change.**

---

## Resource identifiers

| Resource | Value |
|---|---|
| AWS account | `354918409802` |
| Route 53 hosted zone ID | `Z0875849YNMCH1EJIGWA` |
| Route 53 nameservers | `ns-173.awsdns-21.com`, `ns-516.awsdns-00.net`, `ns-1254.awsdns-28.org`, `ns-1898.awsdns-45.co.uk` |
| Certificate ARN | _(Task 3)_ |
| Prod bucket | `directhired-website-prod` (`ap-southeast-1`) |
| Prod distribution ID | _(Task 6)_ |
| Prod distribution domain | _(Task 6)_ |
| Preview distribution (unchanged) | `EQFX1V1KHG4IS` → `didceb5na1cjo.cloudfront.net` |
| Origin Access Control (shared) | `E2JJP00VJVN9QQ` |
| Viewer-request function (shared) | `directhired-directory-index` |

---

## Task 1 — verbatim zone copy, verified 2026-08-16

Zone `Z0875849YNMCH1EJIGWA` created and populated from
`infra/route53-zone-initial.json` (change `C04032321DY79WSQ0KCEN`).

Each nameserver was queried **by name**, comparing the old zone against the new
one before any delegation change. This is the gate on Task 2.

| Record | Exabytes | Route 53 | Verdict |
|---|---|---|---|
| `MX directhired.com` | `pref=1 SMTP.GOOGLE.com` ttl 3600 | `pref=1 smtp.google.com` ttl 3600 | **match** (DNS is case-insensitive) |
| `A directhired.com` | `103.7.9.45` ttl 14400 | `103.7.9.45` ttl **300** | **match** (TTL lowered deliberately) |
| `www` | `CNAME → directhired.com` ttl 14400 | `CNAME → directhired.com` ttl **300** | **match** (TTL lowered deliberately) |
| `mail` | `CNAME → directhired.com` | `CNAME → directhired.com` | **match** |
| `webmail` | `103.7.9.45` | `103.7.9.45` | **match** |
| `cpanel` | `103.7.9.45` | `103.7.9.45` | **match** |
| `ftp` | `103.7.9.45` | `103.7.9.45` | **match** |
| `autodiscover` | `103.7.9.45` | `103.7.9.45` | **match** |
| `autoconfig` | `103.7.9.45` | `103.7.9.45` | **match** |

**Every value is identical. The only differences are the two lowered TTLs**, so
the go-live swap in Task 10 propagates in about five minutes rather than four
hours. A TTL affects how long an answer is cached, never the answer.

**Why the six cPanel names are reproduced** even though spec decision D-B retires
them: dropping them here would make the Task 2 nameserver change a *behaviour*
change, and the entire safety argument for flipping first is that it is not one.
They are removed in Task 10, once nothing depends on comparing the two zones.

---

## Task 4 — apex redirect in the shared function (2026-08-16)

`infra/cloudfront-directory-index.js` gained a host-guarded 301 from
`directhired.com` to `https://www.directhired.com`, above the existing rewrite
logic. Written test-first: 7 failing / 15 passing before, 22/22 after. Full
suite green at 20 files, 710 tests.

**Not yet published.** The live function is unchanged until Task 8 runs
`scripts/deploy-cloudfront-function.sh`, which re-tests against the real
published function and refuses to publish on any failure.

## Task 5 — production bucket (2026-08-16)

`directhired-website-prod` created in `ap-southeast-1`. Verified:

| Check | Result |
|---|---|
| `BlockPublicAcls` / `IgnorePublicAcls` / `BlockPublicPolicy` / `RestrictPublicBuckets` | all `true` |
| `LocationConstraint` | `ap-southeast-1` |
| S3 static website hosting | off (never enabled) |

Empty until Task 7. The bucket policy granting CloudFront read access is applied
in Task 6, because it is scoped by `AWS:SourceArn` to a distribution that does
not exist yet.

## Task 2 — nameserver change

Status: **awaiting the human action at Exabytes.**

Replace `ns135.sgcloudhosting.cloud` and `ns136.sgcloudhosting.cloud` with:

```
ns-173.awsdns-21.com
ns-516.awsdns-00.net
ns-1254.awsdns-28.org
ns-1898.awsdns-45.co.uk
```

| Check | Result |
|---|---|
| Registry returns the four AWS nameservers | _(pending)_ |
| `MX` unchanged from 8.8.8.8 and 1.1.1.1 | _(pending)_ |
| Site still returns 200 | _(pending)_ |
| Test message sent to `hello@directhired.com` and received | _(pending)_ |
| Reply sent from `hello@directhired.com` and received | _(pending)_ |

**Task 3 (the certificate) is blocked on this.** ACM validates by reading a
public DNS record; until the domain is delegated to Route 53, a record created
there is invisible to the internet and validation cannot complete.

| Check | Result |
|---|---|
| Registry returns the four AWS nameservers | _(pending)_ |
| `MX` unchanged from 8.8.8.8 and 1.1.1.1 | _(pending)_ |
| Site still returns 200 | _(pending)_ |
| Test message sent to `hello@directhired.com` and received | _(pending)_ |
| Reply sent from `hello@directhired.com` and received | _(pending)_ |

---

## Task 9 — pre-go-live verification

Status: _pending_

---

## Task 10 — go-live

Status: _pending. Deliberately deferred._

**Hold until `docs/OPEN-DECISIONS.md` "Blocks launch" is clear** — compliance
sign-off on the loan repayment terms, and a production form URL, without which
every primary CTA 404s. That is a business decision, not a technical one. The
infrastructure does not care when it is taken.

---

## Dated follow-ups

1. **One week after go-live:** Exabytes hosting and DNS may be cancelled. Not
   before — `103.7.9.45` serves live traffic through the new zone until go-live,
   and resolvers on the old delegation still need the old zone.
2. **Before ~2027-07:** the ACM certificate auto-renews only if Task 3's two
   validation `CNAME` records are still in the Route 53 zone. Confirm they are.
   If they are missing, renewal fails silently and the first symptom is a browser
   TLS error in production.
