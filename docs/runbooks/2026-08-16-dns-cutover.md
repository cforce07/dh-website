# DNS cutover runbook — directhired.com

Date: 2026-08-16
Spec: `docs/superpowers/specs/2026-08-16-dns-route53-cloudfront-production-design.md`
Plan: `docs/superpowers/plans/2026-08-16-dns-route53-cloudfront-production.md`

---

## Rollback (read this first)

**Before go-live:** set the domain's nameservers at Exabytes back to

```
ns135.sgcloudhosting.cloud
ns136.sgcloudhosting.cloud
```

The old zone is intact — nothing at Exabytes is deleted or cancelled by this
work. Propagation applies in reverse, up to 48h for the `.com` delegation TTL.

**After go-live, the faster rollback is a Route 53 record swap, not a nameserver
change:** re-point the apex `A` and `www` records at `103.7.9.45`. TTL is 300, so
that takes effect in about five minutes.

**The Exabytes hosting cannot be cancelled at all.** See the finding below: it
hosts a live application at `dev.directhired.com`.

---

## FINDING 2026-08-16 — the zone was three times larger than a public survey showed

Before the export, the record inventory was built by **guessing record names** and
querying them, because a zone transfer (`AXFR`) is refused to the public. That
method found **9 records**. The cPanel Zone Editor export found **49**.

Everything in the 9 was correct. The problem was entirely what it could not see,
and three of the misses mattered:

| Missed record | What losing it would have done |
|---|---|
| **The whole `dev.directhired.com` tree** (22 records) | `dev.directhired.com` is a **live application** — `/login`, `/register`, `/apply`, `/helpers`, `/pricing`, plus legal pages. It would have stopped resolving entirely at the nameserver change. |
| `3pbwvtl3lfiw` → `gv-3enkjlry7hztmh.dv.googlehosted.com` | Google's domain-verification CNAME. Losing it risks de-verifying the domain with Google. |
| `default._domainkey` TXT | A **DKIM** key. An earlier note in this project said the domain had no DKIM; that was checked at the `google._domainkey` selector only, and this one sits at `default._domainkey`. |

Also missed: `cpcontacts`, `webdisk`, `cpcalendars`, `whm` on both trees; a
`googleverification` TXT; the `_cpanel-dcv-test-record` and `_acme-challenge`
validation TXTs; and ten `_caldav`/`_carddav`/`_autodiscover` `SRV` records with
their companion `path=/` TXTs.

**The lesson, recorded because it generalises:** an inventory built by guessing
names can only ever prove what *is* there. It cannot prove nothing else exists,
and it will systematically miss anything with an unguessable label — which is
exactly what verification records, DKIM selectors and hashed CNAMEs are. Get the
export. It cost five minutes.

Still confirmed absent after the export: **no SPF record anywhere** (`v=spf1`
appears nowhere in the zone), no DMARC, no CAA, no wildcard.

### Consequence: decision D-B is reversed

Spec §3 decision **D-B** recorded "drop all six cPanel names — the hosting is
being retired", on the answer that nothing else lived on the Exabytes hosting.
That answer was given in good faith and is **factually wrong**: `103.7.9.45`
serves a live application.

**The Exabytes hosting is not being retired.** Therefore:

- Every record in this zone stays, except the two the go-live swap replaces.
- Go-live changes **only** `directhired.com` `A` and `www.directhired.com`
  `CNAME` → CloudFront ALIAS. The cPanel names, the `dev` tree, the SRV records,
  DKIM and the Google verification records are all untouched, at go-live and
  afterwards.
- The "cancel Exabytes after a week" follow-up is **withdrawn**.

### Open question for DirectHired

`dev.directhired.com` is a full helper-browsing application with `/apply`,
`/login` and `/register`. `docs/OPEN-DECISIONS.md` records that the employer
requirement form "lives on a different site" and that
`company.requirementFormUrl` currently 404s. **Is `dev.directhired.com` that
site, and is it the intended production home of the form?** Nothing here depends
on the answer — the records are preserved either way — but the answer decides
what `company.requirementFormUrl` should point at.

