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
 * CONDITIONAL SECTIONS — DERIVED, NEVER LISTED.
 *
 * A section whose whole <section> sits behind a collection-length guard
 * renders NOTHING while that collection is empty, so the ground sequence a
 * visitor actually loads is the list with those blocks removed. That sequence
 * has to alternate too, or the page shows two same-ground sections back to
 * back to every visitor today while the full list — the one every assertion
 * above reads — alternates perfectly.
 *
 * This used to be `const CONDITIONAL = new Set(['10a', '10b'])`: two
 * hand-typed HOMEPAGE block IDs, used by one test inside the homepage's own
 * describe. The register loop had no conditional-aware rule at all, so a
 * registered page could render MeetHelpers or Reviews (both of which render
 * nothing today) between two cream sections and the whole suite stayed green
 * — proved by inserting exactly that on /why-directhired: 50 tests passed,
 * the build exited 0, and `meet-helpers` appeared zero times in the built
 * HTML while the page ran cream → cream.
 *
 * So the rule moved into the register loop, and the SET IS DERIVED. Hand-typing
 * it again would reproduce the defect for the third conditional section anybody
 * writes: a new guarded block would be absent from the set, absent from the
 * page, and invisible to every assertion here. Reading the guard out of the
 * source is what makes a new conditional block carry the rule automatically.
 *
 * Read from source rather than from dist/ for this file's standing reason (see
 * the header): a ground and a guard are both decided at author time, and a page
 * that fails to build must fail here rather than quietly leave the register.
 * tests/links.test.ts carries the dist/-side half — that no built page ships a
 * conditional block whose collection is empty.
 */
