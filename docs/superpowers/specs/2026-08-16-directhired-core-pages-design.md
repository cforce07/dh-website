# DirectHired Website — Core Pages

**Design specification, sub-project 2 of 4**
Date: 2026-08-16
Status: Approved for planning
Builds on: `docs/superpowers/specs/2026-08-15-directhired-foundation-homepage-design.md`
Source brief: `DirectHired Website — Master Context & Design Brief for Claude Code + Taste Skills.md` (V1.0)

---

## 1. Scope

Six pages: `/pricing`, `/find-your-helper`, `/why-directhired`, `/about`, `/faq`, `/contact`.
Corresponds to Phase 3 of the source brief.

**Build order: `/pricing` first and complete, reviewed against the live site, then the remaining five in one pass.**

Sub-project 1 used a vertical slice because the design system was unproven. It is now proven. The risk here is different: `/pricing` is worth more than the other five combined — it answers §84's number-one objection and targets §49's strongest commercial-intent queries — and building six at once gives it a sixth of the attention.

**Out of scope, deferred to sub-project 3:** the 6 service detail pages, 3 helper-source detail pages, and 4 legal pages. `/services` and `/helpers` index pages also stay out; they are entry points to those families.

**Explicitly not built** (§40, §77): helper search, filtering, or browse; any new content type or CMS; any mention of the Philippines, including "coming soon".

---

## 2. Business information supplied for this sub-project

DirectHired supplied the following on 2026-08-16. It unblocks the two most valuable pages. Nothing here may be extended, rounded, or inferred beyond what is written.

### 2.1 Replacement

- **Trigger:** the employer requests it. No justification required.
- **Sole exclusion:** the employer has breached the Employment Act or abused the helper.
- **Entitlement:** strictly one replacement, within **6 months of the deployment date**.
- **Cost:** the employer re-pays the third-party components — MOM, insurance, SIP, medical, handling & transport. **DirectHired's agent fee is not charged again.**
- **Loan carry-forward:** any outstanding balance from the replaced helper reduces what the employer advances for the new one, as a subtraction:

```
New helper's loan                                    $2,500
Less: outstanding balance from the replaced helper  −$1,500
                                                    ───────
Employer advances                                    $1,000
```

Figures illustrative. The mechanism is the subtraction, not the numbers.

### 2.2 Timeline

- **From source country:** approximately **2 weeks** after confirmation.
- **Transfer helper:** approximately **1 week**.
- Applies to Indonesia, Myanmar and Mizoram. No other source may be named.

### 2.3 Loan and placement fee

- **Placement fee:** fixed at **one month's salary**. Same for new and transfer helpers.
- **Loan:** genuinely case-by-case; ranges differ by profile. **No range may be published.**
- **Repayment:** **1 to 7 months**, 7 being the maximum DirectHired accepts, repaid from the helper's basic salary monthly. During repayment the helper receives off-day compensation.

### 2.4 Framing — binding on all copy

The employer **advances** the loan and placement fee and **recovers** it through the helper's repayment. It is ultimately the **helper's** cost.

Current site copy says these fees "may apply", which reads as a cost the employer bears. That is wrong and must be corrected wherever it appears. Copy must state both halves: the employer funds it first, and it is repaid.

### 2.5 Compliance gate

§2.3's repayment terms describe a **salary-deduction arrangement on a licensed employment agency's public website**, in an area MOM regulates closely. Source brief §19 requires final wording here to be reviewed against DirectHired's actual commercial and regulatory terms before publication.

**This paragraph ships behind a declared input requiring DirectHired's compliance sign-off.** Not because the facts are doubted, but because it is the highest-liability sentence on the site.

### 2.6 Supplied 2026-08-16 (second round)