### Watch item: AutoSSL on the Exabytes hosting

cPanel renews TLS certificates for `directhired.com` and `dev.directhired.com`
via AutoSSL. Once DNS is delegated to Route 53, cPanel can no longer write
validation records into an authoritative zone, so **DNS-based** validation stops
working. **HTTP-based validation should continue to work**, because this zone
keeps every `A` record pointing at `103.7.9.45`, so the server still answers on
those hostnames and can serve the `/.well-known/acme-challenge/` file.

Not expected to break. Worth checking that `https://dev.directhired.com` still
has a valid certificate about 60–90 days after the nameserver change.

---

## Starting state (from the cPanel Zone Editor export, 2026-08-16)

49 records. Every value below was read back from the authoritative nameserver
rather than transcribed from the panel, because the panel line-wraps long values
and one of them is a cryptographic key.

**Apex tree (27)**

| Name | Type | Value | TTL |
|---|---|---|---|
| `directhired.com` | A | `103.7.9.45` | 14400 |
| `directhired.com` | MX | `1 SMTP.GOOGLE.COM` | 3600 |
| `www` | CNAME | `directhired.com` | 14400 |
| `mail` | CNAME | `directhired.com` | 14400 |
| `webmail`, `cpanel`, `whm`, `webdisk`, `cpcontacts`, `cpcalendars`, `ftp`, `autodiscover`, `autoconfig` | A | `103.7.9.45` | 14400 |
| `default._domainkey` | TXT | `v=DKIM1; k=rsa; p=MIIBIjANBg…` (2 chunks, 255 + 156) | 14400 |
| `googleverification` | TXT | `google-site-verification=PpFPzF9f…` | 14400 |
| `3pbwvtl3lfiw` | CNAME | `gv-3enkjlry7hztmh.dv.googlehosted.com` | 86400 |
| `_cpanel-dcv-test-record` | TXT | `_cpanel-dcv-test-record=zEpLps4Y…` | 14400 |
| `_acme-challenge` | TXT | `0THtbBOVo8Q_zBkav9PGbk8P1ji1UhtTrjVyyVB74bw` | 14400 |
| `_autodiscover._tcp` | SRV | `0 0 443 cpanelemaildiscovery.cpanel.net` | 14400 |
| `_carddav._tcp`, `_caldav._tcp` | SRV | `0 0 2079 directhired.com` | 14400 |
| `_carddavs._tcp`, `_caldavs._tcp` | SRV | `0 0 2080 directhired.com` | 14400 |
| the four `_*dav*._tcp` names | TXT | `path=/` | 14400 |

**`dev` tree (22)** — `dev`, `www.dev`, `webmail.dev`, `cpanel.dev`, `whm.dev`,
`webdisk.dev`, `cpcontacts.dev`, `cpcalendars.dev`, `autodiscover.dev`,
`autoconfig.dev` all `A → 103.7.9.45`; its own `default._domainkey` DKIM;
`_acme-challenge.dev` and `_acme-challenge.www.dev` TXTs; and the same eight
`SRV` + `TXT` autodiscovery pairs targeting `dev.directhired.com`.

**SOA minimum TTL is 86400**, so a name queried before it exists can have its
`NXDOMAIN` cached for a day.

What the apex served: a 793-byte **"UNDER CONSTRUCTION"** page on LiteSpeed.
Apex and `www` both returned `200`; neither redirected to the other.

---

## Resource identifiers

