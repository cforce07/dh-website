# DirectHired Core Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build six core pages — `/pricing`, `/find-your-helper`, `/why-directhired`, `/about`, `/faq`, `/contact` — so every navigation item except the detail and legal families resolves.

**Architecture:** Pages compose the existing design system; no new visual language. Sections that appear on more than one page are parameterised rather than copied, so content stays single-sourced. `/pricing` is built and reviewed first, alone, because it is worth more than the other five combined.

**Tech Stack:** Astro 5, TypeScript strict, Vitest, existing tokens and primitives.

**Spec:** `docs/superpowers/specs/2026-08-16-directhired-core-pages-design.md`

## Global Constraints

Every task's requirements implicitly include this section.

**Business facts — verbatim, never extended**

- Replacement: employer requests it, no justification needed. Sole exclusion: employer breached the Employment Act or abused the helper. **One** replacement, within **6 months of deployment date**.
- On replacement the employer re-pays MOM `$70`, Insurance `$425.10`, SIP `$77`, Medical `$60`, Handling & transport `$120`. **The agent fee is not charged again.**
- Loan carry-forward is a **subtraction**: new helper's loan − outstanding balance from the replaced helper = what the employer advances.
- Timeline: **~2 weeks** after confirmation from a source country; **~1 week** for a transfer helper.
- Placement fee: **one month's salary**, fixed, same for new and transfer.
- Loan: **case-by-case. No range may be published.**
- Repayment: **1–7 months** from basic salary; helper receives off-day compensation during it. **GATED — see below.**

**Framing — binding on all copy (spec §2.4)**

The employer **advances** the loan and placement fee and **recovers** it through the helper's repayment. It is ultimately the **helper's** cost. Copy that says these fees "may apply" without saying they are recovered is wrong and must be corrected wherever it appears, **including the homepage**.

**Prohibitions**

- Never name the Philippines or any source beyond Indonesia, Myanmar, Mizoram — not even "coming soon"
- Never describe Mizoram as a country; it is a state of India
- Never publish a loan range
- Never state a timeline beyond the two figures above
- Never invent helper data, reviews, ratings, licence numbers, statistics, or replacement conditions
- Never write "perfect match", promise an outcome, claim AI matching, or claim instant response (it is "within 1 business day")
- No component may hardcode the requirement-form URL; it resolves only through `company.requirementFormUrl`
- `--color-brand-teal` (`#00a4a6`, 2.89:1) is graphic-only — never text, never a button fill

**Technical floors**

- Exactly one `<h1>` per page; correct heading nesting
- Tokens only — no hardcoded colour, spacing, radius, weight or shadow
- Zero horizontal overflow from 320px up
- LCP < 2.5s, CLS < 0.1, TBT < 200ms; performance/a11y/SEO 1.00; axe 0 violations
- Block 07's `--color-deep` stays the page-set's only palette register shift

---

## Plan decisions

**The compliance gate, resolved.** Spec §2.5 says the repayment paragraph "ships behind a declared input", which is ambiguous. Resolution:

- **Ships now:** the framing — the employer advances the loan and placement fee, the helper repays it, it is ultimately the helper's cost, and the placement fee is one month's salary. This is what a customer needs to understand the offer and is not regulatory detail.
- **Gated:** the repayment specifics — the 1–7 month range, that it comes from basic salary, and that the helper receives off-day compensation during it. These go into `DECLARED_INPUTS` in `scripts/generate-info-required.mjs` awaiting DirectHired's compliance sign-off, and are **not written into any page** until then.

This lets `/pricing` ship complete and honest without publishing the site's highest-liability sentence unreviewed. Do not use `<Tbd>` here — a `<Tbd>` fails the production build, and the page is not broken without this detail.

**`FAQPage` structured data per page is intended, not duplication.** `Faq.astro` emits `faqPageSchema()` for the entries it renders. The homepage, `/pricing` and `/faq` each emit one covering their own questions. One per page is correct; two on a single page is not.

---

## File Structure

