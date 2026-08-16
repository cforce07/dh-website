# Running Lighthouse locally (Windows)

**Status: Lighthouse ran successfully against this site for the first time on
2026-08-16, during core-pages Task 12.** Every performance claim made about
this project before that date was unverified — not wrong, unverified. This
runbook exists so nobody has to rediscover why, or how to get past it.

---

## The short version

```bash
npm run build
npm run preview &                  # must be serving before the next step
node scripts/lighthouse-local.mjs  # collects LHRs into .lighthouseci/
npx lhci assert                    # grades them with lighthouserc.json
```

`lhci assert` must report **8 URL(s)** and **24 total run(s)**. See
*The green run that graded nothing*, below, before trusting its exit code.

---

## Why `npx lhci autorun` does not work here

It fails, and it has always failed, on this:

```
Runtime error encountered: EPERM, Permission denied:
  \\?\C:\Users\<user>\AppData\Local\Temp\lighthouse.18168723
    at Launcher.destroyTmp (chrome-launcher/dist/chrome-launcher.js:367)
    at Launcher.kill        (chrome-launcher/dist/chrome-launcher.js:349)
    at runLighthouse        (lighthouse/cli/run.js:217)
```

**The audit completes.** The log reaches `Auditing: Optimize viewport for
mobile` and then `Generating results...` before anything goes wrong. The
crash is in *teardown*: `chrome-launcher` creates a temp Chrome profile
directory, and on Windows the OS still holds a handle on it for a moment
after Chrome exits, so the `rmSync` throws. Nothing is wrong with the site,
the config, the budget or Chrome.

Two consequences worth knowing:

- The `lighthouse` CLI **does** write its report before dying —
  `saveResults()` is called at `cli/run.js:216`, one line before the fatal
  `launchedChrome.kill()`. So `lighthouse <url> --output-path=x.json` leaves
  a valid report behind and *then* exits non-zero.
- `lhci autorun` does **not** survive it, because collection dies before the
  assert step ever runs. There is no partial result to grade.

`--port` does not help. `lighthouse/cli/run.js` calls
`ChromeLauncher.launch({port})`, which *spawns* Chrome on that port rather
than attaching to an existing one, so chrome-launcher is still in the path.

## What `scripts/lighthouse-local.mjs` does instead

It owns the browser. It spawns Chrome itself with a profile directory it
controls, drives Lighthouse through the **node API** with `{ port }`, and
never calls `chrome-launcher`. Cleanup failures are caught and warned about
rather than thrown, because a leftover temp profile is not a reason to
discard a finished audit.

It deliberately **does not grade anything**. It writes raw LHRs into
`.lighthouseci/` and stops, so `npx lhci assert` applies `lighthouserc.json`
— the same config, the same assertion engine and the same `median`
aggregation CI uses. A second implementation of the budget would be a second
thing to keep in step, and it would be the one that drifts.

It derives its page list from `dist/`, for the reason
`lighthouserc.json`'s `_maxAutodiscoverUrlsIsNotOptional` gives at length: a
hardcoded list is how a page stops being audited without anyone noticing.

**This is a local escape hatch, not a replacement for `lhci autorun`.** CI
runs autorun on Linux, where chrome-launcher works.

## The green run that graded nothing

`lhci assert` finds reports by matching `/^lhr-\d+\.json$/`
(`@lhci/utils/src/saved-reports.js:11`). Digits only — **no separator**.

An early version of the collection script named its files
`lhr-<timestamp>-<n>.json`. One hyphen, and `lhci assert` printed:

```
Checking assertions against 0 URL(s), 0 total run(s)

All results processed!
```

…and **exited 0**. A green run that graded nothing at all, indistinguishable
at a glance from a green run that graded everything.

Two guards now exist. The script asserts its own filenames against lhci's
regex before claiming success, and it prints the URL and run counts you
should expect to see. **Always read the first line of `lhci assert` output.**
If it says `0 URL(s)`, its exit code is meaningless.

## The 404 cannot score 1.00 on SEO

The first successful grading run failed exactly one assertion:

```
1 result(s) for http://localhost:4321/404.html :
  ×  categories.seo failure for minScore assertion
        expected: >=1
           found: 0.63
      all values: 0.63, 0.63, 0.63
```