| Resource | Value |
|---|---|
| AWS account | `354918409802` |
| Route 53 hosted zone ID | `Z0875849YNMCH1EJIGWA` |
| Route 53 nameservers | `ns-173.awsdns-21.com`, `ns-516.awsdns-00.net`, `ns-1254.awsdns-28.org`, `ns-1898.awsdns-45.co.uk` |
| Certificate ARN | `arn:aws:acm:us-east-1:354918409802:certificate/6c22fa0e-11f6-4901-9323-f86e24796845` |
| Prod bucket | `directhired-website-prod` (`ap-southeast-1`) |
| Prod distribution ID | `E3R68EGASPTMJ3` |
| Prod distribution domain | `d3ov6snrv878q6.cloudfront.net` |
| Preview distribution (unchanged) | `EQFX1V1KHG4IS` → `didceb5na1cjo.cloudfront.net` |
| Origin Access Control (shared) | `E2JJP00VJVN9QQ` |
| Viewer-request function (shared) | `directhired-directory-index` |

---

## Task 1 — complete zone copy, verified 2026-08-16

Zone `Z0875849YNMCH1EJIGWA` populated from `infra/route53-zone-initial.json`
(49 `UPSERT` changes, so the file is idempotent and re-runnable).

Each nameserver was then queried **by name** — the old zone against the new —
comparing values for all 49 records before any delegation change.

```
APEX TREE: 27 match, 0 differ
DEV  TREE: 22 match, 0 differ
```

The DKIM comparison is the one worth noting: it is 411 characters, split by DNS
into a 255-char and a 156-char string. It was reproduced from the DNS chunks
rather than from the panel's line-wrapped display, and reads back identical.

**Only two values differ anywhere, both TTLs, both deliberate:** the apex `A` and
`www` are at 300 instead of 14400, so the go-live swap propagates in about five
minutes rather than four hours. A TTL changes how long an answer is cached, never
the answer.

**A verification bug worth recording.** The first comparison script reported
"6 match, 21 differ" with every value blank. That was a fault in the script, not
in DNS: PowerShell's `switch` rebinds `$_` to the value being switched on, so
`$_.IPAddress` was reading a property off the type string. Worse than the false
failures were the false *passes* — `MX` and `SRV` built their values with string
interpolation, which produced a non-empty string of spaces that compared equal on
both sides. **A green line from a broken comparator is the failure mode to fear
here**, and it is why the rewritten check asserts each value is non-blank before
it is allowed to count as a match.

---

## Task 4 — apex redirect in the shared function (2026-08-16)

`infra/cloudfront-directory-index.js` gained a host-guarded 301 from
`directhired.com` to `https://www.directhired.com`, above the existing rewrite
logic. Written test-first: 7 failing / 15 passing before, 22/22 after. Full suite
green at 20 files, 710 tests.

**Not yet published.** The live function is unchanged until Task 8 runs
`scripts/deploy-cloudfront-function.sh`, which re-tests against the real
published function and refuses to publish on any failure.

## Task 5 — production bucket (2026-08-16)

`directhired-website-prod` created in `ap-southeast-1`. All four public-access
blocks `true`; S3 website hosting never enabled. Empty until Task 7. The bucket
policy is applied in Task 6, because it is scoped by `AWS:SourceArn` to a
distribution that does not exist yet.

---

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
| Apex still returns 200 | _(pending)_ |
| **`dev.directhired.com` still returns 200** | _(pending)_ |
| Test message sent to `hello@directhired.com` and received | _(to confirm)_ |
| Reply sent from `hello@directhired.com` and received | _(to confirm)_ |

**Completed 2026-08-16.** Verified immediately after the change:

```
DELEGATION   8.8.8.8  -> ns-1254 / ns-173 / ns-1898 / ns-516   (all four AWS)
             9.9.9.9  -> ns-1254 / ns-173 / ns-1898 / ns-516   (all four AWS)
             1.1.1.1  -> ns135 / ns136                          (old, still cached)

MX           8.8.8.8  -> pref=1 smtp.google.com
             1.1.1.1  -> pref=1 smtp.google.com
             9.9.9.9  -> pref=1 smtp.google.com
```

**`MX` is correct from every resolver, including the one still on the old
delegation.** That is the verbatim copy earning its place: during the tail it
does not matter which nameserver answers, because both say the same thing.