Five questions put to DirectHired in `docs/OPEN-DECISIONS.md`, answered the same day, plus **2.6.6** and **2.6.7** — two further questions raised by the `/why-directhired` review and answered by DirectHired on 2026-08-16 — plus **2.6.8** and **2.6.9**, the two `docs/OPEN-DECISIONS.md` "facts to confirm in writing" raised by `/about`, answered by DirectHired on 2026-08-16, plus **2.6.10** and **2.6.11**, which separate the package's `Medical` and `Insurance` line items into the two different obligations they are, supplied by DirectHired on 2026-08-16. **2.6.12** was answered by DirectHired on 2026-08-17 and is a RECORD ONLY — it changes no copy. Same rule as the rest of §2: nothing here may be extended, rounded or inferred beyond what is written.

**One exception, and it is confined to §2.6.11.** The two insurance minimums in that entry are **MOM's**, read off the regulator's own page rather than supplied by DirectHired — the only values in §2 that do not rest on the client's word. That entry records what was checked, what it corrected, and what it therefore may not be extended past.

- **2.6.1 — The replacement terms are complete.** Asked "are those five facts the whole of your replacement terms?", DirectHired answered **yes**. §2.1's five facts are therefore the whole of the replacement terms, and that is now a supplied fact rather than an inference.

  **Scope: the replacement terms only.** It says nothing about the completeness of `/pricing` as a page, which still withholds the loan figure (§2.3, §7) and the repayment mechanics (§2.5). A section may state that its own terms are complete; the page may not claim to be.

- **2.6.2 — One repayment-process sentence is approved for publication.** DirectHired approved this exact wording:

  > We go through the repayment arrangement in full with you before you commit, and it is set out in the contract.

  It is a statement about **process** — that the arrangement is explained and contracted — not about the mechanism. **§2.5's gate is unchanged by it.** The 1–7 month range, repayment from the helper's basic salary, and off-day compensation during repayment all remain unpublishable pending compliance sign-off, in substance as well as literally. One sentence was approved; the mechanics were not.

  This also supersedes, for this sentence only, the earlier deletion of "…before you commit to anything" from `src/sections/LoanAndPlacement.astro` and `src/content/faq/helper-loan-placement-fee.md`. That clause was an unauthorised process promise when it was deleted; the sentence above is the same idea, now authorised, in DirectHired's own words.

- **2.6.3 — The with-replacement package is recommended for first-time employers.** Asked whether they recommend it to first-time employers, DirectHired answered **yes**. The recommendation is **audience-qualified**: it is for first-time employers, not a general statement that the package is better. The without-replacement package remains the right choice for an experienced employer, and no copy may imply otherwise.

- **2.6.4 — What families ask after seeing the figures.** DirectHired: *"Normally they will ask similar question for re-assurance."* Families re-ask questions the page has already answered, seeking reassurance rather than new information. Consequence: an FAQ that restates what the page says is **correct behaviour, not duplication**, and copy answering these questions should be framed as reassurance. This does **not** license restoring near-verbatim adjacent repetition — the earlier de-duplication on `/pricing` removed entries that repeated the cards a screen above them, which remains right.

- **2.6.5 — The requirements form stays on the legacy site.** DirectHired: *"Yes it's a different site. We can audit design on that later."* The employer requirement form is not migrating to this site. Consequence: **the primary conversion path leaves this domain**, so conversion cannot be measured from here and the form's design is outside this project. DirectHired has accepted both; a design audit of that form is deferred.

- **2.6.6 — "No gallery of helpers to browse" is a PRINCIPLE, not a V1 scope note.** *Answered 2026-08-16.* Two pages state the absence of a browsable gallery as an argument rather than as a stage: `/find-your-helper` (*"Because a match is made from both halves, there is no list of helpers to browse here."*) and `/why-directhired` (*"It is also why this site has no gallery of helpers to browse. A shortlist assembled before anyone has heard about your household is a shortlist assembled from whoever happens to be available…"*). The review flagged that this sits against master brief §40's note that the architecture should stay **"future-ready for a future helper-matching platform"** — the copy argues the absence is right, while the architecture is being kept ready to reverse it.

  **DirectHired chose to keep it as a principle**, on both pages, and **no copy changed**. Source brief §40's ban on search/filter/browse is therefore read as a product position, not a V1 limitation, and copy may keep arguing it.

  **This is the record, so that it is not re-litigated by whoever reads §40 next.** It also cuts the other way and is written down for that reason: **if a browse or matching surface is ever built, these two pages argue against it on the record** and both must be rewritten in the same change — a gallery shipping under copy that calls a gallery the thing DirectHired was started to stop doing is worse than either alone. Whoever builds it inherits that as work, not as a surprise.

