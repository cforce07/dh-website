# DirectHired Website — Foundation + Homepage

**Design specification, sub-project 1 of 4**
Date: 2026-08-15
Status: Approved for planning
Source brief: `DirectHired Website — Master Context & Design Brief for Claude Code + Taste Skills.md` (V1.0)

---

## 1. Scope

This spec covers sub-project 1: the design system, content model, layout shell, and homepage. It corresponds to Phases 1–2 of the source brief.

**In scope**

- Design system: colour roles, typography, spacing, radius, motion
- Content model: typed data modules and Astro content collections
- The `<Tbd>` mechanism and its production build gate
- Layout shell: header, navigation, footer, mobile conversion affordances
- Homepage: twelve blocks as specified in §6
- SEO, performance, and accessibility foundations that later pages inherit

**Out of scope, deferred to later sub-projects**

| Sub-project | Contents |
|---|---|
| 2 — Core pages | Pricing, Find Your Helper, Why DirectHired, About, FAQ, Contact |
| 3 — Page families | 6 service pages, 3 helper-source pages, 4 legal pages |
| 4 — Production readiness | Real asset swap, SEO audit, a11y audit, performance verification |

**Explicitly not built**, per brief §77: ecommerce, payments, marketplace, helper filtering, automated matching, any fabricated candidate or review system.

---

## 2. Decisions Already Settled

| Decision | Value | Rationale |
|---|---|---|
| Framework | Astro | Zero JS by default, native image optimization, content collections, static output for S3 |
| Hosting target | AWS S3 static | From brief §Implementation Target |
| Brand starting point | Existing logo, no system | Palette and type system derived to work with the supplied mark |
| Requirement form | Already built, not yet wired to the domain | V1 links out via a single configurable constant |
| Build order | Design system first, then homepage as vertical slice | Visual direction validated on a real page before it multiplies |

### 2.1 The requirement-form URL

`www.directhired.com/employer-requirement` currently returns HTTP 404; the domain serves an "under construction" placeholder. The form exists but is not yet wired to the production domain.

Every primary CTA across the site must therefore resolve through **one** exported constant, `company.requirementFormUrl`. No component may hardcode this destination. Repointing it at launch is a one-line change, and the link-integrity test asserts that no hardcoded variant exists anywhere in the tree.

---

## 3. Design System

### 3.1 Colour

Exact values are proposed during implementation, once the official logo is available, and approved as a swatch set before any component is built on them. What this spec fixes is the role structure and the constraints every value must satisfy.

| Token | Purpose | Constraint |
|---|---|---|
| `ink` | Primary text | Warm near-black. Never `#000`. |
| `ink-muted` | Secondary text | ≥ 4.5:1 against `surface` |
| `surface` | Page ground | Warm off-white. Never `#ffffff`. |
| `surface-raised` | Cards, elevated panels | Distinguishable from `surface` without a border |
| `accent` | Primary CTA only | ≥ 4.5:1 against `surface` |
| `accent-hover` | Primary CTA interaction | ≥ 3:1 against `accent` |
| `deep` | Brand/emotional sections | Carries block 07's register shift |
| `on-deep` | Text on `deep` | ≥ 4.5:1 against `deep` |
| `border` | Hairlines, dividers | ≥ 3:1 against `surface` |

Constraints from the brief:

- Ruled out: corporate blue, generic green, red/blue recruitment palettes (§57)
- Must communicate trust, warmth, premium, modern (§57)
- `accent` is reserved for primary conversion actions. Scarcity of the accent is what makes it read as premium; using it decoratively defeats the system.

All pairings verified against WCAG AA before approval.

### 3.2 Typography

Two faces, mapped to the brief's 70% Premium Family / 30% Modern Technology direction (§52):

- **Display** — editorial character, carrying the "premium family" register. Used for section headlines and the hero.
- **Text** — humanist sans, high legibility at small sizes, carrying the "modern technology" register. Used for body, UI, and navigation.

A sans-only system in this category reads as a recruitment portal almost regardless of other choices. The display/text split is the primary defence against that.