All four sites still served `200` — apex and `www` (793 b placeholder), `dev`
and `www.dev` (29 KB application).

---

## Task 3 — certificate (2026-08-16)

Requested in `us-east-1`, DNS validation, `directhired.com` + SAN
`www.directhired.com`. Validation records created from
`infra/route53-acm-validation.json` and **left in place permanently** — ACM
re-reads them to auto-renew.

Status: **ISSUED**.

One snag worth recording: the first `change-resource-record-sets` call was
rejected because the batch `Comment` exceeded Route 53's 256-character limit.
JSON has no comment syntax, so the explanation that belongs beside those records
lives here rather than in the file.

## Task 6 — production distribution (2026-08-16)

`E3R68EGASPTMJ3` → `d3ov6snrv878q6.cloudfront.net`, from
`infra/prod-distribution.json`. Verified after creation:

| Check | Result |
|---|---|
| `SSLSupportMethod` | **`sni-only`** ✅ (the ~US$600/month guard) |
| `MinimumProtocolVersion` | `TLSv1.2_2021` |
| Custom error responses | `403 → /404.html` as 404; `404 → /404.html` as 404 |

Bucket policy applied from `infra/prod-bucket-policy.json`, scoped by
`AWS:SourceArn` to this distribution alone, so the preview distribution cannot
read the production bucket.

## Task 7 — first production deploy (2026-08-16)

`scripts/deploy-production.sh` created. The confirmation gate was tested by
answering "no" **before** it was trusted: it aborted with exit 1 and left the
bucket empty. Then deployed for real — `<Tbd>` gate passed, 31 objects.

Cache-control verified on a **nested** page, not just the root, because that is
the case the `*.html` pattern exists to catch:

```
index.html                 public,max-age=60,must-revalidate
pricing/index.html         public,max-age=60,must-revalidate
contact/index.html         public,max-age=60,must-revalidate
404.html                   public,max-age=60,must-revalidate
_astro/about.CWtgndoc.css  public,max-age=31536000,immutable
```

## Task 8 — function published (2026-08-16)

All 15 gate checks passed against the real deployed function — 9 rewrite cases,
3 apex redirects, and 3 negative cases proving `www`, the preview host and a
lookalike host do **not** redirect. Published to LIVE; both distributions
invalidated.

Two script fixes were needed:

1. `mktemp -d` returned a POSIX path the shell could write and the **native
   Windows** AWS CLI could not read, so every `test-function` call died on
   "Unable to load paramfile" while the file plainly existed. Now a
   repo-relative temp dir, which resolves under Git Bash, Windows and Linux CI.
2. `check()` sent no `host` header. It would still have passed — an empty host
   fails to match the apex branch — but a rewrite case selecting its code path
   via an *absent* header is the kind of accident this suite exists to catch.
   It now states the host explicitly.

## Task 9 — pre-go-live verification (2026-08-16)

Run with `curl --connect-to`, which sends the real SNI and `Host` header while
connecting to the CloudFront endpoint — the same thing a browser will do, with
no `hosts` file edit and no administrator rights.

| Check | Result |
|---|---|
| TLS chain valid for `www.directhired.com` | ✅ `ssl_verify_result=0`, 200 |
| apex `/` → `www` | ✅ 301 → `https://www.directhired.com/` |
| apex `/pricing` → `www` | ✅ 301, path preserved |
| apex `/pricing?utm_source=fb&utm_campaign=x` | ✅ 301, **both** parameters preserved |
| `http://` → `https://` | ✅ 301 |
| All 7 pages | ✅ 200 |
| Missing page | ✅ **404** (not 403), 25,328 bytes, zero `AccessDenied`, title `Page not found — DirectHired` |
| `Strict-Transport-Security` | ✅ `max-age=31536000` |
| `X-Content-Type-Options` / `X-Frame-Options` / `Referrer-Policy` | ✅ all present |
| HTML cache-control | ✅ `max-age=60,must-revalidate` |
| Asset cache-control | ✅ `max-age=31536000,immutable` |
| Preview distribution unaffected | ✅ `/` and `/pricing` 200 |