```
src/pages/pricing.astro              new
src/pages/find-your-helper.astro     new
src/pages/why-directhired.astro      new
src/pages/about.astro                new
src/pages/faq.astro                  new
src/pages/contact.astro              new

src/sections/Faq.astro               + surface, limit, emitSchema props
src/sections/Process.astro           + heading, lede props
src/sections/FinalCta.astro          + heading, lede props
src/sections/ReplacementTerms.astro  new — the worked sum
src/sections/LoanAndPlacement.astro  new — the §2.4 framing
src/sections/FaqGrouped.astro        new — /faq's four-category layout

src/content/config.ts                + required `category` on faq
src/content/faq/*.md                 6 existing gain category, 8 new authored

src/lib/nav.ts                       + /contact in footer links
scripts/generate-info-required.mjs   + the gated repayment detail

tests/pages.test.ts                  new — per-page guards across all 7
tests/links.test.ts                  extend allowlist and CTA checks
tests/content.test.ts                extend drift guard to /pricing
```

---

# PHASE A — `/pricing`, built and reviewed alone

### Task 1: FAQ schema, categories, and Faq parameterisation

**Files:**
- Modify: `src/content/config.ts`, `src/sections/Faq.astro`, all 6 of `src/content/faq/*.md`
- Test: `tests/content.test.ts`

**Interfaces:**
- Consumes: nothing new
- Produces: `<Faq surface="home|faq|pricing" limit={n} emitSchema={bool} />`; `category` on every faq entry

- [ ] **Step 1: Add `category` to the faq schema**

```ts
const faq = defineCollection({
  type: 'content',
  schema: z.object({
    question: z.string(),
    surfaces: z.array(z.enum(['home', 'faq', 'pricing'])),
    // Required, no default. /faq groups by this; a default would silently
    // dump miscategorised entries into one bucket.
    category: z.enum(['cost', 'sources', 'process', 'replacement']),
    order: z.number(),
  }),
})
```

- [ ] **Step 2: Run the build and watch it fail**

Run: `npm run build:dev`
Expected: `InvalidContentEntryDataError` on all 6 entries — `category` is required and absent. This is the schema doing its job; do not add a default to silence it.

- [ ] **Step 3: Assign a category to each existing entry**

| File | Category |
|---|---|
| `cost.md` | `cost` |
| `fly-in-package.md` | `cost` |
| `helper-sources.md` | `sources` |
| `how-matching-works.md` | `process` |
| `new-vs-transfer.md` | `sources` |
| `submit-requirements.md` | `process` |

- [ ] **Step 4: Confirm the build passes**

Run: `npm run build:dev`
Expected: exit 0.

- [ ] **Step 5: Parameterise `Faq.astro`**

Add props with the current hardcoded values as defaults, so the homepage is unchanged:

```astro
interface Props {
  surface?: 'home' | 'faq' | 'pricing'
  limit?: number
  emitSchema?: boolean
  heading?: string
  lede?: string
}
const { surface = 'home', limit = 6, emitSchema = true, heading, lede } = Astro.props
```

Filter on `surface`, slice to `limit`, and emit `faqPageSchema()` only when `emitSchema`. Keep the native `<details>`/`<summary>` rendering exactly as it is — it is keyboard-operable and screen-reader-correct without ARIA.

- [ ] **Step 6: Verify the homepage is byte-identical**

Build, and diff the FAQ section of `dist/index.html` against the previous build. A parameterisation that changes the homepage has changed behaviour, not just shape.

- [ ] **Step 7: Commit**

```bash
git add src/content/config.ts src/content/faq src/sections/Faq.astro tests/content.test.ts
git commit -m "feat: add faq categories and parameterise the Faq section"
```

---

### Task 2: Parameterise Process and FinalCta

**Files:** Modify `src/sections/Process.astro`, `src/sections/FinalCta.astro`

**Interfaces:** Produces `<Process heading lede />`, `<FinalCta heading lede />` — all optional, current copy as defaults

- [ ] **Step 1: Add optional props to both, defaulting to today's copy**

`Process` keeps its four steps and its derived step count — only the heading and lede become overridable. `FinalCta` keeps its CTA pair and hrefs; only heading and supporting copy become overridable.

- [ ] **Step 2: Verify the homepage is unchanged**