Both faces self-hosted as subset WOFF2. No font CDN — a render-blocking third-party request contradicts the Core Web Vitals goal in §50. Display face preloaded; text face `font-display: swap`.

Type scale is modular, defined in tokens, with explicit mobile ramps. Minimum body size 16px. No text baked into images (§63).

### 3.3 Spacing, radius, motion

- **Spacing**: 4px base unit. Section rhythm generous per §53. Spacing values come from tokens only; no arbitrary magic numbers in components.
- **Radius**: a small restrained set per §59. No uniformly heavy rounding, no uniformly square boxes.
- **Motion**: moderate per §60 — scroll reveal, gentle fade, card hover, button interaction. Prohibited: parallax, video backgrounds, constant movement, any animation that costs mobile performance. A `prefers-reduced-motion: reduce` query disables all non-essential motion; this is a hard requirement, not a nicety (§63).

### 3.4 Components

The homepage requires this component set. Each is built once, tokenised, and reused by later sub-projects.

`Button` (primary/secondary/ghost) · `Card` · `SectionHeader` · `Container` · `Header` · `Nav` · `MobileNav` · `Footer` · `WhatsAppCta` · `TrustBadge` · `ProcessStep` · `PricingCard` · `FaqItem` · `Tbd`

---

## 4. Content Model

No factual content is written inline in a component. Everything routes through typed modules, so a value has exactly one definition and every surface consuming it stays consistent.

```
src/data/company.ts        phone, whatsapp, email, address, openingHours,
                           socials, foundedYear, placementCount,
                           momLicence, requirementFormUrl
src/data/pricing.ts        packages, line items, derived totals
src/content/services/      6 entries
src/content/helpers/       3 entries — indonesia, myanmar, mizoram
src/content/faq/           entries tagged by surface
```

Astro content collections carry Zod schemas, so malformed content fails the build rather than rendering broken.

### 4.1 Pricing derivation

Package totals are **computed from their line items**, never typed as literals. The published breakdown sums correctly:

```
agent fees            888.00
MOM                    70.00
insurance             425.10
SIP                    77.00
medical                60.00
handling & transport  120.00
                    ─────────
total              $1,640.10   ✓ matches the brief
```

This is asserted by test. The failure mode it prevents is a component edit silently changing a published price.

### 4.2 A gap the brief cannot yet close

The without-replacement package is **$1,252.10**, exactly $388 below the with-replacement package. The brief does not state which line item that $388 comes off.

The "What's Included" list for the without-replacement package therefore cannot be honestly itemised. That package renders its total and its replacement terms, and its inclusion list is withheld behind `<Tbd>` until DirectHired confirms the breakdown. Inferring it would violate §78.

### 4.3 Helper sources

Three entries: Indonesia, Myanmar, Mizoram. Mizoram is never labelled "India" in navigation or marketing copy (§13). The collection schema and the homepage block are both built to accept a fourth entry — Philippines is a plausible future addition — without layout changes.

---

## 5. The TBD Mechanism

Brief §78 forbids inventing business information, and Reminders 01–10 enumerate ten categories of unverified data. Across twenty pages this cannot rest on authorial discipline. It is made structural.

**`<Tbd>` component**

- In development: renders a visibly marked placeholder identifying what is missing and who must supply it.
- In production build: **any surviving instance fails the build.**

Missing information falls into two categories, handled differently.

**Category A — inline gaps, gated by `<Tbd>`.** A value missing from a block that otherwise renders. These fail the production build.

| Item | Source reminder |
|---|---|
| MOM licence number | 06 |
| Detailed replacement terms | 04 |
| Without-replacement inclusion list | §17, see 4.2 |

**Category B — whole-block omissions, gated by empty collections.** An entire section has no data. These do not fail the build; the block is simply absent and the site launches without it (see 6.2).

| Item | Source reminder |
|---|---|
| Helper profile data | 03 |
| Google rating, review count, review content | 05 |

The distinction matters: category A would publish a visibly broken claim, so it must block release. Category B publishes nothing at all, which is honest — merely less persuasive.

**Generated checklist.** The brief (§79) asks for a maintained document titled "DirectHired — Information Required Before Production". Rather than a hand-kept file that drifts, it is generated at build time from live `<Tbd>` instances *and* empty gated collections, so both categories appear. It cannot fall out of sync with the code.