const GUARD_BEFORE_SECTION = /\.length\s*(?:>\s*0\s*|!==?\s*0\s*)?&&\s*\(?\s*$/

/**
 * The selectors in one file whose <section> renders only when a collection has
 * entries. Works for a section component and for a <section> written inline in
 * a page file, because both are just "the file that renders it".
 */
function conditionalSelectorsIn(path: string): Set<string> {
  const source = stripComments(readFileSync(path, 'utf8'))
  const found = new Set<string>()
  for (const m of source.matchAll(/<section[^>]*class="([a-z0-9 -]+)"/g)) {
    if (GUARD_BEFORE_SECTION.test(source.slice(0, m.index))) {
      found.add(`.${m[1].trim().split(/\s+/)[0]}`)
    }
  }
  return found
}

/** The blocks of one page's list that render nothing while a collection is empty. */
function conditionalBlocksOf(
  blocks: readonly { block: string; path: string; selector: string }[],
): Set<string> {
  const byPath = new Map<string, Set<string>>()
  return new Set(
    blocks
      .filter((b) => {
        if (!byPath.has(b.path)) byPath.set(b.path, conditionalSelectorsIn(b.path))
        return byPath.get(b.path)!.has(b.selector)
      })
      .map((b) => b.block),
  )
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

/**
 * Section files in the order src/pages/why-directhired.astro renders them.
 *
 * Task 7. Two of its five blocks are defined in the page file — the origin
 * and the credentials are this page's own content and belong to no other
 * route — so they are addressed by `path: <the page>` exactly as /pricing's
 * hero block and /find-your-helper's two inline blocks are.
 *
 * THIS IS THE FIRST PAGE OTHER THAN THE HOMEPAGE TO RENDER TwoSidedMatch,
 * and therefore the first to carry --color-deep. Spec §3.2 lists that
 * component in this page's composition by name, and spec §6's rule is that a
 * page's ground rhythm contains at most ONE palette register shift — which
 * this sequence does. See the page file's header for the full argument, and
 * the "shifts palette register at most once" assertion in the register
 * below, which is what holds the rule for every page rather than for the
 * homepage alone.
 *
 * The grounds are not free: TwoSidedMatch is fixed at --color-deep and
 * FinalCta at --color-surface, both because the homepage renders the same
 * two components. Those two fix the other three — cream at the top so the
 * page opens on the site's page ground, and white either side of the deep
 * band so nothing meets a ground it shares.
 */
const WHY_DIRECTHIRED_BLOCKS = [
  { block: 'W1', path: 'src/pages/why-directhired.astro', selector: '.why-origin' },
  { block: 'W2', path: 'src/pages/why-directhired.astro', selector: '.why-pillars' },
  { block: 'W3', path: 'src/sections/TwoSidedMatch.astro', selector: '.two-sided' },
  { block: 'W4', path: 'src/pages/why-directhired.astro', selector: '.why-credentials' },
  { block: 'W5', path: 'src/sections/FinalCta.astro', selector: '.final-cta' },
] as const

/**
 * Section files in the order src/pages/about.astro renders them.
 *
 * Task 8. Four of its five blocks are defined in the page file — the company
 * story, the philosophy, the Singapore presence and the record are this
 * page's own content and belong to no other route — so they are addressed by
 * `path: <the page>` exactly as /pricing's hero block and the two earlier
 * Phase B pages' inline blocks are.
 *
 * THE ONLY GROUND HERE THAT IS A CHOICE IS A3. FinalCta is fixed at
 * --color-surface because the homepage renders the same component, which
 * forces A4 off cream; opening on cream is what every other page does; and
 * A2 then cannot be cream either. That leaves the Singapore block, which
 * could have been cream and is --color-surface-teal instead: this page has
 * no --color-deep section to spend its register change on, and a metronomic
 * cream/white/cream/white/cream is the exact defect the /pricing audit
 * found (5,201px of alternation at identical padding). The wash lands on
 * the block about where the company physically is, which is the one place
 * on the page where the brand ground means something.
 *
 * TwoSidedMatch is deliberately NOT rendered here — spec §3.2 does not list
 * it for this page, and the "adds no dark band" assertion in this page's own
 * describe holds that by consequence rather than by convention.
 */
const ABOUT_BLOCKS = [
  { block: 'A1', path: 'src/pages/about.astro', selector: '.about-company' },
  { block: 'A2', path: 'src/pages/about.astro', selector: '.about-philosophy' },
  { block: 'A3', path: 'src/pages/about.astro', selector: '.about-singapore' },
  { block: 'A4', path: 'src/pages/about.astro', selector: '.about-record' },
  { block: 'A5', path: 'src/sections/FinalCta.astro', selector: '.final-cta' },
] as const

/**
 * Section files in the order src/pages/faq.astro renders them.
 *
 * Task 9, and the shortest sequence on the site: three blocks, of which
 * only the first is defined in the page file. This page has almost no prose
 * of its own — the content is the faq collection — so the page file owns the
 * hero and nothing else.
 *
 * THE GROUNDS ARE ENTIRELY FORCED, and that is worth stating because it
 * means there was no ground decision to take here. FinalCta is fixed at
 * --color-surface because the homepage renders the same component; opening
 * on cream is what all four earlier Phase B pages do; and those two fix the
 * middle block white.
 *
 * NO BRAND WASH, deliberately — see the page file's header. The only two
 * candidates are the hero (which would make /faq the one page that does not
 * open on the page ground) and the list (which would put --color-surface-teal
 * behind ~1,400px of collapsed accordion rows, which is the wallpaper this
 * file's own rule warns about). The "grounds no section in the brand wash"
 * assertion in this page's describe holds that as a decision rather than as
 * an accident of a three-block page.
 */
const FAQ_BLOCKS = [
  { block: 'Q1', path: 'src/pages/faq.astro', selector: '.faq-intro' },
  { block: 'Q2', path: 'src/sections/FaqGrouped.astro', selector: '.faq-grouped' },
  { block: 'Q3', path: 'src/sections/FinalCta.astro', selector: '.final-cta' },
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
  { page: 'src/pages/why-directhired.astro', blocks: WHY_DIRECTHIRED_BLOCKS },
  { page: 'src/pages/about.astro', blocks: ABOUT_BLOCKS },
  { page: 'src/pages/faq.astro', blocks: FAQ_BLOCKS },
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

  it('still alternates with its conditional blocks absent', () => {
    /*
     * Task 7 fix round, W-1. THE SEQUENCE A VISITOR LOADS TODAY.
     *
     * MeetHelpers and Reviews render nothing while their collections are
     * empty, so any page rendering one shows the list MINUS those blocks. The
     * rule above judges the full list; this judges the page as it is served.
     *
     * It existed only inside the homepage's describe, against a hand-typed
     * set of two homepage block IDs. Here it is derived (see
     * conditionalSelectorsIn) and it runs for every registered page, which is
     * what closes the hole: a page putting a conditional block between two
     * cream sections shipped cream → cream to every visitor with the suite
     * green.
     *
     * ALL the conditional blocks at once, not every subset of them. Both
     * homepage blocks are absent together today and populate together
     * (neither collection has an entry), and the intermediate states are a
     * genuinely different design question — 09/10b are both cream, so
     * "10a alone absent" is a collision the approved homepage sequence has
     * always carried and this rule has never claimed to forbid. Asserting the
     * two states that actually exist is what it did before and what it does
     * now, for every page instead of one.
     */
    const conditional = conditionalBlocksOf(blocks)
    const rendered = grounds.filter((g) => !conditional.has(g.block))
    for (let i = 1; i < rendered.length; i += 1) {
      expect(
        rendered[i].ground,
        `with ${[...conditional].join('/') || 'nothing'} absent, blocks ${rendered[i - 1].block} and ${rendered[i].block} collide`,
      ).not.toBe(rendered[i - 1].ground)
    }
  })

  it('grounds at most one section in the brand wash', () => {
    // Per page, never site-wide: --color-surface-teal gives #00a4a6 real
    // area without putting it behind text, and rarity WITHIN ONE SCROLL is
    // what makes that register change land. Two on one page is wallpaper.
    const teal = grounds.filter((g) => g.ground === '--color-surface-teal').map((g) => g.block)
    expect(teal.length).toBeLessThanOrEqual(1)
  })

  it('shifts palette register at most once', () => {
    /*
     * Task 7. The equivalent rule for --color-deep, and until now it
     * existed ONLY inside the homepage's describe below — scoped to
     * BLOCKS, which enumerates homepage sections by hand. That is the same
     * shape of hole G-5 found in the brand-wash rule: a rule named after a
     * site-wide property, asserted against one page's list, passing by
     * omission on every other page.
     *
     * It went unnoticed because no page but the homepage rendered a
     * --color-deep section. /why-directhired is the first that does (spec
     * §3.2 lists TwoSidedMatch in its composition), so the rule has to be
     * stated where it can be checked for every page, including ones nobody
     * has written yet.
     *
     * AT MOST ONE, not exactly one, and not "only the homepage". Spec §6
     * says block 07's --color-deep remains the only palette REGISTER SHIFT
     * — a rule about how many times ONE SCROLL changes register, which is
     * what makes the change land. A page reusing block 07 itself keeps
     * that; a page painting a second dark band of its own does not, and
     * fails here. Most pages have none at all, which is also fine.
     *
     * The footer is --color-deep on every page and is deliberately outside
     * this: it is not a section in any page's rhythm, and the homepage
     * describe's own comment has always read "block 07 and the footer".
     */
    const deep = grounds.filter((g) => g.ground === '--color-deep').map((g) => g.block)
    expect(deep.length, `${page} shifts register more than once: ${deep.join(', ')}`).toBeLessThanOrEqual(1)
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

describe('the conditional-block derivation', () => {
  /*
   * The register rule "still alternates with its conditional blocks absent"
   * is only as strong as this derivation. A regex that matched nothing would
   * make it pass on every page by omission — the exact failure mode this file
   * keeps finding — so what it finds is asserted by name, in both directions.
   */
  it('finds the two guarded sections that exist, by name', () => {
    expect([...conditionalSelectorsIn('src/sections/MeetHelpers.astro')]).toContain('.meet-helpers')
    expect([...conditionalSelectorsIn('src/sections/Reviews.astro')]).toContain('.reviews')
  })

  it('does not mistake an always-on section for a conditional one', () => {
    // Without this, a derivation that returned every section would also
    // "pass" the rule — by deleting the whole sequence rather than by
    // alternating. Services renders unconditionally; FinalCta takes props and
    // renders on four pages.
    expect([...conditionalSelectorsIn('src/sections/Services.astro')]).toEqual([])
    expect([...conditionalSelectorsIn('src/sections/FinalCta.astro')]).toEqual([])
  })

  it('derives exactly 10a and 10b for the homepage — the set that used to be typed by hand', () => {
    const homepage = PAGE_SEQUENCES.find((s) => s.page === 'src/pages/index.astro')!
    expect([...conditionalBlocksOf(homepage.blocks)].sort()).toEqual(['10a', '10b'])
  })

  it('is exercised by at least one registered page (the rule has a subject)', () => {
    const withConditionals = PAGE_SEQUENCES.filter(
      (s) => conditionalBlocksOf(s.blocks).size > 0,
    ).map((s) => s.page)
    expect(withConditionals.length).toBeGreaterThan(0)
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

  /*
   * "still alternates with the two conditional blocks absent" USED TO BE HERE,
   * scoped to a hand-typed `CONDITIONAL = new Set(['10a', '10b'])`. It is now
   * in the register loop above, derived from the guard in each section's
   * source, and therefore runs for this page and every other one — see W-1 in
   * conditionalSelectorsIn's docblock for the /why-directhired scenario that
   * passed the whole suite while shipping cream → cream. Nothing was dropped:
   * the same assertion still runs over this page's list, and the derivation
   * still producing exactly 10a and 10b for it is asserted below, so the
   * generalisation cannot quietly become an empty set.
   */
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

describe('the /why-directhired ground sequence alternates', () => {
  /*
   * The generic rules in the register above already hold for this page.
   * What they cannot say is which sequence was CHOSEN — a page could
   * satisfy every one of them with white / cream / deep / cream / white and
   * still not be the arrangement anybody approved. So the sequence is
   * stated here, the way the homepage's, /pricing's and
   * /find-your-helper's are. Changing one entry changes at least two
   * adjacencies; re-derive the whole thing rather than editing a line.
   */
  const grounds = WHY_DIRECTHIRED_BLOCKS.map((b) => ({
    ...b,
    ground: groundOfPath(b.path, b.selector),
  }))

  it('is exactly the approved sequence', () => {
    expect(grounds.map((g) => `${g.block} ${g.ground}`)).toEqual([
      'W1 --color-surface',
      'W2 --color-surface-raised',
      'W3 --color-deep',
      'W4 --color-surface-raised',
      'W5 --color-surface',
    ])
  })

  it('shifts palette register exactly once, and it is TwoSidedMatch that does it', () => {
    /*
     * The counterpart to /pricing's and /find-your-helper's "adds no second
     * dark band". Those two pages have none; this one has exactly one, and
     * the thing worth asserting is WHICH block it is.
     *
     * A page-local section painting itself --color-deep would satisfy "at
     * most one" in the register above while being precisely the second dark
     * band spec §6 requires to be justified on its own terms. Naming the
     * block means only the shared component can be it.
     */
    const deep = grounds.filter((g) => g.ground === '--color-deep')
    expect(deep.map((g) => g.block)).toEqual(['W3'])
    expect(deep[0].path).toBe('src/sections/TwoSidedMatch.astro')
  })

  it('grounds no section in the brand wash', () => {
    // Not an oversight. The page already spends its one register change on
    // the deep band; a teal wash as well would give one scroll two special
    // grounds and neither would read as the exception. Stated so that
    // adding one is a decision somebody takes here rather than a ground
    // flipped in the page file.
    expect(grounds.filter((g) => g.ground === '--color-surface-teal')).toEqual([])
  })

  it('shares TwoSidedMatch and FinalCta with the homepage rather than copying them', () => {
    /*
     * The coupling this page is built on, asserted the way /pricing and
     * /find-your-helper assert theirs. TwoSidedMatch is reused UNCHANGED
     * (spec §3.1) — it is not parameterised, and a page-local copy of it
     * would be the second dark band the assertion above exists to refuse
     * while still passing every ground check, because the copy would be
     * a --color-deep block named W3.
     *
     * File paths, not grounds: comparing grounds here would be x === x,
     * both sides calling the same reader on the same file — the mistake
     * caught in /pricing's equivalent test.
     */
    const shared = [
      ['W3', '07'],
      ['W5', '12'],
    ] as const
    for (const [pageBlock, homeBlock] of shared) {
      const p = WHY_DIRECTHIRED_BLOCKS.find((b) => b.block === pageBlock)!
      const h = BLOCKS.find((b) => b.block === homeBlock)!
      expect(p.path).toBe(`src/sections/${h.file}.astro`)
      expect(p.selector).toBe(h.selector)
    }
  })
})

describe('the /about ground sequence alternates', () => {
  /*
   * The generic rules in the register above already hold for this page.
   * What they cannot say is which sequence was CHOSEN — a page could satisfy
   * every one of them with white / cream / white / teal / cream and still
   * not be the arrangement anybody approved. So the sequence is stated here,
   * the way the four pages before it state theirs. Changing one entry
   * changes at least two adjacencies; re-derive the whole thing rather than
   * editing a line.
   */
  const grounds = ABOUT_BLOCKS.map((b) => ({ ...b, ground: groundOfPath(b.path, b.selector) }))

  it('is exactly the approved sequence', () => {
    expect(grounds.map((g) => `${g.block} ${g.ground}`)).toEqual([
      'A1 --color-surface',
      'A2 --color-surface-raised',
      'A3 --color-surface-teal',
      'A4 --color-surface-raised',
      'A5 --color-surface',
    ])
  })

  it('adds no dark band', () => {
    // TwoSidedMatch is not rendered on this page — spec §3.2 does not list
    // it here — and this is the assertion that keeps it that way by
    // consequence rather than by convention. Block 07 of the homepage,
    // reused by /why-directhired, remains the site's only --color-deep
    // section, and spec §6 requires a second one to be justified on its own
    // terms.
    expect(grounds.filter((g) => g.ground === '--color-deep')).toEqual([])
  })

  it('grounds exactly one section in the brand wash, and it is the Singapore block', () => {
    /*
     * The register's rule is "at most one". This page has exactly one, and
     * WHICH block it is was the only ground decision available here (see
     * ABOUT_BLOCKS' docblock) — so it is named, not counted. Moving the wash
     * to the record block, or adding a second, is a decision somebody takes
     * in this file rather than a background flipped in the page.
     */
    const teal = grounds.filter((g) => g.ground === '--color-surface-teal')
    expect(teal.map((g) => g.block)).toEqual(['A3'])
    expect(teal[0].selector).toBe('.about-singapore')
  })

  it('shares FinalCta with the homepage rather than copying it', () => {
    /*
     * The coupling this page's last two grounds rest on: FinalCta is fixed
     * at --color-surface because the homepage renders the same component,
     * and that is what forces A4 white. A page-local copy of the CTA would
     * keep every ground assertion above passing while quietly breaking the
     * single-sourced CTA pair (spec §3.1: order, labels and both hrefs are
     * not parameterised).
     *
     * File paths, not grounds: comparing grounds here would be x === x, both
     * sides calling the same reader on the same file — the mistake caught in
     * /pricing's equivalent test.
     */
    const a5 = ABOUT_BLOCKS.find((b) => b.block === 'A5')!
    const home12 = BLOCKS.find((b) => b.block === '12')!
    expect(a5.path).toBe(`src/sections/${home12.file}.astro`)
    expect(a5.selector).toBe(home12.selector)
  })
})

describe('the /faq ground sequence alternates', () => {
  /*
   * The generic rules in the register above already hold for this page.
   * What they cannot say is which sequence was CHOSEN. On this page the
   * answer is "the only legal one" — see FAQ_BLOCKS' docblock, every ground
   * is forced by FinalCta being shared with the homepage — but that is
   * exactly why it is worth writing down: a later change that made a ground
   * free again should have to come through this file.
   */
  const grounds = FAQ_BLOCKS.map((b) => ({ ...b, ground: groundOfPath(b.path, b.selector) }))

  it('is exactly the approved sequence', () => {
    expect(grounds.map((g) => `${g.block} ${g.ground}`)).toEqual([
      'Q1 --color-surface',
      'Q2 --color-surface-raised',
      'Q3 --color-surface',
    ])
  })

  it('adds no dark band', () => {
    // TwoSidedMatch is not rendered here — spec §3.2 does not list it for
    // this page — and this holds that by consequence rather than by
    // convention. Block 07 of the homepage, reused by /why-directhired,
    // remains the site's only --color-deep section.
    expect(grounds.filter((g) => g.ground === '--color-deep')).toEqual([])
  })

  it('grounds no section in the brand wash', () => {
    // Not an oversight, and not merely "at most one" satisfied by having
    // three blocks. The page file's header records both candidates and why
    // neither takes it; putting the wash behind ~1,400px of collapsed
    // accordion rows is the wallpaper this file's own rule warns about.
    expect(grounds.filter((g) => g.ground === '--color-surface-teal')).toEqual([])
  })

  it('shares FinalCta with the homepage rather than copying it', () => {
    /*
     * The coupling this page's grounds rest on: FinalCta is fixed at
     * --color-surface because the homepage renders the same component, and
     * that is what forces Q2 white. A page-local copy would keep every
     * ground assertion above passing while quietly breaking the
     * single-sourced CTA pair (spec §3.1: order, labels and both hrefs are
     * not parameterised).
     *
     * File paths, not grounds: comparing grounds here would be x === x,
     * both sides calling the same reader on the same file — the mistake
     * caught in /pricing's equivalent test.
     */
    const q3 = FAQ_BLOCKS.find((b) => b.block === 'Q3')!
    const home12 = BLOCKS.find((b) => b.block === '12')!
    expect(q3.path).toBe(`src/sections/${home12.file}.astro`)
    expect(q3.selector).toBe(home12.selector)
  })

  it('renders FaqGrouped and NOT Faq — one FAQPage block, not two', () => {
    /*
     * Spec §4 gives this page the long-tail intent "via FAQPage structured
     * data across all 14", and FaqGrouped emits exactly one block covering
     * every entry. Faq.astro emits its OWN block whenever `emitSchema` is
     * left at its default, so a <Faq /> added to this page — the obvious
     * thing to reach for, since it is the component every other page uses —
     * would put two FAQPage blocks on one page. That is a structured-data
     * defect rather than twice the signal, and it would also render six of
     * the fourteen questions a second time.
     *
     * Asserted in source here so the reason is next to the sequence it
     * belongs to; tests/faq-grouped.test.ts asserts the built page really
     * does carry exactly one.
     */
    const source = stripComments(readFileSync('src/pages/faq.astro', 'utf8'))
    expect(source).toMatch(/<FaqGrouped[\s/>]/)
    expect(source).not.toMatch(/<Faq[\s/>]/)
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
