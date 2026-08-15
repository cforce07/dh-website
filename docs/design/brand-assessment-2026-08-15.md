# DirectHired — Brand System Assessment

**Date:** 2026-08-15
**Reviewed:** live build at `https://didceb5na1cjo.cloudfront.net`, branch `main`
**Scope:** brand system only — identity, mark usage, palette meaning, type voice, iconography, motion, art direction.
**Explicitly out of scope:** layout, spacing rhythm, component composition, responsive behaviour, accessibility mechanics. A separate page-level design audit covers those. Where this document touches a layout file it is only because a *brand* decision lives there.

**Nothing in the repository was modified. No commits were made.** Every item below is a proposal with a location.

---

## Verdict

**There is a well-executed website here, and a brand waiting to be let into it.**

The build is disciplined, honest, and better-reasoned than most agency sites in this category. But the identity that exists — a wordmark whose "H" is two people joined at the arms, and a tagline that states the company's promise in five words — has been **sampled rather than deployed**. The site borrowed two hex values from the logo and left the logo itself outside.

Three findings drive everything below:

1. **The logo never appears on the site.** Not in the header, not in the footer, not in the mobile panel, not as the favicon, not as the social card. `logo/logo.png` is referenced exactly once in the codebase — inside a *code comment* (`src/sections/TwoSidedMatch.astro:7`).
2. **The brand's own teal `#00a4a6` is present only as hairlines.** Across the entire homepage its total rendered area is one ~14px square plus five rules between 1.5px and 2px wide. The colour a visitor actually reads as "DirectHired teal" is `#046A6C`, a different colour chosen for contrast compliance.
3. **The site's dominant recurring gesture is a divider, where the logo's gesture is a connector.** The hero splits family from helper with a teal seam (`src/sections/Hero.astro:112`). Block 07 places two vertical rules either side of a gap. The mark says *joined*; the page says *two columns*.

None of this requires a redesign. The corrections are small, and most are additive.

---

## 1. Is the logo working here, or merely present?

**It is not even present.** This is the single largest gap in the system.

### What is actually in the header

`src/components/Header.astro:27-30`:

```astro
<a class="logo" href="/" aria-label={`${company.name} home`}>
  <span class="logo-mark" aria-hidden="true"></span>
  {company.name}
</a>
```

The "logo" is two things, neither of them the logo:

- `.logo-mark` (`src/components/Header.astro:85-91`) — a `0.6em` rounded **square** filled with `--color-brand-teal`. It is not derived from the mark. It is a generic placeholder glyph.
- `{company.name}` — the string `"DirectHired"` typeset live in `--font-display`, i.e. **Fraunces, a serif** (`src/components/Header.astro:77`, `src/styles/tokens.css:106`).

The real wordmark is a **geometric sans** with circular bowls. Setting it in a serif does not approximate the logo — it contradicts it. A visitor who has seen DirectHired's Facebook page, name card, or WhatsApp display picture and then lands here sees a different company's typography.

### Three inconsistent lockups

The wordmark is re-typeset independently in three places, and they do not agree with each other:

| Location | Line | Treatment |
|---|---|---|
| Header | `src/components/Header.astro:73-91` | teal square + Fraunces, `--size-h3`, weight 500 |
| Footer | `src/components/Footer.astro:38`, styles `:124-128` | Fraunces, `--size-h3`, **no mark at all** |
| Mobile nav panel | `src/components/MobileNav.astro:53`, styles `:245-249` | Fraunces, `--size-h3`, **no mark at all** |

So the mark appears on one surface out of three, and it is the wrong mark on that one.

### The favicon is the Astro framework's logo

`src/layouts/BaseLayout.astro:34-35` points at `public/favicon.svg` and `public/favicon.ico`. `public/favicon.svg` is the **unmodified Astro starter favicon** — its path data is Astro's own mark, and `git log --diff-filter=A` shows both files entered the repository in commit `2a5e4ea "chore: scaffold Astro project with vitest harness"`. They were never replaced.

The browser tab of a licensed Singapore employment agency currently displays the logo of a JavaScript framework. This is the most visible unforced brand error on the site, and the logo already contains a mark that is *ideal* for a favicon.

### There is no vector master

`logo/` contains exactly one file: `logo.png` (8335×2318 raster). **There is no `.svg`, `.ai`, `.eps`, or `.pdf` anywhere in the repository.**

This is a genuine system gap, not a build oversight. Without vector artwork you cannot cut a clean favicon, cannot produce a print-ready name card, cannot render the mark crisply at 16px, and cannot reliably reproduce the logo at any size the client has not already exported. Every recommendation in Section 8 below assumes a vector master is obtained first.

**→ See System Gaps S1, S2, S3 and Expression Gaps E1, E2.**