- **2.6.7 — The "not asked to put your family into a category" clause is deleted.** *Answered 2026-08-16.* `/why-directhired`'s Personalised Service pillar claimed *"…you are not asked to put your family into a category before anyone has spoken to you."* That is a claim about the legacy employer-requirement form (§2.6.5) — outside this project, unseen by anyone in this repository, behind a URL that 404s today, and one click from this page's primary CTA. **DirectHired chose to delete it** rather than defend it. It is gone from the page; `src/pages/why-directhired.astro` records the exact wording and the one condition for restoring it — written confirmation of what fields that form asks for.

- **2.6.8 — The registered entity name is exactly `DIRECT HIRED PTE. LTD.`** *Answered 2026-08-16.* Full stops and capitalisation as written. DirectHired confirmed the form directly, closing the `docs/OPEN-DECISIONS.md` item that asked for it. `/about` already published this string; what changes is its standing — it was an uncorroborated punctuation resting on a supplied value, and it is now a confirmed client fact.

  **It is a CLIENT-SUPPLIED fact, not a verified one, and §2's rule is the whole of its authority.** Verification was attempted on 2026-08-16 and failed: a web search for the entity returned nothing usable, and MOM's employment-agency directory is a JavaScript application that cannot be fetched from this environment. An earlier public search returned the *unpunctuated* form "Direct Hired Pte Ltd" against licence 23C1443, which corroborates the words and says nothing about the punctuation. Nobody in this repository has read the name off a register. `src/data/company.ts` records that attempt and its failure at the value.

- **2.6.9 — The UEN is `202240964Z`.** *Answered 2026-08-16.* DirectHired supplied it in answer to the `docs/OPEN-DECISIONS.md` question that asked for the number "if you want it published". It ships as a row in `/about`'s record block, single-sourced from `src/data/company.ts` like every other value there.

  **Same standing as 2.6.8: client-supplied, not verified.** A web search for the number returned nothing, and the MOM directory is unreachable for the same reason. The *format* is consistent with the rest of §2 — YYYY plus five digits plus a check letter is the shape a local company incorporated in 2022 gets, and "since 2022" is §2's founding year — but a format that parses is not a registry entry that was read, and that consistency is recorded as a sanity check rather than as corroboration.

- **2.6.10 — "Medical" in the package is the PRE-EMPLOYMENT MEDICAL CHECKUP, not medical insurance.** *Answered 2026-08-16.* The `Medical` line item — **$60.00** in both packages — pays for the helper's pre-employment medical examination. **It is not insurance of any kind.** The package's `Insurance` line (§2.6.11) is a separate obligation buying separate policies, and the two must never be described as one thing or as two halves of one thing.

  **This corrects a premise the site was already built on.** `src/content/faq/medical-examination.md` opened *"Like the insurance, it is one of the components inside the fly-in package…"*, which on these facts is a category error: it drew an equivalence between an examination and an insurance policy. It also assumed what else was on the page around it, which is the same defect this repo bans `/find-your-helper` links in markdown for — a content entry cannot know which surface renders it. Both reasons stand alone; the clause is deleted.

