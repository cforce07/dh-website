# DirectHired homepage — taste audit

**Date:** 2026-08-15
**Audited:** `https://didceb5na1cjo.cloudfront.net` (live CloudFront deploy of `main`)
**Method:** `redesign-existing-projects` as the primary lens, `high-end-visual-design` as the second. The rendered page was examined in Chrome at 375, 768, 1200, 1280, 1536 and 1920 CSS px using a same-origin iframe harness (media queries respond to iframe width; `resize_window` does not change viewport width in this environment). Geometry claims below are measured with `getBoundingClientRect` / `getComputedStyle` against the live DOM, not read off the source.
**Scope:** proposals only. No source file was modified.

---

## How to read this

Grouped by priority, not by file. Every item states **What / Why / Where / Effort & risk**.

- **Where** is a real file path plus line numbers or a selector. Line numbers are as of commit `962e604`; if they drift, the selector is authoritative.
- **Effort & risk** flags whether a change is *systemic* (touches `tokens.css` or a shared primitive, so it moves every block at once) or *local* (one component).
- Reference visuals: `taste-audit-2026-08-15-hero-composition.svg` and `taste-audit-2026-08-15-page-rhythm.svg`, both in this directory.

---

## Verdict, up front

This is a well-built page with genuine discipline behind it — the token system, the contrast reasoning, and the refusal to invent data are all better than most agency work. What it does not yet have is a **point of view**. Every block is a centred 1152px column, left-aligned heading, 128px of padding above and below, content inside. Thirteen times. Nothing on the page is a different size, a different shape, or in a different place than the thing before it, except block 07. The result reads as competent and safe rather than premium — and "safe" is precisely the register a family compares against three other agency sites and then forgets.

The five items in P0 are the ones that change that. The rest is polish.

---

# P0 — these change how the page reads

## P0-1 · The header breaks the page's own grid at every desktop width, and that is the real cause of the 1536px breakpoint

**What.** Trim the header's content until it fits the 1152px content column, then lower `--bp-desktop` from `96em` to `75em` (1200px). Three cuts, in order of how much they buy:

1. Remove `{ label: 'Home', href: '/' }` from `navItems`. The wordmark already links to `/`; a "Home" item next to a home-linking wordmark is duplication, and it is the first thing every editorial site drops.
2. Remove the secondary `WhatsApp Us` button from the header only. It survives in five other places on this page (hero, pricing, final CTA, footer, fixed bar).
3. Rename `Why DirectHired` → `Why Us`. The brand name is 40px to the left of it in the wordmark.

**Measured, not calculated** (natural width of `.header-inner` with `width: max-content`, desktop nav forced on, mobile surfaces hidden, at a 1200px viewport):

| State | Natural width | Fits the 1088px content box? |
|---|---|---|
| As shipped (8 nav + 2 CTAs) | **1252px** | No — overruns by 164px |
| − "Home" | 1196px | No — overruns by 108px |
| − "Home", − "WhatsApp Us" | **1051px** | Yes, 37px slack |
| − "Home", − "WhatsApp Us", "Why Us" | **986px** | Yes, **102px slack** |

At a 1200px viewport `Container` resolves to a 1088px content box, so 986px fits with 102px to spare — more headroom than the 106px the current 96em value was chosen to preserve, and it arrives 336px earlier.

**Why.** This is not primarily a breakpoint problem, it is an alignment problem that was *solved by hiding it*. At 1920px the wordmark starts at x=408, flush with every section heading below it — and the "WhatsApp Us" button ends at x=1660, which is **164px outside the content column**. At 1536px (the breakpoint itself) it still overhangs by ~132px. Nothing else on the page does this. Raising `--bp-desktop` to 96em did not make the header fit; it only pushed the viewport wide enough that the overhang stopped causing document-level horizontal scroll. The misalignment is still visible at every desktop width — see the "Current" panel of the hero schematic.

The knock-on is the laptop range the brief asks about. At 1280px a user gets a wordmark on the left, a hamburger on the right, and ~1100px of nothing between them, plus a permanent 76px bottom bar. That is not "a desktop layout under pressure", it is a phone layout stretched wide, and it is the single most template-like moment on the site. Fixing the content fixes the breakpoint, the alignment, and the laptop experience with one change — and the root cause the existing comment already identifies ("8 nav items + 2 CTAs + wordmark") is exactly the thing being cut.

