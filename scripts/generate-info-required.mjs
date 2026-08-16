#!/usr/bin/env node
/**
 * Generates docs/INFORMATION-REQUIRED-BEFORE-PRODUCTION.md — the master
 * brief §79 checklist of real-world information DirectHired must supply
 * before launch. Hand-maintaining that file drifts out of date the moment
 * someone forgets to update it after adding or resolving a placeholder, so
 * this script derives the whole thing from the codebase instead.
 *
 * Two categories, sourced and treated differently:
 *
 *   Category A — inline gaps, gated by <Tbd> (src/components/Tbd.astro).
 *   A missing value on a block that still renders. FAILS `npm run build`
 *   (scripts/check-tbd.mjs scans built HTML for `data-tbd` and exits
 *   non-zero on any finding) — publishing a rendered block with a hole in
 *   it is a broken claim. Detected by scanning built HTML under dist/ for
 *   `data-tbd` attributes, using the same two regexes check-tbd.mjs uses
 *   (quoted `data-tbd="..."` and the bare form Astro emits for an empty
 *   string value) and the same recursive directory walk.
 *
 *   Category C — declared inputs, not derivable from the codebase.
 *   Information DirectHired still owes that leaves NO trace to detect:
 *   the code's honest response to not having it was to render nothing at
 *   all (PricingCard omits the without-replacement itemisation entirely;
 *   no page writes replacement terms beyond the one confirmed line) — or,
 *   where something had to render, to render a working placeholder (the
 *   share card is an AI illustration, not DirectHired's approved asset).
 *   Absence of an artefact is exactly what makes these undetectable —
 *   deriving them would require adding cosmetic <Tbd>s to pages purely so
 *   this script could find them, which would trade a correct page for a
 *   broken one. So they are declared in DECLARED_INPUTS below, and the
 *   generated document labels them as declared rather than derived.
 *
 *   Category D — images whose provenance is not `real-photo`, derived from
 *   the image provenance registry (`src/data/images.json`, typed by
 *   `src/data/images.ts`). Images are their own category because the
 *   decision they need is different in kind: A, B and C are missing
 *   *information*, while every entry here is a rendered thing that already
 *   works — an illustration standing in for a photograph, or a slot
 *   deliberately left empty.
 *   Nothing here blocks the build. What the client needs at production is
 *   not "what is missing" but "which pictures are not mine, and where does
 *   each one live", which is why every entry prints its usage sites.
 *
 *   Derived, not declared: the registry is asserted against the codebase by
 *   tests/image-registry.test.ts (every image asset referenced under src/
 *   must appear in it, and no real-photo-only slot may carry AI
 *   provenance), so it cannot quietly fall out of step the way a
 *   hand-written list would.
 *
 *   Without this category the checklist under-reported: design spec §5
 *   names three Category A items (MOM licence number, detailed
 *   replacement terms, without-replacement inclusion list) and only the
 *   first has a live <Tbd>.
 *
 *   Category B — whole-block omissions, gated by an empty collection.
 *   An entire section has no data, so the section is entirely absent from
 *   the page (no shell, no placeholder). Does NOT fail the build — saying
 *   nothing is honest. Detected by finding which src/sections/*.astro
 *   files both call `getCollection('<name>')` and guard their markup on
 *   that collection's `.length` (the same `length\s*[>!]` signature
 *   tests/conditional-blocks.test.ts checks for), then checking whether
 *   `src/content/<name>/` currently has any real entries (ignoring the
 *   `.gitkeep` placeholder that keeps the empty directory tracked in git).
 *
 * Usage:
 *   npm run build:dev && node scripts/generate-info-required.mjs
 *
 * (build:dev, not build — Category A's own source data is the *build
 * output*, and `npm run build` refuses to produce one while any <Tbd> is
 * unresolved. build:dev is the same astro build without that gate. The
 * MOM licence <Tbd> that used to trigger this was resolved on 2026-08-15
 * and `npm run build` succeeds today; the distinction is kept because
 * this script must be runnable whether or not a <Tbd> is outstanding.)
 */
import { readdirSync, readFileSync, statSync, writeFileSync, existsSync } from 'node:fs'
import { join, relative } from 'node:path'

