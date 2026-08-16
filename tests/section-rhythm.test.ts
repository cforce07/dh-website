/**
 * Section-rhythm regression guard.
 *
 * Two things this file exists to catch, both of which have already
 * happened on this site and both of which passed every other test:
 *
 *   1. The ground sequence collapsing. Three sections were moved onto
 *      --color-surface (page cream) one at a time, each for a correct
 *      local reason — a white Card on a white section had zero rendered
 *      background contrast. The correct local fix, applied three times,
 *      left blocks 08 through 11 as a single unbroken ~2,400px cream
 *      field in which a reader could not tell where one subject ended
 *      and the next began. The sequence has to be judged as a whole, so
 *      it is asserted as a whole here.
 *
 *   2. Block 07's crossbar not touching anything. `.bridge::before`
 *      spanned only a 32px middle grid column with a 32px gap on each
 *      side of it, so the one connective gesture on a page otherwise
 *      full of dividers connected nothing. It rendered as `] [` with a
 *      dash between. An earlier fix corrected the bar's height and was
 *      reported as done; nobody checked the horizontal.
 *
 * These are static source assertions, not rendered measurements. A
 * background declaration and a grid geometry are both decided at author
 * time, and a jsdom re-measurement would only be as trustworthy as its
 * layout engine. The rendered numbers behind the crossbar assertions
 * were taken in real Chrome at 1024 / 1280 / 1440 / 1920: composition
 * 768px wide, uprights at x=0-2 and x=766-768, bar spanning x=0 to
 * x=768 at y=27-29, head marks centred on x=1 and x=767, first line of
 * text at y=40.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'

/** Section files in the order src/pages/index.astro renders them. */
const BLOCKS = [
  { block: '01', file: 'Hero', selector: '.hero' },
  { block: '02', file: 'TrustBar', selector: '.trust-bar' },
  { block: '03', file: 'Problem', selector: '.problem' },
  { block: '04', file: 'Difference', selector: '.difference' },
  { block: '05', file: 'Process', selector: '.process' },
  { block: '06', file: 'PricingSection', selector: '.pricing' },
  { block: '07', file: 'TwoSidedMatch', selector: '.two-sided' },
  { block: '08', file: 'HelperSources', selector: '.helper-sources' },
  { block: '09', file: 'Services', selector: '.services' },
  { block: '10a', file: 'MeetHelpers', selector: '.meet-helpers' },
  { block: '10b', file: 'Reviews', selector: '.reviews' },
  { block: '11', file: 'Faq', selector: '.faq' },
  { block: '12', file: 'FinalCta', selector: '.final-cta' },
] as const

/**
 * Section files in the order src/pages/pricing.astro renders them.
 *
 * ADDED because the homepage list above was, for a while, the ONLY ground
 * sequence asserted anywhere — on a branch whose /pricing work grounded
 * ReplacementTerms in --color-surface-teal specifically so that five more
 * pages would inherit a three-ground rhythm from it. The rule "exactly one
 * section in the brand wash" was written against BLOCKS alone, so it went on
 * passing while becoming false site-wide, and the page setting the pattern
 * had its own rhythm checked nowhere.
 *
 * Note the first entry is not in src/sections: /pricing carries its hero,
 * the two cards and the inclusion notes as ONE block defined in the page
 * file, deliberately, so that splitting them cannot put two cream sections
 * next to each other. `path` rather than `file` is what lets this list say
 * that.
 */
const PRICING_BLOCKS = [
  { block: 'P1', path: 'src/pages/pricing.astro', selector: '.pricing-packages' },
  { block: 'P2', path: 'src/sections/ReplacementTerms.astro', selector: '.replacement-terms' },
  { block: 'P3', path: 'src/sections/LoanAndPlacement.astro', selector: '.loan-placement' },
  { block: 'P4', path: 'src/sections/Faq.astro', selector: '.faq' },
  { block: 'P5', path: 'src/sections/FinalCta.astro', selector: '.final-cta' },
] as const