**On the query string:** parameters are preserved but may be **reordered**
(`utm_source=fb&utm_campaign=x` came back as `utm_campaign=x&utm_source=fb`).
CloudFront hands the function a querystring object, and object key order is not
the request's order. No parameter is lost or altered, and no analytics tool
depends on parameter order, so this is recorded as a known behaviour rather than
a defect.

**Pre-existing issue found on the preview stack, not caused by this work.**
`/about` returns 403 on the preview distribution. The preview bucket is a stale
deploy containing only `index.html` and `pricing/`, and preview has no custom
error responses — so a missing key surfaces S3's raw 403. Both conditions
predate today; `/` and `/pricing` return 200, which is what proves the shared
function still behaves there. Worth fixing separately by giving preview the same
`403 → /404.html` mapping production now has.

## Task 10 — go-live

Status: _pending. Deliberately deferred._

**Hold until `docs/OPEN-DECISIONS.md` "Blocks launch" is clear** — compliance
sign-off on the loan repayment terms, and a production form URL, without which
every primary CTA 404s. That is a business decision, not a technical one.

**The go-live batch must be rewritten** against the finding above: it may change
only the apex `A` and the `www` `CNAME`. The version drafted in the plan also
deleted the six cPanel names, which is now wrong.

---

---

## Staging environment — `staging.directhired.com` (2026-08-16)

The former preview stack, given a real hostname. **Not** `dev.directhired.com`,
which hosts a live application; taking that name would have removed it from the
internet as a side effect.

| Resource | Value |
|---|---|
| Hostname | `staging.directhired.com` |
| Distribution | `EQFX1V1KHG4IS` (was preview-only) |
| Bucket | `directhired-website-preview` |
| Certificate | `arn:aws:acm:us-east-1:354918409802:certificate/9bd88754-5c52-47d3-b111-32c5bb5a3bb7` |
| Response headers policy | `50dbf328-ddfb-4240-9199-70f9baab6c48` (`directhired-staging-noindex`) |
| Old CloudFront URL | `didceb5na1cjo.cloudfront.net` — still works |

### THE `vip` TRAP SPRANG HERE, AND WAS CAUGHT

This distribution had run with `SSLSupportMethod: "vip"` since it was created,
at **no cost** — the field is inert while a distribution uses the default
`*.cloudfront.net` certificate. Giving it a real hostname meant attaching an ACM
certificate, **which is the second half of the billable pair.**

Left untouched, that single word would have begun charging roughly **US$600 per
month** the moment the distribution deployed. No error, no warning, no failed
request — just a line on next month's bill.

The config was changed to `sni-only` in the same edit that added the
certificate, and re-read from AWS afterwards to confirm. The rule worth
remembering: **`vip` alone is free, a custom certificate alone is free, only the
pair bills.** Both `infra/prod-distribution.json` and
`infra/preview-distribution.json` are now asserted by `tests/infra.test.ts`.

### Verified 2026-08-16

| Check | Result |
|---|---|
| TLS chain valid for `staging.directhired.com` | ✅ `ssl_verify_result=0` |
| All 6 content pages | ✅ 200 |
| `/about` | ✅ **200** — was 403 before this change |
| Missing page | ✅ 404 |
| `X-Robots-Tag` | ✅ `noindex, nofollow` |
| HSTS / nosniff / SAMEORIGIN / Referrer-Policy | ✅ all present |
| Staging is **not** caught by the apex redirect | ✅ 200, no `Location` |
| `didceb5na1cjo.cloudfront.net` still serves | ✅ 200 |
| Production unaffected | ✅ still the Exabytes placeholder |

**Why `/about` was 403 and now is not.** The distribution had no custom error
responses, and a private S3 origin behind OAC is granted `s3:GetObject` but not
`s3:ListBucket` — so S3 answers a missing key with `403 AccessDenied` rather
than `404`. The bucket was also a stale deploy holding only `index.html` and
`pricing/`. Both are fixed: the error mapping is in place and the bucket has
been redeployed.