const DIST_DIR = 'dist'
const SECTIONS_DIR = 'src/sections'
const CONTENT_DIR = 'src/content'
const IMAGE_REGISTRY_PATH = 'src/data/images.json'
/**
 * The env override exists for ONE consumer: tests/info-required.test.ts, which
 * regenerates into a temp file and diffs it against the committed document
 * to prove the document is current. Without that test this file's own
 * opening claim — "derived from the codebase and cannot fall out of sync
 * with it" — was false in the ordinary way: the document is only derived at
 * the moment somebody remembers to run this script, and on 2026-08-16 it was
 * found carrying six stale line-number citations from before
 * BaseLayout.astro and config.ts grew. Nothing was wrong except that nobody
 * had re-run it. Writing to a temp path is what lets the test check that
 * without mutating a tracked file.
 */
const OUTPUT_PATH =
  process.env.INFO_REQUIRED_OUT ?? 'docs/INFORMATION-REQUIRED-BEFORE-PRODUCTION.md'

// Same two patterns as scripts/check-tbd.mjs (kept in sync deliberately —
// this script and the build gate must agree on what counts as a gap).
const QUOTED_PATTERN = /data-tbd="([^"]*)"/g
const BARE_PATTERN = /data-tbd(?![-="])/g

/**
 * How many calls to action currently point at the requirement form, and on
 * how many pages.
 *
 * DERIVED, NOT TYPED, because the whole point of the entry it feeds is that
 * this number is the measure of the damage — and a hand-typed count in a
 * client document is exactly the sort of figure that is right on the day it
 * is written and quietly wrong a page later. The URL is read out of
 * `src/data/company.ts` rather than repeated here for the same reason
 * tests/links.test.ts forbids any page from repeating it: there is one
 * definition of that address in this codebase and this is not it.
 *
 * Counted from BUILT HTML, so it counts what a visitor can actually click,
 * including the instances a component contributes to every page.
 */
function requirementFormUsage() {
  // This runs while DECLARED_INPUTS is being built, which is BEFORE
  // findCategoryA's own dist check, so it carries its own.
  if (!existsSync(DIST_DIR)) {
    console.error(
      `\nNo "${DIST_DIR}" directory found. The requirement-form CTA count is read from built\n` +
        'HTML — run "npm run build:dev" first, then re-run this script.\n',
    )
    process.exit(1)
  }

  const companySource = readFileSync('src/data/company.ts', 'utf8')
  const match = companySource.match(/requirementFormUrl:\s*'([^']+)'/)
  if (!match) {
    console.error(
      '\nCould not read `requirementFormUrl` from src/data/company.ts. That constant is the ' +
        'only definition of the requirement-form destination; if it has been renamed or moved, ' +
        'update this function rather than hardcoding the URL here.\n',
    )
    process.exit(1)
  }
  const url = match[1]

  let ctas = 0
  let pages = 0
  for (const file of htmlFiles(DIST_DIR)) {
    const hits = readFileSync(file, 'utf8').split(`href="${url}"`).length - 1
    if (hits > 0) pages++
    ctas += hits
  }
  return { ctas, pages }
}

/**
 * Category C. The ONLY hand-maintained data in this script — everything
 * else is derived. Add an entry here only when the input genuinely leaves
 * no detectable trace in the codebase; if a <Tbd> or an empty collection
 * can represent it, use those instead so it stays derived.
 *
 * `blocks` states what the missing information actually prevents, and
 * `handledBy` states what the site does in the meantime — so a reader can
 * confirm the gap is being handled honestly rather than silently ignored.
 */
const FORM_USAGE = requirementFormUsage()

const DECLARED_INPUTS = [
  // ADDED 2026-08-16 BY TASK 12, AND IT SHOULD HAVE BEEN HERE FROM THE
  // START. This is the single highest-value outstanding input on the
  // project and it was absent from the document named "Information
  // Required Before Production" — tracked only in docs/OPEN-DECISIONS.md,
  // which is the decisions register, not the production checklist.
  //
  // It is undetectable for the usual Category C reason, and the reason is
  // worth stating because it is the opposite of the others: the code is not
  // silent here, it is CONFIDENT. Every CTA renders a real anchor with a
  // real href. Nothing is missing from the markup, no collection is empty,
  // no <Tbd> is marked, and the build is correct. The gap is that the URL
  // the constant holds does not resolve — a fact about the internet, not
  // about this repository, and no scanner over src/ or dist/ can see it.
  //
  // It is listed FIRST because it is the only item here that stops the site
  // doing the thing it exists to do.
  {
    item: 'Production URL for the employer requirement form',
    source: 'Brief §79; core-pages spec §3; docs/OPEN-DECISIONS.md ("Blocks launch")',
    blocks:
      '**every conversion on the site.** `src/data/company.ts` sets ' +
      '`requirementFormUrl` to `https://www.directhired.com/employer-requirement`, ' +
      `which does not resolve. That URL is behind **${FORM_USAGE.ctas} calls to action across ` +
      `all ${FORM_USAGE.pages} built pages** — every "Submit Your Requirements" button in the header, ` +
      'the mobile nav, every hero, every closing block and the fixed mobile bar, plus ' +
      'the 404. Nothing on the site is broken to look at and every page passes every ' +
      'check; the primary conversion path simply ends nowhere. DirectHired confirmed on ' +
      '2026-08-16 that the form stays on their existing separate site, so what is needed ' +
      'is **that site\'s live form URL** — not a form to be built.',
    handledBy:
      'A single constant. `company.requirementFormUrl` is the only definition of the ' +
      'destination anywhere in the codebase — `tests/links.test.ts` asserts that no ' +
      '`.astro` or `.ts` file under `src/` writes the URL as a literal, so repointing it ' +
      `at launch is one edit to one line and all ${FORM_USAGE.ctas} call sites follow. That is the whole ` +
      'of the work. Because the form is hosted elsewhere, this site cannot measure ' +
      'whether anyone arrives at it or finishes it; that consequence is accepted and ' +
      'written up under *Housekeeping* in `docs/OPEN-DECISIONS.md`.',
  },
  // RESOLVED 2026-08-16 — "Detailed replacement terms and conditions"
  // (brief §18 / §79 Reminder 04; design spec §5 Category A). DirectHired
  // supplied them, and they are recorded verbatim in core-pages design
  // spec §2.1: the employer requests a replacement with no justification
  // required; the sole exclusion is a breach of the Employment Act or
  // abuse of the helper; one replacement, within 6 months of the
  // deployment date; the third-party components are re-paid and the agent
  // fee is not; and an outstanding loan balance from the replaced helper
  // is subtracted from what the employer advances for the new one.
  //
  // CONFIRMED COMPLETE 2026-08-16 (spec §2.6.1). DirectHired was asked in
  // docs/OPEN-DECISIONS.md whether those five facts are the WHOLE of their
  // replacement terms — the one thing that could not be inferred from the
  // facts themselves — and answered yes. That is why
  // src/sections/ReplacementTerms.astro's lede now says the terms are stated
  // in full, and it is the only thing supporting that claim. If DirectHired
  // ever adds a term, this entry comes back and that sentence comes out.
  //
  // This entry stated that the confirmed line "1 replacement within 6
  // months" was the only replacement text on the site and that no
  // conditions were stated. Both stopped being true on 2026-08-16, when
  // `src/sections/ReplacementTerms.astro` and two FAQ entries published
  // the full terms. Deleted rather than left in place: a checklist item
  // that describes the site incorrectly is worse than no item, because it
  // is the document a reader trusts to tell them what is still missing.
  //
  // RESOLVED 2026-08-16 — the without-replacement inclusion list, the
  // third of design spec §5's Category A items.
  // DirectHired supplied the breakdown, which also
  // corrected the total from $1,252.10 to $1,140.10. The package is now
  // `itemised` in src/data/pricing.ts and renders its six line items.
  //
  // `TotalOnlyPackage` is deliberately kept in the type union even though
  // nothing uses it: it is what makes an invented itemisation a type error
  // rather than an oversight, and the next package with an unknown
  // breakdown should reach for it rather than guessing.
  //
  // NOT AN ENTRY, and deliberately so: "one distinguishing fact per helper
  // source" (implementation plan D-5, C-62) was going to be added here.
  // DirectHired answered it on 2026-08-16 before it ever landed — there is
  // no real difference between Indonesia, Myanmar and Mizoram. Same
  // service, same package, same matching process; only the source country
  // differs. There is therefore nothing outstanding to declare: the three
  // `summary` fields are gone for good (src/content/config.ts) and
  // HelperSources.astro states the equivalence once instead. Recorded here
  // so nobody re-opens a question that has an answer.
  //
  // NOT resolved as of 2026-08-16, and deliberately not deleted.
  //
  // A share image now ships, so the *mechanism* is done: BaseLayout.astro
  // declares og:image with dimensions and carries twitter:card back up to
  // summary_large_image. But what it ships is an AI-generated illustration,
  // and the input this entry has always asked for is an *approved* card —
  // DirectHired's own asset, with their wordmark on it. Those are not the
  // same thing, and closing the item because a placeholder renders would be
  // exactly the quiet drift the generated checklist exists to prevent.
  //
  // What changed is the consequence, not the status: while nothing shipped,
  // the gap cost the business a blank link preview in WhatsApp. Now it costs
  // an unbranded one. Resolve this only when the file at
  // `src/assets/og-share.png` is replaced by DirectHired's own card.
  {
    item: 'Approved social share image (Open Graph)',
    source: 'Brief §79 Reminders 01/02; §55',
    blocks:
      'nothing from rendering — a share card ships and link previews work, including ' +
      'in WhatsApp, a secondary conversion channel for this business. What is still ' +
      'outstanding is DirectHired’s **own approved** card: the one in place is an ' +
      'AI-generated illustration carrying no wordmark, so every link to this site ' +
      'currently previews unbranded.',
    handledBy:
      '`src/layouts/BaseLayout.astro` ships `og:image` / `twitter:image` (with width, ' +
      'height, type and alt) pointing at `src/assets/og-share.png`, cropped to exactly ' +
      '1200x630 and transcoded to JPEG by `astro:assets`, and declares ' +
      '`twitter:card="summary_large_image"` now that there is an image to fill it. ' +
      'The image is compliant with §55 because it is visibly a drawing and every ' +
      'figure in it is faceless — it depicts a situation and claims no person — and ' +
      'nothing captions it as a DirectHired family, helper or staff member. Its ' +
      'provenance is recorded as `ai-generated` in the registry and it appears in ' +
      'Category D below. If the image is ever removed, `twitter:card` must go back ' +
      'to `"summary"` in the same commit.',
  },
  // Added 2026-08-16 with /pricing (core-pages Task 4). This is the one
  // entry here whose blocker is NOT missing information — DirectHired
  // supplied the facts the same day. What is missing is sign-off, so the
  // usual "we cannot write it until you tell us" framing does not apply
  // and the `blocks` text says so explicitly.
  //
  // Enforced, not merely declared: tests/compliance-gate.test.ts scans the
  // built HTML of every page for the gated phrasings and for the obvious
  // paraphrases of them. Resolving this item means deleting that test's
  // expectations in the same commit that publishes the paragraph — a
  // deliberate speed bump, so the gate cannot lapse by inattention.
  // STILL OPEN after DirectHired's 2026-08-16 answers, and the item is
  // deliberately NOT narrowed into something that reads as nearly done.
  //
  // DirectHired approved ONE sentence that day (core-pages spec §2.6.2):
  // "We go through the repayment arrangement in full with you before you
  // commit, and it is set out in the contract." That sentence is about the
  // PROCESS and now ships. It is not sign-off on the MECHANICS, which is
  // what this entry has always been about and what §2.5 gates. Approving a
  // sentence that says an arrangement is explained to the employer says
  // nothing about publishing how the arrangement works.
  //
  // The wording below states the approval explicitly rather than leaving it
  // out, because the failure mode here is a reader seeing "they answered on
  // 2026-08-16" somewhere else and assuming this closed with it.
  {
    item: 'Compliance sign-off on loan repayment terms',
    source: 'Brief §19; core-pages spec §2.3, §2.5 and §2.6.2',
    blocks:
      'publishing the repayment mechanics — the 1-7 month range, that repayment ' +
      'comes from the helper\'s basic salary, and that the helper receives ' +
      'off-day compensation during it. DirectHired supplied these facts on ' +
      '2026-08-16; what is missing is sign-off, not information. **Their ' +
      '2026-08-16 approval of one process sentence does not resolve this.** ' +
      'That approval covers "We go through the repayment arrangement in full ' +
      'with you before you commit, and it is set out in the contract" and ' +
      'nothing else — one sentence about the process, not the three mechanics ' +
      'above, which remain unpublishable in substance as well as literally.',
    handledBy:
      '`src/sections/LoanAndPlacement.astro` publishes the framing only — the ' +
      'employer advances the loan and placement fee, the helper repays it, it is ' +
      'ultimately the helper\'s cost, the placement fee is one month\'s salary, ' +
      'and (since 2026-08-16, in DirectHired\'s own approved wording) that the ' +
      'arrangement is gone through in full before the employer commits and is ' +
      'set out in the contract. The repayment mechanics appear nowhere on the ' +
      'site. The page is complete and honest without them; it is a ' +
      'salary-deduction arrangement on a licensed agency\'s public site, in an ' +
      'area MOM regulates, so it does not publish unreviewed.',
  },
]

function htmlFiles(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) return htmlFiles(full)
    return full.endsWith('.html') ? [full] : []
  })
}