**Where.**
- `src/lib/nav.ts:11` — delete the `Home` entry. `src/lib/nav.ts:16` — relabel to `Why Us`.
- `src/components/Header.astro:46` — delete the secondary `<Button>`. Keep line 45.
- `src/styles/tokens.css:155` — `--bp-desktop: 96em` → `75em`, and rewrite the comment block at lines 155–182 with the measurements above (the current comment's warning against hand-arithmetic is correct and should be preserved, but its conclusion is now wrong).
- The literal `96em` must change in lockstep in three more places or a range opens with no nav at all: `src/components/Header.astro:148` (`min-width: 96em`), `src/components/MobileNav.astro:296` (`min-width: 96em`), `src/components/MobileCtaBar.astro:59` (`max-width: 95.99em` → `74.99em`).
- Once the header fits, `src/components/Header.astro:138-140` (`.header-ctas :global(.btn) { padding-inline: var(--space-4) }`) is no longer needed — delete it so the header CTA matches every other CTA on the site.

**Effort & risk.** Medium effort, **systemic**. Five files, one of them a token. The risk is the four-way breakpoint literal, which is already documented as a hand-sync hazard — verify by loading at 1199 and 1201px and confirming exactly one nav surface is present at each. Verify the header no longer overruns by asserting `.header-inner.scrollWidth <= .header-inner.clientWidth` at 1200px; this is worth a test alongside `tests/tokens.test.ts`.

---

## P0-2 · The hero's central device is a wall, and the brand's central device is a bridge

**What.** Replace the split diptych with a **single frame containing both people**. Concretely: one landscape image (5:4 at desktop, 4:3 at mobile) instead of two 4:5 portraits with a 2px teal seam between them. Let that single image bleed from the container's right edge to the viewport edge at ≥1280px. Add an eyebrow above the `<h1>` carrying the MOM licence. Drop the hero's secondary CTA (see P0-5).

See `taste-audit-2026-08-15-hero-composition.svg`.

**Why.** `docs/design/palette-proposal.md:19` makes the argument itself: *"The 'H' is two human figures joined at the crossbar… That is 'Happy Employer. Happy Helper.'"* The hero currently takes those two figures and puts a line between them. The seam is the most prominent graphic element in the composition and it means separation. A family reading "Find the Right Helper for Your Family" next to two figures in separate boxes is being shown a catalogue, not a match — which is the exact "traditional recruitment portal" reading the brief rules out.

The composition also fails structurally at narrow widths, independent of asset quality. At 768px each panel is ~376px wide; at 375px each is ~127px wide with the figure ~30px tall. Two thumbnails. The split is the thing that breaks, not the drawing.

The bleed is a separate but related point: at 1920px the page has 384px of dead margin on each side and *every single element* obeys the same 1152px box. One element crossing that line gives the page an axis and costs nothing structurally.

Putting the licence in the eyebrow serves the stated priority order — **trust before conversion**. Right now the first credential a visitor meets is 550px below the fold in a 113px white strip.

**Where.**
- `src/sections/Hero.astro:38-59` — the `.hero-visual` block. Replace the two `<Image>` elements with one.
- `src/sections/Hero.astro:108-116` — delete `.hero-visual`'s `grid-template-columns: 1fr 1fr`, `gap: 2px` and `background: var(--color-brand-teal)`. The comment at lines 101–107 explaining the seam goes with it.
- `src/sections/Hero.astro:118-123` — `.hero-image` `aspect-ratio: 4 / 5` → `5 / 4`.
- `src/sections/Hero.astro:125-129` — the `@media (min-width: 64em)` block. For the bleed, add a rule at ≥80em giving `.hero-visual` `margin-right: calc((100% - 100vw) / 2)` or equivalent; confirm it does not introduce horizontal scroll (`document.scrollWidth === clientWidth`).
- `src/sections/Hero.astro:28` — add `<SectionHeader>`-style eyebrow markup above the `<h1>`, or lift the eyebrow pattern from `src/components/SectionHeader.astro:22-29`.
- Assets: `src/assets/hero-family.svg`, `src/assets/hero-helper.svg` are both retired.

**Effort & risk.** Low effort for the composition change, **local** to one section. The bleed is the only fiddly part and is easily reverted. Blocked on photography, but the *structure* should change now so the shoot is briefed against the right frame — currently the brief would ask for two portraits, which is the wrong thing to commission.

### What the photography should actually depict

The composition question is upstream of the asset question, so this is deliberately specific.

**Hero — one frame.** One room, two people, one ordinary shared task. A helper and a family member (or a child) folding laundry at the same table, at the kitchen counter together, or walking to the lift lobby. Both people fully in frame; neither cropped, neither behind the other. Shot at **eye level** — never from above, which reads as supervision. Natural window light, mid-morning, no fill flash. A real Singapore interior with specific, unstageable detail: a window grille, a bamboo pole rack, school shoes by the door, an HDB corridor. The premium reading comes from the room being real, not from the room being expensive.

**Explicitly avoid.** A uniformed helper standing while a family sits. Anyone holding a serving tray. A helper photographed alone against white or in a "profile shot" pose. Uniforms of any kind. Stock-library results for "Asian domestic helper" — that is the uncanny stock imagery the brief rules out, and it is instantly recognisable to a Singapore audience.

**Elsewhere.** Individual helper portraits belong in block 10a (Meet Our Helpers), not the hero: eye level, working clothes not uniform, not smiling on cue, plain background, consistent crop across all of them. Block 08 (Helper Sources) wants *place*, not people — a street, a landscape, a market in each source region — which also sidesteps the risk of one portrait standing in for a nationality.

**Practical.** Real people, model-released, shot for DirectHired. Two hours with one family and one helper produces the hero, three or four secondary frames, and the 10a portraits. Deliver at 2× the largest rendered width; keep `width`/`height` fixed as the current code already does so the swap is a one-line `src` change.

---

## P0-3 · Helper Sources says the same sentence four times, and the flags render as bare letter pairs on Windows

**What.** Two separate defects in one block.

*(a) The copy.* The section lede and all three cards are the same sentence:

> lede: "We work with helpers from a number of countries, each matched to your family based on the requirements you share with us."
> card 1: "We work with helpers from **Indonesia** and match them to your family based on the requirements you share with us."
> card 2: "We work with helpers from **Myanmar** and match them to your family…"
> card 3: "We work with helpers from **Mizoram** and match them to your family…"

Rewrite each `summary` so it carries one fact the other two do not — typical prior experience, language, the placement route, how long the paperwork usually takes for that source. If DirectHired cannot supply a distinguishing fact per source, the honest fix is to **delete the summaries entirely** and let the block be three names and three images, because three identical sentences say less than no sentence.

*(b) The flags.* `flag: 🇮🇩` etc. are regional-indicator emoji pairs. Chrome and Edge on Windows do not render them — they fall back to the two letters. On the live site in Chrome/Windows the cards read **"ID" / "MM" / "IN"** at 32px in Fraunces. Replace with a real asset (inline SVG flag, or a place photograph per P0-2) rather than an emoji whose rendering depends on the visitor's OS.

Note "IN" is doubly wrong: Mizoram is an Indian state, so the ISO pair renders as India, and the card reads "IN — Mizoram", which looks like a data error to anyone who knows the region.

**Why.** Repeated boilerplate with one word swapped is the single most recognisable signature of generated content, and the client's stated fear is being read as "an AI-generated recruitment template". This block is the clearest instance of it on the page. It also breaks **"show, don't over-explain"** in both directions at once: it over-explains (four sentences) and shows nothing (no image, no distinguishing fact).

The flag issue is not cosmetic. A block whose entire visual vocabulary is three glyphs, rendering as three grey letter-pairs on the most common desktop OS, is a broken block — and it is invisible to anyone reviewing on a Mac.

**Where.**
- Copy: `src/content/helpers/indonesia.md:5`, `src/content/helpers/myanmar.md:5`, `src/content/helpers/mizoram.md:5` (the `summary` frontmatter field). The lede is `src/sections/HelperSources.astro:28`. The markdown bodies (line 9 of each file) are also identical across all three and have the same problem on the eventual `/helpers/:slug` pages.
- Flags: the `flag` field at line 4 of each of the three files; rendered by `src/sections/HelperSources.astro:36-38`, styled at `src/sections/HelperSources.astro:71-74` (`.source-flag`).

**Effort & risk.** Copy is low effort, **local**, but blocked on DirectHired supplying real per-source facts — add it to `docs/INFORMATION-REQUIRED-BEFORE-PRODUCTION.md`. Flags are low effort and unblocked. Zero structural risk either way.

---

## P0-4 · The background alternation stops after block 04, and that — not the padding — is why the page has no rhythm

**What.** Restore strict alternation across all thirteen blocks, and cut the card grids from four to two. See `taste-audit-2026-08-15-page-rhythm.svg`.

Measured rendered backgrounds today:

| Block | Rendered background | |
|---|---|---|
| 01 Hero | `#FAF8F5` cream | |
| 02 Trust bar | `#FFFFFF` | |
| 03 Problem | cream | 3 cards |
| 04 Difference | `#FFFFFF` | |
| 05 Process | cream | |
| 06 Pricing | cream | 2 cards — **same field as 05** |
| 07 Two-sided | `#0E3A3B` deep | |
| 08 Helper sources | cream | 3 cards |
| 09 Services | cream | 6 cards — **same field as 08** |
| 10a Meet helpers | cream *(absent)* | N cards |
| 10b Reviews | cream *(absent)* | N cards |
| 11 FAQ | cream | **same field as 09/10** |
| 12 Final CTA | `#FFFFFF` | |

`PricingSection`, `Services` and `Reviews` all explicitly declare `background: var(--color-surface)` — which is byte-identical to the page ground. So blocks 08 through 11 are **one continuous cream field roughly 2,400px tall**, and once 10a and 10b populate it will contain four consecutive card grids with nothing between them. Judged as it stands: 08→09 already reads as one over-long block. Judged as it will be: it becomes the page's dead zone.

The enabling knot, and it is worth naming precisely: **`Card` is pure white, so any section hosting `Card` is forced onto cream to stay visible.** The three `background: var(--color-surface)` declarations each carry a comment explaining exactly this. Four card-hosting sections in a row is what collapsed the alternation. Fix one of the two:

- **Preferred — reduce card-hosting sections to two.** Block 08 becomes an unboxed divided row (the pattern `Difference.astro:110-127` already implements and which was chosen there for exactly this reason). Block 10b becomes an unboxed quote wall — hairline-separated pull quotes in Fraunces, no boxes; a boxed Google review is a widget, an unboxed one is a testimonial. That leaves 09 (Services, genuinely a card grid) and 10a (Meet Our Helpers, where the portrait *is* the card), separated by one non-card block. Then the alternation runs free: 06 white, 08 white, 09 cream, 10a white, 10b cream, 11 white, 12 cream.
- **Alternative — invert `Card`.** Make `Card` sit on `--color-surface` (recessed) so it reads correctly on a white section. One-line change, but it restyles every card on the site at once.

Do one. Not both.

**Why.** The 256px between every pair of blocks is uniform, but uniform spacing is only monotonous when there is nothing else marking the boundary. Where the ground colour changes, 256px reads as generous. Where it does not, 256px reads as an error — the reader cannot tell whether block 09 is a new subject or a continuation of 08. That is why "the page has no rhythm" and "the padding is uniform" are the same complaint with different causes: **fix the alternation and most of the spacing complaint dissolves.** Do not start by inventing a spacing scale; that would add complexity in service of a problem the colour system should be solving, and "premium does not mean complicated" argues against it.

Cutting the card count serves the same principle. `Card` currently appears in five of the thirteen blocks. Two blocks whose content is prose (08) and quotation (10b) do not need a container to be legible, and boxing them is what makes the lower page feel like a directory.

**Where.**
- `src/sections/PricingSection.astro:71-84` — `.pricing` background.
- `src/sections/Services.astro:43-53` — `.services` background.
- `src/sections/Reviews.astro:66-75` — `.reviews` background.
- `src/sections/Faq.astro:82-84` — `.faq` has no background at all; add one.
- `src/sections/MeetHelpers.astro:90-92` — `.meet-helpers` has no background; add one.
- `src/sections/FinalCta.astro:43-47` — `.final-cta` background, if the sequence shifts it to cream.
- Block 08 restructure: `src/sections/HelperSources.astro:31-46` (markup) and `:55-102` (styles). Lift the divided-row pattern from `src/components/../sections/Difference.astro:85-127`.
- Block 10b restructure: `src/sections/Reviews.astro:42-59` and `:77-117`.
- `Card` inversion alternative: `src/components/Card.astro:27` (`background`) and `:31` (`box-shadow`).

**Effort & risk.** Background changes are trivial and **local** but must be decided together as one sequence — changing them piecemeal produces a worse pattern than either the current or the target state. The 08 and 10b restructures are medium effort, local, and 10b is unblocked work that can be done before review data exists (it currently renders nothing, so there is no regression surface). The `Card` inversion is **systemic** — one line, every card on the site.

---

## P0-5 · The same two buttons appear six times, and on a phone four of them are on screen at once

**What.** Reduce the primary/secondary CTA pair from six surfaces to three. Keep the pair in the **final CTA** (block 12), the **fixed mobile bar**, and the **footer**. Reduce the **hero**, the **pricing block** and the **header** to the primary button alone.

On mobile the immediate defect: at 375px the hero's two stacked full-width buttons sit directly above the fixed bar's two stacked full-width buttons — **four buttons, two labels, one screen**. The fixed bar is also 144px tall below 416px (`--mobile-bar-height: 9rem`), permanently consuming ~18% of an iPhone viewport. Removing the secondary from the bar below 416px returns it to a single row and roughly 76px.

**Why.** "Trust before conversion" and "premium does not mean complicated" both point the same way. A page that asks six times reads as anxious, and anxious is the opposite of premium — a licensed agency with 500+ placements does not need to repeat its ask on every screen. The redundancy is also self-defeating: when the identical pair appears in the hero and again fixed to the bottom of the same viewport, neither reads as the decision point.

The existing rule — "primary always precedes secondary, on every surface" (`Header.astro:9-12`) — is a good rule and should be kept. It governs *ordering within a surface*; it does not require the pair on every surface, and the code comments never claim it does.

**Where.**
- `src/sections/Hero.astro:32-35` — remove the secondary `<Button>` at line 34.
- `src/sections/PricingSection.astro:60-66` — remove the secondary at line 63. Note the block comment at lines 14–23 argues for the pair here; that argument is about *having a CTA at peak intent*, which the primary alone satisfies.
- `src/components/Header.astro:46` — as per P0-1.
- `src/components/MobileCtaBar.astro:29` — remove the secondary, or scope it to ≥26em so the sub-416px case returns to one row. If removed entirely, `--mobile-bar-height` at `src/components/MobileCtaBar.astro:34` drops to ~`3.75rem` and the whole `@media (max-width: 26em)` block at lines 106–117 can go.
- Keep as-is: `src/sections/FinalCta.astro:35-38`, and the footer pair.

**Effort & risk.** Low effort, **local** to four files, but it touches conversion, so it is the one item here that deserves a measurement rather than a taste argument. If DirectHired can compare WhatsApp-click volume before and after, do that; if not, the design case above stands on its own. Watch for a test asserting CTA counts — `tests/` should be checked before editing.

---

# P1 — material, but not the first impression

## P1-1 · The Services grid is a ragged 4+2 with baselines that do not line up

**What.** Constrain the grid to three columns at desktop so six services render as a clean 3×2, and reserve fixed height for the title so every card's body copy starts at the same Y.

At 1280px and above the `auto-fit / minmax(15rem, 1fr)` track sizing yields four columns, so row 2 has two cards and two visibly empty cells. Card content width lands around 205px, producing 5–7 line wraps with 3–4 words per line ("— we arrange it / and coordinate it on / your behalf."). Separately, "New Helper Placement" and "Direct-Hire Processing" wrap to two lines while "Transfer Helper" and "Maid Insurance" do not, so body copy starts at two different heights across one row.

**Why.** Two named anti-patterns at once — a grid that leaves orphan cells reads as unfinished, and misaligned baselines across side-by-side cards read as broken. A 205px measure also fights the editorial register: Fraunces headings over four-word lines look cramped, not considered.

**Where.** `src/sections/Services.astro:55-60` — change `repeat(auto-fit, minmax(15rem, 1fr))` to an explicit `repeat(2, 1fr)` at `48em` and `repeat(3, 1fr)` at `64em`. For the baseline, `src/sections/Services.astro:68-74` (`.service-title`) — add `min-height` equal to two lines at `1.125rem × 1.15` line-height, or set the card to `display: grid; grid-template-rows: auto 1fr`.

**Effort & risk.** Low, **local**, no dependencies. Same `auto-fit` pattern exists at `HelperSources.astro:57`, `MeetHelpers.astro:96` and `Reviews.astro:79` — audit all four together, since 10a with 5 or 7 profiles will produce the identical orphan-cell problem.

## P1-2 · The process rail becomes five thin columns at 1024px, two steps in a row start with the same word

**What.** Raise the horizontal breakpoint on `.process-rail` from `64em` to `80em` (1280px), and rewrite step 2's label.

At 1024–1280px each of the five steps is ~180px wide; at 1920px each is ~200px. Labels wrap after two words ("Understand / your family", "Recommend / suitable helpers") and descriptions run 5–7 lines at 3–5 words each. Separately, steps 1 and 2 read "Understand your family" then "Understand your needs" — adjacent, same opening word, and the distinction between "your family" and "your needs" is not self-evident. Merge them into one step, or rename step 2 to name what it actually covers (e.g. "Map the day-to-day").

**Why.** The horizontal rail is a good device — the typographic `01`–`05` markers and the teal rule are among the more considered things on the page. It just needs more width per step than 180px to read as editorial rather than cramped. And two consecutive steps opening on the same verb undermines the claim that this is a five-step process; it looks like one step split to reach five.

**Where.** `src/sections/Process.astro:77` — `@media (min-width: 64em)` → `80em`. Labels at `src/sections/Process.astro:22` and `:26`. Note this breakpoint (64em) matches neither `--bp-tablet` (48em) nor `--bp-desktop`; it is a third, undocumented breakpoint, as is the one at `Hero.astro:125`. Worth adding both to the token comment or reconciling them.

**Effort & risk.** Trivial CSS, **local**. Copy change needs DirectHired sign-off since the process wording is constrained by brief §23.

## P1-3 · The strongest trust asset on the page is given the weakest treatment

**What.** Give the trust bar real presence: the MOM licence number set noticeably larger (it is currently 16px), an actual MOM-licensed mark or a bordered licence "plate" around the number, and either more vertical room or a move into the hero as the eyebrow (per P0-2).

Today it is a 113px white strip with three centred 13px uppercase labels above three 16px values, between two hairlines. It reads as a divider that happens to have text in it.

**Why.** Stated principle one is **trust before conversion**. For a Singapore maid agency the licence number is the credential — it is checkable against MOM's register, and it is the thing that separates a licensed agency from the unlicensed operators families are warned about. Setting it at the same size as body copy, centred, in a band designed to be scrolled past, wastes the page's best asset. "Show, don't over-explain" argues for making it a visual object rather than a line of text.

**Where.** `src/sections/TrustBar.astro:27-38` (`.trust-bar`, `padding-block: var(--space-8)`) and `src/components/TrustBadge.astro:39-44` (`.trust-value`, `font-size: var(--size-body)`). The licence value itself comes from `src/data/company.ts` and must not be retyped.

**Effort & risk.** Low, **local**. One caution: do not reproduce the MOM crest or any government mark unless DirectHired confirms the usage is permitted — a bordered plate with the licence number is safe, an official-looking seal may not be.

## P1-4 · The two pricing cards are wildly different heights, which reads as a rendering fault

**What.** Give the total-only package a visual treatment that fills its card without inventing line items — a short prose paragraph explaining what the package covers and why it is not itemised, or a set of ticked inclusions drawn from the same source data.

Card 1 renders six line items plus a total and stands ~310px tall. Card 2 renders a rule and a single total and stands ~85px. In a `3fr 2fr` grid side by side, the right column is three-quarters empty.

**Why.** The data modelling here is genuinely good — `TotalOnlyPackage` exists specifically so an itemisation cannot be invented, and that decision should stand. But the *visual* consequence currently reads as "the second card failed to load", which undermines the block whose whole job is to communicate transparency. The fix is to give the card honest content, not to fake the breakdown.

**Where.** `src/components/PricingCard.astro:31-53` (the `pkg.kind` branch) and `src/sections/PricingSection.astro:131-137` (`grid-template-columns: 3fr 2fr`). New copy would need a field on `TotalOnlyPackage` in `src/data/pricing.ts:17-23`.

**Effort & risk.** Low, **local**, but blocked on DirectHired supplying the explanatory copy. Add to `docs/INFORMATION-REQUIRED-BEFORE-PRODUCTION.md`.

## P1-5 · The FAQ column aligns to nothing

**What.** Either left-align the narrow FAQ column to the main container's left edge, or centre-align the block's heading and lede so the narrowing is legible as intentional.

`Faq.astro` uses `<Container width="narrow">` (48rem), which centres a 768px column inside the viewport. At 1920px its left edge sits at x=598 while every other section's heading starts at x=408. The heading is left-aligned within that column, so it reads as a section that slipped 190px to the right.

**Why.** A narrower measure for reading content is a good instinct and correct for an FAQ. But an off-axis left edge with left-aligned text inside it reads as a mistake rather than a decision. Editorial layouts either hold the axis or break it obviously — a 190px indent does neither.

**Where.** `src/sections/Faq.astro:53` (`<Container width="narrow">`) and `src/components/Container.astro:30-32` (`.narrow`). Note `FinalCta.astro:30` uses the same narrow container but is `text-align: center` throughout, so it reads correctly — the FAQ is the only inconsistent use.

**Effort & risk.** Trivial, **local**.

## P1-6 · The eyebrow primitive is used once on the entire page

**What.** Either apply `SectionHeader`'s `eyebrow` consistently across the major blocks, or delete it from the component.

`SectionHeader` supports an eyebrow with a teal rule mark. Exactly one section passes one: `TwoSidedMatch` ("HAPPY EMPLOYER. HAPPY HELPER."). Every other block renders a bare `<h2>`.

**Why.** A design system primitive used once is not a system, it is an exception — and it makes block 07 look like it was designed by someone else. Used consistently, eyebrows give a long page navigational texture and let each block declare its subject before its argument. If there is nothing worth saying in an eyebrow on ten blocks, the primitive is not earning its place.

**Where.** `src/components/SectionHeader.astro:22-29` and `:40-59`. Call sites: `Problem.astro`, `Difference.astro:49`, `Process.astro:46-49`, `PricingSection.astro:47-50`, `HelperSources.astro:26-29`, `Services.astro:25`, `Faq.astro:54-57`, `MeetHelpers.astro:50-53`, `Reviews.astro:40`.

**Effort & risk.** Low, **local**, but it is a taste call that should be made once and applied everywhere rather than block by block.

---

# P2 — polish

## P2-1 · `Card` is the textbook generic card

`background: #fff` + `1px solid` border + `box-shadow` + `border-radius` is the exact combination named as generic in the redesign checklist. The shadows are at least warm-tinted off `--color-ink` rather than black, which is better than most. Consider dropping the border and relying on the (already warm) shadow alone, or dropping the shadow and relying on the border — using both is what makes it read as a UI kit. **Where:** `src/components/Card.astro:27-31`. Trivial, **systemic** (every card at once).

## P2-2 · Nothing on the page moves

There are no scroll-entry animations anywhere — every element is statically present at paint. Hover states exist and are well-judged (a restrained `translateY(-2px)` on cards, `-1px` on buttons, a good `cubic-bezier(0.22, 1, 0.36, 1)` easing token). A single staggered fade-up on section entry, via `IntersectionObserver`, animating only `transform` and `opacity`, would add a great deal of perceived quality for very little code. The `prefers-reduced-motion` guard already exists at `src/styles/global.css:84-90` and `tokens.css:210-217`, so the accessibility side is already handled. **Where:** new behaviour, most naturally in `src/layouts/BaseLayout.astro` with an opt-in class. Medium effort, **systemic**. This is genuinely optional — a still page executed well beats a moving page executed badly, and this page is currently still and well executed.

## P2-3 · Straight apostrophes throughout

`shouldn't`, `we're`, `doesn't`, `family's` all render with the typewriter apostrophe `'` rather than `’`. At 44px in Fraunces on the Problem heading it is clearly visible and it is one of the reliable tells separating typeset copy from pasted copy. **Where:** `src/sections/Problem.astro` (heading and card bodies), `Faq.astro:56`, `FinalCta.astro:33`, `src/content/**/*.md`. Trivial, **local**, but touches many files — worth a single sweep.

## P2-4 · Hero image alt text describes the file, not the picture

`alt="Illustration representing a family"` and `alt="Illustration representing a helper"` tell a screen-reader user nothing. When real photography lands, write what is in the frame. **Where:** `src/sections/Hero.astro:41` and `:51`.

## P2-5 · Section padding is perfectly symmetrical

Every section is `padding-block: var(--space-section)`, giving identical top and bottom. Optically, a heading sitting the same distance below the previous block as its own content sits above the next reads slightly top-heavy. A ~1.15 ratio (bottom larger) is the conventional correction. Low value on its own — mentioned only because it is cheap if `--space-section` is being touched anyway for another reason. **Where:** `src/styles/tokens.css:137`, or per-section `padding-block`.

---

# What is genuinely good — leave it alone

Listing these is not padding; several are things a later contributor might "fix" and make worse.

- **The token system and its comments.** `tokens.css` is unusually well reasoned. The `--color-brand-teal` note (lines 42–52) explaining why the real brand colour must never be used for text is the kind of thing that saves a future contributor from silently breaking AA. The pre-flattened `--color-*-on-deep` ramp (lines 58–92) is a genuinely elegant solution to alpha-over-dark. Do not touch either.
- **The colour choices themselves.** Warm off-white `#FAF8F5` rather than `#fff`, warm near-black `#2A2724` rather than `#000`, one accent, no second accent, no purple/blue gradient anywhere. This is exactly right and it is most of why the page does not read as AI-generated despite the layout monotony.
- **Warm-tinted shadows.** `rgba(42, 39, 36, 0.06)` rather than black at low opacity, at two restrained steps. Correct.
- **The deep register used exactly once.** Block 07 is the only palette shift on the page and `FinalCta.astro:14-19` explicitly declines to add a second one. That restraint is what makes block 07 land. Do not add a second dark band.
- **`Difference` deliberately not being a card grid.** The comment at `Difference.astro:3-7` says the pillars are a divided row *because* block 03 already used cards. That instinct is exactly right and under-applied — P0-4 is essentially asking for more of it.
- **The FAQ as native `<details>`/`<summary>`** with a CSS-only plus/minus that flips off `[open]`. Zero JavaScript, keyboard-operable for free, correctly announced. Better than the hand-rolled accordion most builds ship.
- **Absent blocks rendering nothing.** `MeetHelpers` and `Reviews` render no shell, no skeleton, no "coming soon" when their collections are empty. This is the honest choice and it is well defended in the comments.
- **The refusal to invent.** `TotalOnlyPackage` existing purely so an itemisation cannot be fabricated; the pricing lede refusing a completeness promise it would contradict two paragraphs later; the process copy saying "typically" and "our team". This discipline is worth more to a licensed agency than any visual change on this list.
- **Typographic details already handled.** `text-wrap: balance` on headings and `pretty` on paragraphs (`global.css:33-53`); `font-variant-numeric: tabular-nums` on the process index; `--tracking-wide` scoped to small uppercase only; measures capped at 42–60ch. Focus rings present and never removed.
- **Self-hosted variable fonts, preloaded, latin-subset, no CDN.** Fraunces + Figtree is a strong pairing for "70% premium family / 30% modern technology" and is doing real work — it is the main reason the page does not read as generic SaaS.

---

# Suggested order of work

1. **P0-1** (header + breakpoint) — unblocks the laptop range, fixes alignment at every desktop width, and is the only item that is pure engineering with no client input needed.
2. **P0-4** (rhythm) — decide the full background sequence in one sitting; apply the trivial background changes immediately, schedule the 08 and 10b restructures.
3. **P0-5** (CTA reduction) — cheap, and it makes the mobile page feel materially calmer.
4. **P0-3(b)** (flags) — unblocked; **P0-3(a)** (copy) once DirectHired supplies distinguishing facts.
5. **P0-2** — change the hero *structure* now so the photo shoot is briefed against a single frame; swap the asset when photography lands.
6. P1 items in any order. P2 only if time allows.

Items blocked on DirectHired, for `docs/INFORMATION-REQUIRED-BEFORE-PRODUCTION.md`: one distinguishing fact per helper source (P0-3a); explanatory copy for the without-replacement package (P1-4); confirmation of permitted MOM mark usage (P1-3); photography (P0-2).