/** Blocks 10a and 10b render nothing while their collections are empty. */
const CONDITIONAL = new Set(['10a', '10b'])

const read = (file: string) => readFileSync(`src/sections/${file}.astro`, 'utf8')

/** Strip comments so a comment naming a token is not read as a declaration. */
const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')

/**
 * The ground a section paints. A section with no `background` of its own
 * shows the body ground, which global.css sets to --color-surface.
 */
function groundOfPath(path: string, selector: string): string {
  const css = stripComments(readFileSync(path, 'utf8'))
  const rule = new RegExp(`(?:^|\\n)\\s*\\${selector}\\s*\\{([^}]*)\\}`).exec(css)
  if (!rule) throw new Error(`${path} has no top-level rule for ${selector}`)
  const bg = /(?:^|\s|;)background(?:-color)?:\s*var\((--color-[a-z-]+)\)/.exec(rule[1])
  return bg ? bg[1] : '--color-surface'
}

/** The same reader, for the homepage list's `file` shorthand. */
function groundOf(file: string, selector: string): string {
  return groundOfPath(`src/sections/${file}.astro`, selector)
}

/*
 * TIE THE LISTS TO THE PAGES THEY CLAIM TO DESCRIBE.
 *
 * Both lists above say "in the order <page> renders them", and for a while
 * nothing checked that. A review swapped <ReplacementTerms /> and
 * <LoanAndPlacement /> in pricing.astro — putting two --color-surface
 * sections adjacent, which is defect #1 in this file's own header — and the
 * whole suite stayed green. The same swap of <Problem /> and <Difference />
 * on the homepage was equally invisible.
 *
 * That is the hazard of a hand-written list: it can be right about the
 * grounds and wrong about the page, and the sequence assertions above check
 * only the first half. This closes it by reading the page source and
 * asserting each block appears after the one before it.
 *
 * A block whose `path` IS the page file is matched on its class attribute
 * rather than a component tag — /pricing's first block is defined inline in
 * the page, deliberately, so that splitting it cannot put two cream
 * sections next to each other.
 */
function renderPositions(
  page: string,
  blocks: readonly { block: string; path: string; selector: string }[],
): { block: string; at: number }[] {
  const source = stripComments(readFileSync(page, 'utf8'))
  return blocks.map((b) => {
    const needle =
      b.path === page
        ? new RegExp(`class="[^"]*\\b${b.selector.slice(1)}\\b`)
        : new RegExp(`<${b.path.split('/').pop()!.replace('.astro', '')}[\\s/>]`)
    const at = source.search(needle)
    if (at === -1) throw new Error(`${page} does not render ${b.block} (${b.path})`)
    return { block: b.block, at }
  })
}

/* -------------------------------------------------------------------------
 * THE PAGE REGISTER — read this before adding a page.
 *
 * Task 5B, G-5. Five core pages ship next: /find-your-helper,
 * /why-directhired, /about, /faq and /contact. Their sequences are not
 * invented here — nobody has designed them yet — but the SHAPE a page task
 * has to fill in is settled now, before the pages exist, so that adding one
 * is a list rather than an archaeology exercise.
 *
 * TO ADD A PAGE: write its block list in the same shape as PRICING_BLOCKS
 * ({ block, path, selector }, in render order), add one entry to
 * PAGE_SEQUENCES below, and that is all that is REQUIRED. Everything in
 * "every registered page keeps the rhythm" then applies to it: the list is
 * tied to the page it claims to describe, consecutive blocks may not share a
 * ground, the brand wash appears at most once, and the list must account for
 * every section the page renders.
 *
 * Then decide whether the page also wants its own describe stating its exact
 * approved sequence, the way the homepage and /pricing do below. That is the
 * assertion that makes a sequence a DECISION rather than merely a legal
 * arrangement, and it is the one that cannot be written generically because
 * the sequence is the design.
 *
 * WHY A REGISTER RATHER THAN A COPIED DESCRIBE. Both existing lists say "in
 * the order <page> renders them", and renderPositions() exists because a
 * review proved a list could be right about grounds and wrong about the
 * page. A register makes that tie automatic: a list that is never registered
 * is never tied, and an unregistered page is the failure this whole file is
 * about. Nothing is derived from dist/ here on purpose — a ground is decided
 * in source at author time, and this file's header says why it is asserted
 * there.
 *
 * The two existing describes are unchanged and still run. They carry the
 * per-page reasoning and the exact sequences; this carries the rules that
 * hold for any page, including ones nobody has written yet.
 * ---------------------------------------------------------------------- */

