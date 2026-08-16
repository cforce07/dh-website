/**
 * /faq and the duplicated FAQ item.
 *
 * ---------------------------------------------------------------------
 * WHY THIS FILE EXISTS: THERE ARE TWO COPIES OF THE DISCLOSURE WIDGET.
 * ---------------------------------------------------------------------
 *
 * src/sections/Faq.astro renders a flat, filtered list on / and /pricing.
 * src/sections/FaqGrouped.astro renders every entry under four headings on
 * /faq. Both draw the same <details> item, and the second file's markup and
 * item CSS are a DELIBERATE duplicate of the first's.
 *
 * Extraction into one shared component was tried first and measured. Astro
 * scopes component styles by stamping a per-component attribute on the
 * elements a component's own template writes, so moving the item into a
 * child component moves its CSS there too and every <details>, <summary>,
 * <span> and answer <div> on TWO LIVE PAGES gains a second scope attribute:
 *
 *     before  .faq-item[data-astro-cid-oaufy27u]{border-bottom:...}
 *     after   .faq-item[data-astro-cid-6rmelcr5]{border-bottom:...}
 *
 *     dist/index.html          61,434 → 61,452 bytes
 *     dist/pricing/index.html  46,558 → 46,567 bytes
 *
 * The bar set for Task 9 was that / and /pricing come out byte-identical
 * from a full-file diff of dist/. They cannot, so the duplicate ships — a
 * subtle rendering difference on two live pages is a worse outcome than a
 * duplicate, and this file is the price of taking that trade honestly.
 *
 * WHAT IT ASSERTS. Not "the two files are similar" — that a named list of
 * item rules is declared IDENTICALLY in both. A duplicate nobody checks
 * drifts within two edits; a duplicate whose divergence fails the suite is
 * just a compiler nobody wrote yet. If Astro ever gains a way to share
 * scoped CSS without changing emitted markup, delete the duplicate and this
 * describe block together.
 *
 * The rest of the file is about /faq itself: one FAQPage block for all 14
 * (spec §4), every entry actually on the page, and the heading levels the
 * grouped layout is built on.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'

const FAQ_FLAT = 'src/sections/Faq.astro'
const FAQ_GROUPED = 'src/sections/FaqGrouped.astro'
const FAQ_PAGE = 'dist/faq/index.html'

const read = (file: string) => readFileSync(file, 'utf8')

/** Strip CSS comments so a commented-out declaration is not read as one. */
const stripCssComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, ' ')

/**
 * Every top-level rule in a component's <style> block, as
 * selector → normalised declaration body.
 *
 * "Top-level" matters: both files carry an `@media` block, and a rule
 * inside one is a different declaration from the same selector outside it.
 * Nesting is tracked by brace depth rather than by parsing, which is enough
 * for hand-written CSS in this project and fails loudly (a selector simply
 * not being found) rather than quietly if it ever is not.
 */
function topLevelRules(file: string): Map<string, string> {
  const style = /<style>([\s\S]*)<\/style>/.exec(read(file))
  if (!style) throw new Error(`${file} has no <style> block`)
  const css = stripCssComments(style[1])

  const rules = new Map<string, string>()
  let depth = 0
  let buffer = ''
  let selector = ''

  for (const char of css) {
    if (char === '{') {
      depth += 1
      if (depth === 1) {
        selector = buffer.trim().replace(/\s+/g, ' ')
        buffer = ''
        continue
      }
    } else if (char === '}') {
      depth -= 1
      if (depth === 0) {
        // An at-rule's body contains nested rules; only plain rules are
        // collected, and an at-rule is recognised by its leading "@".
        if (!selector.startsWith('@')) {
          rules.set(selector, buffer.trim().replace(/\s+/g, ' '))
        }
        buffer = ''
        selector = ''
        continue
      }
    }
    buffer += char
  }

  if (depth !== 0) throw new Error(`${file}: unbalanced braces in <style>`)
  return rules
}

/**
 * The item's visual contract, selector by selector. Every one of these must
 * be declared identically in both files.
 *
 * ENUMERATED, NOT DERIVED. Deriving "the selectors both files happen to
 * share" would make the assertion satisfiable by DELETING a rule from one
 * file — the intersection shrinks and everything still passes, which is the
 * exact failure this guard is for. A hand-written list means a rule that
 * disappears from either file fails here by name.
 */