/**
 * Every place in src/ that actually renders a <Tbd>, excluding the component
 * itself and any comment that merely mentions it.
 *
 * Derived rather than stated: Category A's "none found" line is only honest
 * if the reader is told whether that means "nothing missing" or "nothing
 * marked". Since the MOM licence number landed it has meant the latter, and a
 * hand-written sentence saying so would go stale the moment a <Tbd> returns.
 */
function tbdCallSites() {
  const walk = (dir) =>
    readdirSync(dir).flatMap((entry) => {
      const full = join(dir, entry)
      if (statSync(full).isDirectory()) return walk(full)
      return [full]
    })

  const stripComments = (source) =>
    source
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/^\s*\/\/[^\n]*/gm, ' ')

  return walk('src')
    .map((f) => f.split('\\').join('/'))
    .filter((f) => f !== 'src/components/Tbd.astro')
    .filter((f) => /<Tbd[\s/>]/.test(stripComments(readFileSync(f, 'utf8'))))
}

function findCategoryA() {
  if (!existsSync(DIST_DIR)) {
    console.error(
      `\nNo "${DIST_DIR}" directory found. Category A is sourced from built HTML — run\n` +
        '"npm run build:dev" first, then re-run this script.\n',
    )
    process.exit(1)
  }

  const findings = new Map() // item name -> Set of files it appears in

  for (const file of htmlFiles(DIST_DIR)) {
    const html = readFileSync(file, 'utf8')
    const relFile = relative(DIST_DIR, file).split('\\').join('/')

    for (const match of html.matchAll(QUOTED_PATTERN)) {
      const item = match[1].trim() === '' ? '(unnamed placeholder)' : match[1]
      if (!findings.has(item)) findings.set(item, new Set())
      findings.get(item).add(relFile)
    }
    for (const _match of html.matchAll(BARE_PATTERN)) {
      const item = '(unnamed placeholder)'
      if (!findings.has(item)) findings.set(item, new Set())
      findings.get(item).add(relFile)
    }
  }

  return [...findings.entries()]
    .map(([item, files]) => ({ item, files: [...files].sort() }))
    .sort((a, b) => a.item.localeCompare(b.item))
}

