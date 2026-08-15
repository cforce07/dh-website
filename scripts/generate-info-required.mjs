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
 *   BaseLayout ships a "summary" card rather than an empty large-image
 *   one; no page writes replacement terms beyond the one confirmed line).
 *   Absence of an artefact is exactly what makes these undetectable —
 *   deriving them would require adding cosmetic <Tbd>s to pages purely so
 *   this script could find them, which would trade a correct page for a
 *   broken one. So they are declared in DECLARED_INPUTS below, and the
 *   generated document labels them as declared rather than derived.
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
 * output*, and `npm run build` would refuse to produce one while the MOM
 * licence <Tbd> is unresolved. build:dev is the same astro build without
 * that gate.)
 */
import { readdirSync, readFileSync, statSync, writeFileSync, existsSync } from 'node:fs'
import { join, relative } from 'node:path'

const DIST_DIR = 'dist'
const SECTIONS_DIR = 'src/sections'
const CONTENT_DIR = 'src/content'
const OUTPUT_PATH = 'docs/INFORMATION-REQUIRED-BEFORE-PRODUCTION.md'

// Same two patterns as scripts/check-tbd.mjs (kept in sync deliberately —
// this script and the build gate must agree on what counts as a gap).
const QUOTED_PATTERN = /data-tbd="([^"]*)"/g
const BARE_PATTERN = /data-tbd(?![-="])/g

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
const DECLARED_INPUTS = [
  {
    item: 'Detailed replacement terms and conditions',
    source: 'Brief §18 / §79 Reminder 04; design spec §5 Category A',
    blocks:
      'publishing any replacement language beyond the single confirmed line ' +
      '"1 replacement within 6 months". A replacement policy page, and any ' +
      'FAQ answer about what a replacement covers, cannot be written without it.',
    handledBy:
      'the confirmed line is the only replacement text on the site (`replacementTerm` ' +
      'in `src/data/pricing.ts`, rendered by `src/components/PricingCard.astro`); ' +
      'no conditions are stated.',
  },
  // RESOLVED 2026-08-16 — DirectHired supplied the breakdown, which also
  // corrected the total from $1,252.10 to $1,140.10. The package is now
  // `itemised` in src/data/pricing.ts and renders its six line items.
  //
  // `TotalOnlyPackage` is deliberately kept in the type union even though
  // nothing uses it: it is what makes an invented itemisation a type error
  // rather than an oversight, and the next package with an unknown
  // breakdown should reach for it rather than guessing.
  {
    item: 'Approved social share image (Open Graph)',
    source: 'Brief §79 Reminders 01/02; §55',
    blocks:
      '`og:image` / `twitter:image`, and with them the image in link previews — ' +
      'including WhatsApp, a secondary conversion channel for this business.',
    handledBy:
      '`src/layouts/BaseLayout.astro` declares `twitter:card="summary"` rather than ' +
      '`summary_large_image`, so the preview is correct and complete without an ' +
      'image instead of reserving a hero slot it cannot fill. No placeholder ' +
      'imagery of people is used (§55).',
  },
]

function htmlFiles(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) return htmlFiles(full)
    return full.endsWith('.html') ? [full] : []
  })
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

function renderMarkdown(categoryA, categoryB, categoryC) {
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
    'Three categories, which behave differently and are tracked separately (master brief §79):',
  )
  lines.push('')
  lines.push(
    'Categories A and B are **derived** from the codebase and cannot fall out of sync with it. ' +
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
      'an omitted itemisation, an unwritten paragraph, a `summary` card instead of an empty ' +
      'large-image one. There is no artefact left to detect.',
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
    'Design spec §5 names three Category A items — the MOM licence number, detailed ' +
      'replacement terms, and the without-replacement inclusion list. Only the first has a ' +
      'live `<Tbd>`; the other two appear here.',
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

  return lines.join('\n')
}

const categoryA = findCategoryA()
const categoryB = findCategoryB()
const categoryC = DECLARED_INPUTS
const markdown = renderMarkdown(categoryA, categoryB, categoryC)

writeFileSync(OUTPUT_PATH, markdown)

console.log(`Wrote ${OUTPUT_PATH}`)
console.log(`  Category A (inline gaps, block the build): ${categoryA.length}`)
console.log(`  Category B (whole-block omissions, do not block the build): ${categoryB.length}`)
console.log(`  Category C (declared, not derivable): ${categoryC.length}`)