The `placementCount` value of "1,000+" and `foundedYear` of 2022 are treated as confirmed per §69, and are not gated.

---

## 6. Homepage Composition

Twelve blocks. Three deviations from the brief's fifteen, each deliberate and recorded below.

```
01  Hero                 split composition, family ↔ helper
02  Trust bar            MOM licence (Tbd) | Since 2022 | 1,000+ placed
03  Problem              "Finding a helper shouldn't be a guessing game."
04  The Difference       origin story → three pillars
05  Matching Process     five steps, visual progression
06  Pricing              package overview → View Pricing
07  Happy Employer.      emotional peak, `deep` palette
    Happy Helper.
08  Helper Sources       three cards, extensible to four
09  Services             six concise cards
10a Meet Our Helpers     conditional — see 6.2
10b Google Reviews       conditional — see 6.2
11  FAQ                  six highest-intent questions → /faq
12  Final CTA            "Tell us what your family needs."
```

Blocks 10a and 10b are two distinct sections that share a launch state. They occupy one position in the spine; when neither has data, the page flows from 09 directly to 11 with no visual gap.

### 6.1 Deviations

**Merged §35 (Why DirectHired) into block 04.** Brief §27 argues *"We understand first. We recommend second."*; §35 argues *"We don't just fill vacancies."* These are one argument, and splitting it across two homepage sections halves its force. The origin story becomes the lead-in to the three pillars. Long form lives at `/why-directhired` in sub-project 2.

**Reduced §36 (About) to a credibility strip.** A full About section duplicates `/about`. Company credentials appear in the trust bar and footer instead.

**Moved Pricing from position 9 to 6.** §84 requires a user to answer "How much does it cost?" within seconds. At position 9 of 15 that is a long scroll. Transparent pricing is one of three brand pillars, so surfacing it early *is* the trust argument — this serves §82 rather than competing with it.

### 6.2 Blocks that are empty at launch

Blocks §29 (Meet Our Helpers) and §34 (Google Reviews) both depend on data that §78 forbids inventing and that Reminders 03 and 05 confirm is unavailable. They are designed and built, but each renders only when its backing content collection contains at least one entry — an empty collection omits the block entirely rather than rendering an empty shell or a placeholder. Because the gate is emptiness rather than a `<Tbd>` instance, these blocks do not fail the production build; the site launches without them and gains them when content arrives.

**Consequence, stated plainly:** the two most persuasive trust devices — real faces and real reviews — are absent at launch. V1's trust argument therefore rests on transparent pricing, the visible five-step process, MOM licensing, and Singapore physical presence. Obtaining verified reviews and publishable helper data is the highest-value content task outside this spec.

### 6.3 Block 07 — the emotional peak

The only block that shifts palette register, to `deep`. Per §22 it represents two-sided matching: employer needs on one side, helper skills and expectations on the other, resolving to *"Better matching happens when both sides are understood."*

Per §83 this is shown as composition, not explained in prose. It is the block intended to be remembered.

### 6.4 Conversion hierarchy

Primary **Submit Your Requirements**, secondary **WhatsApp Us**, in that order everywhere, without exception (§9).

- Desktop: header, block 06, block 12, footer
- Mobile: persistent WhatsApp affordance that never occludes content or the primary CTA

WhatsApp opens a deep link built from `company.whatsapp` with a pre-filled message. Response expectation is "within 1 business day" (§10, §74). The site never claims instant human response, and never uses the phrase "perfect match" (§67).

---

## 7. SEO Architecture

- Fully prerendered static output. Exactly one `H1` per page; correct `H2`/`H3` nesting.
- **Structured data**: `EmploymentAgency` on home and contact — more precise than generic `LocalBusiness`; `FAQPage` on FAQ surfaces; `BreadcrumbList` on nested pages.
- Per-page title, meta description, canonical URL, and Open Graph metadata driven from frontmatter.
- `@astrojs/sitemap` and `robots.txt`.
- Descriptive image filenames and alt text on every image (§50).
- **Internal linking**: a reinforcing triangle between helper sources, services, and pricing — the site's highest-intent keyword clusters.
- Content written to search intent, not keyword density (§49).