const SHARED_ITEM_RULES = [
  '.faq-item',
  '.faq-item:first-child',
  '.faq-question',
  '.faq-question::-webkit-details-marker',
  '.faq-question::marker',
  '.faq-question:focus-visible',
  '.faq-icon',
  '.faq-icon::before, .faq-icon::after',
  '.faq-icon::before',
  '.faq-icon::after',
  '.faq-item[open] .faq-icon::after',
  '.faq-answer',
  '.faq-answer :global(p:first-child)',
  '.faq-answer :global(p:last-child)',
]

describe('the duplicated FAQ item stays identical in both files', () => {
  const flat = topLevelRules(FAQ_FLAT)
  const grouped = topLevelRules(FAQ_GROUPED)

  it('reads real CSS out of both files (guards every assertion below)', () => {
    // A parser that returned an empty map would make every comparison below
    // pass by comparing undefined to undefined. The floors are well under
    // what either file carries today, so an ordinary edit does not trip
    // them and a broken reader does.
    expect(flat.size).toBeGreaterThanOrEqual(14)
    expect(grouped.size).toBeGreaterThanOrEqual(14)
    // ...and it must not be reading INSIDE the @media block as top level.
    expect([...flat.keys()].some((k) => k.startsWith('@'))).toBe(false)
    expect([...grouped.keys()].some((k) => k.startsWith('@'))).toBe(false)
    // A known declaration, spelled out, so a reader that returns keys with
    // empty bodies cannot satisfy the equality checks either.
    expect(flat.get('.faq-icon::before')).toBe('width: 12px; height: 2px;')
  })

  for (const selector of SHARED_ITEM_RULES) {
    it(`declares ${selector} identically`, () => {
      expect(flat.get(selector), `${FAQ_FLAT} no longer declares ${selector}`).toBeDefined()
      expect(grouped.get(selector), `${FAQ_GROUPED} no longer declares ${selector}`).toBeDefined()
      expect(grouped.get(selector)).toBe(flat.get(selector))
    })
  }

  it('draws the same element structure in both files', () => {
    /*
     * The CSS being identical is worth nothing if the markup it styles is
     * not. The one deliberate difference is the question element: a <span>
     * in the flat list, an <h3> in the grouped one, because on /faq the
     * fourteen questions ARE the document outline and on the homepage six
     * questions inside a page about something else are not. That difference
     * is asserted in the heading tests further down rather than hidden here.
     */
    for (const file of [FAQ_FLAT, FAQ_GROUPED]) {
      const source = read(file)
      expect(source, `${file}: <details class="faq-item">`).toContain('<details class="faq-item">')
      expect(source, `${file}: <summary class="faq-question">`).toContain(
        '<summary class="faq-question">',
      )
      expect(source, `${file}: the icon span`).toContain('<span class="faq-icon" aria-hidden="true"')
      expect(source, `${file}: <div class="faq-answer">`).toContain('<div class="faq-answer">')
    }
  })

  it('would notice a one-value drift (the check has teeth)', () => {
    /*
     * The mutation this file exists to catch, run against the reader rather
     * than against the repository: take the real CSS, change one length in
     * one rule, and confirm the comparison fails. Without this, a reader
     * that normalised too aggressively — collapsing every value to "" — would
     * report every rule as identical forever.
     */
    const real = flat.get('.faq-icon::after')!
    const drifted = real.replace('12px', '10px')
    expect(drifted).not.toBe(real)
    expect(drifted).not.toBe(grouped.get('.faq-icon::after'))
  })
})