// A section is "gated" the same way tests/conditional-blocks.test.ts
// verifies: it both reads a content collection and guards its rendered
// markup on that collection's .length. Detecting this from the section
// source (rather than hardcoding 'helper-profiles' and 'reviews' here)
// means a future gated block gets picked up automatically instead of
// silently missing from the checklist.
function findGatedCollections() {
  const gated = [] // { collection, sectionFile, title }

  for (const entry of readdirSync(SECTIONS_DIR)) {
    if (!entry.endsWith('.astro')) continue
    const full = join(SECTIONS_DIR, entry)
    const source = readFileSync(full, 'utf8')

    const isLengthGated = /length\s*[>!]/.test(source)
    if (!isLengthGated) continue

    const collectionMatches = [...source.matchAll(/getCollection\(\s*['"]([^'"]+)['"]\s*\)/g)]
    if (collectionMatches.length === 0) continue

    const titleMatch = source.match(/<SectionHeader[^>]*\stitle="([^"]+)"/)
    const title = titleMatch ? titleMatch[1] : entry.replace(/\.astro$/, '')

    for (const [, collection] of collectionMatches) {
      gated.push({ collection, sectionFile: `${SECTIONS_DIR}/${entry}`, title })
    }
  }

  return gated
}

function findCategoryB() {
  const gated = findGatedCollections()
  const empty = []

  for (const { collection, sectionFile, title } of gated) {
    const contentDir = join(CONTENT_DIR, collection)
    if (!existsSync(contentDir)) continue

    const files = readdirSync(contentDir).filter((f) => f !== '.gitkeep')
    if (files.length === 0) {
      empty.push({ collection, sectionFile, title })
    }
  }

  return empty.sort((a, b) => a.collection.localeCompare(b.collection))
}