interface PageSequence {
  page: string
  blocks: readonly { block: string; path: string; selector: string }[]
}

/**
 * Section files in the order src/pages/find-your-helper.astro renders them.
 *
 * Task 6, the first Phase B page to fill in the shape the register above
 * describes. Two of its four blocks are defined in the page file rather than
 * in src/sections — the matching explanation and the timing block are this
 * page's own content and belong to no other route, so they are inline and
 * addressed by `path: <the page>` exactly as /pricing's hero block is.
 *
 * The grounds are not free: Process is fixed at --color-surface-teal and
 * FinalCta at --color-surface, both because the homepage renders the same
 * two components. Those two fix the other two — cream at the top so the
 * page opens on the site's page ground, white in the middle so the teal
 * wash and the closing cream cannot meet.
 */
const FIND_YOUR_HELPER_BLOCKS = [
  { block: 'F1', path: 'src/pages/find-your-helper.astro', selector: '.helper-match' },
  { block: 'F2', path: 'src/sections/Process.astro', selector: '.process' },
  { block: 'F3', path: 'src/pages/find-your-helper.astro', selector: '.match-timing' },
  { block: 'F4', path: 'src/sections/FinalCta.astro', selector: '.final-cta' },
] as const

const PAGE_SEQUENCES: PageSequence[] = [
  {
    page: 'src/pages/index.astro',
    // BLOCKS uses the `file` shorthand because every homepage block is a
    // section component. Expanded to the `path` shape the register speaks,
    // so a page task meets ONE shape rather than two.
    blocks: BLOCKS.map((b) => ({
      block: b.block,
      path: `src/sections/${b.file}.astro`,
      selector: b.selector,
    })),
  },
  { page: 'src/pages/pricing.astro', blocks: PRICING_BLOCKS },
  // --- Phase B: one entry per page, in the shape above. ---
  { page: 'src/pages/find-your-helper.astro', blocks: FIND_YOUR_HELPER_BLOCKS },
]

/**
 * Every section the page actually renders, as the register would name it:
 * a section component by its file path, an inline <section> by
 * `<page>:<selector>`.
 *
 * This is the direction renderPositions() does not cover. That function
 * proves every LISTED block is on the page and in order; this proves the
 * page has no section the list forgot — which is how a half-written list
 * passes every other assertion in this file while describing half a page.
 */
function sectionsRenderedBy(page: string): string[] {
  const source = stripComments(readFileSync(page, 'utf8'))
  const sectionComponents = new Set(
    readdirSync('src/sections')
      .filter((f) => f.endsWith('.astro'))
      .map((f) => f.replace('.astro', '')),
  )
  const components = [...source.matchAll(/<([A-Z][A-Za-z0-9]*)[\s/>]/g)]
    .map((m) => m[1])
    .filter((name) => sectionComponents.has(name))
    .map((name) => `src/sections/${name}.astro`)
  const inline = [...source.matchAll(/<section[^>]*class="([a-z0-9 -]+)"/g)].map(
    (m) => `${page}:.${m[1].trim().split(/\s+/)[0]}`,
  )
  return [...new Set([...components, ...inline])]
}

