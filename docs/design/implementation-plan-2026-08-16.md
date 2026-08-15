# DirectHired — Consolidated Implementation Plan

**Date:** 2026-08-16
**Consolidates:** `docs/design/taste-audit-2026-08-15.md` (page-level design) and `docs/design/brand-assessment-2026-08-15.md` (brand system).
**Status of this document:** plan only. No source file was modified in producing it.
**Baseline verified at time of writing:** `npm test` → 11 files, **89 tests passing**. `npm run build` → succeeds. Branch `main`, working tree clean apart from the four uncommitted-at-audit-time logo assets, which are now present.

---

## How to read this

- Every proposal from both audits appears exactly once below, as a **C-nn** item in §3. Where the two audits found the same thing independently, the item names both sources.
- §4 assigns **every editable file in the repository to exactly one workstream.** Two proposals that touch the same file are in the same workstream even when they are conceptually unrelated. If a file is not in your workstream's list, do not open it in write mode.
- §5 lists what needs a **client decision** (D-nn). §6 lists what I judge **wrong, risky, or not worth doing** (R-nn) with the reasoning.
- §2 lists facts I verified against the codebase that **change the advice in the source audits**. Read §2 before executing anything.
- Line numbers are as of the current working tree. Where they drift, the **selector or symbol name is authoritative**.
- Reference visuals produced by the taste audit: `docs/design/taste-audit-2026-08-15-hero-composition.svg`, `docs/design/taste-audit-2026-08-15-page-rhythm.svg`.

### Non-negotiable constraints (apply to every item)

1. `--color-brand-teal` (`#00a4a6`) measures **2.89:1** on `--color-surface` and **fails WCAG AA**. Never text. Never a button fill. Graphic use only. Use `--color-accent` (`#046A6C`, 6.03:1) for anything interactive, and `--color-accent-on-deep` (`#3FC9CB`, 6.18:1) on `--color-deep`. The warning comment at `src/styles/tokens.css:42-51` stays exactly as written.
2. **Never invent business information.** No helper data, prices, statistics, timelines, credentials, staff details, availability claims or testimonials beyond what already exists in `src/data/` and `src/content/`. Master brief §55, §68, §70, §78 are binding.
3. **Conversion hierarchy:** primary "Submit Your Requirements" always precedes secondary "WhatsApp Us" on any surface carrying both. This governs *order within a surface*, not *which surfaces carry the pair*.
4. `npm run build` must keep passing. **89 tests must keep passing** (add tests; do not weaken existing ones).
5. Lighthouse budget in `lighthouserc.json` must hold: **performance ≥ 0.90, accessibility = 1.00, SEO = 1.00, LCP < 2500 ms, CLS < 0.1, TBT < 200 ms**, asserted as the median of 3 runs. (Note: the perf floor is 0.90, not 1.00 — but treat any regression below the current score as a defect.)
6. Only the homepage exists. Nav links to `/pricing`, `/faq`, `/about` etc. correctly 404 and are covered by the allowlist in `tests/links.test.ts`. Do not "fix" them.

---

## 2. Corrections to the source audits — read this first

Six things I verified in the codebase that change what the audits tell you to do.

### 2.1 The vector master exists. Everything blocked on S1 is unblocked.

`logo/Logo-01.svg` is present, and four tight crops have already been cut from it and committed:

| Asset | viewBox | Size | Colours | Use |
|---|---|---|---|---|
| `src/assets/logo-wordmark.svg` | `576 571 849 124` (6.85:1) | 3,098 B | wordmark `#4d4d4d`, H `#00a4a6` | Header, mobile nav panel |
| `src/assets/logo-wordmark-on-deep.svg` | `576 571 849 124` | 3,098 B | wordmark `#FAF8F5`, H `#00a4a6` | Footer only |
| `src/assets/logo-mark.svg` | `1010.5 559 147 147` (square) | 669 B | H `#00a4a6` | Favicon, app icon, WhatsApp DP |
| `src/assets/logo-lockup.svg` | `576 571 849 191` | 8,678 B | wordmark + tagline `#4d4d4d`, H `#00a4a6` | Print / light grounds only |

Brand-assessment **S1 is closed**. S2, S3, E1, E2, E8 and S4 are all unblocked.

**Measured contrast for these assets:**

- Logo charcoal `#4d4d4d` on `--color-deep` `#0E3A3B` = **1.47:1** — unusable. The footer must use `logo-wordmark-on-deep.svg`, never the standard wordmark and **never `logo-lockup.svg`** (its tagline is charcoal too).
- Brand teal `#00a4a6` on `--color-deep` = **4.07:1** — fine, and it is a logotype anyway.
- Brand teal `#00a4a6` on `--color-surface` = 2.89:1. **This is not a defect in the logo.** WCAG 1.4.3 and 1.4.11 exempt logotypes. Do not recolour the H inside the logo assets to "fix" it, and add a comment saying so where the asset is imported.

### 2.2 `SectionHeader`'s `eyebrow` prop is used **zero** times, not once.

Grepped across `src/`: no call site passes `eyebrow`. Both audits are wrong here in opposite directions.

- Taste audit **P1-6** says it is used once, by `TwoSidedMatch`. It is not — `TwoSidedMatch.astro:42` renders its own `<h2 class="match-kicker">`, which is eyebrow-*styled* but is not the `SectionHeader` primitive and carries no teal rule.
- Brand assessment **E7** says the short teal dash "has already appeared as ordinary section furniture several times" before block 07. **It has appeared zero times.** `.eyebrow-mark` (`SectionHeader.astro:53-59`) never renders. The only teal dash on the page is `FinalCta`'s `.cta-mark` (`FinalCta.astro:49-56`), and it is in block 12 — *after* block 07.

Consequence: **E7 is a non-issue and must not be implemented as written** (see R-4). And P1-6's "apply it everywhere" option would *create* the problem E7 describes (see R-5). The resolution is C-31.

### 2.3 The Fraunces subset does **not** carry the `SOFT` or `WONK` axes. E6 / Fix 5a is blocked exactly as its own caution warned.

I decompressed `public/fonts/fraunces-variable.woff2` (brotli stream at offset 114, 107,846 B of table data) and parsed its `fvar` table:

```
fvar axisCount = 2
  opsz   min 9    max 144
  wght   min 100  max 900
```

`SOFT` and `WONK` appear only in the `STAT` table's design-axis records — i.e. they were **instanced out** during subsetting and are pinned at Google Fonts' defaults (SOFT 0, WONK 0). `font-variation-settings: 'SOFT' 40, 'WONK' 0` would be a **silent no-op**.

Two further points the brand assessment missed:

- `opsz` **is** available, and `font-optical-sizing: auto` is the CSS default, so Chrome already maps optical size to font-size on every heading. The face is *not* running fully untuned.
- Setting `font-variation-settings` at all **disables `font-optical-sizing: auto`**. The suggested `font-variation-settings: 'opsz' 96` on the shared `h1..h6` rule would therefore lock every heading — including 24px `<h3>`s and the FAQ's 18px `<summary>` — at display optical size. That is a regression, not a tuning.

Resolution: C-03 (narrow, safe) plus D-10 (client decision on re-subsetting).

### 2.4 `docs/INFORMATION-REQUIRED-BEFORE-PRODUCTION.md` is generated. Do not hand-edit it.

Both audits instruct implementers to "add it to `docs/INFORMATION-REQUIRED-BEFORE-PRODUCTION.md`". That file carries `> Generated by scripts/generate-info-required.mjs ... Do not hand-edit — regenerate instead`. The correct action is to add an entry to `DECLARED_INPUTS` in `scripts/generate-info-required.mjs:78` and run `npm run build:dev && node scripts/generate-info-required.mjs`. See C-62 and R-11.

### 2.5 The Mizoram flag problem is worse than the taste audit states, and the repo already has a rule against it.