- **2.6.11 — "Insurance" covers BOTH required policies, at MOM's minimums.** *Answered 2026-08-16.* The `Insurance` line item — **$425.10** in both packages — buys the two policies MOM requires of every MDW employer: **medical insurance** and **personal accident insurance**, each at the regulator's minimum. It is one price for two policies, and the site publishes the two policies with their own figures rather than merging them into a single number.

  **THE FIGURES ARE MOM'S, AND THEY WERE READ OFF MOM BEFORE ANY OF THIS WAS WRITTEN** (https://www.mom.gov.sg/passes-and-permits/work-permit-for-foreign-domestic-worker/eligibility-and-requirements/insurance-requirements):

  - **Personal accident insurance — a sum assured of at least $60,000.** MOM requires it to cover sudden, unforeseen and unexpected incidents resulting in permanent disability or death.
  - **Medical insurance — an annual claim limit of at least $60,000 per year**, for in-patient care and day surgery, for policies starting on or after 1 July 2023.

  These are **the regulator's floor, not DirectHired's product.** Copy must say so. Nothing here states what DirectHired's chosen policies actually pay beyond that floor, who underwrites them, or on what conditions they pay — the `docs/OPEN-DECISIONS.md` item asking for the insurer, the product name or a policy summary stays open, narrowed rather than closed.

  **VERIFICATION IS WHY THIS ENTRY HAS THE NUMBERS IT HAS, AND IT CAUGHT TWO ERRORS RATHER THAN ONE.** Both are recorded because the lesson is the process, not the arithmetic.

  1. **DirectHired's first answer was wrong.** Asked what the insurance covers, they said *"death, personal accident and hospitalization to be at least 60k"* — one figure spanning everything. Written as given, that would have published a single merged number for two policies MOM regulates separately, on the page where a family pays $425.10 for them. Asking a second time produced the two-policy split.
  2. **The correction supplied in its place was also wrong, in the other direction.** The medical-insurance minimum was given as **$15,000 per year**. It is **$60,000 per year**. $15,000 does appear on MOM's page — it is the threshold above which the enhanced-MI co-payment applies (75% insurer / 25% employer) — so it is a real number in the right document doing a different job, which is exactly the kind of error that survives a careless read. Publishing it would have understated the helper's hospitalisation cover **fourfold**. Caught by fetching the MOM page rather than by trusting either party's phrasing; confirmed twice, from the requirements page and from MOM's own search index.

  **The standing of these two figures is therefore NOT the standing of the rest of §2.** Every other fact here is DirectHired's word. These were read off the regulator, and they are the only values in §2 that a third party can check without asking DirectHired anything. If MOM revises either minimum, this copy is wrong the day it changes — that is the cost of publishing a statutory figure, and it is accepted deliberately rather than by oversight.

  **"DEATH" IS NOT WRITTEN ANYWHERE.** MOM folds it into personal accident ("permanent disability or death") rather than listing it as its own cover; it entered this project only in the client answer that turned out to be wrong; and no source available here states it as a separate policy or a separate figure. There is no wording it could be added in that would not be one of those three things.

  **MOM FORBIDS PASSING THE INSURANCE COST TO THE WORKER** — verbatim from the same page: *"You cannot pass on the cost of purchasing the insurance to your helper."* Nothing on the site suggests otherwise and nothing needs changing for it. It is written down because **§2.4 sits close to it and points the other way**: the employer *advances* the loan and placement fee and *recovers* them through the helper's repayment, so those are ultimately the helper's cost. Insurance is not. It is inside the package the employer bears and it stays there, and the boundary between the two framings is one word of drift wide. §2.4's framing is unchanged by this entry and must not be extended to reach the package.

- **2.6.12 — `dev.directhired.com` is a PROTOTYPE that is not launching. §2.6.6 stands unchanged and no copy moves.** *Answered 2026-08-17.*

  A reviewer found `docs/runbooks/2026-08-16-dns-cutover.md` describing that host as a live application, and it was verified directly: `/login`, `/register`, `/apply`, `/helpers` and `/pricing` all return **200**, titled *"Direct Hired"*. The `/helpers` route is a **browse surface**, which appeared to contradict §2.6.6 — where DirectHired chose to keep *"no gallery of helpers to browse"* as a stated principle on `/find-your-helper` and `/why-directhired`.

  **DirectHired confirmed it is a prototype that is not launching.** So the apparent contradiction is not one: §2.6.6's principle is unchanged, and **no copy on either page moves**.

  **THE REVERSE-DIRECTION NOTE IN §2.6.6 STILL APPLIES AND IS RESTATED HERE ON PURPOSE.** If a browse or matching surface is ever shipped — this prototype promoted, or anything else — then `/find-your-helper` and `/why-directhired` **argue against it on the record** and both must be rewritten in the same change. A gallery shipping under copy that calls a gallery the thing DirectHired was started to stop doing is worse than either alone. Whoever builds it inherits that as work, not as a surprise.

  **THE HOST IS REACHABLE TODAY AND SHOULD NOT BE AT LAUNCH.** A prototype answering on a public subdomain of the production domain, with `/login` and `/register` working, is a deployment concern rather than a copy one: it is indexable, it is confusable with the real site, and it publishes a browse surface the marketing site argues against. **It belongs to the infrastructure work, not to this sub-project** — nothing on this branch touches it — but it is written down here because this is the document the next person reads. The DNS cutover runbook's description of it as a "live application" is accurate about its HTTP behaviour and misleading about its status; read it with this entry.