Local signals per §51: Singapore address, Singapore phone, service area, consistent NAP data sourced from `company.ts` so every occurrence is identical. No fabricated branch locations.

---

## 8. Performance

Zero JS by default. Only three interactive islands are justified: mobile navigation, FAQ accordion, scroll reveal. Anything else must argue for its bytes.

- Images via `astro:assets`; AVIF/WebP with fallbacks; explicit dimensions on every image so CLS stays near zero; below-fold images lazy-loaded.
- Fonts self-hosted, subset, display face preloaded.
- No animation library. Motion is CSS-driven.

**Budget, enforced in CI rather than checked by hand:**

| Metric | Target |
|---|---|
| LCP | < 2.5s |
| CLS | < 0.1 |
| INP | < 200ms |

Per §64, visual effects never justify exceeding the budget.

---

## 9. Accessibility

Per §63, treated as requirements rather than aspirations:

- WCAG AA contrast on all token pairings, verified at palette approval
- Full keyboard navigability with visible focus states
- Semantic landmarks and heading hierarchy
- Alt text on all images; no text embedded in images
- `prefers-reduced-motion` honoured
- Minimum 16px body text

`axe` runs against the homepage in CI.

---

## 10. Testing

A static marketing site does not warrant broad unit testing. Three areas genuinely earn tests and are written test-first:

1. **Pricing derivation** — totals computed from line items assert to $1,640.10. Guards against silent price corruption.
2. **TBD production gate** — the build fails while any `<Tbd>` instance remains. The failure path is tested; an untested gate is decoration.
3. **Link integrity** — every internal link resolves; every primary CTA resolves through `company.requirementFormUrl`; no hardcoded requirement-form URL exists in the tree.

Supplementing these: Astro content-collection schema validation at build, Lighthouse CI against the §8 budget, and `axe` per §9.

---

## 11. Content Integrity Rules

Binding on all implementation:

- Never invent helper names, ages, experience, skills, salaries, or availability
- Never invent customer names, reviews, ratings, or review counts
- Never invent licence numbers, certifications, awards, branches, or staff counts
- Never invent pricing, fees, government charges, or replacement conditions
- Never present placeholder people as actual DirectHired employees or helpers (§55)
- Never claim AI matching; current differentiation is personalised human consultation (§66)
- Never promise a "perfect match" or an instant human response (§67, §74)

Unavailable information routes through `<Tbd>`. It is never silently approximated.

---

## 12. Definition of Done

- [ ] Palette and type system proposed against the official logo and approved
- [ ] Design tokens implemented; no hardcoded colour, spacing, or radius in components
- [ ] `company.ts` and `pricing.ts` are the sole source of their facts
- [ ] Pricing totals derived and asserted by test
- [ ] `<Tbd>` renders in dev and fails the production build; failure path tested
- [ ] "Information Required Before Production" checklist generates from both live `<Tbd>` instances and empty gated collections
- [ ] Blocks 10a and 10b omit cleanly when their collections are empty, leaving no visual gap
- [ ] Twelve homepage blocks implemented per §6
- [ ] Conversion hierarchy correct on every surface; no hardcoded form URL
- [ ] Structured data validates
- [ ] Lighthouse CI meets the §8 budget
- [ ] `axe` passes on the homepage
- [ ] Link-integrity test passes
- [ ] Renders correctly at mobile, tablet, desktop, and large desktop, recomposed rather than scaled (§62)

---

## 13. Open Inputs

Required before the corresponding stage, not before planning:

| Input | Needed by |
|---|---|
| Official logo file | Palette proposal, start of implementation |
| Existing brand colours, if any | Palette proposal |
| MOM licence number | Production build |
| Google rating, review count, publishable reviews | Whichever comes first: block 10 or production |
| Publishable helper profile fields | Block 10 |
| Without-replacement price breakdown | Pricing block honest itemisation |
| Detailed replacement terms | Production build |
| Production requirement-form URL | Launch |
| Real photography | Sub-project 4 |
