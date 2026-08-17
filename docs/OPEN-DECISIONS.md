# DirectHired — What's waiting on you

Last updated 2026-08-17. Everything here needs a decision or an asset from
DirectHired; none of it can be resolved from the codebase.

Detail and reasoning for each: `docs/design/implementation-plan-2026-08-16.md` §5.
Generated status of missing content: `docs/INFORMATION-REQUIRED-BEFORE-PRODUCTION.md`.

> **THE SITE IS LIVE as of 2026-08-17** at `https://www.directhired.com`.
> See `docs/runbooks/2026-08-16-dns-cutover.md` § *GO-LIVE*.
>
> **And the form URL is answered, also on 2026-08-17.** For the whole of this
> project the first item under the heading below was a conversion path that
> ended nowhere. You supplied the address, it is wired in, and the item has
> moved to *Answered, for the record* at the foot of this document — with the
> URL, the date, and what we checked about it before using it. What is left
> below is a sign-off that blocks a paragraph.

---

## Costs you money every day (was: *Blocks launch*)

**One item now, and it is the lesser of the two that were here.** The other was
the form URL — the single highest-value thing on this entire document, and the
only one with the property that nothing on the site worked without it. It was
**answered on 2026-08-17** and is recorded in full under *Answered, for the
record*. It is not deleted: it is the thing that stopped the site converting,
and you should be able to see that it is closed, what the answer was, and when.

**Why this was renamed, and why the heading still stands.** Both items sat under
*Blocks launch* while the domain still served a 793-byte placeholder.
Re-examined at cutover, neither actually gated publication: the compliance item
blocks a paragraph and says so in its own row, and the form URL was already a
404 on the old site, so going live neither created nor worsened it. Keeping them
under *Blocks launch* was protecting an empty page. The form URL's urgency then
rose rather than fell at go-live, because the dead buttons had acquired an
audience — which is what the renamed heading was measuring, and which is now
over. The heading stays because the item beneath it is still a live cost, and
because renaming it back would erase why the first one was ranked as it was.

### 1. Compliance sign-off on loan repayment

| | What's needed | Why it blocks |
|---|---|---|
| **Compliance sign-off on loan repayment** | Written confirmation that the repayment terms you gave us on 2026-08-16 may be published as-is | **Still open, and only partly narrowed by your 2026-08-16 answer.** You approved one sentence about the *process* — *"We go through the repayment arrangement in full with you before you commit, and it is set out in the contract."* — and that sentence is now live on `/pricing`. The **mechanics are not**: that repayment runs **1 to 7 months**, that it comes from the helper's **basic salary**, and that she receives **off-day compensation** during it. None of those three is on the site, in those words or paraphrased, and a test fails the build if any of them appears. They describe a salary-deduction arrangement on a licensed agency's public website, in an area MOM regulates closely, so they wait for your sign-off rather than your say-so. Approving one process sentence is not that sign-off. **Unlike the form URL, which is now answered, this one blocks a paragraph, not the business** — the pricing page is complete and honest without it, and it is why this is the only item left under this heading. |

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

## Copy that is short because you have not said more

Nothing here blocks anything. `/why-directhired` and `/about` are both live and
every sentence on them traces back to something you or your brief already
supplied — which is exactly why two parts of them are shorter than they want to
be. Neither gap was filled in, because filling it in would have meant writing
something you never said.