describe.each(PAGE_SEQUENCES)('$page keeps the ground rhythm', ({ page, blocks }) => {
  const grounds = blocks.map((b) => ({ ...b, ground: groundOfPath(b.path, b.selector) }))

  it('reads a real list of blocks (guards the four assertions below)', () => {
    // A page registered with an empty list would satisfy every rule here
    // while asserting nothing about the page — the vacuous pass this file
    // exists to refuse. A floor of one, not of "enough": the assertion that
    // makes a list non-vacuous is the completeness check below, which forces
    // it to name every section the page renders. A number here would only
    // be a weaker restatement of that, and one somebody would have to guess
    // for each new page.
    expect(blocks.length).toBeGreaterThanOrEqual(1)
  })

  it('renders every block in its list, in the order the list gives', () => {
    const positions = renderPositions(page, blocks)
    const outOfOrder = positions.filter((p, i) => i > 0 && p.at < positions[i - 1].at)
    expect(outOfOrder.map((p) => p.block)).toEqual([])
  })

  it('lists every section the page renders — nothing omitted', () => {
    const listed = new Set(blocks.map((b) => (b.path === page ? `${page}:${b.selector}` : b.path)))
    const unlisted = sectionsRenderedBy(page).filter((s) => !listed.has(s))
    expect(unlisted).toEqual([])
  })

  it('never puts two consecutive blocks on the same ground', () => {
    for (let i = 1; i < grounds.length; i += 1) {
      expect(
        grounds[i].ground,
        `blocks ${grounds[i - 1].block} and ${grounds[i].block} share a ground`,
      ).not.toBe(grounds[i - 1].ground)
    }
  })

  it('grounds at most one section in the brand wash', () => {
    // Per page, never site-wide: --color-surface-teal gives #00a4a6 real
    // area without putting it behind text, and rarity WITHIN ONE SCROLL is
    // what makes that register change land. Two on one page is wallpaper.
    const teal = grounds.filter((g) => g.ground === '--color-surface-teal').map((g) => g.block)
    expect(teal.length).toBeLessThanOrEqual(1)
  })
})

describe('the page register covers the pages that exist', () => {
  it('registers every page in src/pages', () => {
    /*
     * The register is only worth having if a new page cannot skip it. This
     * is the assertion a Phase B page task will meet first: build the page,
     * run the suite, and this fails until its sequence is written down.
     *
     * Deliberately NOT derived from dist/ — a page's ground rhythm is a
     * source decision (see this file's header), and a page that fails to
     * build should fail here too rather than quietly leave the register.
     */
    const walk = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        // Astro does not route anything prefixed with "_".
        if (entry.name.startsWith('_')) return []
        const full = `${dir}/${entry.name}`
        return entry.isDirectory() ? walk(full) : [full]
      })
    const pageFiles = walk('src/pages').filter((f) => f.endsWith('.astro'))
    const unregistered = pageFiles.filter((f) => !PAGE_SEQUENCES.some((s) => s.page === f))
    expect(unregistered).toEqual([])
  })

  it('registers no page twice, and none that does not exist', () => {
    const registered = PAGE_SEQUENCES.map((s) => s.page)
    expect(new Set(registered).size).toBe(registered.length)
    for (const page of registered) {
      expect(() => readFileSync(page, 'utf8'), `${page} is registered but missing`).not.toThrow()
    }
  })
})