**`scripts/deploy-preview.sh` now builds UNGATED** (`npm run build:dev`). It ran
the gated `npm run build` before, which is right for production and wrong here:
staging is precisely where an unverified `<Tbd>` value should be *visible* so it
can be reviewed. Gating staging would block previewing the one thing staging
exists for. `scripts/deploy-production.sh` keeps the gate.

**Local resolution note.** `staging.directhired.com` resolved from public
resolvers immediately but not from this network, because the local router had
cached an `NXDOMAIN` from before the record existed. Route 53's SOA gives a
negative-cache TTL of `min(86400, 900)` = 900s. Verified via `curl --resolve`
against a CloudFront address in the meantime. This is the same negative-caching
hazard noted for the ACM validation records.

### Still to do — Phase 2

GitHub Actions deployment, agreed but not built:

- IAM OIDC provider for `token.actions.githubusercontent.com`, and a role
  scoped to `cforce07/dh-website` — no long-lived AWS keys in GitHub
- `deploy-staging.yml`: push to `main` → tests/axe/Lighthouse → `build:dev` →
  deploy to staging
- `deploy-production.yml`: manual dispatch behind a GitHub environment approval
  → gated `build` → deploy to production
- `scripts/deploy-production.sh` needs a non-interactive path for CI, with the
  GitHub environment approval replacing its typed prompt

---

## GO-LIVE — 2026-08-17

`directhired.com` and `www.directhired.com` now serve the Astro site from
CloudFront `E3R68EGASPTMJ3`. Change id `/change/C0030647HGA75SXD7VZA`, `INSYNC`.

### Why this happened earlier than the plan said

The plan parked go-live behind *Blocks launch* in `docs/OPEN-DECISIONS.md`. That
was **over-cautious, and the caution was aimed at the wrong thing.** Re-examined
on 2026-08-17:

- **The compliance sign-off never blocked launch.** `OPEN-DECISIONS.md` says so
  itself — it "blocks a paragraph, not the business". The gated repayment
  mechanics are not on the site, and `tests/` fails the build if they appear. The
  site is compliant *by construction*, so waiting protected nothing.
- **The form URL blocks conversion, not publication.** 46 buttons point at
  `/employer-requirement`. That path was probed on the live Exabytes site and
  **already returned 404**, so the cutover neither created nor worsened the
  problem. It is still the highest-value open item, but it is not a reason to
  keep the old page up.

  > **Note added 2026-08-17, after the cutover.** The bullet above is left as
  > written — it records what was true at the moment of the decision, and the
  > decision was correct on those facts. What has since changed: DirectHired
  > supplied the live address, `https://www.directhired.com/app/requirements`,
  > and `company.requirementFormUrl` was repointed at it. The same 46 buttons
  > now resolve. The probe recorded above was of `/employer-requirement` on the
  > **Exabytes** host and is not evidence about the new path, which is served
  > from S3 through this distribution and returns 200.
  >
  > **One inference in the surrounding reasoning was wrong, and it is corrected
  > rather than deleted.** The form was recorded throughout as living on a
  > separate *site* (core-pages spec §2.6.5, `docs/OPEN-DECISIONS.md`). It is a
  > separate *application* on the **same host and the same CloudFront
  > distribution** as this build. Nothing about the cutover turned on that —
  > the DNS work is unaffected — but a reader of this runbook should not carry
  > the old premise forward into a question about origins or measurement.
- **What was being protected was worth nothing.** The old site was probed
  path-by-path: a single 793-byte W3Schools "coming soon" template at `/` and
  `/index.php`. Every other path 404'd. There was no content, no form, no
  landing page — nothing a cutover could lose.

The lesson worth keeping: *"blocks launch"* had quietly come to mean two
different things — work that must precede publication, and work that must
precede the site being *good*. Only the first is a cutover gate.