| | What's there now | What we would use instead |
|---|---|---|
| **Your founding story** | The one line from your brief, word for word: *"DirectHired was created after seeing families struggle with agencies that focused on filling vacancies instead of finding the right fit."* It opens `/why-directhired`, and as of 2026-08-16 it opens `/about` too — one sentence carrying a whole About page's origin | **The story in your own words** — who saw it, when, and what specifically went wrong. This is the single most persuasive paragraph a family reads on a trust page, and right now it is one sentence long. We will not invent a founder, a year or an anecdote to lengthen it |
| **What your insurance actually covers** | **Narrowed 2026-08-16 by your own answer, not closed.** `/faq` now states both required policies and their cover: medical insurance with an annual claim limit of at least **$60,000**, and personal accident at a sum assured of at least **$60,000**. Both are attributed in the copy to **MOM's minimums** rather than to you, because that is exactly what they are — the regulator's floor, which we could read off MOM ourselves. What the entry still cannot say is what **your** policies do above that floor | **The insurer and product name, or a policy summary we can link to.** That is the whole of what is left. A statutory minimum tells a family what the law guarantees; it does not tell them whose policy they hold, what it pays beyond the floor, or what it excludes. We will not paraphrase a policy nobody here has read |
| **Whether one consultant carries a placement end to end** | Your brief already answers who picks a submission up: *"Employer requirements are received and reviewed by the sales consultant, with a target response within 1 business day"* (line 353), repeated at §74/line 1856. That is published — the FAQ says a consultant reviews every submission and aims to respond within 1 business day. The `/why-directhired` pillar adds that the guidance is human throughout | **One thing only: does the same person stay with a family from that first review through to the placement?** Everything else here you have already told us. If it is one consultant end to end, that is a sentence the trust pillar can carry and cannot write without you; if a placement passes between people, we will not imply otherwise. *(This question used to ask what "personalised service" consists of, on the basis that the brief supplied two lines. That was inaccurate — lines 353 and 1856 supply the intake role, and the pages use them. Narrowed on 2026-08-16 to the part that is genuinely unconfirmed.)* |

---

## Facts you confirmed on 2026-08-16 — nothing outstanding

Both were open questions in this file until 2026-08-16. **You answered both, and
both are now published on `/about`.** They are kept here, resolved, rather than
deleted: they are the two values on the site that rest on your word alone, and a
reader who wants to know how much checking sits behind a legal name should find
the answer where the question was asked.

| | What's published | Status |
|---|---|---|
| **Your registered entity name** | **DIRECT HIRED PTE. LTD.**, in the record block on `/about` — the one credential on the site that names the legal company behind the brand | **Answered 2026-08-16 — resolved.** You confirmed the exact form, full stops and capitalisation as written. Recorded as core-pages spec §2.6.8. It is your word, and that is the whole of its authority: we tried to check it and could not. A public search returns the *unpunctuated* "Direct Hired Pte Ltd" against licence 23C1443, which corroborates the words and not the punctuation, and MOM's own directory is a JavaScript application we cannot fetch. Your master brief never supplied the name — it came to us with the licence number, and it is now confirmed by you directly |
| **Your UEN** | **202240964Z**, as a row in the same record block on `/about` | **Answered 2026-08-16 — resolved.** You supplied the number and it is published. Same standing as the name above: your word, unverified by us. The format is consistent with a company incorporated here in 2022, which is a sanity check and not a confirmation — a search for the number returned nothing, and the registry we would have read it from is the same one we cannot fetch. Nothing was derived from the licence number |

---

## Decisions with a recommendation (answer when convenient)

Four of these (**D-1**, **D-2**, **D-11**, **D-12**) are **already implemented**.
They are listed anyway, and they are not questions — answering "no" now means
requesting a reversal, which is a small change but a real one. They were
previously written as open questions, which read as though the site were waiting
on you; it is not.

**D-13 is closed** and is kept below with its answer rather than deleted: it was
settled by a fact you supplied, and the reasoning is worth reading once. The
count above used to say "three" while listing five implemented rows, and **D-13
sat above D-12** — both fixed here.