describe('the homepage ground sequence alternates', () => {
  const grounds = BLOCKS.map((b) => ({ ...b, ground: groundOf(b.file, b.selector) }))

  it('is exactly the approved sequence', () => {
    // Changing any one of these changes at least two adjacencies, which is
    // why the plan requires the whole sequence to be decided in one sitting
    // rather than a section at a time. If you are here because one entry
    // needs to move, re-derive the whole list.
    expect(grounds.map((g) => `${g.block} ${g.ground}`)).toEqual([
      '01 --color-surface',
      '02 --color-surface-raised',
      '03 --color-surface',
      '04 --color-surface-raised',
      '05 --color-surface-teal',
      '06 --color-surface',
      '07 --color-deep',
      '08 --color-surface-raised',
      '09 --color-surface',
      '10a --color-surface-raised',
      '10b --color-surface',
      '11 --color-surface-raised',
      '12 --color-surface',
    ])
  })

  it('is the order index.astro actually renders, not just the order listed here', () => {
    const positions = renderPositions(
      'src/pages/index.astro',
      // 10a and 10b render nothing while their collections are empty, but
      // the page still contains their tags, so they are checked like the rest.
      BLOCKS.map((b) => ({ ...b, path: `src/sections/${b.file}.astro` })),
    )
    const outOfOrder = positions.filter((p, i) => i > 0 && p.at < positions[i - 1].at)
    expect(outOfOrder.map((p) => p.block)).toEqual([])
  })

  it('never puts two consecutive blocks on the same ground', () => {
    for (let i = 1; i < grounds.length; i += 1) {
      expect(
        grounds[i].ground,
        `blocks ${grounds[i - 1].block} and ${grounds[i].block} share a ground`,
      ).not.toBe(grounds[i - 1].ground)
    }
  })

  it('still alternates with the two conditional blocks absent', () => {
    // 10a and 10b render nothing until their collections are populated, so
    // the sequence a visitor sees TODAY skips them. Both the full sequence
    // and the current one have to hold, or the page reads as one flat field
    // right up until the day real profiles land.
    const rendered = grounds.filter((g) => !CONDITIONAL.has(g.block))
    for (let i = 1; i < rendered.length; i += 1) {
      expect(
        rendered[i].ground,
        `with 10a/10b absent, blocks ${rendered[i - 1].block} and ${rendered[i].block} collide`,
      ).not.toBe(rendered[i - 1].ground)
    }
  })

  it('shifts palette register exactly once', () => {
    // --color-deep is block 07 and the footer, and nowhere else. The
    // register shift works BECAUSE it is rare; a third dark surface makes
    // it a pattern instead of a moment.
    expect(grounds.filter((g) => g.ground === '--color-deep').map((g) => g.block)).toEqual(['07'])
  })

  it('grounds exactly one HOMEPAGE section in the brand wash', () => {
    // Same argument as --color-deep. --color-surface-teal exists to give
    // #00a4a6 real area without ever putting it behind text; a second teal
    // section ON THE SAME PAGE turns that from a register into wallpaper.
    //
    // PER PAGE, NOT SITE-WIDE, and the title now says so. This assertion
    // used to read "exactly one section", which was true of the homepage and
    // false of the site the moment /pricing grounded its replacement block
    // in the same wash. It kept passing because BLOCKS enumerates homepage
    // sections by hand and nothing else was enumerated at all — a rule that
    // had quietly stopped describing the thing it was named after.
    //
    // The per-page reading is the correct one and always was: rarity within
    // one scroll is what makes a register change land. The equivalent
    // assertion for /pricing is in the describe below.
    expect(grounds.filter((g) => g.ground === '--color-surface-teal').map((g) => g.block)).toEqual([
      '05',
    ])
  })
})