---

## 3. Architecture

### 3.1 Section reuse — parameterise the few, reuse the rest

Several homepage sections belong on these pages. Three options were considered:

- **Copy them** — guarantees drift. Six pages later, six versions of the CTA.
- **Reuse verbatim** — a page repeating the homepage gives a visitor no reason to be there, and creates duplicate content across the site.
- **Parameterise the few that need it** — chosen.

`Process` and `FinalCta` gain optional heading and lede props so a page can frame them for its own context while the underlying content stays single-sourced. `TwoSidedMatch` and `TrustBar` are reused unchanged.

This matters concretely: the process changed from five steps to four on 2026-08-16. That must never need doing twice.

**`Faq` needs more than a prop, and the spec was initially wrong about this.** It currently hardcodes `.filter(e => e.data.surfaces.includes('home'))` and `.slice(0, 6)` — so it is not reusable as-is. Two distinct needs:

- **Flat, filtered** — the homepage (6 tagged `home`) and `/pricing` (entries tagged `pricing`). `Faq` gains `surface` and `limit` props; the hardcoded values become its defaults so the homepage is unchanged.
- **Grouped** — `/faq` renders all 14 under four headings (Cost & Pricing / Helpers & Sources / Process & Timing / Replacement). That is a different layout, not a parameter, and it needs a **`category` field added to the `faq` collection schema** — which does not exist today.

So: `Faq` is parameterised for the flat case, `/faq` gets its own grouped layout reusing the same `<details>` item rendering, and the collection schema gains one required field. Adding a required field means all 6 existing entries need it — that is part of the work, not an afterthought.

### 3.2 Page composition

| Page | Structure |
|---|---|
| `/pricing` | Both packages itemised · what's included · replacement mechanics with the worked sum · loan and placement fee per §2.4 · pricing-tagged FAQs · CTA |
| `/find-your-helper` | Matching explained · `Process` reframed as "what happens after you submit" · response expectation · form CTA. Not a filter or search (§40) |
| `/why-directhired` | Origin · three pillars at length · `TwoSidedMatch` · credentials · CTA |
| `/about` | Company story · philosophy · Singapore presence · credentials with the verified MOM licence · CTA |
| `/faq` | All 14 of §37's questions, grouped: Cost & Pricing / Helpers & Sources / Process & Timing / Replacement |
| `/contact` | Details from `company.ts` · office · hours · socials · `EmploymentAgency` structured data |

### 3.3 Content model

The `faq` collection's existing `surfaces` field carries page routing: entries tagged `'pricing'` surface on `/pricing`, `'faq'` on `/faq`, `'home'` on the homepage. No new collection.

**One schema change:** a required `category` field on `faq`, one of `cost` / `sources` / `process` / `replacement`, used only by `/faq`'s grouped layout. All 6 existing entries must gain it — a required field with no default breaks the build until they do, which is the correct behaviour and should not be worked around with an optional field.

Eight new FAQ entries are authored from §2's supplied information, bringing the total to fourteen.

### 3.4 Decisions taken by default

Recorded because DirectHired did not answer and these can be overruled:

- **`/contact` is built and linked from the footer, not the navigation.** The nav is at its width budget; the footer already carries the details, and the page is where local-SEO signals belong (§51).
- **The About founding story uses source brief §35 verbatim** — *"DirectHired was created after seeing families struggle with agencies that focused on filling vacancies instead of finding the right fit."* Nothing expanded. Recorded as wanting DirectHired's own words.