| # | Decision | Recommendation | Status |
|---|---|---|---|
| **D-1** | Rename nav "Why DirectHired" → "Why Us"? | **Yes** — the wordmark sits 40px left; buys 65px of header width | **Already implemented** (`src/lib/nav.ts` ships "Why Us"); flagged so it can be reversed. The 65px it bought is spent: it is part of what let the desktop breakpoint come down from 1536px to 1200px, so a reversal means re-measuring the header |
| **D-2** | MOM licence in a hero eyebrow **or** a strengthened trust bar? *(conflicting — pick one)* | **Trust bar.** A hero eyebrow competes with an `<h1>` and lede that both work | **Already implemented** — the licence is in the trust bar (`src/sections/TrustBar.astro`) and there is no hero eyebrow; flagged so it can be reversed |
| **D-3** | Remove the pricing block's secondary WhatsApp CTA? | **Keep it.** Design spec §6.4 says the pair appears "without exception", and a family that has just resolved cost is at peak intent | Open — nothing changed pending your answer |
| **D-7** | May DirectHired display any MOM mark or crest? | **Assume no** until usage terms are produced in writing. A plain bordered licence plate ships today | Open — the safe option ships meanwhile |
| **D-10** | Fund re-subsetting Fraunces to restore its SOFT/WONK axes? | **No for now.** 67KB in the LCP path against a 2.5s budget, for anxious customers on mid-range Android | Open — costs money, so it is yours to call |
| **D-11** | Delete the unused `eyebrow` primitive? | **Delete** — zero call sites | **Already implemented** — removed from `src/components/SectionHeader.astro`; flagged so it can be reversed |
| **D-12** | Remove the hero's secondary WhatsApp CTA? | **Yes** — on a phone it sits directly above two identical buttons in the fixed bar | **Already implemented**; flagged so it can be reversed |
| **D-13** | ~~Merge the insurance and medical FAQ entries into one?~~ Your brief asks for two questions — *"Do you provide insurance?"* and *"Do you arrange medical examinations?"* — and until 2026-08-16 their true answers were almost the same sentence: we arrange it, it is a priced line inside the package | **No — and this is now settled by fact rather than by preference.** They describe **two different obligations**. Your 2026-08-16 answers established it: *Medical* ($60.00) is the **pre-employment medical checkup**, and *Insurance* ($425.10) buys the **two policies MOM requires** — medical insurance and personal accident, each at the regulator's minimum. A checkup taken once before work starts and a year of hospitalisation cover are not one topic, and merging them would have **cemented the confusion instead of resolving it** — publishing, under a single heading, the very equivalence the facts disprove | **Closed 2026-08-16.** No longer a decision you can be asked to make: both entries are rewritten to the supplied facts (spec §2.6.10, §2.6.11) and the question no longer has two defensible answers |

**Why D-13 was ever open, and what the earlier finding got right.** A review found these two entries were near-duplicates. **That was right about the symptom and wrong about the cause.** They read alike because they were **under-specified** — each said only "we arrange it and it is a priced line", which is the one thing that happens to be true of both — not because they were redundant. Specifying them was the fix, and it was unavailable at the time because nothing had been supplied about either line item. Merging would have been the wrong repair for a real observation: it treats two thin answers as one topic, when what they actually were is two topics described too thinly to tell apart. Worth keeping on the record, because the same shape recurs — **entries that look duplicated are sometimes just entries nobody has been able to fill in yet**, and the remedy is facts, not consolidation.

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

**Your requirement form is a separate application, but it is NOT on a separate
domain — and this paragraph used to say it was.** *Corrected 2026-08-17.*

What this said until the URL arrived: that the form lived on a different site,
that the **primary conversion path therefore left this domain**, and that this
site could consequently never see whether a visitor arrived at the form,
finished it, or gave up — that the question *"how many visitors converted?"*
could not be answered from here by us or by anyone, ever, without instrumenting
somebody else's site. That was written from your 2026-08-16 answer, *"Yes it's a
different site"*, and it was a reasonable reading of it. It is wrong.

**What is actually true.** The form is at
`https://www.directhired.com/app/requirements` — the **same host** as this site,
served through the **same CloudFront distribution**, from a different origin
behind it. It is a separate *application* (its own JavaScript bundle, its own
build, nothing to do with this repository) and it is not a separate *site*. A
visitor clicking "Submit Your Requirements" stays on `www.directhired.com`.