describe('/faq renders the whole collection', () => {
  const entries = readdirSync('src/content/faq').filter((f) => f.endsWith('.md'))
  const questions = entries.map((file) => {
    const match = /^question:\s*(.+)$/m.exec(read(`src/content/faq/${file}`))
    if (!match) throw new Error(`src/content/faq/${file} has no question`)
    return match[1].trim()
  })
  const html = read(FAQ_PAGE)

  it('has 14 entries to render (sanity check)', () => {
    // Spec §3.2 and §8: eight new entries brought the collection to
    // fourteen. A literal, so that adding a fifteenth is a moment somebody
    // looks at this page rather than a silent change.
    expect(entries).toHaveLength(14)
  })

  it('renders one <details> per entry, and no more', () => {
    const details = html.match(/<details class="faq-item"/g) ?? []
    expect(details).toHaveLength(entries.length)
  })

  it('renders every question on the page', () => {
    // The question strings carry a typographic apostrophe in some entries,
    // which Astro escapes in the built HTML — so compare against the same
    // decoding pages.test.ts uses rather than against raw markup.
    const text = html
      .replace(/<[^>]+>/g, ' ')
      .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
      .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ')
    const missing = questions.filter((q) => !text.includes(q))
    expect(missing).toEqual([])
  })

  it('groups them under exactly the four headings spec §3.2 names, in order', () => {
    const h2s = [...html.matchAll(/<h2[^>]*class="group-title"[^>]*>([\s\S]*?)<\/h2>/g)].map((m) =>
      m[1].replace(/&amp;/g, '&').trim(),
    )
    expect(h2s).toEqual(['Cost & Pricing', 'Helpers & Sources', 'Process & Timing', 'Replacement'])
  })

  it('covers every category the schema allows — no entry can land nowhere', () => {
    /*
     * FaqGrouped throws at build time if an entry has no group, which is the
     * real protection. This is the other direction: the schema's enum and
     * the component's GROUPS list are two hand-maintained copies of one
     * list, and a value added to the schema but not to GROUPS would only
     * fail once an entry actually used it. Here it fails immediately.
     */
    const schema = read('src/content/config.ts')
    const enumMatch = /category: z\.enum\(\[([^\]]*)\]\)/.exec(schema)
    expect(enumMatch, 'src/content/config.ts: could not find the faq category enum').not.toBeNull()
    const allowed = enumMatch![1].split(',').map((s) => s.trim().replace(/^'|'$/g, ''))

    const grouped = [...read(FAQ_GROUPED).matchAll(/\{ category: '([a-z]+)', title: '/g)].map(
      (m) => m[1],
    )
    expect(grouped.sort()).toEqual([...allowed].sort())
  })
})

describe('/faq carries one FAQPage block for all 14 (spec §4)', () => {
  const html = read(FAQ_PAGE)

  const jsonLdBlocks = () =>
    [
      ...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi),
    ].map((m) => JSON.parse(m[1]) as { '@type'?: string; mainEntity?: unknown[] })

  it('ships exactly one FAQPage block, not one per group and not two components’ worth', () => {
    const faqPages = jsonLdBlocks().filter((b) => b['@type'] === 'FAQPage')
    expect(faqPages).toHaveLength(1)
  })

  it('covers all 14 questions in that one block', () => {
    const faqPage = jsonLdBlocks().find((b) => b['@type'] === 'FAQPage')!
    expect(faqPage.mainEntity).toHaveLength(14)
  })

  it('gives every question a non-empty answer', () => {
    // markdownToPlainText returning "" for an entry would produce valid
    // JSON-LD that says nothing — the kind of structured data Google reads
    // as thin rather than as absent.
    const faqPage = jsonLdBlocks().find((b) => b['@type'] === 'FAQPage')!
    const thin = (faqPage.mainEntity as { name: string; acceptedAnswer: { text: string } }[])
      .filter((q) => q.acceptedAnswer.text.trim().length < 20)
      .map((q) => q.name)
    expect(thin).toEqual([])
  })
})

describe('/faq’s heading outline is what the grouped layout claims', () => {
  const html = read('dist/faq/index.html')
  const levels = [...html.matchAll(/<h([1-6])[\s>]/g)].map((m) => Number(m[1]))

  it('opens on the one <h1> and puts a <h3> question under a <h2> group', () => {
    /*
     * tests/pages.test.ts already asserts "one <h1>, no skipped levels" for
     * every route. What it cannot say is that the levels are the ones this
     * LAYOUT is built on: a page whose fourteen questions were plain
     * <span>s would satisfy it perfectly, and so would one whose group
     * titles were <h3>s under a <h2> nobody sees.
     *
     * Fourteen h3s, four h2 group titles, plus FinalCta's own h2 headline.
     */
    expect(levels[0]).toBe(1)
    expect(levels.filter((l) => l === 1)).toHaveLength(1)
    expect(levels.filter((l) => l === 3)).toHaveLength(14)
    expect(levels.filter((l) => l === 2)).toHaveLength(5)
  })

  it('puts the question heading inside its own <summary>', () => {
    // The whole point of the h3: a screen-reader user gets a heading list
    // of fourteen questions instead of fourteen unlabelled disclosures.
    // <summary>'s content model is "phrasing content, optionally
    // intermixed with heading content", so this is valid HTML.
    const inSummary = html.match(/<summary class="faq-question"[^>]*>\s*<h3/g) ?? []
    expect(inSummary).toHaveLength(14)
  })
})