---

## 2. Does block 07 land as a brand moment?

**The register shift lands. The logo translation does not.**

### What works

`src/sections/TwoSidedMatch.astro` is doing real things right, and they should be protected:

- It is one of only two surfaces using `--color-deep` (`:71`, and `src/components/Footer.astro:107`), so the palette shift genuinely reads as *arrival* rather than decoration.
- It shows the idea as composition instead of explaining it in prose. There is no paragraph between the two lists.
- "Happy Employer. Happy Helper." appears **once on the whole page**, here, as the section's `<h2>` (`:42`). Resisting the urge to repeat it on every block was the right call.
- The resolving line — "Better matching happens when both sides are understood." — lands only after both columns have been read.

### Why the metaphor does not read

I looked at this section on the live site as a first-time visitor would, with no access to the code comments. **The "H" is not perceivable.** Here is what is actually rendered, and why each piece fails:

| Logo element | Rendered as | Problem |
|---|---|---|
| Two heads (dots) | `.side-mark`, two 10px circles (`:99-105`) | They sit at the **top-left of each text column**, roughly 400px from the vertical rules. Nothing connects a dot to an upright. They read as decorative bullets. |
| Two bodies (uprights) | `border-right` on `.side:first-child` and `border-left` on `.side:last-child` (`:153-161`) | Both rules sit on the **inner** edges, hugging the central gutter. The logo's uprights are the *outer* strokes of the H. As drawn, the structure is `] [`, not `H`. |
| The crossbar (arms meeting) | `.bridge::before`, a 2px rule (`:168-177`) | It spans only the ~32px middle grid column (`grid-template-columns: 1fr var(--space-8) 1fr`, `:140`) and **does not touch either vertical**. |

That last row is the decisive failure. The crossbar is the entire meaning of the mark — it is the moment the two figures are *joined*. On the live page it is a short floating dash suspended in a gap, connecting nothing. The one gesture that must touch is the one that does not.

There is a second dilution: the identical short teal dash is used as a generic decorative eyebrow rule in `src/components/SectionHeader.astro:53-59` and `src/sections/FinalCta.astro:55`. By the time a visitor reaches block 07, that dash has already appeared as ordinary section furniture several times. It cannot carry symbolic weight on its ninth appearance.

Finally, block 07's teal is `--color-accent-on-deep` (`#3FC9CB`, `src/styles/tokens.css:56`) — a *fourth* teal. Correct for contrast on the dark ground, but it means the brand's signature moment does not use the brand's colour.

**Honest answer to the question as posed: the metaphor lives only in the code comments.** The 26-line header comment at `src/sections/TwoSidedMatch.astro:2-32` is a more legible expression of the brand idea than the section it documents.

**→ See Expression Gap E3 for the specific fix.**

### One incidental note

`src/sections/TwoSidedMatch.astro:136` opens the two-column composition at `@media (min-width: 64em)`, while `--bp-desktop` is `96em` (`src/styles/tokens.css:155`) and the file's own header comment (`:12`) says the columns render "from `--bp-desktop` up." The comment and the code disagree. This is a page-level concern and I flag it only because the crossbar's visibility depends on it — I am not proposing the layout fix here.

---

## 3. The tagline is absent

**Confirmed:** `"Make It Easier For You"` appears **zero times** across `src/` and `public/`.

**Verdict: it is a loss, but the current omission is the least-bad of the available mistakes — and it should be placed deliberately, in exactly one location.**

Why it matters: the site currently states what DirectHired *does* ("Find the Right Helper for Your Family") and how it *behaves* ("Happy Employer. Happy Helper."). The tagline is the only line that states what the company *promises the customer feels*. For a category where the dominant customer emotion is dread of a complicated, opaque, bureaucratic process, "Make It Easier For You" is not filler — it is the positioning. It also happens to be the one brand asset the client already owns and has presumably used on name cards and vehicle decals.

Why placing it badly would be worse: it is a soft, generic-sounding line in isolation. Put it under the `<h1>` and it competes with a lede that is already doing better work. Put it on every section and it becomes wallpaper. Put it in the header next to the wordmark and it clutters a nav bar that (per the existing measurement notes at `src/styles/tokens.css:155-182`) is already fighting for horizontal space.

**Recommendation — place it once, in the footer, locked up with the mark.**