/**
 * Category D. Read straight from the registry JSON rather than the typed
 * module beside it: this script is plain Node (CI runs Node 20, which cannot
 * strip TypeScript), so the JSON is the file both readers share.
 * `src/data/images.ts` is the typed view for everything inside the Astro
 * project; the shapes are asserted together in tests/image-registry.test.ts.
 */
function findCategoryD() {
  if (!existsSync(IMAGE_REGISTRY_PATH)) {
    console.error(
      `\nNo "${IMAGE_REGISTRY_PATH}" found. The image registry is a required input —\n` +
        'restore it rather than removing this category, or the checklist silently\n' +
        'stops reporting which images are not DirectHired’s own.\n',
    )
    process.exit(1)
  }

  const slots = JSON.parse(readFileSync(IMAGE_REGISTRY_PATH, 'utf8'))

  return slots
    .filter((slot) => slot.provenance !== 'real-photo')
    .sort((a, b) => a.id.localeCompare(b.id))
}

const PROVENANCE_LABEL = {
  'hand-svg': 'hand-drawn SVG placeholder in this repo',
  'ai-generated': 'AI-generated from a prompt in `docs/design/image-prompts-2026-08-16.md`',
  'real-photo': 'DirectHired’s own verified asset',
  'none-yet': 'nothing shipped — the slot renders no image',
}

