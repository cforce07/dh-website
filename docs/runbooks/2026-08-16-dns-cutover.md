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
| Certificate ARN | _(Task 3)_ |
| Prod bucket | `directhired-website-prod` (`ap-southeast-1`) |
| Prod distribution ID | _(Task 6)_ |
| Prod distribution domain | _(Task 6)_ |
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
| Test message sent to `hello@directhired.com` and received | _(pending)_ |
| Reply sent from `hello@directhired.com` and received | _(pending)_ |

**Task 3 (the certificate) is blocked on this.** ACM validates by reading a
public DNS record; until the domain is delegated to Route 53, a record created
there is invisible to the internet and validation cannot complete.

---

## Task 9 — pre-go-live verification

Status: _pending_

## Task 10 — go-live

Status: _pending. Deliberately deferred._

**Hold until `docs/OPEN-DECISIONS.md` "Blocks launch" is clear** — compliance
sign-off on the loan repayment terms, and a production form URL, without which
every primary CTA 404s. That is a business decision, not a technical one.

**The go-live batch must be rewritten** against the finding above: it may change
only the apex `A` and the `www` `CNAME`. The version drafted in the plan also
deleted the six cPanel names, which is now wrong.

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