describe('the /pricing ground sequence alternates', () => {
  /*
   * /pricing sets the pattern the five remaining core pages inherit, which
   * is the reason its own rhythm is asserted rather than left to the
   * homepage's list to imply.
   */
  const grounds = PRICING_BLOCKS.map((b) => ({ ...b, ground: groundOfPath(b.path, b.selector) }))

  it('is exactly the approved sequence', () => {
    // Three grounds, not two. This page ran cream / white / cream / white /
    // cream — 5,201px of metronomic alternation at identical padding with no
    // register change anywhere — against the homepage's three light grounds
    // plus one dark. As with the homepage list, changing any one entry
    // changes at least two adjacencies: re-derive the whole thing.
    expect(grounds.map((g) => `${g.block} ${g.ground}`)).toEqual([
      'P1 --color-surface',
      'P2 --color-surface-teal',
      'P3 --color-surface',
      'P4 --color-surface-raised',
      'P5 --color-surface',
    ])
  })

  it('is the order pricing.astro actually renders, not just the order listed here', () => {
    const positions = renderPositions('src/pages/pricing.astro', PRICING_BLOCKS)
    const outOfOrder = positions.filter((p, i) => i > 0 && p.at < positions[i - 1].at)
    expect(outOfOrder.map((p) => p.block)).toEqual([])
  })

  it('never puts two consecutive blocks on the same ground', () => {
    for (let i = 1; i < grounds.length; i += 1) {
      expect(
        grounds[i].ground,
        `blocks ${grounds[i - 1].block} and ${grounds[i].block} share a ground`,
      ).not.toBe(grounds[i - 1].ground)
    }
  })

  it('grounds exactly one section in the brand wash', () => {
    expect(grounds.filter((g) => g.ground === '--color-surface-teal').map((g) => g.block)).toEqual([
      'P2',
    ])
  })

  it('adds no second dark band', () => {
    // Block 07 of the homepage is the site's ONLY --color-deep section, and
    // restoring a pale ground here is not a second one. This is the
    // assertion that keeps those two facts from being confused by whoever
    // reads the teal ground as licence for a register shift.
    expect(grounds.filter((g) => g.ground === '--color-deep')).toEqual([])
  })

  it('shares its section files with the homepage where it says it does', () => {
    /*
     * WHAT THIS ASSERTS, AND WHAT IT DELIBERATELY DOES NOT.
     *
     * Faq and FinalCta are the same components the homepage renders at
     * blocks 11 and 12, so their grounds are FIXED for both pages and the
     * two sequences have to be solved together. Flipping one to fix
     * /pricing breaks the homepage sequence — but that coupling is already
     * enforced, by each page's own `is exactly the approved sequence`
     * assertion. Both fail on such a flip; this one is not needed for it.
     *
     * The first version of this test compared the shared blocks' GROUNDS,
     * which was x === x: both sides called the same pure reader on the same
     * file and selector, so no change to src/ could make them differ. A
     * review caught it by flipping Faq.astro's ground and watching five
     * rhythm tests fail without this being one of them. A test that cannot
     * fail is worse than no test, because its name tells the next reader
     * the coupling is guarded.
     *
     * So it asserts the thing that IS load-bearing and CAN break: that the
     * two lists name the same file for the shared blocks. If someone gives
     * /pricing a page-local copy of the FAQ or the CTA, the sequences stop
     * being coupled, both pages keep passing their own sequence test, and
     * the shared-ground reasoning above quietly stops being true.
     */
    const shared = [
      ['P4', '11'],
      ['P5', '12'],
    ] as const
    for (const [pricingBlock, homeBlock] of shared) {
      const p = PRICING_BLOCKS.find((b) => b.block === pricingBlock)!
      const h = BLOCKS.find((b) => b.block === homeBlock)!
      expect(p.path).toBe(`src/sections/${h.file}.astro`)
      expect(p.selector).toBe(h.selector)
    }
  })
})

describe('the /find-your-helper ground sequence alternates', () => {
  /*
   * The generic rules in the register above already hold for this page:
   * the list is tied to the page, no two consecutive blocks share a ground,
   * at most one section sits in the brand wash, and nothing the page
   * renders is left off the list. What they cannot say is which sequence
   * was CHOSEN — a page could satisfy every one of them with white / teal /
   * cream / white and still not be the arrangement anybody approved.
   *
   * So the sequence is stated here, the way the homepage's and /pricing's
   * are. Changing one entry changes at least two adjacencies; re-derive the
   * whole thing rather than editing a line.
   */
  const grounds = FIND_YOUR_HELPER_BLOCKS.map((b) => ({
    ...b,
    ground: groundOfPath(b.path, b.selector),
  }))

  it('is exactly the approved sequence', () => {
    expect(grounds.map((g) => `${g.block} ${g.ground}`)).toEqual([
      'F1 --color-surface',
      'F2 --color-surface-teal',
      'F3 --color-surface-raised',
      'F4 --color-surface',
    ])
  })

  it('adds no second dark band', () => {
    // TwoSidedMatch is not rendered on this page, and this is the assertion
    // that keeps it that way by consequence rather than by convention:
    // block 07 of the homepage is the site's only --color-deep section, and
    // spec §6 requires a second one to be justified on its own terms.
    expect(grounds.filter((g) => g.ground === '--color-deep')).toEqual([])
  })

  it('shares Process and FinalCta with the homepage rather than copying them', () => {
    /*
     * The coupling this page is built on, asserted the same way /pricing
     * asserts its own: `heading` and `lede` props exist so a page can
     * reframe these two sections without duplicating them (spec §3.1), and
     * the four process steps must never need changing twice — they went
     * from five to four on 2026-08-16.
     *
     * A page-local copy of either would keep every ground assertion above
     * passing while quietly breaking that guarantee, so the file paths are
     * what is checked, not the grounds. (Comparing grounds here would be
     * x === x: both sides would call the same reader on the same file —
     * the mistake caught in /pricing's equivalent test.)
     */
    const shared = [
      ['F2', '05'],
      ['F4', '12'],
    ] as const
    for (const [pageBlock, homeBlock] of shared) {
      const p = FIND_YOUR_HELPER_BLOCKS.find((b) => b.block === pageBlock)!
      const h = BLOCKS.find((b) => b.block === homeBlock)!
      expect(p.path).toBe(`src/sections/${h.file}.astro`)
      expect(p.selector).toBe(h.selector)
    }
  })
})

