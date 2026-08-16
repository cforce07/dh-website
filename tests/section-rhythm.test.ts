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
import { readFileSync } from 'node:fs'

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
    // Faq and FinalCta are the same components the homepage renders at
    // blocks 11 and 12, so their grounds are FIXED for both pages and the
    // two sequences have to be solved together. If someone flips one to fix
    // /pricing, the homepage sequence above fails — which is the coupling
    // this assertion exists to make visible rather than surprising.
    const shared = [
      ['P4', '11'],
      ['P5', '12'],
    ] as const
    for (const [pricingBlock, homeBlock] of shared) {
      const p = grounds.find((g) => g.block === pricingBlock)!
      const h = BLOCKS.find((b) => b.block === homeBlock)!
      expect(p.ground).toBe(groundOf(h.file, h.selector))
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