---

## 4. SEO

Each page owns one distinct intent from §49:

| Page | Primary intent |
|---|---|
| `/pricing` | maid agency pricing Singapore · how much does a maid cost Singapore |
| `/faq` | long tail, via `FAQPage` structured data across all 14 |
| `/find-your-helper` | maid placement Singapore |
| `/why-directhired`, `/about` | brand and trust queries |
| `/contact` | local intent, via `EmploymentAgency` structured data |

**Per page:** unique title and meta description, canonical URL, `BreadcrumbList`, OG tags. All flow through the existing `BaseLayout` — inputs, not new machinery.

**The internal linking triangle** (foundation spec §7) becomes buildable for the first time: Pricing ↔ Find Your Helper ↔ FAQ, all three ↔ the requirement form. Sub-project 1 could not build it because there was nowhere to link.

---

## 5. Testing

Sub-project 1's guards inspect `index.astro` only. Extended to all seven pages:

1. **Exactly one `<h1>` per page**, correct nesting, no skipped levels
2. **No hardcoded requirement-form URL** anywhere; every primary CTA resolves through `company.requirementFormUrl`
3. **The pricing drift guard extended to `/pricing`** — that page repeats figures in prose, which is exactly where a stale number hides
4. **No invented business information** — the existing greps for "perfect match", AI matching, instant response, invented timelines, nationality characterisation, and "country" applied to Mizoram, applied to every page
5. **Every internal link resolves**, with the allowlist reduced to the legal and detail pages still outstanding
6. **The §2.3 compliance paragraph is gated** — a test asserting it cannot ship without its declared input resolved

Every new assertion must be able to fail. Mutation-check anything load-bearing.

---

## 6. Performance and accessibility

Unchanged from the foundation spec, now enforced across seven pages:

- LCP < 2.5s, CLS < 0.1, TBT < 200ms; performance/accessibility/SEO 1.00 in CI at median aggregation
- WCAG AA on every pairing. `--color-brand-teal` (#00a4a6, 2.89:1) remains graphic-only — never text, never a button fill
- `axe` at zero violations
- Zero horizontal overflow, 320px upward
- Block 07's `--color-deep` remains the only palette register shift; a second dark band on another page needs its own justification

---

## 7. Content integrity

Binding, unchanged from the foundation spec, plus:

- Never name the Philippines or any source beyond Indonesia, Myanmar and Mizoram
- Never describe Mizoram as a country — it is a state of India (§13, §412)
- Never publish a loan range; §2.3 says it is case-by-case
- Never present the loan or placement fee as a cost the employer bears (§2.4)
- Never state a timeline beyond §2.2's figures

---

## 8. Definition of done

- [ ] `/pricing` built, reviewed against the live site, and approved before the other five begin
- [ ] All six pages built; every nav and footer link except legal and detail pages resolves
- [ ] Eight new FAQ entries authored from §2; all 14 grouped and rendering
- [ ] The replacement worked sum renders as a sum
- [ ] Loan and placement copy reframed per §2.4 everywhere it appears, homepage included
- [ ] The §2.3 paragraph gated behind its compliance declared input
- [ ] `Process` and `FinalCta` parameterised; `Faq` gains surface/limit props with current values as defaults; `faq` schema gains `category` and all 6 existing entries updated; no section duplicated
- [ ] Internal linking triangle in place
- [ ] All §5 guards extended to seven pages, each mutation-checked
- [ ] Lighthouse budget and axe hold on every page
- [ ] `docs/OPEN-DECISIONS.md` updated

---

## 9. Open inputs

| Input | Needed by |
|---|---|
| Compliance sign-off on §2.3 | Publication of the loan repayment paragraph |
| Production requirement-form URL | Launch — six pages now multiply one broken conversion path |
| Founding story in DirectHired's words | `/about` (brief §35 line ships meanwhile) |
| Google reviews, helper profile data | Blocks 10a/10b, still absent |
| Real photography | Sub-project 4 |
