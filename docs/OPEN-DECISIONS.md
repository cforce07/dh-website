# DirectHired — What's waiting on you

Last updated 2026-08-16. Everything here needs a decision or an asset from
DirectHired; none of it can be resolved from the codebase.

Detail and reasoning for each: `docs/design/implementation-plan-2026-08-16.md` §5.
Generated status of missing content: `docs/INFORMATION-REQUIRED-BEFORE-PRODUCTION.md`.

---

## Blocks launch

| | What's needed | Why it blocks |
|---|---|---|
| **Replacement terms** | The detailed conditions behind "1 replacement within 6 months" | Category C. The site states the headline term and nothing else. Blocks the pricing page in sub-project 2. |
| **Production form URL** | The live URL for the employer requirement form | Every primary CTA points at `company.requirementFormUrl`, which 404s today. One constant, one edit — but nothing converts until it resolves. |

---

## Blocks a section from appearing at all

Both blocks are built, styled and tested. They render **nothing** because their
content collections are empty — deliberately, since inventing either would
fabricate a person.

| | What's needed |
|---|---|
| **Google reviews** | Real reviews, plus confirmation of which may be displayed and the current rating and count |
| **Helper profiles** | Which fields may be published, and real profile data |

These are the two most persuasive trust devices on the page and both are
currently absent. AI-generated faces are refused by the image registry for
exactly this reason.

---

## Decisions with a recommendation (answer when convenient)

Three of these (**D-1**, **D-2**, **D-11**) are **already implemented**. They are
listed anyway, and they are not questions — answering "no" now means requesting a
reversal, which is a small change but a real one. They were previously written as
open questions, which read as though the site were waiting on you; it is not.

| # | Decision | Recommendation | Status |
|---|---|---|---|
| **D-1** | Rename nav "Why DirectHired" → "Why Us"? | **Yes** — the wordmark sits 40px left; buys 65px of header width | **Already implemented** (`src/lib/nav.ts` ships "Why Us"); flagged so it can be reversed. The 65px it bought is spent: it is part of what let the desktop breakpoint come down from 1536px to 1200px, so a reversal means re-measuring the header |
| **D-2** | MOM licence in a hero eyebrow **or** a strengthened trust bar? *(conflicting — pick one)* | **Trust bar.** A hero eyebrow competes with an `<h1>` and lede that both work | **Already implemented** — the licence is in the trust bar (`src/sections/TrustBar.astro`) and there is no hero eyebrow; flagged so it can be reversed |
| **D-3** | Remove the pricing block's secondary WhatsApp CTA? | **Keep it.** Design spec §6.4 says the pair appears "without exception", and a family that has just resolved cost is at peak intent | Open — nothing changed pending your answer |
| **D-7** | May DirectHired display any MOM mark or crest? | **Assume no** until usage terms are produced in writing. A plain bordered licence plate ships today | Open — the safe option ships meanwhile |
| **D-10** | Fund re-subsetting Fraunces to restore its SOFT/WONK axes? | **No for now.** 67KB in the LCP path against a 2.5s budget, for anxious customers on mid-range Android | Open — costs money, so it is yours to call |
| **D-11** | Delete the unused `eyebrow` primitive? | **Delete** — zero call sites | **Already implemented** — removed from `src/components/SectionHeader.astro`; flagged so it can be reversed |
| **D-12** | Remove the hero's secondary WhatsApp CTA? | **Yes** — on a phone it sits directly above two identical buttons in the fixed bar | **Already implemented**; flagged so it can be reversed |

---

## Assets to commission

| | What's needed |
|---|---|
| **Photography (D-8)** | ~2 hours with one family and one helper yields the hero, secondary frames and the block-10a portraits. Shot brief, framing rules, forbidden list and consent requirements: `docs/design/brand-assessment-2026-08-15.md` §7. Plus signed releases. |
| **Social share card (D-9)** | The AI placeholder works, but has **no wordmark**. The image has clear space on the right for it — a five-minute design-tool step. Until then every shared link previews unbranded. |

Both current images are AI placeholders. Provenance and every usage site are
tracked in `src/data/images.json`, surfaced as Category D of the generated
production checklist.

---

## Housekeeping

**Your master brief is now stale against your own answers.** The code is correct
and documents why, but anyone handed the brief will work from old numbers:

- §506–584 still shows **$1,252.10** and "**$388 less**". Real: **$1,140.10**, and the gap is **$500** (the agent fee, $888 vs $388).
- §665 and §813 still describe a **five-step** process opening "Understand your family". It is now **four steps**, opening "Understand your household needs".

**"Handling & transport" vs "Transport"** — resolved, both cards now read
"Handling & transport".

**Category A of the production checklist currently detects nothing.**
`docs/INFORMATION-REQUIRED-BEFORE-PRODUCTION.md` opens with Category A —
"inline gaps that block the production build" — and it reads *"None found."*
That is true but weaker than it looks. Category A works by finding `<Tbd>`
markers in the built HTML, and there are **zero `<Tbd>` call sites anywhere in
the codebase** since you supplied the MOM licence number on 2026-08-15. So the
category is reporting that nothing is *marked*, not that nothing is *missing*;
it cannot currently detect anything at all, and `npm run build` passes its gate.

Nothing is wrong: the gate and the `<Tbd>` component are deliberately kept for
the next unverified value, and the real outstanding items are the ones in this
document plus Categories B, C and D of that checklist. It is written down here
because a client reading "Category A: none found" would reasonably take it as a
clean bill of health for the whole document, and it is not one.

---

## Answered, for the record

| | Answer | Date |
|---|---|---|
| MOM licence number | `23C1443` — verified against MOM's Employment Agencies Directory | 2026-08-15 |
| Placement count | "500+ placements across all services since 2022" | 2026-08-15 |
| Without-replacement pricing | $1,140.10, itemised; agent fee $388 | 2026-08-16 |
| Process steps 1 and 2 | Merged into "Understand your household needs" | 2026-08-16 |
| Helper source differences | None — same service, package and process; only the source differs | 2026-08-16 |