**What that changes for you.** Measuring the conversion path is now an ordinary
piece of work rather than an impossibility: same-origin means analytics, a
cookie or a session can follow a visitor from a page here to the form and back,
with no cross-domain instrumentation and no third party in between. **Nothing of
the sort is built today** — this site measures nothing at all, deliberately, and
that has not changed. What has changed is that the door is not locked. If you
ever want the answer to "how many visitors converted?", ask; it is a decision
about analytics and privacy, not a limitation to be accepted.

A design audit of that form remains **deferred** by your instruction, not
forgotten.

**Category A of the production checklist currently detects nothing.**
`docs/INFORMATION-REQUIRED-BEFORE-PRODUCTION.md` opens with Category A —
"inline gaps that block the production build" — and it reads *"None found."*
That is true but weaker than it looks. Category A works by finding `<Tbd>`
markers in the built HTML, and there are **zero `<Tbd>` call sites anywhere in
the codebase** since you supplied the MOM licence number on 2026-08-15. So the
category is reporting that nothing is *marked*, not that nothing is *missing*;
it cannot currently detect anything at all, and `npm run build` passes its gate.

Nothing is wrong: the gate and the `<Tbd>` component are deliberately kept for
the next unverified value. It is written down here because a client reading
"Category A: none found" would reasonably take it as a clean bill of health for
the whole document, and it is not one. **That checklist now says so in its own
words** (revised 2026-08-16) rather than leaving this note to correct it.

**The two documents are companions, not duplicates — read both.** That
checklist covers what the codebase can *detect* or has *declared*, which is
everything with a consequence in the build: the empty sections, the
placeholder images, the form URL, the repayment sign-off. This document covers
everything else — the decisions, and the copy that is short because nobody has
said more. A gap with no consequence in the build leaves no trace in that
checklist at all, which is exactly why your founding story and what your
insurance covers appear here and not there. Neither file is the whole list on
its own.

**The form URL was missing from that checklist entirely until 2026-08-16.** It
was tracked here, under what was then called *Blocks launch*, and nowhere else — so the document
titled "Information Required Before Production" did not mention the one input
without which nothing on the site converted. It became the first entry in its
Category C, and a test fails if it is ever dropped again. Since **2026-08-17**
it appears there as **resolved** rather than outstanding — with the address, the
date, what was checked about it, and the count of working buttons it now sits
behind. It was moved rather than removed for the same reason it is kept below in
*Answered, for the record*: a checklist that quietly drops its top item leaves
you unable to tell *resolved* from *forgotten*.

---

## Answered, for the record