- **What:** Add the tagline as a locked-up line beneath the footer wordmark, in the same typographic relationship the printed logo uses (letterspaced, lighter weight, smaller, aligned to the wordmark's left edge).
- **Why:** The footer is where a visitor arrives having already read the offer — the tagline reads as a signature rather than a claim. It is also the only surface on the site whose job is *identity* rather than *conversion*, and it is already on `--color-deep`, so the line gets a quiet, premium ground.
- **Where:** `src/components/Footer.astro:38`, immediately after `<p class="footer-logo">{company.name}</p>`. Style it alongside `.footer-logo` at `src/components/Footer.astro:124-128`.

Suggested treatment (values, not code to apply):
`font-family: var(--font-text)` · `font-size: var(--size-small)` · `letter-spacing: var(--tracking-wide)` · `text-transform: none` · `color: var(--color-on-deep-muted)` · `margin-top: calc(var(--space-2) * -1)` to tighten the lockup.

**Do not** also add it to the hero, the header, or the final CTA. One appearance is what makes it a signature.

**→ See System Gap S4.**

---

## 4. Does the palette read as a brand or as a constraint solution?

**Honestly: as a constraint solution wearing brand colours.** The reasoning in `docs/design/palette-proposal.md` is sound and the arithmetic is right. The *outcome* is that the brand colour lost.

### The evidence

Every use of `--color-brand-teal` (`#00a4a6` — the actual logo colour) in the entire codebase:

| File:line | What it renders |
|---|---|
| `src/components/Header.astro:90` | a `0.6em` (~14px) rounded square |
| `src/components/SectionHeader.astro:58` | a **2px**-tall, 24px-wide eyebrow rule |
| `src/sections/FinalCta.astro:55` | the same short rule |
| `src/sections/Hero.astro:112` | a **2px** seam between two images |
| `src/sections/Process.astro:74`, `:84` | a **1.5px** border |

That is the complete list. **The brand's own colour exists on this website exclusively as hairlines and one small square.** Meanwhile `--color-accent` (`#046A6C`) fills every button on every surface, and `--color-deep` (`#0E3A3B`) fills two entire full-bleed sections.

So the colour a visitor's eye records as "this company's teal" is `#046A6C` — a colour that appears nowhere in the client's logo, name card, or shopfront. The system is internally consistent and externally divergent from the brand it derives from.

Compounding it: there are now **four** teals in play — `#00a4a6`, `#046A6C`, `#005F61`, `#3FC9CB`. Four values of one hue, none clearly dominant, is how a palette stops reading as a decision and starts reading as a spreadsheet.

### What would fix it without breaking AA

The constraint is real and must be respected: `#00a4a6` measures 2.89:1 on `--color-surface` and cannot carry text or be a button fill. **But nothing requires the brand teal to be small.** The accessibility rule limits *what* it can do, not *how much of it* there is.

**Fix 4a — Let the brand teal own area, not lines.**
- **What:** Introduce a tinted surface token derived from `#00a4a6` and use it as a section ground behind charcoal text. A wash at roughly 8–12% teal over `--color-surface` gives a warm pale teal that is unmistakably the brand hue, while `--color-ink` (`#2A2724`) sitting on it still clears AA with enormous margin.
- **Why:** This is the standard, correct resolution for a low-contrast brand colour: *demote it from foreground to ground.* A full-width pale-teal section reads as "brand colour" far more strongly than fifty hairlines do, and it introduces no contrast risk because no text is ever set *in* the teal.
- **Where:** Add `--color-surface-teal` next to `--color-surface-raised` at `src/styles/tokens.css:38`. Apply it as the section background on one or two alternating blocks — `src/sections/Process.astro` (`.process`) and `src/sections/Services.astro` are the natural candidates, since both currently sit on bare `--color-surface` and the page's only ground changes today are the two `--color-deep` blocks.
- **Verify:** assert the new token's contrast against `--color-ink` in `tests/tokens.test.ts`, matching the existing pattern.

**Fix 4b — Make the brand teal a large graphic field somewhere it can be large.**
- **What:** The hero's teal is currently a 2px seam. Replace the *seam* concept with a teal graphic field — see Expression Gap E4.
- **Why:** Same principle. Graphic-only means it cannot be text; it does not mean it must be thin.
- **Where:** `src/sections/Hero.astro:108-116`.

**Fix 4c — Retire one teal.**
- **What:** `--color-accent-hover` (`#005F61`, `src/styles/tokens.css:40`) is close enough to `--color-accent` (`#046A6C`) that the hover step reads as a rendering artefact rather than a state change, while adding a fourth value to the ramp.
- **Why:** Three teals with clear jobs (brand ground, interactive, on-dark) is a palette. Four is an accident.
- **Where:** `src/styles/tokens.css:40`. Either widen the gap so the hover is legibly darker, or drop the token and express hover through another channel.

**What NOT to do:** do not "restore" `#00a4a6` to buttons or text. The warning comment at `src/styles/tokens.css:42-51` is correct and should stay exactly as written.

---

## 5. Typography as identity

**Fraunces + Figtree are tasteful defaults, not yet DirectHired's voice — and the specific reason is measurable.**

The pairing is genuinely well chosen. Fraunces buys the "premium family" register and is the strongest single defence against looking like a job board. Figtree's geometric humanist construction genuinely does harmonise with the wordmark. Both are self-hosted as variable WOFF2 (`src/styles/tokens.css:15-29`). None of that should change.

But the case made for Fraunces in `docs/design/palette-proposal.md:65` was specifically this:

> A variable serif with `SOFT` and `WONK` axes, so its warmth is tunable rather than fixed. Set low-to-moderate on both, it reads editorial and premium without becoming decorative.

**That tuning was never performed.** `font-variation-settings` appears **nowhere** in `src/`. Fraunces is running at its default axis positions on every heading. The entire justification for choosing this face over any other premium serif — that it can be *dialled to DirectHired's specific warmth* — is unexercised. What ships is stock Fraunces, which is exactly the "hundred other premium sites" concern.

This is the cheapest high-leverage brand fix available, and it is a one-line change.

**Fix 5a — Actually tune the display face.**
- **What:** Set `font-variation-settings` on headings, dialling `SOFT` up (warmth, softened terminals — the humane register this brand needs) and `WONK` down or off (keeps it trustworthy rather than quirky, which matters for an agency handling immigration paperwork). `opsz` should also be set so large headings pick up the display optical size rather than the text default.
- **Why:** This is the difference between "a nice serif" and "DirectHired's serif." Two agencies using Fraunces at different axis settings do not look alike. Two using it at defaults do.
- **Where:** `src/styles/global.css:33-37`, on the `h1,h2,h3,h4,h5,h6` rule. Suggested starting point to art-direct against: `font-variation-settings: 'SOFT' 40, 'WONK' 0, 'opsz' 96;` — treat these as a first position to review on screen, not a final value.
- **Caution:** confirm the shipped `public/fonts/fraunces-variable.woff2` subset retains the `SOFT`, `WONK`, and `opsz` axes. If the subsetting stripped them, that is the actual blocker and must be fixed first.

**Fix 5b — Give the wordmark its own type role.**
- **What:** Currently the wordmark is styled as "Fraunces at `--size-h3`" in three places, which is the same treatment an `<h3>` gets. A brand wordmark should not share a token with body headings.
- **Why:** As long as the wordmark is just another heading, it will drift every time heading styles change, and it will never read as a mark.
- **Where:** This becomes moot if the real logo is adopted (Expression Gap E1), which is the preferred path. If for any reason the typeset fallback must persist, define a dedicated `--size-wordmark` and tracking in `src/styles/tokens.css` rather than reusing `--size-h3` at `src/components/Header.astro:78`, `src/components/Footer.astro:126`, `src/components/MobileNav.astro:247`.

---

## 6. What is missing from the system entirely

### Iconography — half-built, and it matters

There are exactly **six** icons on the whole site:

- Three in `src/sections/Problem.astro:41-60` — 28×28 viewBox, `stroke-width: 1.6`, `fill: none`, `currentColor`, coloured `--color-accent` at `:89-92`.
- Two social glyphs in `src/components/Footer.astro`.
- One hamburger in `src/components/MobileNav.astro`.

A consistent language is *implied* by the Problem trio — 28px box, 1.6 stroke, rounded joins, one filled dot as an accent — but it is never named, never documented, and never used again. `Services`, `Process`, `Difference`, `HelperSources`, and `TrustBar` all have no icons at all.

**This matters, and here is the specific reason it matters for this brand:** the first Problem icon (`:42-46`) is *two overlapping circles, one of them dashed* — "not the right fit." That is, entirely by accident, the most brand-native drawing on the site: two parties, imperfectly registered. The iconography language and the logo want the same vocabulary — **two forms in relationship** — and nobody connected them.

**Fix 6a — Name the icon system and root it in the mark.**
- **What:** Document the rule (28×28, 1.6 stroke, `currentColor`, rounded caps/joins, max one filled element per icon) and derive the icon grammar from the logo's own primitives: a **circle** (a person) and a **connecting stroke** (the relationship). Every icon should be expressible as some arrangement of those two.
- **Why:** It turns an accidental style into an ownable one, and it makes the mark generative rather than decorative — which is the difference between a logo and an identity.
- **Where:** New `docs/design/iconography.md`; the existing implementation to standardise against is `src/sections/Problem.astro:41-60`.

### Motion signature — absent, and that is *nearly* fine

There are six transitions site-wide (`src/components/Button.astro:42`, `src/components/Card.astro:32`, `src/components/Footer.astro:204`, `src/components/Header.astro:112`, `src/components/MobileNav.astro:176`, `src/sections/Faq.astro:142`). All are hover/state micro-transitions. There is no entrance motion, no scroll behaviour, no signature gesture. `--duration-base` is used three times.

**Verdict: leave this alone, with one exception.** For a trust-led agency serving anxious customers on mid-range Android phones over Singapore mobile data, restraint is correct and premium. Scroll-reveal animation would actively cheapen this brand. The `prefers-reduced-motion` block (`src/styles/tokens.css:210-217`) is exemplary.

The one exception is Expression Gap E3 — if block 07's crossbar is fixed, a single slow draw-in of that one line, and nothing else on the site, would make it the page's only motion moment and therefore genuinely memorable. That is a *signature*, which is different from *animation*. It is optional.

### Photographic art direction — missing, and blocking

Covered in full in Section 7.

### Also missing (lower priority, named so they are not forgotten)

- **Social share image (`og:image`).** Already correctly tracked in `docs/INFORMATION-REQUIRED-BEFORE-PRODUCTION.md`, and the reasoning at `src/layouts/BaseLayout.astro:43-64` for shipping `summary` instead of an empty `summary_large_image` is right. Flagging only because WhatsApp is this business's live conversion channel, so this is the highest-value single image the client will ever commission.
- **`theme-color` meta tag.** Absent from `src/layouts/BaseLayout.astro:30-66`. On Android Chrome this tints the browser UI — a free, high-visibility brand surface. Should be `--color-deep` (`#0E3A3B`), not the teal.
- **No brand guidelines artefact.** `docs/design/palette-proposal.md` covers colour and type only, and says so explicitly at `:73-75`. There is no document a future designer, printer, or social media contractor could be handed.

### Fine to leave absent

- **Illustration language.** The hero SVGs are explicitly temporary and will be replaced by photography. Building an illustration system that is about to be deleted would be waste. Do not commission one.
- **Sound, 3D, custom cursor, dark mode.** None belong here. `color-scheme: light` (`src/styles/global.css:19`) is a correct, deliberate decision.

---

## 7. Photography direction

> **I could not generate images.** No image-generation tool is available in this environment. Everything in this section is written direction, precise enough to hand to a photographer as a shot brief. **No images were produced and none are claimed.**

### What is there now, and why it must go

`src/assets/hero-family.svg` and `src/assets/hero-helper.svg` render as **solid near-black (`#2A2724`) faceless silhouettes**: on the left, two adult forms with a smaller teal form between them; on the right, a single dark figure alone. They are separated by a 2px teal seam.

The intent — abstract rather than fake people, honouring the brief's §55 prohibition on presenting placeholder people as real DirectHired helpers — was exactly right, and the restraint deserves credit.

But read as images, they do not say what the brand means. The family is a group; the helper is alone. Both are faceless dark shapes. And the composition's organising element is a **line down the middle that divides them**. For a company whose entire proposition is that both sides must work, the hero currently draws a border between them.

There is also an unexplained artefact: a 6px teal dot floats on each figure's torso (`hero-family.svg` last line, `hero-helper.svg` last line). It reads as a pin or badge and has no stated meaning.

### The single controlling idea for the shoot

**One story, one light, one room. Not two subjects photographed separately and placed side by side.**

The logo's H is two figures sharing a crossbar. The photography's job is the same: it must be visually evident that the family and the helper occupy the **same space, same light, same moment**. Everything below follows from that.

### Shot list

**Priority 1 — Hero (one frame, landscape, ~4:5 or 3:2 crop-tolerant)**
- A helper and a family member in a genuinely shared, unremarkable domestic activity: preparing food at the same counter; folding laundry from the same basket; one holding a door while the other carries something through. **Both hands visible and both engaged in the same task.**
- Framed at mid-distance — not a portrait, not a wide room shot. Close enough to read posture and hands, far enough that the home is legible.
- **Both people at the same scale, on the same plane, both in focus.** Neither one soft-focus in the background. This is the entire brief in one sentence.
- Natural light from a window, HDB or condo interior, mid-morning. Warm, not golden-hour cinematic.
- The seam must go: the hero image should be **one frame**, not two panels.

**Priority 2 — Process / trust (3–5 frames)**
- Hands on a document at a desk, shallow depth, no faces. Paperwork made calm.
- A real DirectHired consultation in progress, shot from behind or side-on, faces not required.
- The office: a real corner of it, at working temperature. Not empty, not staged, not wide-angle.
- A helper alone doing something skilled and self-directed — cooking, tending a plant, reading. **Composed with the same care and the same light as the family images.** This is the dignity test: if the helper's solo frame looks like documentation while the family's frame looks like a lifestyle shot, the brand has failed its own promise.

**Priority 3 — Texture (2–3 frames, non-figurative)**
- Details that carry warmth without people: a kettle, a folded stack of linen, a doorway with light across it, a shared table. These give the site somewhere to breathe without demanding a person in every frame, and they are the safest images to ship before releases are cleared.

### Framing and treatment

- **Eye level.** Never shoot a helper from above — a high camera angle diminishes a subject, and here it would encode exactly the hierarchy this brand exists to reject. Never shoot a family from below.
- **Faces are allowed to be partial or turned.** A hand, a shoulder, a three-quarter turn often reads more honest than a direct-to-camera smile, and it eases consent and release logistics.
- **Warm neutral grade.** Match the site ground (`#FAF8F5`): slightly warm whites, retained shadow detail, no crushed blacks, no teal-and-orange grade. The photography should sit *inside* the palette, not fight it.
- **Do not tint the photography teal.** The brand colour belongs to the graphic system, not the images.
- **Real homes.** Singapore HDB and condo interiors, lived-in. Visible ordinary objects. A show-flat reads as a lie to a Singaporean audience instantly.

### Forbidden — verbatim for the photographer's brief

- No uniformed helper standing beside a seated family. This is the single most common image in this category and it encodes servitude. **Never.**
- No helper in the background of a family portrait.
- No one carrying luggage, opening a car door, or being handed anything by an employer.
- No arms-folded-in-front-of-office group shots.
- No handshake-over-desk, no clipboard-and-thumbs-up, no piggyback-in-a-park.
- No pure-white cyclorama backgrounds. No lens flare. No motion blur for "energy."
- No stock. If it could be bought, it will look bought.
- **No image may be captioned, credited, or implied to depict actual DirectHired staff, helpers, or clients unless it does and a signed release exists.** Per brief §55 this is non-negotiable, and it applies to `alt` text as much as to visible captions.

### Consent and dignity requirements

- Written releases from every identifiable person, in a language they read fluently, obtained **before** the shoot and not on the day under time pressure.
- Helpers are paid for their time on the shoot at no less than their normal rate.
- Anyone may decline or withdraw without consequence to a placement, and they are told so explicitly.
- Do not name a helper's country of origin in a caption next to her photograph. The `HelperSources` block (`src/sections/HelperSources.astro`) handles nationality as information; pairing a face with a nationality label turns a person into a category.

### Where these land in the code

- Hero: replace both `<Image>` sources at `src/sections/Hero.astro:39-58`. Per the file's own header comment (`:8-11`), width/height are fixed independently of the source, so nothing else in that section needs to change. **Also remove the two-panel split** — see Expression Gap E4.
- Delete `src/assets/hero-family.svg` and `src/assets/hero-helper.svg` once replaced.
- OG image: add `og:image` and switch `twitter:card` back to `summary_large_image` at `src/layouts/BaseLayout.astro:65`, per the instructions already written at `:60-63`.
- Update `docs/INFORMATION-REQUIRED-BEFORE-PRODUCTION.md` Category C when the assets land.

---

## System gaps — things missing from the brand that should exist

**S1 — There is no vector master of the logo.** *(Blocking — do this first)*
`logo/` contains only `logo.png`. Request `.svg` (preferred), `.ai`, or `.eps` from DirectHired or the original designer. Without it, S2, S3, and E1 cannot be done properly. Store at `logo/logo.svg` and add a mark-only variant `logo/mark.svg` (the H figures alone, no wordmark).

**S2 — There is no favicon.** *(High)*
`public/favicon.svg` and `public/favicon.ico` are the stock Astro starter assets (entered in commit `2a5e4ea`). Replace both with the **H mark alone** — the two joined figures — extracted from the vector master. Do not redraw it by hand; extract it, so it matches the printed logo exactly. Teal figures on transparent for the SVG; teal on `#FAF8F5` for the `.ico` so it survives light and dark tab bars. Referenced at `src/layouts/BaseLayout.astro:34-35`.

**S3 — There is no mark-only lockup defined.** *(High)*
The brand needs the H usable independently of the wordmark — for the favicon, the app icon, the WhatsApp display picture, and as a repeatable graphic device. Define it and its clear-space rule as part of S1's deliverable.

**S4 — The tagline is not placed anywhere.** *(Medium)*
Place once, in the footer lockup. Full rationale and treatment in Section 3. Location: `src/components/Footer.astro:38`.

**S5 — There is no icon system.** *(Medium)*
Six icons exist, one consistent style is implied, nothing is documented and five sections have none. Root the grammar in the logo's primitives (circle = person, stroke = relationship). New `docs/design/iconography.md`; standardise against `src/sections/Problem.astro:41-60`.

**S6 — There is no photographic art direction.** *(High — blocking launch)*
Section 7 above is the brief. Hand it to the photographer before booking.

**S7 — There is no `theme-color`.** *(Low, one line)*
Add `<meta name="theme-color" content="#0E3A3B">` to `src/layouts/BaseLayout.astro` head (near `:34`). Use `--color-deep`, not the teal.

**S8 — There is no brand guidelines document.** *(Low, but compounding)*
`docs/design/palette-proposal.md` deliberately covers only colour and type (`:73-75`). Everything else — mark usage, clear space, minimum sizes, tagline placement, icon rules, photography rules, what never to do — lives nowhere. The first external contractor the client hires will invent their own answers.

---

## Expression gaps — things that exist but are not doing enough work

**E1 — The real logo is not used on any surface.** *(Highest priority)*
- **What:** Replace the typeset-serif-plus-square wordmark with the actual logo artwork on all three surfaces.
- **Why:** The site currently presents a different visual identity from the one on the client's cards, vehicles, and social profiles. Everything else in this document is secondary to this.
- **Where:**
  - `src/components/Header.astro:27-30` — swap `<span class="logo-mark">` + `{company.name}` for the SVG wordmark; delete the `.logo-mark` rule at `:85-91`; keep the existing `aria-label`.
  - `src/components/Footer.astro:38` — replace `<p class="footer-logo">{company.name}</p>` with the reversed/knockout logo variant (it sits on `--color-deep`).
  - `src/components/MobileNav.astro:53` — replace `<span class="panel-brand">{company.name}</span>`.
- **Note:** requires S1. Ship the logo as inline SVG (not `<img>`) so the header does not incur an extra request and the mark can inherit `currentColor` where useful.

**E2 — The header mark is a generic square where the brand has a real symbol.** *(High)*
- **What:** The `0.6em` rounded square at `src/components/Header.astro:85-91` is placeholder geometry. Even if the full logo swap (E1) is deferred, this specific element should become the H mark.
- **Why:** It occupies the single most-seen brand position on the site — sticky, top-left, on every scroll position of every page — and it currently says nothing.
- **Where:** `src/components/Header.astro:85-91`.

**E3 — Block 07's crossbar does not touch anything.** *(High — this is what turns 07 into a brand moment)*
- **What:** Three changes, all inside `src/sections/TwoSidedMatch.astro`:
  1. **Make the crossbar connect.** `.bridge::before` (`:168-177`) currently spans only the `var(--space-8)` middle column. Extend it so it visibly meets both vertical rules — negative inline margins, or move the crossbar to a full-width absolutely-positioned element behind the composition. A crossbar that does not touch is not a crossbar.
  2. **Attach the heads to the uprights.** `.side-mark` (`:99-105`) sits at each column's top-left, hundreds of pixels from the vertical. Move each dot to sit **directly on top of its own upright** so that dot-plus-vertical reads as one figure. Increase from 10px so it is legible as a head rather than a bullet.
  3. **Move the uprights outward.** The rules currently sit on the inner edges (`:153-161`), producing `] [`. Placing them on the outer edges of each column produces the H the comment describes.
- **Why:** These three changes are the difference between a metaphor that exists in a code comment and one a visitor perceives. Individually none is large; together they are the section's whole reason for existing.
- **Optional:** once the crossbar connects, a single slow draw-in on scroll — the only motion on the entire site — makes it the page's one memorable gesture. Must respect the existing `prefers-reduced-motion` block.

**E4 — The hero's teal seam divides where the brand joins.** *(Medium-high)*
- **What:** `src/sections/Hero.astro:108-116` builds the hero visual as two panels with `gap: 2px` and `background: var(--color-brand-teal)` showing through as a seam.
- **Why:** The organising graphic gesture of the page's most-viewed element is a **line separating family from helper**. It is the precise opposite of the mark's meaning, and it will persist after the photography swap unless it is deliberately removed — the comment at `:101-107` explains why the seam is *accessible*, but not why it is *right*.
- **Where:** Replace with a **single frame** (one photograph, one story — see Section 7) and let the brand teal appear as a supporting field or ground rather than a dividing rule. This pairs with Fix 4b.

**E5 — The brand teal is present only as hairlines.** *(Medium)*
- **What:** Give `#00a4a6` area rather than line weight, via a tinted surface token.
- **Why / Where:** Full detail in Fix 4a. Token at `src/styles/tokens.css:38`; apply as section ground in `src/sections/Process.astro` and/or `src/sections/Services.astro`.

**E6 — Fraunces is running at default axis settings.** *(Medium — cheapest high-leverage fix on this list)*
- **What / Why / Where:** Full detail in Fix 5a. `src/styles/global.css:33-37`. Verify axes survived subsetting first.

**E7 — The signature dash is spent on generic furniture.** *(Low-medium)*
- **What:** The short teal rule at `src/components/SectionHeader.astro:53-59` and `src/sections/FinalCta.astro:55` is the same shape as block 07's crossbar. Using it as routine section decoration spends the gesture before it means anything.
- **Why:** A brand device only carries weight if it is rationed.
- **Where:** Either differentiate the eyebrow rule (different weight, length, or colour) at `src/components/SectionHeader.astro:53-59`, or accept it as neutral furniture and make block 07's crossbar visually distinct in weight and scale so it cannot be mistaken for the same element.

**E8 — Three wordmark lockups disagree with each other.** *(Low — resolved by E1)*
Header has a mark, footer and mobile panel do not; all three re-typeset independently. Resolved automatically if E1 is done. If E1 is deferred, at minimum make all three consistent: `src/components/Header.astro:73-91`, `src/components/Footer.astro:124-128`, `src/components/MobileNav.astro:245-249`.

---

## Leave alone — already right, do not "improve" these

Named explicitly so a future contributor does not undo them.

1. **`--color-brand-teal`'s graphic-only constraint and its warning comment** (`src/styles/tokens.css:42-52`). The reasoning is correct and the comment is doing real defensive work. Give the colour more *area*; never give it text or button fills.

2. **`#046A6C` as the interactive accent.** The contrast analysis in `docs/design/palette-proposal.md:34-41` is sound. My criticism in Section 4 is about the brand colour's *absence*, not about this token's existence. Keep it.

3. **"Happy Employer. Happy Helper." appearing exactly once.** `src/sections/TwoSidedMatch.astro:42`. Do not repeat it in the hero, the footer, or the final CTA. Its scarcity is what gives it force.

4. **`--color-deep` used on only two surfaces.** `src/sections/TwoSidedMatch.astro:71` and `src/components/Footer.astro:107`. The register shift works *because* it is rare. Do not add a third deep section.

5. **The restrained motion system.** Six hover transitions, no scroll animation. Correct for a trust-led brand on mid-range mobile. Do not add reveal animations.

6. **The `prefers-reduced-motion` implementation.** `src/styles/tokens.css:210-217` and `src/styles/global.css:84-91`.

7. **Empty sections rendering as nothing.** `src/sections/MeetHelpers.astro` and `src/sections/Reviews.astro` render no shell, no skeleton, no "coming soon" when their collections are empty. This is a *brand* decision as much as a technical one — an agency that invents testimonials has no trust proposition. Do not add placeholders.

8. **`twitter:card="summary"` instead of an empty `summary_large_image`.** `src/layouts/BaseLayout.astro:43-65`. Correct until a real approved image exists.

9. **Restrained radii and warm-tinted shadows.** `src/styles/tokens.css:187` and `:199-200`. Shadows tinted off `--color-ink` rather than pure black is exactly the right instinct for "premium family."

10. **The warm off-white ground `#FAF8F5` over pure white**, and `--color-ink` `#2A2724` over `#000`. `src/styles/tokens.css:35-37`. This is quietly doing more brand work than anything else in the token file.

11. **Self-hosted variable fonts with no CDN request.** `src/styles/tokens.css:15-29` and the preload at `src/layouts/BaseLayout.astro:33`.

12. **The `<h2>`/`<p>` heading structure in block 07.** `src/sections/TwoSidedMatch.astro:42` and `:64`. The resolving line is deliberately a large `<p>`, not a second heading. Keep it.

---

## Suggested sequence

| Order | Item | Blocked by | Effort |
|---|---|---|---|
| 1 | **S1** — obtain vector logo master | client | client-side |
| 2 | **S2** — real favicon | S1 | small |
| 3 | **E1 / E2** — put the logo on the site | S1 | small |
| 4 | **E6** — tune Fraunces axes | — | one line |
| 5 | **S6** — issue photography brief | — | send Section 7 |
| 6 | **E3** — make block 07's H actually read | — | medium |
| 7 | **E5 / Fix 4a** — brand teal as ground | — | small |
| 8 | **S4** — place the tagline | S1 | small |
| 9 | **E4** — single-frame hero | photography | medium |
| 10 | **S5, S7, S8** — icons, theme-color, guidelines | — | varies |

Items 2, 3, and 4 together would close most of the gap between "well-styled site" and "branded site," and none of them is a large piece of work.

---

## Note on visuals

**No images were generated for this assessment.** No image-generation capability was available in this environment. I did not produce a brand board, a photography moodboard, or an iconography sketch, and I am not claiming any.

What exists instead: Section 7 is written to function directly as a photographer's brief, and Section 6 specifies the iconography grammar in enough detail for an illustrator to work from. If visual direction boards are wanted, they should be commissioned separately — and per S1, the vector logo master should be in hand first, since every board would need to be rebuilt around it otherwise.