Build and diff both sections in `dist/index.html`. Byte-identical, or the defaults are wrong.

- [ ] **Step 3: Commit**

---

### Task 3: Author the eight new FAQ entries

**Files:** Create 8 files in `src/content/faq/`

Every answer comes from the Global Constraints above. **Nothing may be extended, rounded or inferred.**

- [ ] **Step 1: Author the entries**

| File | Question | Category | Surfaces |
|---|---|---|---|
| `replacement-what-covered.md` | What is included in the replacement package? | `replacement` | faq, pricing |
| `replacement-six-months.md` | What does the 6-month replacement mean? | `replacement` | faq, pricing |
| `how-long-does-it-take.md` | How long does the process take? | `process` | faq, home |
| `helper-loan-placement-fee.md` | What does the helper loan and placement fee mean? | `cost` | faq, pricing |
| `response-time.md` | How quickly will DirectHired respond? | `process` | faq |
| `insurance.md` | Do you provide insurance? | `cost` | faq |
| `medical-examination.md` | Do you arrange medical examinations? | `process` | faq |
| `direct-hire-processing.md` | Do you handle direct-hire processing? | `process` | faq |

- [ ] **Step 2: The loan/placement answer — the one to get right**

It must state: the employer advances it; the helper repays it; it is ultimately the helper's cost; the placement fee is one month's salary; the loan amount is case-by-case.

It must **not** state the 1–7 month range, that repayment comes from basic salary, or anything about off-day compensation. Those are gated pending compliance sign-off (see Plan decisions).

- [ ] **Step 3: The replacement answers**

Trigger, sole exclusion, one within 6 months of deployment, and which costs recur. State that the agent fee is not charged again — it is the most customer-favourable true fact available and it is currently unpublished.

- [ ] **Step 4: Run the drift guard**

Run: `npx vitest run tests/content.test.ts`
Expected: PASS. Any dollar figure written must match `pricing.ts`.

- [ ] **Step 5: Commit**

---

### Task 4: The `/pricing` page

**Files:**
- Create: `src/pages/pricing.astro`, `src/sections/ReplacementTerms.astro`, `src/sections/LoanAndPlacement.astro`

- [ ] **Step 1: `ReplacementTerms.astro` — render the carry-forward as a sum**

DirectHired asked specifically for a sum, not prose. Use a table or definition list with visible arithmetic:

```
New helper's loan                                    $2,500
Less: outstanding balance from the replaced helper  −$1,500
                                                    ───────
Employer advances                                    $1,000
```

Label the figures **illustrative** — they are an example of the mechanism, not DirectHired's rates. A visitor must not read $2,500 as a quoted loan.

- [ ] **Step 2: `LoanAndPlacement.astro` — the §2.4 reframe**

The employer advances, the helper repays, it is the helper's cost. Placement fee is one month's salary. Loan is case-by-case. No range. Nothing gated.

- [ ] **Step 3: Compose the page**

`BaseLayout` → heading → both `PricingCard`s → what's included → `ReplacementTerms` → `LoanAndPlacement` → `<Faq surface="pricing" limit={6} />` → `<FinalCta />`.

Never a hardcoded price string — every figure through `packageTotalCents()` + `formatSgd()`.

Title and meta description target *maid agency pricing Singapore* and *how much does a maid cost Singapore* without keyword stuffing.

- [ ] **Step 4: Correct the homepage qualifier**

`src/sections/PricingSection.astro`'s qualifier currently says fees "may apply" — wrong per §2.4. Rewrite to state that the employer advances and recovers them, and link to `/pricing`.

- [ ] **Step 5: Record the gated repayment detail as a declared input**

Add an entry to `DECLARED_INPUTS` in `scripts/generate-info-required.mjs`:

```js
{
  item: 'Compliance sign-off on loan repayment terms',
  source: 'Brief §19; core-pages spec §2.3 and §2.5',
  blocks:
    'publishing the repayment mechanics — the 1-7 month range, that repayment ' +
    'comes from the helper\'s basic salary, and that the helper receives ' +
    'off-day compensation during it. DirectHired supplied these facts on ' +
    '2026-08-16; what is missing is sign-off, not information.',
  handledBy:
    '`src/sections/LoanAndPlacement.astro` publishes the framing only — the ' +
    'employer advances the loan and placement fee, the helper repays it, it is ' +
    'ultimately the helper\'s cost, and the placement fee is one month\'s ' +
    'salary. The repayment mechanics appear nowhere on the site. The page is ' +
    'complete and honest without them; it is a salary-deduction arrangement on ' +
    'a licensed agency\'s public site, in an area MOM regulates, so it does not ' +
    'publish unreviewed.',
}
```

Then regenerate: `npm run build:dev && node scripts/generate-info-required.mjs`, and confirm the entry appears under Category C.

**Add a test** asserting the gated phrases appear nowhere in built output — the 1–7 month range, "basic salary" in a deduction context, and "off-day compensation". Mutation-check it by adding one of them to a page and confirming failure.

- [ ] **Step 6: Verify in a real browser**

- [ ] **Step 7: Verify in a real browser**

Build, `npx astro preview --port 4321`, check at 320, 375, 768, 1280, 1920. Zero horizontal overflow, one `<h1>`, the sum renders as a sum, and the gated phrases appear nowhere.

- [ ] **Step 8: Commit**

---

### Task 5: Extend the guards to multiple pages

**Files:** Create `tests/pages.test.ts`; modify `tests/links.test.ts`, `tests/content.test.ts`

- [ ] **Step 1: Write per-page guards**

For every built HTML page: exactly one `<h1>`; no skipped heading levels; a non-empty unique `<title>` and meta description; a canonical URL.

Derive the page list from `dist/`, do not hardcode it — a hardcoded list silently stops covering new pages.

- [ ] **Step 2: Extend the CTA and hardcode checks to all pages**

- [ ] **Step 3: Extend the pricing drift guard to `/pricing`**

- [ ] **Step 4: Extend the invented-information greps to all pages**

"perfect match", AI matching, instant response, invented timelines, nationality characterisation, "country" applied to Mizoram.

- [ ] **Step 5: Mutation-check each new assertion and report what you saw**

- [ ] **Step 6: Commit**

---

### 🔍 REVIEW GATE — stop here

`/pricing` is reviewed against the live deployment before Phase B begins. Do not start the remaining five pages until that review is clean.

---

# PHASE B — the remaining five

### Task 6: `/find-your-helper`
Matching explained · `<Process heading="What happens after you submit" />` · response expectation (within 1 business day) · form CTA. **Not** a filter or search (§40). Include the timeline figures.

### Task 7: `/why-directhired`
Origin (brief §35 verbatim) · three pillars at length · `TwoSidedMatch` reused · credentials · CTA.

### Task 8: `/about`
Company not founders (§45) · philosophy · Singapore presence · credentials with MOM licence 23C1443 · "Since 2022" · "500+ placements across all services since 2022" — the basis wording, not "Helpers Placed".

### Task 9: `/faq` with `FaqGrouped.astro`
All 14 under four headings: Cost & Pricing / Helpers & Sources / Process & Timing / Replacement. Reuse the `<details>` item rendering. One `FAQPage` block covering all 14.

### Task 10: `/contact`
Details from `company.ts`, never retyped · office · hours · socials · `EmploymentAgency` structured data · add to footer links in `src/lib/nav.ts`, not the nav.

### Task 11: Internal linking and SEO
The triangle: Pricing ↔ Find Your Helper ↔ FAQ, all three ↔ the requirement form. `BreadcrumbList` on each page. Verify the sitemap lists all seven.

### Task 12: Final verification
Lighthouse on every page against the budget. `axe` on every page. Overflow sweep 320–1920 on every page. Regenerate the production checklist. Update `docs/OPEN-DECISIONS.md`.

---

## Verification

```bash
npm test                    # all suites, every new assertion mutation-checked
npm run build               # exits 0 — the TBD gate has nothing to catch
npm run axe                 # 0 violations
npx lhci autorun            # budget holds on every page
```

Seven pages resolve. Only the detail families and legal pages 404, and those are sub-project 3.