| | Answer | Date |
|---|---|---|
| **The production URL for your requirement form** | **`https://www.directhired.com/app/requirements`** — **the item that was first on this document from the day it was written, and it is closed.** Every "Submit Your Requirements" button on the site now leads there: **46 buttons and links across all eight pages** — the header, the mobile menu, the top of every page, the bottom of every page, the bar fixed to the bottom of every phone screen, and the "page not found" page. Before this, all 46 pointed at `https://www.directhired.com/employer-requirement`, which does not exist, and a visitor who clicked the thing the entire site is built to make them click arrived nowhere. **We checked the address before wiring it in** rather than taking it on trust: it returns 200 with and without a trailing slash, and it is served through the same CloudFront distribution as this site. **It cost one line** — `requirementFormUrl` in `src/data/company.ts` is the only place that address is written down anywhere in the codebase, so the single edit moved all 46 links at once, and a test now reads the built site back and fails unless every one of the 46 followed | 2026-08-17 |
| MOM licence number | `23C1443` — verified against MOM's Employment Agencies Directory | 2026-08-15 |
| Placement count | "500+ placements across all services since 2022" | 2026-08-15 |
| Without-replacement pricing | $1,140.10, itemised; agent fee $388 | 2026-08-16 |
| Process steps 1 and 2 | Merged into "Understand your household needs" | 2026-08-16 |
| Helper source differences | None — same service, package and process; only the source differs | 2026-08-16 |
| **Are those five facts the whole of your replacement terms?** | **Yes.** `/pricing` now says so: the replacement section states that these are its terms in full. That claim rests on this answer alone, so if anything is ever added to your terms — a replaced helper who is already deployed, refund treatment, how long a replacement takes to arrange — tell us, because the site is now asserting there is nothing else | 2026-08-16 |
| May we publish *"We go through the repayment arrangement in full with you before you commit, and it is set out in the contract"*? | **Yes.** Live on `/pricing`, in your wording. It approves **this sentence only** — the repayment mechanics remain gated; see *Costs you money every day* above | 2026-08-16 |
| Do you recommend the with-replacement package to first-time employers? | **Yes.** The recommendation is live on **both pages that show the packages** — `/pricing` and the homepage — and on **one card only**, the with-replacement one, marked **"Recommended for first-time employers"**. Deliberately worded with the audience rather than as a bare "Recommended": the other package is not marked as second best, because for an experienced employer it is the right one, and it carries no counterpart label of any kind | 2026-08-16 |
| What do families ask after seeing the figures? | *"Normally they will ask similar question for re-assurance."* Recorded rather than acted on: it means an FAQ that restates what the page already says is doing its job, not repeating itself, and it is the basis for writing those answers as reassurance. No FAQ entries were added or re-tagged on the strength of it — the entries removed from `/pricing` earlier were ones repeating the price cards a screen above them, which is a different problem | 2026-08-16 |
| Is the requirements form staying on your existing site? | *"Yes it's a different site. We can audit design on that later."* Recorded; a design audit of that form is deferred. **Read together with the row above, which corrects what we inferred from this.** "A different site" turned out to mean a different *application*, not a different *domain* — the form is at `www.directhired.com/app/requirements`, same host, same distribution. We took it to mean a separate domain and wrote a consequence into *Housekeeping* that followed from that reading and not from your answer: that conversion could never be measured from here. That paragraph is corrected | 2026-08-16 |
| What is the *"Medical"* line in the package? | The **pre-employment medical checkup** — **not** medical insurance. Two separate obligations, and the FAQ entry that implied otherwise (*"Like the insurance, …"*) is rewritten. Recorded as spec §2.6.10 | 2026-08-16 |
| What does the *"Insurance"* line cover? | **Both** policies MOM requires — **medical insurance** and **personal accident** — at MOM's minimum cover. Published as two policies with their own figures, because MOM regulates them separately. Recorded as spec §2.6.11. **Your first answer to this was corrected by checking MOM**, and that is written up in the note below | 2026-08-16 |

**One note on the answer above, because it is the reason we ask twice.** Your
first reply was *"death, personal accident and hospitalization to be at least
60k"* — one figure spanning everything. Published as given, on the page where a
family pays **$425.10** for it, that would have merged two separately regulated
policies into a single number. Asking again produced the split.

**The figures were then checked against MOM directly, and that caught a second
error.** The medical-insurance minimum reached us as **$15,000 a year**. It is
**$60,000 a year**. $15,000 is a real number on MOM's own page — it is the
threshold above which the enhanced medical-insurance co-payment applies — which
is precisely why it looked right. Publishing it would have understated your
helper's hospitalisation cover **fourfold**, in the answer families read to find
out what they are protected against.

Nothing here reflects badly on your answers; regulated minimums are exactly the
kind of detail that goes stale in everyone's notes. It is written down because
these two are **the only published figures on your site that we verified against
a source instead of taking from you**, and a reader deserves to know which is
which. If MOM revises either minimum, that FAQ answer is wrong the day it
changes — tell us, or we will re-check it at your next content review.

**One rule that came with them, and is not currently at risk.** MOM: *"You
cannot pass on the cost of purchasing the insurance to your helper."* Nothing on
the site suggests otherwise. It is recorded because your `/pricing` page states,
correctly, that the **loan and placement fee** are advanced by you and recovered
from the helper — and the insurance sits a few centimetres away in the package
you bear. The two must never be described in the same breath.