`dist/404.html` carries `<meta name="robots" content="noindex, follow">`, so
Lighthouse's `is-crawlable` audit scores 0 and drags the SEO category to
0.63. **The tag is correct.** `/404.html` answers 200 as a real object and
would otherwise be an indexable thin page with no content of its own;
`tests/pages.test.ts` asserts both that the 404 carries `noindex` and that no
other page does.

So the site was one working Lighthouse run away from a red CI on a page doing
precisely what it should. `.github/workflows/ci.yml` runs `npx @lhci/cli
autorun` with no exemption, and `maxAutodiscoverUrls: 0` guarantees the 404
is audited.

`lighthouserc.json` now uses an `assertMatrix`: the seven real pages keep all
six assertions unchanged, and the 404 keeps the five non-SEO ones plus the
seven SEO **audits** it actually scores, each at 1. That is stricter than the
category it replaces — a category score is a weighted average that can absorb
a failing audit, an individual assertion cannot — and the only thing dropped
is `is-crawlable`, whose underlying property the test suite already asserts
from both directions. The config carries the full reasoning.

Note `assertMatrix` may not be combined with a top-level `assertions`,
`preset`, `budgetsFile` or `aggregationMethod` — lhci throws *"Cannot use
assertMatrix with other options"*. `aggregationMethod: "median"` is therefore
repeated inside **both** entries; an entry that omits it silently falls back
to lhci's `optimistic` default, which grades on the best of the three runs.

Both patterns are tested against `lhr.finalUrl` with an **unanchored**
`new RegExp`, and *every* entry is applied to *every* URL. That is why the
first entry carries a negative lookahead rather than `.*`: without it the
seven real pages would also be graded by the 404's rule set, which does not
assert `canonical` — so a real page that lost its canonical would still pass.

## Results — 2026-08-16, first successful run

Median of 3 runs per page, mobile emulation with simulated throttling
(Lighthouse defaults, which is what lhci collects with here), against
`astro preview` on `dist/`.

| page | perf | a11y | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|
| `/` | 1.00 | 1.00 | 1.00 | 1671 ms | 0 | 0 ms |
| `/about/` | 1.00 | 1.00 | 1.00 | 1514 ms | 0.017 | 0 ms |
| `/contact/` | 1.00 | 1.00 | 1.00 | 1508 ms | 0 | 0 ms |
| `/faq/` | 1.00 | 1.00 | 1.00 | 1509 ms | 0.0003 | 0 ms |
| `/find-your-helper/` | 1.00 | 1.00 | 1.00 | 1509 ms | 0 | 0 ms |
| `/pricing/` | 1.00 | 1.00 | 1.00 | 1511 ms | 0.0144 | 0 ms |
| `/why-directhired/` | 1.00 | 1.00 | 1.00 | 1508 ms | 0 | 0 ms |
| `/404.html` | 1.00 | 1.00 | 0.63 † | 1508 ms | 0.0001 | 0 ms |

† `is-crawlable` = 0 by design; see above. Every other scored SEO audit on
that page is 1.

Budget for comparison: performance ≥ 0.9, accessibility = 1.00, SEO = 1.00,
LCP ≤ 2500 ms, CLS ≤ 0.1, TBT ≤ 200 ms. The tightest real margin is LCP,
which lands at roughly **60% of budget** on every page.

### The one thing these numbers do not tell you

**This is `astro preview` on localhost, not CloudFront.** Every byte came off
a loopback interface. Lighthouse's simulated throttling models the *network*,
but not TLS negotiation to an edge PoP, not cache misses, not
`Content-Encoding` chosen by a real CDN. Re-run against
`staging.directhired.com` before treating LCP as a production figure.

Also: `total-blocking-time` is a **lab proxy for INP**, not INP. The design
budget is INP < 200 ms, and INP is a field metric Lighthouse cannot measure
in a single-page lab run. A TBT of 0 ms does not guarantee a passing field
INP — it only says there is essentially no main-thread JavaScript to block
on, which for this site is true.

### One real opportunity, below the assertion threshold

Every page reports `render-blocking-resources` at roughly **190–460 ms**
(lowest on `/`, highest on the content pages). Performance still scores 1.00,
so nothing is failing, but it is the only non-trivial opportunity Lighthouse
finds anywhere on the site and it is the first place to look if the LCP
margin ever tightens.