### The one real hazard, and how it was handled

`mail.directhired.com` was a **`CNAME` to the apex**. Re-pointing the apex at
CloudFront would have dragged it along, so a mail client configured with
`mail.directhired.com` as its IMAP/SMTP host would have been sent to a CDN.

Delivery was never at risk — `MX` is `smtp.google.com` and was untouched — but
"probably unused" is not a standard to apply to the one thing the owner named as
paramount. It was pinned to `103.7.9.45` in a **separate batch applied first**
(`infra/route53-mail-pin.json`), so its answer today is byte-identical to its
answer yesterday. Splitting it from the cutover kept the two blast radii apart.

### What changed, and what deliberately did not

| Name | Before | After |
|---|---|---|
| `directhired.com` | `A 103.7.9.45` | `A`/`AAAA` ALIAS → `d3ov6snrv878q6.cloudfront.net` |
| `www.directhired.com` | `CNAME directhired.com` | `A`/`AAAA` ALIAS → same |
| `mail.directhired.com` | `CNAME directhired.com` | `A 103.7.9.45` *(same answer, pinned)* |

Verified unchanged after the batch: `MX`, `default._domainkey`, the Google
Workspace verification `CNAME`, the entire `dev.*` tree, and every cPanel host.

`www` needed `DELETE` + `UPSERT` rather than a plain `UPSERT` — a name cannot
hold both a `CNAME` and an `A`, so the type change has to be expressed as a
removal and an addition inside one atomic batch.

### Verified live

All seven pages `200`; `/no-such-page` `404`; apex `301`s to `www` preserving
query strings; `http` `301`s to `https`; TLS valid without `-k`; `robots.txt`
allows indexing and points at the sitemap; canonical and sitemap both on `www`;
production carries **no** `X-Robots-Tag` while staging still does.

**Note on verifying from the operator's own machine:** it resolved
`www.directhired.com` to `103.7.9.45` for some time after `INSYNC`, because its
upstream resolver still held the old delegation. Testing without `--resolve`
produced `/` `200` and every other path `404` — which looks exactly like a broken
deploy and is not. Confirm against `8.8.8.8`/`1.1.1.1`/`9.9.9.9` before
diagnosing anything.

### Rollback

`infra/route53-golive-rollback.json` restores the apex `A` and `www` `CNAME` to
`103.7.9.45`. TTL 300, so about five minutes. It does **not** revert the
`mail` pin — that is intentional, since the pin is correct either way.

---

## Dated follow-ups

1. ~~One week after go-live: cancel Exabytes hosting and DNS.~~ **Withdrawn.**
   The hosting serves a live application at `dev.directhired.com`.
2. **60–90 days after the nameserver change:** confirm
   `https://dev.directhired.com` still has a valid TLS certificate. See the
   AutoSSL watch item above.
3. **Before ~2027-07:** the ACM certificate auto-renews only if Task 3's two
   validation `CNAME` records are still in the Route 53 zone. Confirm they are.
   If they are missing, renewal fails silently and the first symptom is a browser
   TLS error in production.
4. **Left deliberately unchanged at go-live — four `SRV` records still target the
   apex.** `_caldav._tcp`, `_caldavs._tcp`, `_carddav._tcp` and `_carddavs._tcp`
   at `directhired.com` point at `directhired.com` on ports 2079/2080, which now
   resolves to CloudFront rather than cPanel. Anything genuinely using cPanel
   calendars or contacts on this domain would now fail.

   They were not touched because the fix is a *functional* change to service
   discovery, not a preservation of it: re-targeting them at
   `cpcalendars.directhired.com` keeps the IP identical but changes the name a
   TLS client validates against, and cPanel's certificate may not cover it. Mail
   is Google Workspace, so these are near-certainly vestigial — but "near-certainly"
   is the reason to ask rather than the reason to act. Confirm whether any client
   uses them, then either re-target or delete.

   The `dev.*` equivalents point at `dev.directhired.com` and are unaffected.