function renderMarkdown(categoryA, categoryB, categoryC, categoryD) {
  const lines = []

  lines.push('# DirectHired — Information Required Before Production')
  lines.push('')
  lines.push(
    '> Generated by `node scripts/generate-info-required.mjs` from the current build output ' +
      'and content collections. Do not hand-edit — regenerate instead:',
  )
  lines.push('>')
  lines.push('> ```')
  lines.push('> npm run build:dev && node scripts/generate-info-required.mjs')
  lines.push('> ```')
  lines.push('')
  lines.push(
    'Four categories, which behave differently and are tracked separately (master brief §79):',
  )
  lines.push('')
  lines.push(
    'Categories A, B and D are **derived** from the codebase and cannot fall out of sync with it. ' +
      'Category C is **declared** — see that section for why those items cannot be derived.',
  )
  lines.push('')

  lines.push('## Category A — Inline gaps (block the production build)')
  lines.push('')
  lines.push(
    'A missing value on a block that still renders. Each is marked with `<Tbd>` in the source ' +
      'and shows up as a `data-tbd` attribute in the built HTML. `npm run build` runs ' +
      '`scripts/check-tbd.mjs` against `dist/` and **fails** while any of these remain — ' +
      'publishing a rendered block with a hole in it is a broken claim.',
  )
  lines.push('')

  if (categoryA.length === 0) {
    lines.push('_None found — every inline value in the current build is verified._')
    lines.push('')
    lines.push(
      `**Read that carefully — it is not a clean bill of health.** There are currently ` +
        `**${tbdCallSites().length} \`<Tbd>\` call sites** anywhere in \`src/\`. The last one, the MOM ` +
        'licence number, was resolved on 2026-08-15. So this category is not reporting that ' +
        'nothing is missing — it is reporting that nothing is *marked*, which is a much weaker ' +
        'statement. With zero markers, Category A cannot detect anything at all: it would say ' +
        '"none found" on a site with a hundred gaps in it, and `npm run build` would pass its ' +
        'gate. The gate and the `<Tbd>` component are deliberately kept for the next ' +
        'unverified value.',
    )
    lines.push('')
    lines.push(
      '**What is actually outstanding is below, and in one other place.** Categories B, C and ' +
        'D carry the whole of this document. They are not the whole of what DirectHired still ' +
        'owes: this checklist covers what the codebase can *detect* (B, D) or has *declared* ' +
        '(C), and by construction that is everything with a consequence in the build. Items ' +
        'with no consequence in the build — a founding story that is one sentence long, what ' +
        'your insurance covers above MOM\'s floor, whether one consultant carries a placement ' +
        'end to end — leave no trace here at all, because the honest response to not having ' +
        'them was to write less rather than to write something. Those live in ' +
        '`docs/OPEN-DECISIONS.md`, which is the companion to this file and not a duplicate of ' +
        'it. **Read both, or you have read half the list.**',
    )
  } else {
    for (const { item, files } of categoryA) {
      lines.push(`- **${item}**`)
      lines.push(`  - Blocks: \`npm run build\` (the \`scripts/check-tbd.mjs\` gate)`)
      lines.push(`  - Found in: ${files.map((f) => `\`${f}\``).join(', ')}`)
    }
  }
  lines.push('')

  lines.push('## Category B — Whole-block omissions (do not block the production build)')
  lines.push('')
  lines.push(
    'An entire section has no backing data, so the section is absent from the page — no shell, ' +
      'no "coming soon" placeholder, no invented content. `npm run build` **succeeds** with these ' +
      'empty; saying nothing is honest. The section reappears automatically once the collection ' +
      'has entries.',
  )
  lines.push('')

  if (categoryB.length === 0) {
    lines.push('_None found — every gated collection currently has content._')
  } else {
    for (const { collection, sectionFile, title } of categoryB) {
      lines.push(`- **${title}** (\`${collection}\` collection)`)
      lines.push(`  - Blocks: nothing at build time — \`npm run build\` succeeds`)
      lines.push(
        `  - Blocks: the "${title}" section from appearing on the homepage until ` +
          `\`src/content/${collection}/\` has at least one entry (rendered by \`${sectionFile}\`)`,
      )
    }
  }
  lines.push('')

  lines.push('## Category C — Declared inputs (not derivable from the codebase)')
  lines.push('')
  lines.push(
    'Information DirectHired still owes that leaves **no detectable trace** in the code. ' +
      'Categories A and B are found by scanning: A looks for `<Tbd>` markers in the built ' +
      'HTML, B looks for gated sections whose collection is empty. These items have neither, ' +
      'because the honest response to not having the information was to render *nothing* — ' +
      'an omitted itemisation, an unwritten paragraph — or, where something had to render, ' +
      'to render a placeholder that works. There is no artefact left to detect either way: ' +
      'a page that says nothing and a page carrying a stand-in both look complete to a ' +
      'scanner. That is precisely why these are declared by hand.',
  )
  lines.push('')
  lines.push(
    'They are therefore **declared** in `DECLARED_INPUTS` in ' +
      '`scripts/generate-info-required.mjs` — the only hand-maintained list in this document. ' +
      'The alternative would be sprinkling cosmetic `<Tbd>` markers onto pages purely so this ' +
      'script could find them, which would trade a correct page for a broken one. ' +
      '`npm run build` **succeeds** with these outstanding; nothing false is published.',
  )
  lines.push('')
  lines.push(
    'Design spec §5 named three Category A items — the MOM licence number, detailed ' +
      'replacement terms, and the without-replacement inclusion list. **All three have since ' +
      'been supplied**: the licence number on 2026-08-15 (its `<Tbd>` removed), the other two ' +
      'on 2026-08-16. What remains below are three items, and no two of them are the same ' +
      'kind of thing. **The form URL is the one that matters**: nothing is missing from the ' +
      'code at all, the destination simply does not resolve, and until it does the site ' +
      'cannot convert. The second is not missing information either — those facts are in ' +
      'hand, and what is outstanding is DirectHired’s sign-off on publishing them. The third ' +
      'is a placeholder asset rather than a gap in the copy.',
  )
  lines.push('')

  if (categoryC.length === 0) {
    lines.push('_None declared._')
  } else {
    for (const { item, source, blocks, handledBy } of categoryC) {
      lines.push(`- **${item}**`)
      lines.push(`  - Source: ${source}`)
      lines.push(`  - Blocks: ${blocks}`)
      lines.push(`  - Handled meanwhile by: ${handledBy}`)
    }
  }
  lines.push('')

  lines.push('## Category D — Images that are not DirectHired’s own')
  lines.push('')
  lines.push(
    'Every image on the site, minus the ones that are already DirectHired’s own asset. Derived ' +
      'from the image provenance registry (`src/data/images.json`, typed by `src/data/images.ts`), ' +
      'which `tests/image-registry.test.ts` holds against the codebase: every image asset ' +
      'referenced under `src/` must appear in it, and no slot marked real-photo-only may carry AI ' +
      'provenance. `npm run build` **succeeds** with all of these outstanding — a faceless ' +
      'illustration and an absent block are both honest.',
  )
  lines.push('')
  lines.push(
    'This is the production decision list: for each entry, either supply your own photograph or ' +
      'keep what is there. **Usage sites** is where the swap happens. Entries marked ' +
      '**real photo only** are not a choice — an AI or placeholder image there would fabricate a ' +
      'person or a fact about the business (master brief §55 / §78), so the block stays absent ' +
      'until a real, consented photograph exists.',
  )
  lines.push('')

  if (categoryD.length === 0) {
    lines.push('_None — every registered image is DirectHired’s own asset._')
  } else {
    for (const slot of categoryD) {
      const flag = slot.aiPermitted ? '' : ' — **real photo only**'
      lines.push(`- **${slot.title}** (\`${slot.id}\`)${flag}`)
      lines.push(
        `  - Currently: ${PROVENANCE_LABEL[slot.provenance] ?? slot.provenance}` +
          (slot.assetPath ? ` (\`${slot.assetPath}\`)` : ''),
      )
      lines.push(`  - Depicts: ${slot.depicts}`)
      if (slot.sourcePrompt) {
        lines.push(`  - Generated from: ${slot.sourcePrompt}`)
      }
      lines.push(`  - Rendered at: ${slot.renderedAt}`)
      if (slot.usedBy.length === 0) {
        lines.push('  - Usage sites: none yet — registered ahead of any consumer')
      } else {
        lines.push('  - Usage sites:')
        for (const use of slot.usedBy) {
          lines.push(`    - \`${use.file}:${use.line}\` — ${use.what}`)
        }
      }
      lines.push(`  - Should become: ${slot.replaceWith}`)
      if (slot.aiPermitted) {
        lines.push(
          `  - AI generation permitted. Prompt: **${slot.promptSection}** in ` +
            '`docs/design/image-prompts-2026-08-16.md`',
        )
      } else {
        lines.push(`  - AI generation **not permitted**: ${slot.aiForbiddenReason}`)
      }
    }
  }
  lines.push('')

  return lines.join('\n')
}

const categoryA = findCategoryA()
const categoryB = findCategoryB()
const categoryC = DECLARED_INPUTS
const categoryD = findCategoryD()
const markdown = renderMarkdown(categoryA, categoryB, categoryC, categoryD)

writeFileSync(OUTPUT_PATH, markdown)

console.log(`Wrote ${OUTPUT_PATH}`)
console.log(`  Category A (inline gaps, block the build): ${categoryA.length}`)
console.log(`  Category B (whole-block omissions, do not block the build): ${categoryB.length}`)
console.log(`  Category C (declared, not derivable): ${categoryC.length}`)
console.log(`  Category D (images not yet DirectHired's own): ${categoryD.length}`)