`src/content/helpers/mizoram.md:4` is `flag: 🇮🇳` — the flag of India. `tests/content.test.ts:13-16` already asserts *"never labels Mizoram as India"*, and passes only because the emoji is not the literal ASCII string `India`. Replacing the emoji with an SVG flag (the taste audit's suggestion) reproduces exactly the error the test exists to prevent, in higher fidelity. Delete the field instead — see C-52 and R-6.

### 2.6 The header-fit measurement and the logo swap are numerically coupled, and both live in `Header.astro`.

Taste audit P0-1 measured 986px natural header width after three content cuts, against a 1088px content box at 1200px viewport — 102px slack. Those measurements were taken with the **typeset** wordmark (`Fraunces` at `--size-h3` + a 0.6em square ≈ 162px). `logo-wordmark.svg` is 849:124, so at a matched cap height it renders **wider** — roughly 190–200px at a 28px logo height. That eats ~30–40px of the 102px slack.

**Therefore `--bp-desktop` must not be lowered until the real logo is in the header and the width is re-measured.** This is the single most important sequencing constraint in the plan, and it is why C-06…C-11 are all in one workstream.

---

## 3. Consolidated proposal register

**62 work items**, derived from **80 raw recommendations** across the two audits. **14 of these items merge two or more independently-raised proposals** — 18 duplicate references collapsed in total — and every merge is marked `⇄` with all of its sources named. Nothing from either audit was dropped: items I judge wrong or not worth doing still appear here, with a pointer to their entry in §6. Priority: **P0** = changes how the page reads; **P1** = material; **P2** = polish. Scope: **SYS** = systemic (a token or shared primitive; moves many blocks at once); **LOC** = local (one component).

### 3.1 Foundations — tokens, type, test harness

| ID | What | Why | Where | Pri | Scope | Source |
|---|---|---|---|---|---|---|
| **C-01** | Add `--color-surface-teal: #E6F1EF` (8% `#00a4a6` over `--color-surface`) next to `--color-surface-raised`. | Demotes the brand colour from foreground to ground, which is the standard resolution for a low-contrast brand hue. Gives `#00a4a6` real area without ever setting text in it. | `src/styles/tokens.css:38` (insert after `--color-surface-raised`) | P0 | SYS | Brand Fix 4a ⇄ E5 |
| **C-02** | Widen or retire `--color-accent-hover` (`#005F61`). It sits 1.0 contrast-step from `--color-accent` (7.05:1 vs 6.03:1) — the hover reads as a rendering artefact, and it is the fourth teal in the ramp. Recommended: keep the token but darken to ~`#00494B`, or express hover through underline/border instead and delete the token. | Three teals with clear jobs (brand ground, interactive, on-dark) is a palette. Four is an accident. | `src/styles/tokens.css:40`. Consumers: `Header.astro:116` (no — that's `--color-accent`), `HelperSources.astro:100`, `Faq.astro:189-190`, `Button.astro` | P1 | SYS | Brand Fix 4c |
| **C-03** | Display-face tuning, **narrowed**: add `font-optical-sizing: auto;` explicitly to the `h1..h6` rule (documents the intent; it is already the default) and add a comment recording that `SOFT`/`WONK` are absent from the shipped subset. Do **not** write `font-variation-settings`. | See §2.3. The axes the brand assessment wanted are not in the file, and the suggested rule would disable optical sizing. | `src/styles/global.css:33-37` | P2 | SYS | Brand E6 ⇄ Fix 5a — **scope reduced**, see R-3, D-10 |
| **C-04** | Asymmetric section padding (~1.15 ratio, bottom larger). | Optical correction for top-heaviness. | `src/styles/tokens.css:137` | P2 | SYS | Taste P2-5 — **DEFER**, see R-9 |
| **C-05** | Add token assertions for anything C-01/C-02 change: `contrastRatio(ink, surface-teal) ≥ 4.5`, `contrastRatio(accent, surface-teal) ≥ 4.5`, `contrastRatio(ink-muted, surface-teal) ≥ 4.5`. Measured values: **12.87 / 5.54 / 7.32** — all clear comfortably. | Matches the existing pattern and stops a later contributor deepening the wash past AA. | `tests/tokens.test.ts` (append to the `token contrast` describe) | P0 | SYS | Implied by Fix 4a's "Verify" line |

### 3.2 Shell and brand mark — header, footer, mobile surfaces, favicon

| ID | What | Why | Where | Pri | Scope | Source |
|---|---|---|---|---|---|---|
| **C-06** | Delete `{ label: 'Home', href: '/' }` from `navItems`. | The wordmark already links to `/`. Buys 56px of header width. Safe for `tests/links.test.ts` — `/` resolves in `dist/` so it does not need the allowlist. | `src/lib/nav.ts:11` | P0 | LOC | Taste P0-1.1 |
| **C-07** | Relabel `Why DirectHired` → `Why Us`. Route stays `/why-directhired`. | Buys 65px; the brand name is 40px to the left in the wordmark. | `src/lib/nav.ts:16` | P0 | LOC | Taste P0-1.3 — **D-1** |
| **C-08** | Delete the secondary `<Button>` from the header. | Removes 145px, the largest single saving. WhatsApp survives in the mobile nav panel, the mobile bar, the hero, pricing, final CTA and footer. | `src/components/Header.astro:46` (keep line 45) | P0 | LOC | Taste P0-1.2 ⇄ P0-5 |
| **C-09** | Delete the `.header-ctas :global(.btn) { padding-inline: var(--space-4) }` override and its 13-line comment. | It exists only to compact a header that will now fit. Removing it makes the header CTA match every other CTA on the site. | `src/components/Header.astro:125-140` | P1 | LOC | Taste P0-1.5 |
| **C-10** | Lower `--bp-desktop` `96em` → the value **re-measured after C-11 lands** (taste audit measured 75em/1200px pre-logo; expect 78–82em post-logo). Change the literal in lockstep in **all four places** or a viewport range opens with no nav surface at all. Rewrite the comment block with the new measurement. | The 1024–1536px laptop range currently gets a phone layout stretched wide: wordmark left, hamburger right, ~1100px of nothing between, plus a permanent 76px bottom bar. This is the most template-like moment on the site. | `src/styles/tokens.css:155-182` (token + comment); `src/components/Header.astro:148` (`min-width: 96em`); `src/components/MobileNav.astro:296` (`min-width: 96em`); `src/components/MobileCtaBar.astro:59` (`max-width: 95.99em`) | P0 | SYS | Taste P0-1.4 |
| **C-11** | Replace the header logo. Delete `<span class="logo-mark">` and `{company.name}`; render `logo-wordmark.svg` as an Astro SVG component (`import Logo from '../assets/logo-wordmark.svg'` → `<Logo />`; stable in Astro 5.7+, this repo is on 5.18.2 — no config change). Delete the `.logo-mark` rule at `:85-91` and the Fraunces sizing at `:73-83`. Add `aria-hidden="true"` to the inlined SVG and strip its `<title>`/`role="img"`/`aria-label` so the link's existing `aria-label={company.name + ' home'}` remains the single accessible name. Height the logo ~28px so cap height matches the previous typeset mark. | The site currently presents a **serif-typeset fake wordmark plus a generic teal square** where the brand has a geometric-sans wordmark with a meaningful H. A visitor who has seen DirectHired's name card or WhatsApp DP sees a different company. | `src/components/Header.astro:27-30`, `:73-91` | **P0** | LOC | Brand E1 ⇄ E2 ⇄ E8 |
| **C-12** | Replace the footer wordmark with `logo-wordmark-on-deep.svg` (the light variant). **Not** `logo-lockup.svg` and **not** `logo-wordmark.svg` — charcoal on `#0E3A3B` is 1.47:1. | Same as C-11; and the footer currently has no mark at all. | `src/components/Footer.astro:38`, styles `:124-128` | P0 | LOC | Brand E1 ⇄ E8 |
| **C-13** | Replace `<span class="panel-brand">{company.name}</span>` with `logo-wordmark.svg` (panel ground is `--color-surface`). | Third of the three disagreeing lockups. | `src/components/MobileNav.astro:53`, styles `:245-249` | P0 | LOC | Brand E1 ⇄ E8 |
| **C-14** | Do **not** add a `--size-wordmark` token. Fix 5b's fallback path is moot once C-11/12/13 land — the wordmark stops being type. | Avoids adding a token with no consumer. | n/a — record the decision in the brand guidelines doc (C-59) | P2 | — | Brand Fix 5b — **resolved by C-11** |
| **C-15** | Replace the favicon. `public/favicon.svg` is the **unmodified Astro starter favicon** — the browser tab of a licensed Singapore employment agency currently shows a JavaScript framework's logo. Ship `logo-mark.svg` (669 B, square viewBox, teal H) as `public/favicon.svg`. `public/favicon.ico` is also Astro's; either regenerate it at 16/32/48px (teal H on `#FAF8F5` so it survives light and dark tab bars) or **delete both the file and its `<link>`** — leaving Astro's `.ico` while the SVG is DirectHired's is worse than having no `.ico`. | Most visible unforced brand error on the site, and the fix is a file copy. | `public/favicon.svg`, `public/favicon.ico`, `src/layouts/BaseLayout.astro:34-35` | **P0** | LOC | Brand S2 |
| **C-16** | Add `<meta name="theme-color" content="...">`. **Recommend `#FAF8F5`** (matches the sticky header, so the Android Chrome URL bar reads as continuous with the page). The brand assessment recommends `#0E3A3B`; that is defensible as a branded chrome but puts a dark band directly above a cream header. Reviewer's call, one line, trivially reversible. | Free, high-visibility brand surface on Android. | `src/layouts/BaseLayout.astro`, near `:34` | P2 | LOC | Brand S7 |
| **C-17** | Place the tagline **"Make It Easier For You"** once, in the footer, locked up under the wordmark. Typeset it in CSS (do not use `logo-lockup.svg` — its tagline is charcoal). Treatment: `font-family: var(--font-text)`, `font-size: var(--size-small)`, `letter-spacing: var(--tracking-wide)`, `color: var(--color-on-deep-muted)` (5.28:1 — clears AA), left-aligned to the wordmark's left edge, `margin-top: calc(var(--space-2) * -1)` to tighten the lockup. **Do not** also add it to the hero, header or final CTA — one appearance is what makes it a signature. | The tagline appears **zero times** across `src/` and `public/`. It is the only line stating what the company promises the customer *feels*, and the footer is the one surface whose job is identity rather than conversion. | `src/components/Footer.astro:38` (immediately after the logo), styles beside `.footer-logo` at `:124-128` | P1 | LOC | Brand S4 / §3 |
| **C-18** | Reduce the mobile CTA bar's stacked height below 416px without removing a button: cut `padding-block` on the stacked buttons and/or drop the bar's own vertical padding, then re-measure and lower `--mobile-bar-height` from `9rem`. **Do not remove the WhatsApp button** (see R-7). | 144px is ~18% of an iPhone SE viewport, permanently. | `src/components/MobileCtaBar.astro:106-117` (`@media (max-width: 26em)`), `:34` and `:111` (`--mobile-bar-height`) | P1 | LOC | Taste P0-5 (partial) — **modified**, see R-7 |
| **C-19** | Document the **third, undocumented breakpoint**: `64em` is used at `Hero.astro:125`, `Process.astro:77` and `TwoSidedMatch.astro:136` and matches neither `--bp-tablet` (48em) nor `--bp-desktop`. Add `--bp-wide: 64em` to the breakpoint block with a comment naming its three consumers. | Both audits tripped over this independently. A fourth undocumented literal is how the four-way sync hazard started. | `src/styles/tokens.css:146-182` | P1 | SYS | Taste P1-2 note ⇄ Brand §2 "incidental note" |
| **C-20** | When an approved OG image exists: add `og:image` / `og:image:width` / `og:image:height` / `twitter:image` and switch `twitter:card` back to `summary_large_image`. The instructions are already written in the comment at `:43-64`. | WhatsApp is this business's live conversion channel and reads `og:image` directly. | `src/layouts/BaseLayout.astro:65` | P1 | LOC | Brand §6, §7 — **blocked, D-9** |
| **C-21** | Add a header-fit regression test asserting `.header-inner.scrollWidth <= .header-inner.clientWidth` at the new breakpoint ±1px, and that exactly one nav surface is present at `bp-1px` and `bp+1px`. | The four-way breakpoint literal is already documented as a hand-sync hazard; this is the only automated guard against it. | New `tests/header-fit.test.ts` | P1 | LOC | Taste P0-1 "Effort & risk" |

### 3.3 Hero — block 01

| ID | What | Why | Where | Pri | Scope | Source |
|---|---|---|---|---|---|---|
| **C-22** | **Replace the split diptych with a single frame containing both people.** Delete `grid-template-columns: 1fr 1fr`, `gap: 2px` and `background: var(--color-brand-teal)` from `.hero-visual`, and the 7-line comment explaining the seam. One `<Image>`, not two. | This is the headline finding of **both** audits, reached independently. The logo's H is two figures **joined at the crossbar**; the hero takes those two figures and puts a line between them. The seam is the most prominent graphic element in the composition and it means *separation*. A family reading "Find the Right Helper for Your Family" beside two figures in separate boxes is being shown a catalogue, not a match. It also fails structurally: at 375px each panel is ~127px wide with the figure ~30px tall. | `src/sections/Hero.astro:38-59` (markup), `:101-116` (styles + comment) | **P0** | LOC | Taste P0-2 ⇄ Brand E4 ⇄ Brand Fix 4b |
| **C-23** | `.hero-image` `aspect-ratio: 4 / 5` → `5 / 4` at desktop, `4 / 3` at mobile. Keep the explicit `width`/`height` attributes so CLS stays at zero. | A landscape frame is what "one room, two people, one shared task" needs; two portraits is what a diptych needs. | `src/sections/Hero.astro:118-123` | P0 | LOC | Taste P0-2 |
| **C-24** | Let the single image bleed from the container's right edge to the viewport edge at ≥80em. **Implement with `overflow-x: clip` on `.hero`**, not bare `100vw` — `100vw` includes the scrollbar on Windows Chrome and will introduce horizontal document scroll. Gate on: `document.scrollWidth === document.documentElement.clientWidth` at 1280 / 1440 / 1920 **with a visible scrollbar**, and re-run Lighthouse (this element is the LCP candidate). | At 1920px every element on the page obeys the same 1152px box and there is 384px of dead margin each side. One element crossing that line gives the page an axis. | `src/sections/Hero.astro:125-129`, add a `@media (min-width: 80em)` block | P1 | LOC | Taste P0-2 — **verify carefully** |
| **C-25** | Add an eyebrow above the `<h1>` carrying the MOM licence. Local markup — do not import a `SectionHeader` eyebrow (see C-31). | Stated principle one is **trust before conversion**; right now the first credential a visitor meets is ~550px below the fold in a 113px strip. | `src/sections/Hero.astro:28` | P0 | LOC | Taste P0-2 — **D-2** (conflicts with C-48) |
| **C-26** | Remove the hero's secondary `<Button>`. | At 375px the hero's two stacked full-width buttons sit directly above the fixed bar's two stacked full-width buttons: **four buttons, two labels, one screen.** Neither reads as the decision point. | `src/sections/Hero.astro:34` | P0 | LOC | Taste P0-5 — **D-12** |
| **C-27** | Rewrite the hero `alt` text. `"Illustration representing a family"` / `"Illustration representing a helper"` describe the file, not the picture. When photography lands, describe what is in the frame — and per brief §55, **never** imply the people depicted are actual DirectHired staff, helpers or clients unless they are and a release exists. | Tells a screen-reader user nothing today. | `src/sections/Hero.astro:41`, `:51` | P2 | LOC | Taste P2-4 ⇄ Brand §7 "Forbidden" |
| **C-28** | Retire `src/assets/hero-family.svg` and `src/assets/hero-helper.svg` once the real image lands. Note both currently render as solid near-black faceless silhouettes with an unexplained 6px teal dot on each torso (reads as a pin or badge, has no stated meaning). | Explicitly temporary; the family reads as a group and the helper reads as alone. | `src/assets/hero-family.svg`, `src/assets/hero-helper.svg`, imports at `Hero.astro:18-19` | P0 | LOC | Taste P0-2 ⇄ Brand §7 |

### 3.4 Shared primitives

| ID | What | Why | Where | Pri | Scope | Source |
|---|---|---|---|---|---|---|
| **C-29** | `Card` is `background: #fff` + `1px solid` border + `box-shadow` + `border-radius` — the exact combination named as generic. Drop the border and rely on the (already warm-tinted) shadow, **or** drop the shadow and rely on the border. Not both. | Using both is what makes it read as a UI kit rather than a design. | `src/components/Card.astro:27-31` | P2 | SYS | Taste P2-1 |
| **C-30** | ~~Invert `Card` to sit on `--color-surface` so it reads on a white section.~~ | **REJECTED** — see R-1. Take the "reduce card-hosting sections" path (C-36, C-37) instead. The two are explicitly alternatives; doing both produces a worse result than either. | `src/components/Card.astro:27` | — | — | Taste P0-4 alternative — **R-1** |
| **C-31** | **Delete** `SectionHeader`'s `eyebrow` prop, the `.eyebrow` / `.eyebrow-mark` markup and styles, and the paragraph in the file header describing them. Reserve the short teal rule for exactly two places: block 07's crossbar (C-38) and `FinalCta`'s `.cta-mark`. | The prop has **zero** call sites (§2.2). A primitive used zero times is dead code, and adding it to ten blocks would spend the brand's one connective gesture on routine furniture before it ever means anything. Deleting resolves the taste audit's "use it or lose it" *and* the brand assessment's "ration the dash" in one move. | `src/components/SectionHeader.astro:3-11` (header comment), `:13`, `:18`, `:22-29`, `:40-59` | P1 | SYS | Taste P1-6 ⇄ Brand E7 — **D-11**, see R-4, R-5 |
| **C-32** | Raise `.trust-value` above body size and give the MOM licence its own treatment (a bordered "plate", tabular numerals). It is currently `--size-body` (16px) — the same size as the copy it sits among. | See C-48 for the argument. This is the component half of that change. | `src/components/TrustBadge.astro:39-44` | P1 | LOC | Taste P1-3 |
| **C-33** | Give the total-only pricing card honest content that fills it. Card 1 renders six line items and stands ~310px; card 2 renders one number and stands ~85px, in a `3fr 2fr` grid — the right column is three-quarters empty and reads as "failed to load". The fix is a short prose paragraph explaining what the package covers and why it is not itemised — **not** a fabricated breakdown. Requires a new optional field on `TotalOnlyPackage` (C-57). | `TotalOnlyPackage` exists specifically so an itemisation cannot be invented, and that decision must stand. But the *visual* consequence undermines the block whose whole job is communicating transparency. | `src/components/PricingCard.astro:31-53` | P1 | LOC | Taste P1-4 — **blocked, D-6** |

### 3.5 Sections — rhythm, grounds, and block-level fixes

| ID | What | Why | Where | Pri | Scope | Source |
|---|---|---|---|---|---|---|
| **C-34** | **Restore strict ground alternation across all thirteen blocks, as one atomic change.** Current rendered grounds: 01 cream, 02 white, 03 cream, 04 white, 05 cream, 06 cream, 07 deep, 08 cream, 09 cream, 10a cream, 10b cream, 11 cream, 12 white. `PricingSection`, `Services` and `Reviews` each explicitly declare `background: var(--color-surface)` — byte-identical to the page ground — so **blocks 08–11 are one continuous cream field ~2,400px tall**, and once 10a/10b populate it will hold four consecutive card grids with nothing between them. Target sequence (with C-35 and C-36/37 applied): 01 cream · 02 white · 03 cream · 04 white · **05 teal wash** · 06 cream · 07 deep · 08 white · 09 cream · 10a white · 10b cream · 11 white · 12 cream. Decide the whole sequence in one sitting; changing them piecemeal yields something worse than either the current or the target state. | The 256px between blocks is uniform, but uniform spacing only reads as monotonous when nothing else marks the boundary. Where the ground changes, 256px reads generous; where it does not, the reader cannot tell whether block 09 is a new subject or a continuation of 08. **Fix the alternation and most of the spacing complaint dissolves.** | `PricingSection.astro:71-84` · `Services.astro:43-53` · `Reviews.astro:66-75` · `Faq.astro:82-84` (no background — add one) · `MeetHelpers.astro:90-92` (no background — add one) · `FinalCta.astro:43-47` · `Problem.astro:73-75` · `Process.astro:64-66` · `HelperSources.astro:51-53` · `TrustBar.astro:27-32` · `Difference.astro:71-74` | **P0** | LOC ×11 | Taste P0-4 |
| **C-35** | Apply `--color-surface-teal` as the ground of **block 05 (Process)**. One section only. | Gives `#00a4a6` real area instead of hairlines — across the whole homepage its total rendered area today is one ~14px square plus five rules of 1.5–2px. Process is the right host: it is the only section already using brand teal as a graphic (the rail at `:74`/`:84`), it hosts no `Card`, and putting a ground change between 05 and 06 fixes one of the two "same field" collisions C-34 identifies. Measured on the wash: ink 12.87:1, ink-muted 7.32:1, accent 5.54:1 — all AA-clear with margin. | `src/sections/Process.astro:64-66` | P0 | LOC | Brand Fix 4a ⇄ E5 (**applied to Process, not Services** — see note) |
| **C-36** | Restructure block 08 (Helper Sources) from a card grid to an **unboxed divided row**. Lift the pattern from `Difference.astro:85-127`, which was chosen there for exactly this reason. | `Card` is pure white, so any section hosting it is forced onto cream to stay visible — that is what collapsed the alternation. Reducing card-hosting sections from five to three (09 Services, 10a Meet Helpers, 06 Pricing) is what lets the sequence in C-34 run free. Block 08's content is prose; it does not need a container to be legible. | `src/sections/HelperSources.astro:31-46` (markup), `:55-102` (styles) | P0 | LOC | Taste P0-4 |
| **C-37** | Restructure block 10b (Reviews) into an **unboxed quote wall** — hairline-separated pull quotes in `--font-display`, no boxes. | A boxed Google review is a widget; an unboxed one is a testimonial. **Unblocked work with zero regression surface** — the section currently renders nothing (empty collection), so it can be rebuilt before review data exists. Keep the `reviews.length > 0 &&` guard and the empty-renders-nothing behaviour exactly as-is. | `src/sections/Reviews.astro:42-59` (markup), `:77-117` (styles) | P1 | LOC | Taste P0-4 |
| **C-38** | **Make block 07's crossbar connect.** `.bridge::before` spans only the `var(--space-8)` (32px) middle grid column and touches neither vertical. Extend it with negative inline margins, or move it to a full-width absolutely-positioned element behind the composition, so it visibly meets both uprights. | The crossbar is the entire meaning of the mark — the moment the two figures are *joined*. On the live page it is a short floating dash suspended in a gap, connecting nothing. **The one gesture that must touch is the one that does not.** This is the same divider-vs-connector finding as C-22, in the block that exists to express it. | `src/sections/TwoSidedMatch.astro:163-177`, grid at `:140` | P0 | LOC | Brand E3.1 |
| **C-39** | Move each `.side-mark` head **onto its own upright**. It currently sits at the top-left of each text column, ~400px from the vertical rule, reading as a decorative bullet. Increase from 10px so it is legible as a head. | Nothing connects a dot to an upright, so the figure never assembles. | `src/sections/TwoSidedMatch.astro:99-105`, `:46`, `:56` | P0 | LOC | Brand E3.2 |
| **C-40** | Move the uprights to the **outer** edges of each column. `border-right` on `.side:first-child` and `border-left` on `.side:last-child` put both rules against the central gutter, so the structure drawn is `] [`, not `H`. | The logo's uprights are the H's outer strokes. | `src/sections/TwoSidedMatch.astro:153-161` | P0 | LOC | Brand E3.3 |
| **C-41** | *Optional:* a single slow draw-in of the crossbar on scroll — the only motion on the entire site. Must sit inside the existing `prefers-reduced-motion` guard, animate `transform`/`opacity` only, and never fire more than once. | A *signature*, not *animation*. Rationed to one element it is memorable; this is the one exception the brand assessment carves out of its own "add no motion" rule. | `src/sections/TwoSidedMatch.astro` (local `<script>` or CSS `@scroll-timeline`) | P2 | LOC | Brand E3 optional — see R-2 for why the general case is rejected |
| **C-42** | Reconcile `TwoSidedMatch`'s `@media (min-width: 64em)` with its own header comment at `:12`, which says the columns render "from `--bp-desktop` up". They disagree. Update the comment to reference `--bp-wide` (C-19). | The crossbar's visibility depends on this query; a future contributor "fixing" the comment could move it. | `src/sections/TwoSidedMatch.astro:12`, `:136` | P2 | LOC | Brand §2 "incidental note" |
| **C-43** | Constrain the Services grid to `repeat(2, 1fr)` at 48em and `repeat(3, 1fr)` at 64em, replacing `repeat(auto-fit, minmax(15rem, 1fr))`. | At ≥1280px `auto-fit` yields four columns, so six services render as **4 + 2 with two visibly empty cells**. A grid that leaves orphan cells reads as unfinished. Content width lands ~205px, producing 5–7 line wraps of 3–4 words. | `src/sections/Services.astro:55-60` | P1 | LOC | Taste P1-1 |
| **C-44** | Align Services card baselines: `min-height` on `.service-title` equal to two lines at `1.125rem × 1.15`, or make `.service-card` `display: grid; grid-template-rows: auto 1fr`. | "New Helper Placement" and "Direct-Hire Processing" wrap to two lines while "Transfer Helper" and "Maid Insurance" do not, so body copy starts at two different heights in one row. | `src/sections/Services.astro:62-74` | P1 | LOC | Taste P1-1 |
| **C-45** | Audit the other three `auto-fit / minmax` grids for the same orphan-cell behaviour and give them explicit column counts: `HelperSources.astro:57` (moot after C-36), `MeetHelpers.astro:96`, `Reviews.astro:79` (moot after C-37). 10a with 5 or 7 profiles will reproduce the defect exactly. | Pre-emptive, free, and it is the identical bug. | `src/sections/MeetHelpers.astro:94-99` | P2 | LOC | Taste P1-1 note |
| **C-46** | Raise `.process-rail`'s horizontal breakpoint from `64em` to `80em` (1280px). | At 1024–1280px each of the five steps is ~180px wide; labels wrap after two words and descriptions run 5–7 lines of 3–5 words. The rail is a good device — the typographic `01`–`05` markers and the teal rule are among the more considered things on the page — it just needs more than 180px per step to read as editorial. | `src/sections/Process.astro:77` | P1 | LOC | Taste P1-2 |
| **C-47** | Rewrite step 2's label. Steps 1 and 2 read "Understand your family" then "Understand your needs" — adjacent, same opening verb, and the distinction is not self-evident. Either merge them into one step, or rename step 2 to name what it actually covers. | Two consecutive steps opening on the same verb makes a five-step process look like one step split to reach five. | `src/sections/Process.astro:22`, `:26` | P1 | LOC | Taste P1-2 — **D-4** (brief §23 constrains process wording) |
| **C-48** | Give the trust bar real presence: MOM licence number set noticeably larger, a bordered licence "plate" around it, more vertical room. Today it is a 113px white strip with three centred 13px uppercase labels over three 16px values between two hairlines — it reads as a divider that happens to have text in it. **Do not reproduce the MOM crest or any government mark** (D-7): a bordered plate with the number is safe; an official-looking seal may not be. The value must keep coming from `company.momLicence` — never retyped. | For a Singapore maid agency the licence number is *the* credential — checkable against MOM's public register, and the thing separating a licensed agency from the unlicensed operators families are warned about. Setting it at body size in a band designed to be scrolled past wastes the page's best asset. | `src/sections/TrustBar.astro:27-38` (pairs with C-32) | P1 | LOC | Taste P1-3 |
| **C-49** | Revisit `grid-template-columns: 3fr 2fr` once C-33's copy exists — if the second card gains real content, an equal split may read better. | The unequal split was chosen to reflect content weight; that reasoning changes when the content changes. | `src/sections/PricingSection.astro:131-140` | P2 | LOC | Taste P1-4 |
| **C-50** | Remove the pricing block's secondary `<Button>`. | Reduces the CTA-pair count. **But** the block comment at `:14-23` cites design spec §6.4 naming this block among the surfaces that carry the pair "in that order everywhere, without exception". | `src/sections/PricingSection.astro:63` | P1 | LOC | Taste P0-5 — **D-3, recommend KEEP**, see R-8 |
| **C-51** | Fix the FAQ column's axis. `<Container width="narrow">` (48rem) centres a 768px column, so at 1920px its left edge sits at x=598 while every other section heading starts at x=408 — a 190px indent with left-aligned text inside it. Either left-align the narrow column to the main container's left edge, or centre the block's heading and lede so the narrowing reads as intentional. Note `FinalCta.astro:30` uses the same narrow container but is `text-align: center` throughout, so it reads correctly — the FAQ is the only inconsistent use. | A narrower measure for reading content is the right instinct. An off-axis left edge with left-aligned text inside reads as a mistake rather than a decision. | `src/sections/Faq.astro:53`; reference `src/components/Container.astro:30-32` (do not edit Container — see §4) | P1 | LOC | Taste P1-5 |
| **C-52** | **Delete the `flag` field** from the helper-source schema, from all three markdown files, and from the block's markup and styles. | `flag: 🇮🇩` etc. are regional-indicator emoji pairs. Chrome and Edge on Windows do not render them — they fall back to the two letters, so on the most common desktop OS the cards read **"ID" / "MM" / "IN"** at 32px in Fraunces. A block whose entire visual vocabulary is three glyphs, rendering as three grey letter-pairs, is a broken block, and it is invisible to anyone reviewing on a Mac. "IN" is doubly wrong: Mizoram is an Indian state, so the card reads "IN — Mizoram", and `tests/content.test.ts:13` already forbids labelling Mizoram as India. Deleting is better than an SVG flag (R-6). | `src/content/config.ts:25` (schema) · `src/content/helpers/indonesia.md:4`, `myanmar.md:4`, `mizoram.md:4` · `src/sections/HelperSources.astro:36-38` (markup), `:71-74` (`.source-flag`) | **P0** | LOC | Taste P0-3b |
| **C-53** | Rewrite each `summary` so it carries one fact the other two do not (typical prior experience, language, placement route, typical paperwork duration). If DirectHired cannot supply a distinguishing fact per source, **delete the summaries entirely** and let the block be three names — three identical sentences say less than no sentence. Current state: the lede and all three cards are literally the same sentence with one word swapped. | Repeated boilerplate with one word changed is the single most recognisable signature of generated content, and the client's stated fear is being read as "an AI-generated recruitment template". This block is the clearest instance of it on the page. | `src/content/helpers/*.md:5` (`summary`); lede at `src/sections/HelperSources.astro:28` | **P0** | LOC | Taste P0-3a — **blocked, D-5** |
| **C-54** | The markdown **bodies** (line 9 of each of the three files) are also identical across all three and carry the same defect onto the eventual `/helpers/:slug` pages. Same treatment as C-53. | Same reasoning; the audit flagged it in passing and it must not be lost. | `src/content/helpers/indonesia.md:9`, `myanmar.md:9`, `mizoram.md:9` | P1 | LOC | Taste P0-3a |
| **C-55** | Typographic apostrophe sweep in section files: `shouldn't`, `we're`, `doesn't`, `family's` all use the typewriter `'` rather than `’`. At 44px in Fraunces on the Problem heading it is clearly visible, and it is one of the reliable tells separating typeset copy from pasted copy. | Cheap; one of the few "premium" signals that costs nothing. | `src/sections/Problem.astro:15`, `:33` · `src/sections/Faq.astro:56` · `src/sections/FinalCta.astro:33` · `src/sections/MeetHelpers.astro:52` · `src/sections/Process.astro:23` | P2 | LOC | Taste P2-3 |

### 3.6 Content and data

| ID | What | Why | Where | Pri | Scope | Source |
|---|---|---|---|---|---|---|
| **C-56** | Apostrophe sweep in the content collections (the other half of C-55). | Same. Split by file owner, not by nature of the change. | `src/content/faq/*.md`, `src/content/services/*.md` | P2 | LOC | Taste P2-3 |
| **C-57** | Add an optional explanatory field to `TotalOnlyPackage` (e.g. `readonly note: string \| null`) so C-33 has somewhere honest to read from. The discriminated union must keep making an invented `lineItems` a **type error**. | Preserves the compiler guarantee that is the point of the type. | `src/data/pricing.ts:17-23` | P1 | LOC | Taste P1-4 — **blocked, D-6** |

### 3.7 Documentation and client-facing artefacts

| ID | What | Why | Where | Pri | Scope | Source |
|---|---|---|---|---|---|---|
| **C-58** | Write the iconography system doc. Name the rule the existing icons already imply — 28×28 viewBox, `stroke-width: 1.6`, `fill: none`, `currentColor`, rounded caps/joins, max one filled element — and root the grammar in the logo's primitives: **a circle is a person, a connecting stroke is the relationship.** Every icon should be expressible as some arrangement of those two. Note the accidental find: the first Problem icon (`Problem.astro:42-46`) is two overlapping circles, one dashed — "not the right fit" — which is already the most brand-native drawing on the site. | Turns an accidental style into an ownable one and makes the mark generative rather than decorative. There are six icons on the whole site and nothing documented. | New `docs/design/iconography.md`; standardise against `src/sections/Problem.astro:41-60` | P1 | — | Brand S5 |
| **C-59** | Write the brand guidelines document. `docs/design/palette-proposal.md:73-75` deliberately covers colour and type only. Everything else — mark usage, the three approved lockups and when to use each, clear space, minimum sizes, the on-deep variant rule (§2.1), tagline placement, icon rules, photography rules, and what never to do — lives nowhere. | The first external contractor the client hires will otherwise invent their own answers. | New `docs/design/brand-guidelines.md` | P1 | — | Brand S8 |
| **C-60** | Define the mark-only lockup and its clear-space rule as part of C-59: minimum size, clear space, the fact that `logo-mark.svg` is the favicon / app icon / WhatsApp DP asset, and that the H must never be redrawn by hand. | The brand needs the H usable independently of the wordmark. The asset now exists; the rules do not. | Section of `docs/design/brand-guidelines.md` | P1 | — | Brand S3 |
| **C-61** | Promote the photography direction to a standing document a photographer can be handed. Both audits wrote briefs that agree on every substantive point and must be merged, not duplicated: **one frame, one room, one light, both people in it, both engaged in the same ordinary task, both at the same scale and on the same plane, both in focus, shot at eye level, natural window light, a real Singapore HDB/condo interior with unstageable detail.** Forbidden verbatim: no uniformed helper standing beside a seated family; no helper in the background of a family portrait; no one carrying luggage or opening a car door; no handshake-over-desk or clipboard-and-thumbs-up; no white cyclorama, lens flare or motion blur; no stock. Consent: written releases in a language the subject reads fluently, obtained before the day; helpers paid at no less than their normal rate; anyone may withdraw without consequence to a placement; never caption a face with a nationality. Block 08 wants *place*, not people. Block 10a portraits: eye level, working clothes not uniform, plain background, consistent crop. Deliver at 2× the largest rendered width. | The composition question is upstream of the asset question, and C-22 must land **before** the shoot is briefed — otherwise the brief asks for two portraits, which is the wrong thing to commission. | New `docs/design/photography-brief.md` | **P0** | — | Taste P0-2 "What the photography should actually depict" ⇄ Brand S6 ⇄ Brand §7 |
| **C-62** | Add the outstanding client inputs to `DECLARED_INPUTS` and regenerate: one distinguishing fact per helper source (D-5); confirmation of permitted MOM mark usage (D-7); photography + releases (D-8). **Do not hand-edit the generated markdown** (§2.4). Run `npm run build:dev && node scripts/generate-info-required.mjs`. | Both audits asked for this and both named the wrong file. | `scripts/generate-info-required.mjs:78` (`DECLARED_INPUTS`), then regenerate `docs/INFORMATION-REQUIRED-BEFORE-PRODUCTION.md` | P1 | — | Taste "Items blocked on DirectHired" ⇄ Brand §7 "Where these land" — **corrected, R-11** |

---

## 4. Workstreams and file ownership

Six workstreams. **Every editable file in the repository is assigned to exactly one of them.** A file not listed under your workstream is read-only to you.

### Ordering

```
WS-0 Foundations  ──┬──▶ WS-4 Primitives ──▶ WS-3 Sections
                    │
                    ├──▶ WS-1 Shell & Mark ──▶ (re-measure) ──▶ C-10 breakpoint
                    │
                    └──▶ WS-2 Hero

WS-5 Content   ── independent, but coordinate C-52 with WS-3 (see below)
WS-6 Docs      ── fully independent, start on day one
```

**Hard dependencies:**

1. **WS-0 must merge before anyone else starts.** It is the only workstream permitted to touch `src/styles/tokens.css` and `src/styles/global.css`. It is small (2–3 h) and exists precisely so the other five never contend for the token file. WS-3 cannot apply C-35 before `--color-surface-teal` exists; WS-4 cannot resolve C-02's hover consumers before the token is settled.
2. **WS-1 holds a carve-out on `tokens.css:146-182` (the breakpoint block) after WS-0 merges.** This is the one shared-file exception in the plan and it is deliberate: the `--bp-desktop` literal must change in lockstep across four files (`tokens.css`, `Header.astro`, `MobileNav.astro`, `MobileCtaBar.astro`), three of which WS-1 already owns. Splitting that across two workstreams opens a viewport range with no nav surface at all. WS-0 must not re-enter `tokens.css` after handing over.
3. **Inside WS-1: C-11 (logo swap) before C-10 (breakpoint).** The header's natural width is what sets the breakpoint, and the real wordmark is wider than the typeset one it replaces (§2.6). Re-measure `.header-inner` natural width at the target viewport *after* the logo lands, then pick the value. Do not carry the taste audit's 75em forward unverified.
4. **WS-4 must merge before WS-3 finishes.** WS-3's entire rhythm sequence (C-34) depends on whether `Card` stays white — that is a WS-4 decision (C-29, C-30). WS-4 is small; land it early.
5. **WS-2's C-22 must land before the photography is commissioned** (C-61), so the shoot is briefed against a single frame.
6. **C-52's two halves are inside WS-3.** `src/content/config.ts` and `src/content/helpers/*.md` are assigned to WS-3, not WS-5, precisely so the schema change and the markup change ship together. WS-5 owns only `src/content/services/`, `src/content/faq/`, and `src/data/`.

---

### WS-0 — Foundations (tokens, type, test harness)

**Items:** C-01, C-02, C-03, C-05. (C-04 deferred.)
**Effort:** 2–3 h. **Blocking — merge first.**

**Owns exclusively:**
```
src/styles/tokens.css          ← hands lines 146-182 to WS-1 after merging
src/styles/global.css
src/lib/contrast.ts
src/lib/money.ts
src/lib/structured-data.ts
src/lib/whatsapp.ts
public/robots.txt
public/fonts/figtree-variable.woff2
public/fonts/fraunces-variable.woff2   ← only if D-10 approves a re-subset
tests/tokens.test.ts
tests/contrast.test.ts
tests/money.test.ts
tests/whatsapp.test.ts
tests/structured-data.test.ts
tests/pricing.test.ts
tests/company.test.ts
tests/check-tbd.test.ts
```

**Verify:** `npm test` (89 → 92 with C-05's three assertions). `npm run build`.

---

### WS-1 — Shell and brand mark

**Items:** C-06, C-07, C-08, C-09, C-10, C-11, C-12, C-13, C-14, C-15, C-16, C-17, C-18, C-19, C-20, C-21.
**Effort:** 8–12 h. **The largest workstream, and the one carrying the highest-leverage change.**

**Owns exclusively:**
```
src/lib/nav.ts
src/components/Header.astro
src/components/MobileNav.astro
src/components/MobileCtaBar.astro
src/components/Footer.astro
src/layouts/BaseLayout.astro
src/assets/logo-wordmark.svg
src/assets/logo-wordmark-on-deep.svg
src/assets/logo-mark.svg
src/assets/logo-lockup.svg
logo/Logo-01.svg
logo/logo.png
public/favicon.svg
public/favicon.ico
tests/links.test.ts
tests/header-fit.test.ts        (new, C-21)
src/styles/tokens.css:146-182   (carve-out, after WS-0 merges — breakpoint block only)
```

**Internal order:** C-06 → C-07 → C-08 → C-11 → C-12 → C-13 → **re-measure** → C-10 → C-09 → C-21 → C-15 → C-16 → C-17 → C-18 → C-19.

**Verify:** load at `bp-1px` and `bp+1px`; assert exactly one nav surface at each and `document.scrollWidth === document.documentElement.clientWidth`. `npm test`. `npm run build`. Confirm the favicon renders the H, not Astro's mark, in a fresh browser profile.

---

### WS-2 — Hero

**Items:** C-22, C-23, C-24, C-25, C-26, C-27, C-28.
**Effort:** 3–4 h for the structure. Asset swap blocked on photography (D-8).

**Owns exclusively:**
```
src/sections/Hero.astro
src/assets/hero-family.svg
src/assets/hero-helper.svg
(future) src/assets/hero-*.{jpg,webp,avif}
```

**Note:** `Hero.astro:125` uses `64em`. Leave the literal alone — WS-1 documents it as `--bp-wide` (C-19). Do not import `SectionHeader` for C-25's eyebrow; write local markup, because WS-4 is deleting the eyebrow primitive (C-31).

**Verify:** no horizontal document scroll at 320 / 375 / 768 / 1024 / 1280 / 1440 / 1920 **with a visible scrollbar**. CLS unchanged (keep explicit `width`/`height`). Re-run Lighthouse — the hero image is the LCP element.

---

### WS-4 — Shared primitives

**Items:** C-29, C-31, C-32, C-33. (C-30 rejected.)
**Effort:** 3–4 h. **Land early — WS-3 depends on its decisions.**

**Owns exclusively:**
```
src/components/Card.astro
src/components/SectionHeader.astro
src/components/Container.astro
src/components/Button.astro
src/components/ProcessStep.astro
src/components/TrustBadge.astro
src/components/PricingCard.astro
src/components/Tbd.astro
```

**Note:** C-51 (FAQ alignment) references `Container.astro:30-32` but **must be solved inside `Faq.astro`** — WS-3 may not edit `Container.astro`. `.narrow` is shared with `FinalCta`, where it currently reads correctly; changing it would break the one call site that works.

**Verify:** visually diff every block that renders a `Card` (03, 06, 08, 09, 10a, 10b) after C-29. `npm test`.

---

### WS-3 — Sections: rhythm, grounds, and block-level fixes

**Items:** C-34, C-35, C-36, C-37, C-38, C-39, C-40, C-41, C-42, C-43, C-44, C-45, C-46, C-47, C-48, C-49, C-50, C-51, C-52, C-53, C-54, C-55.
**Effort:** 12–16 h. **The largest item count.**

**Owns exclusively:**
```
src/sections/TrustBar.astro
src/sections/Problem.astro
src/sections/Difference.astro
src/sections/Process.astro
src/sections/PricingSection.astro
src/sections/TwoSidedMatch.astro
src/sections/HelperSources.astro
src/sections/Services.astro
src/sections/MeetHelpers.astro
src/sections/Reviews.astro
src/sections/Faq.astro
src/sections/FinalCta.astro
src/pages/index.astro
src/content/config.ts
src/content/helpers/indonesia.md
src/content/helpers/myanmar.md
src/content/helpers/mizoram.md
src/content/helper-profiles/.gitkeep
src/content/reviews/.gitkeep
tests/content.test.ts
tests/conditional-blocks.test.ts
```

**Internal order:** decide and apply the full C-34 sequence **first, in one commit** (it is eleven one-line background declarations and must be judged as a whole). Then C-35, C-36, C-37. Then the block-07 trio C-38/39/40 together. Then the independent fixes in any order.

**Do not:** add a second `--color-deep` section (the register shift works *because* it is rare — 07 and the footer only). Do not add placeholder shells to `MeetHelpers` or `Reviews`; the empty-renders-nothing guard is a brand decision as much as a technical one and is covered by `tests/conditional-blocks.test.ts`.

**Verify:** `npm test` — C-52 changes the helpers schema, so `tests/content.test.ts` and the content build must both be re-run. `npm run build`. Screenshot the full page at 375 / 1280 / 1920 before and after C-34 and compare the ground sequence against `taste-audit-2026-08-15-page-rhythm.svg`.

---

### WS-5 — Content and data

**Items:** C-56, C-57.
**Effort:** 1–2 h unblocked; C-57's consumer copy blocked on D-6.

**Owns exclusively:**
```
src/content/faq/cost.md
src/content/faq/fly-in-package.md
src/content/faq/how-matching-works.md
src/content/faq/new-vs-transfer.md
src/content/faq/source-countries.md
src/content/faq/submit-requirements.md
src/content/services/direct-hire-processing.md
src/content/services/maid-insurance.md
src/content/services/maid-replacement.md
src/content/services/medical-examination.md
src/content/services/new-helper-placement.md
src/content/services/transfer-helper.md
src/data/company.ts
src/data/pricing.ts
```

**Caution:** `tests/content.test.ts:47-102` asserts that **every dollar figure written into FAQ markdown matches a real amount from `pricing.ts`**, and counts exactly 10 such figures. Touching either side without the other fails the suite by design.

---

### WS-6 — Documentation and client artefacts

**Items:** C-58, C-59, C-60, C-61, C-62.
**Effort:** 6–8 h. **Zero source-file conflict — start on day one.**

**Owns exclusively:**
```
docs/design/iconography.md              (new)
docs/design/brand-guidelines.md         (new)
docs/design/photography-brief.md        (new)
docs/design/palette-proposal.md
docs/design/implementation-plan-2026-08-16.md   (this file)
docs/INFORMATION-REQUIRED-BEFORE-PRODUCTION.md  (regenerated only, never hand-edited)
scripts/generate-info-required.mjs
scripts/check-tbd.mjs
scripts/run-axe.mjs
scripts/deploy-preview.sh
lighthouserc.json
astro.config.mjs
package.json
README.md
```

C-61 must be delivered before the shoot is booked, and after WS-2's C-22 lands.

---

### Files nobody edits

`docs/design/taste-audit-2026-08-15.md`, `docs/design/brand-assessment-2026-08-15.md`, both `taste-audit-2026-08-15-*.svg`, `docs/superpowers/**` — historical record. `dist/`, `node_modules/`, `.astro/`, `.lighthouseci/`, `.tmp-logo-preview/` — build artefacts.

---

## 5. Decisions the client must make (12)

These are not implementer calls. Each has a recommendation.

| # | Decision | Why it is the client's | Recommendation |
|---|---|---|---|
| **D-1** | Rename the nav item `Why DirectHired` → `Why Us`? (C-07) | Drops the brand name from the navigation. That is a brand-voice call, not a layout one. | **Yes.** The wordmark sits 40px to the left. Buys 65px of the header width budget. |
| **D-2** | Put the MOM licence in a hero eyebrow (C-25), or strengthen the trust bar (C-48)? **These conflict — pick one.** Doing both puts the same credential on screen twice within 600px. | Which credential leads the page is a positioning decision. | **Strengthen the trust bar (C-48), skip C-25.** The bar is directly under the fold and, given the licence, its job is exactly this. A hero eyebrow additionally competes with the `<h1>` and the lede, both of which are working. |
| **D-3** | Remove the pricing block's secondary WhatsApp CTA? (C-50) | Reduces a conversion surface, and design spec §6.4 — which the code cites at `PricingSection.astro:14-23` — names this block as carrying the pair "without exception". | **Keep it.** A family that has just resolved "how much does this cost?" is at peak intent. Removing the header (C-08) and hero (C-26) secondaries already takes the count from 6 surfaces to 4; that is enough. Overriding a signed-off spec clause for a taste argument is not worth it. |
| **D-4** | Approve new wording for process step 2. (C-47) | Brief §23 constrains process wording and notes the process may still be refined. | Recommend merging steps 1 and 2 into one step if the real process supports it; otherwise relabel step 2 to what it actually covers. **DirectHired must supply the wording** — inventing a process step is a §78 violation. |
| **D-5** | Supply **one distinguishing fact per helper source** (Indonesia / Myanmar / Mizoram), or approve deleting the summaries. (C-53, C-54) | Requires business knowledge nobody in the codebase has. | **Supply the facts if they exist; otherwise delete.** Three identical sentences say less than no sentence, and this is the page's clearest "AI-generated template" tell. |
| **D-6** | Supply explanatory copy for the Fly-In **Without Replacement** package — what it covers and why it is not itemised. (C-33, C-57) | Already a tracked Category C declared input. | Supply it. Without it the card stays visually broken (85px against 310px) and the block whose job is transparency reads as failing to load. **Do not** approve a fabricated breakdown. |
| **D-7** | Confirm whether DirectHired may display any MOM mark or crest. (C-48) | Government mark usage is a legal permission, not a design choice. | **Assume no.** Ship a plain bordered licence plate with the number. Do not add a crest unless MOM's usage terms are produced in writing. |
| **D-8** | Commission the photography and obtain releases. (C-22, C-27, C-28, C-61) | Cost, scheduling, consent, and §55 legal exposure. | Approve. Two hours with one family and one helper produces the hero, three or four secondary frames and the block-10a portraits. **The structural change (C-22) ships first regardless**, so the brief asks for the right frame. |
| **D-9** | Approve a social share image. (C-20) | Already a tracked declared input; needs an approved asset. | Highest-value single image the client will ever commission — WhatsApp is their live conversion channel and reads `og:image` directly. Until it exists, `twitter:card="summary"` stays as-is (correct). |
| **D-10** | Fund re-subsetting Fraunces to restore the `SOFT` and `WONK` axes? (§2.3, C-03) | It is a cost/benefit call with a measurable performance price. | **No, for now.** The shipped subset is 67 KB and is preloaded in the LCP path; restoring two axes would materially increase it against a 2.5 s LCP budget for anxious customers on mid-range Android over Singapore mobile data. `opsz` already works via `font-optical-sizing: auto`. Revisit only if a designer, looking at a real comparison, judges SOFT 40 worth the bytes. |
| **D-11** | Delete `SectionHeader`'s `eyebrow` primitive? (C-31) | It removes an unused capability rather than fixing a defect, and the two audits point opposite ways. | **Delete.** Zero call sites (§2.2). Deleting satisfies the taste audit's "use it or lose it" and the brand assessment's "ration the teal dash" simultaneously, and keeps block 07's crossbar as the page's only connective gesture. |
| **D-12** | Remove the hero's secondary WhatsApp CTA? (C-26) | Reduces a conversion surface on the most-viewed block. | **Yes.** On a phone the hero's two full-width buttons sit directly above the fixed bar's two full-width buttons — four buttons, two labels, one screen. Neither reads as the decision point. WhatsApp remains permanently on screen in the fixed bar. If DirectHired can compare WhatsApp-click volume before and after, do that; otherwise the design case stands. |

---

## 6. Proposals I judge wrong, risky, or not worth doing (12)

Both audits were produced by capable agents. These are the places where reading them against the full codebase changes the answer.

| # | Proposal | Verdict | Reasoning |
|---|---|---|---|
| **R-1** | Invert `Card` to `--color-surface` so it reads on a white section. *(Taste P0-4 alternative)* | **Reject** | The audit itself frames this as one of two mutually exclusive paths and prefers the other. Inverting makes every card on the site near-invisible on any cream section — and cream is the page ground, so the recessed card would need a border to exist at all, which reintroduces exactly the generic-card problem C-29 is removing. Take the "reduce card-hosting sections from five to three" path (C-36, C-37). |
| **R-2** | Add staggered scroll-entry fade-up animation site-wide via `IntersectionObserver`. *(Taste P2-2)* | **Reject** | The two audits contradict each other here, and the brand assessment is right: "for a trust-led agency serving anxious customers on mid-range Android phones over Singapore mobile data, restraint is correct and premium — scroll-reveal animation would actively cheapen this brand." It also adds JavaScript to a page that currently ships ~45 lines total, risks CLS against a 0.1 budget, and a still page executed well beats a moving page executed badly. **Keep the single exception: C-41, the block-07 crossbar draw-in.** One gesture, rationed, is a signature. Thirteen is a template. |
| **R-3** | `font-variation-settings: 'SOFT' 40, 'WONK' 0, 'opsz' 96` on `h1..h6`. *(Brand E6 / Fix 5a — "the cheapest high-leverage brand fix available")* | **Reject as written** | Verified against the shipped font (§2.3): `fvar` contains **only `opsz` and `wght`**. `SOFT` and `WONK` were instanced out during subsetting — the declaration would be a silent no-op, and the audit's own caution predicted exactly this. Worse, setting `font-variation-settings` **disables `font-optical-sizing: auto`**, so `'opsz' 96` would lock 24px `<h3>`s and the FAQ's 18px `<summary>` at display optical size — a regression. Replaced by the narrow C-03; the full version becomes D-10. |
| **R-4** | Differentiate `SectionHeader`'s eyebrow rule because "by the time a visitor reaches block 07, that dash has already appeared as ordinary section furniture several times." *(Brand E7)* | **Reject — factually wrong** | `.eyebrow-mark` has **zero** call sites (§2.2). The dash appears nowhere before block 07. The only other instance is `FinalCta`'s `.cta-mark`, in block 12, *after* it. The premise does not hold. Folded into C-31. |
| **R-5** | Apply `SectionHeader`'s eyebrow consistently across the ten major blocks. *(Taste P1-6, option A)* | **Reject in favour of deleting** | This would *create* the problem R-4 describes: ten teal dashes before block 07, spending the brand's connective gesture on routine furniture. The audit offers "use it everywhere or delete it" as alternatives; delete is the one that also satisfies the brand assessment. See C-31, D-11. |
| **R-6** | Replace the emoji flags with inline SVG national flags. *(Taste P0-3b, option A)* | **Reject** | Mizoram is an Indian state; a "Mizoram" card carrying India's flag in crisp vector is the same error at higher fidelity. `tests/content.test.ts:13-16` already asserts the site never labels Mizoram as India. It also adds three assets and a maintenance burden to a block whose real problem is that it has nothing to say. **Delete the field** (C-52). |
| **R-7** | Remove the WhatsApp button from `MobileCtaBar` below 416px (or entirely) to reclaim 144px. *(Taste P0-5, partial)* | **Reject** | WhatsApp is this business's live conversion channel, and sub-416px is the narrowest, cheapest-device segment — the users least likely to complete a web form and most likely to message. This is the single highest-risk conversion change on either list, proposed on a taste argument with no measurement. Reclaim the height by tightening padding instead (C-18). |
| **R-8** | Remove the pricing block's secondary CTA. *(Taste P0-5, partial)* | **Risky — client call** | Design spec §6.4, cited in the code at `PricingSection.astro:14-23`, names this block as carrying the pair "in that order everywhere, without exception". The audit dismisses that as "about having a CTA at peak intent", but §6.4 is a signed-off spec clause, and overriding it on taste is not the implementer's call. See D-3; recommend keeping. |
| **R-9** | Asymmetric section padding, ~1.15 ratio bottom-heavy. *(Taste P2-5)* | **Defer** | The audit itself rates it "low value on its own". It changes vertical rhythm on all thirteen blocks at once, requiring a full-page visual review, and it does so *while* WS-3 is restructuring the same page. Revisit after C-34 lands, when there is a stable page to judge against. |
| **R-10** | Extend the icon language to `Services`, `Process`, `Difference`, `HelperSources` and `TrustBar`. *(Implied by Brand S5)* | **Defer** | An unbounded illustration commission neither audit priced. It also fights `Difference.astro:3-7`'s deliberate restraint — the pillars are a plain divided row *because* block 03 already used cards and icons. **Document the grammar (C-58); do not draw twenty icons yet.** |
| **R-11** | "Add it to `docs/INFORMATION-REQUIRED-BEFORE-PRODUCTION.md`." *(Both audits)* | **Wrong file** | That document is generated and says so in its own header. Hand-editing it is silently reverted on the next regeneration. Edit `DECLARED_INPUTS` in `scripts/generate-info-required.mjs:78` and regenerate (C-62). |
| **R-12** | "S1 — obtain a vector master. *(Blocking — do this first.)*" *(Brand S1)* | **Closed** | `logo/Logo-01.svg` is present and four production crops are committed (§2.1). Everything the brand assessment gated behind S1 — S2, S3, S4, E1, E2, E8 — is unblocked today. |

---

## 7. Effort and sequencing

| Workstream | Items | Effort | Blocked on | Can start |
|---|---|---|---|---|
| **WS-0** Foundations | 4 | 2–3 h | — | Immediately (blocking) |
| **WS-1** Shell & brand mark | 16 | 8–12 h | WS-0 | After WS-0 merges |
| **WS-2** Hero | 7 | 3–4 h structure; asset swap blocked on D-8 | WS-0 | After WS-0 merges |
| **WS-3** Sections | 22 | 12–16 h | WS-0, WS-4; C-53 on D-5; C-47 on D-4 | After WS-4 merges |
| **WS-4** Primitives | 4 | 3–4 h | WS-0; C-33 on D-6 | After WS-0 merges |
| **WS-5** Content & data | 2 | 1–2 h; C-57 on D-6 | — | Immediately |
| **WS-6** Docs | 5 | 6–8 h | C-61 wants WS-2's C-22 first | Immediately |

**Total engineering: ≈ 35–50 hours**, plus client inputs (D-1…D-12) and a half-day photo shoot. With four implementers and the dependency graph above, the critical path is WS-0 → WS-4 → WS-3, roughly **four to five working days**.

### If only one change ships

> **Put the real logo in the header (C-11) and the real mark in the favicon (C-15).**

Roughly two hours, entirely unblocked, and it is the only change on this list that alters what the site *is* rather than how it is arranged. Today the browser tab of a licensed Singapore employment agency displays a JavaScript framework's logo, and the header shows a serif-typeset approximation of a geometric-sans wordmark next to a generic teal square that is not derived from the mark. A visitor who has seen DirectHired's name card, vehicle decal, Facebook page or WhatsApp display picture is looking at a different company's typography. Every other item on this list improves a site that is already recognisably well built; this one is the difference between a well-styled site and *DirectHired's* site.

**Runner-up, and the biggest purely-engineering win:** C-06 → C-11 → C-10, the header trim and breakpoint drop. It fixes the 1024–1536px laptop range — currently a phone layout stretched wide with ~1100px of nothing between the wordmark and the hamburger, plus a permanent bottom bar — along with the header's overhang past the content column at every desktop width, in one change, with no client input required.

---

## 8. What is already right — do not "improve" these

Consolidated from both audits' protected lists. A later contributor could plausibly "fix" any of these and make the site worse.

1. **`--color-brand-teal`'s graphic-only constraint and its warning comment** (`tokens.css:42-52`). Give the colour more *area* (C-01, C-35); never give it text or a button fill.
2. **`#046A6C` as the interactive accent** (`tokens.css:39`). The contrast analysis behind it is sound.
3. **The pre-flattened `--color-*-on-deep` ramp** (`tokens.css:58-92`). An elegant solution to alpha-over-dark, and its flattening is what makes the contrast directly assertable in `tests/tokens.test.ts`.
4. **The warm palette itself** — `#FAF8F5` over `#fff`, `#2A2724` over `#000`, one accent, no second accent, no gradient. This is most of why the page does not read as AI-generated.
5. **Warm-tinted shadows** — `rgba(42, 39, 36, 0.06)` at two restrained steps, never black.
6. **`--color-deep` used on exactly two surfaces** (block 07 and the footer). The register shift works *because* it is rare. Do not add a third.
7. **"Happy Employer. Happy Helper." appearing exactly once** (`TwoSidedMatch.astro:42`). Its scarcity is its force.
8. **`Difference` deliberately not being a card grid** (`Difference.astro:3-7`). C-36 is asking for more of this instinct, not less.
9. **The FAQ as native `<details>`/`<summary>`** with a CSS-only plus/minus flipping off `[open]`. Zero JavaScript, keyboard-operable for free, correctly announced.
10. **Empty sections rendering absolutely nothing** — `MeetHelpers`, `Reviews`. No shell, no skeleton, no "coming soon". A brand decision as much as a technical one, and guarded by `tests/conditional-blocks.test.ts`.
11. **The refusal to invent** — `TotalOnlyPackage` making a fabricated itemisation a *type error*; the pricing lede declining a completeness promise it would contradict two paragraphs later; "typically" and "our team" in the process copy.
12. **`twitter:card="summary"` instead of an empty `summary_large_image`** (`BaseLayout.astro:43-65`). Correct until a real approved image exists.
13. **Typographic details already handled** — `text-wrap: balance` on headings and `pretty` on paragraphs; `tabular-nums` on the process index and pricing amounts; `--tracking-wide` scoped to small uppercase only; measures capped at 42–60ch; focus rings present and never removed.
14. **Self-hosted variable fonts, preloaded, latin-subset, no CDN.** Fraunces + Figtree is doing real work and is the main reason the page does not read as generic SaaS.
15. **The `prefers-reduced-motion` implementation** (`tokens.css:210-217`, `global.css:84-91`).
16. **Restrained radii** (`tokens.css:187`) and `color-scheme: light` (`global.css:19`) as a deliberate choice.
17. **The `<h2>`/`<p>` structure in block 07** — the resolving line is deliberately a large `<p>`, not a second heading, so the outline stays in sequence.