describe("block 07's crossbar connects the two uprights", () => {
  const source = stripComments(read('TwoSidedMatch'))

  it('draws the crossbar across the whole composition, not across a middle column', () => {
    // left/right: 0 on a child of .match-composition reaches the outer edge
    // of each upright, because a grid item's border starts at its column
    // edge. The old .bridge::before spanned one 32px track with a 32px gap
    // either side of it and touched neither.
    expect(source).toMatch(/\.match-composition::before\s*\{[^}]*position:\s*absolute/)
    expect(source).toMatch(/\.match-composition::before\s*\{[^}]*left:\s*0/)
    expect(source).toMatch(/\.match-composition::before\s*\{[^}]*right:\s*0/)
    expect(source).not.toContain('.bridge')
  })

  it('positions the crossbar relative to the composition, not the page', () => {
    // Without this the bar's containing block becomes the nearest
    // positioned ancestor (or the viewport) and left/right: 0 stops meaning
    // "the uprights" — the metric stays clean and the bar goes somewhere
    // else entirely.
    expect(source).toMatch(/\.match-composition\s*\{[^}]*position:\s*relative/)
  })

  it('puts the uprights on the OUTER edge of each column', () => {
    // border-right on the first side and border-left on the last put both
    // rules against the central gutter, which draws `] [`. The logo's
    // uprights are the H's outer strokes.
    expect(source).toMatch(/\.side:first-child\s*\{[^}]*border-left:/)
    expect(source).toMatch(/\.side:last-child\s*\{[^}]*border-right:/)
    expect(source).not.toMatch(/\.side:first-child\s*\{[^}]*border-right:/)
    expect(source).not.toMatch(/\.side:last-child\s*\{[^}]*border-left:/)
  })

  it('derives the crossbar height and the head clearance from the same two properties', () => {
    // The bar lands in the band between the head marks and the titles,
    // which is content-free in both columns only because --head-size and
    // --head-clear drive both the mark's margin and the bar's offset. Split
    // them and the bar can end up struck through a title.
    expect(source).toMatch(/--head-size:/)
    expect(source).toMatch(/--head-clear:/)
    expect(source).toMatch(/\.side-mark\s*\{[^}]*margin-bottom:\s*calc\(var\(--head-clear\)/)
    expect(source).toMatch(
      /\.match-composition::before\s*\{[^}]*top:\s*calc\(var\(--head-size\)\s*\+\s*var\(--head-clear\)/,
    )
  })

  it('keeps both uprights the same length', () => {
    // The uprights ARE the two columns' borders. `align-items: start` lets
    // one column's list wrap to a different height and draws an H with legs
    // of different lengths.
    expect(source).toMatch(/\.match-composition\s*\{[^}]*align-items:\s*stretch/)
  })
})
