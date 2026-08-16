import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { packages, packageTotalCents } from '../src/data/pricing'
import { formatSgd, formatSgdProse } from '../src/lib/money'
import {
  EXEMPT_PLACES,
  PERMITTED_SOURCES,
  forbiddenPlaceNames,
  namedSources,
} from './support/helper-sources'

/**
 * Strips every comment form this codebase uses, so a comment that explains
 * a rule cannot be mistaken for a violation of it. Same technique, and the
 * same reason, as tests/header-fit.test.ts's `code()`.
 */
function code(source: string): string {
  return source
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ') // Astro/JSX template comments
    .replace(/\/\*[\s\S]*?\*\//g, ' ') // JS and CSS block comments
    .replace(/<!--[\s\S]*?-->/g, ' ') // HTML comments
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry).split('\\').join('/')
    return statSync(full).isDirectory() ? walk(full) : [full]
  })
}

/**
 * An .astro file with its scoped stylesheet removed, then its comments.
 *
 * FIX ROUND, F-2. renderedCopy() read each .astro whole, so a `<style>`
 * block was swept as though it were visitor copy — and CSS is full of
 * place names. `font-family: Georgia, serif` fired the source allowlist
 * naming the file, and that exact font stack is what this repo's own
 * foundation plan proposes (docs/superpowers/plans/
 * 2026-08-15-directhired-foundation-homepage.md). `background: peru` does
 * the same; `peru` is a CSS named colour. Nobody reads a stylesheet, so
 * neither is a claim about where a helper comes from.
 *
 * That is the failure mode tests/support/helper-sources.ts's docblock
 * names as the one that matters: a guard that fires on legitimate work
 * gets loosened by whoever meets it rather than fixed.
 *
 * Only the stylesheet goes. The TEMPLATE is exactly what these sweeps must
 * keep reading, and the frontmatter with it — copy typed into either is a
 * violation whether or not the page is built today, which is the entire
 * reason renderedCopy() exists. Same removal, for the same reason, as
 * tests/pages.test.ts's renderedText() makes on the built HTML.
 *
 * Removed BEFORE comments, so a CSS block comment inside <style> cannot
 * dissolve the closing tag this depends on.
 */
function template(source: string): string {
  return code(source.replace(/<style[\s\S]*?<\/style>/gi, ' '))
}

/**
 * Everything a visitor can actually read: the content collections verbatim,
 * plus the comment-free, stylesheet-free source of every file that renders
 * markup. Data and lib files are deliberately NOT included —
 * src/data/company.ts's `address.country: 'SG'` and structured-data.ts's
 * `areaServed: Country` are the business's own Singapore address, which is
 * a country, and neither is prose about a helper source.
 */
function renderedCopy(): { file: string; text: string }[] {
  const markdown = walk('src/content')
    .filter((f) => f.endsWith('.md'))
    .map((file) => ({ file, text: readFileSync(file, 'utf8') }))

  const markup = ['src/sections', 'src/components', 'src/layouts', 'src/pages']
    .flatMap(walk)
    .filter((f) => f.endsWith('.astro'))
    .map((file) => ({ file, text: template(readFileSync(file, 'utf8')) }))

  return [...markdown, ...markup]
}

describe('helper sources', () => {
  const files = readdirSync('src/content/helpers')

  it('has the three current sources', () => {
    expect(files.sort()).toEqual(['indonesia.md', 'mizoram.md', 'myanmar.md'])
  })

  it('never labels Mizoram as India', () => {
    const content = readFileSync('src/content/helpers/mizoram.md', 'utf8')
    expect(content).not.toMatch(/\bIndia\b/)
  })

  it('has a `source` field, not a `country` one', () => {
    // The field name is the seed of the prose. While it was `country`, every
    // sentence written from it inherited the error — see the sweep below.
    const schema = readFileSync('src/content/config.ts', 'utf8').replace(/\/\/[^\n]*/g, ' ')
    expect(schema).toMatch(/source: z\.string\(\)/)
    expect(schema).not.toMatch(/\bcountry:/)
    for (const file of files) {
      const content = readFileSync(`src/content/helpers/${file}`, 'utf8')
      expect(content, `${file} still declares a country field`).toMatch(/^source: /m)
      expect(content, `${file} still declares a country field`).not.toMatch(/^country: /m)
    }
  })

  it('carries no flag of any kind, emoji or vector', () => {
    // The `flag` field held regional-indicator emoji pairs. Chrome and Edge
    // on Windows ship no emoji-flag glyphs, so the three cards rendered as
    // the bare letters "ID", "MM" and "IN" at 32px — and "IN" is India's
    // code on a card headed Mizoram, which is the very thing the test above
    // exists to prevent. Replacing the emoji with SVG national flags was
    // rejected for the same reason: it is the same error at higher
    // fidelity, not a fix. This assertion covers BOTH routes back.
    const REGIONAL_INDICATORS = /[\u{1F1E6}-\u{1F1FF}]/u
    for (const file of files) {
      const content = readFileSync(`src/content/helpers/${file}`, 'utf8')
      expect(content, `${file} reintroduced a flag field`).not.toMatch(/^flag:/m)
      expect(content, `${file} reintroduced an emoji flag`).not.toMatch(REGIONAL_INDICATORS)
    }
    const schema = readFileSync('src/content/config.ts', 'utf8')
    expect(schema.replace(/\/\/[^\n]*/g, ' ')).not.toMatch(/\bflag:/)
    const block = readFileSync('src/sections/HelperSources.astro', 'utf8')
    expect(block).not.toMatch(/data\.flag/)
    expect(block).not.toMatch(/\.svg['"]/)
  })

  it('carries no per-source summary — settled, not pending', () => {
    // The three summaries were one sentence with the source name swapped,
    // which is the clearest generated-content tell on the page. They were
    // deleted rather than rewritten, and DirectHired then closed the
    // question on 2026-08-16 (implementation plan D-5): there is no real
    // difference between the sources. Same service, same package, same
    // matching process; only the source differs.
    //
    // So this is not a field waiting on facts that might yet arrive — the
    // facts do not exist, and three different sentences could only ever be
    // invented (master brief §78, and §42 for anything said about a
    // nationality). The field stays gone.
    for (const file of files) {
      const content = readFileSync(`src/content/helpers/${file}`, 'utf8')
      expect(content, `${file} reintroduced a summary field`).not.toMatch(/^summary:/m)
    }
  })

  it('states the source equivalence once, in the block, above the three names', () => {
    // The other half of the same decision, and the reason this assertion
    // exists at all: deleting the summaries left three bare names with
    // nothing explaining why they carry no description, which reads as
    // content that failed to load. The block says the true thing once
    // instead. If that statement is ever removed, the section silently
    // regresses to looking broken rather than looking deliberate — the
    // exact defect a client spotted by eye, so it is asserted rather than
    // trusted.
    const block = readFileSync('src/sections/HelperSources.astro', 'utf8')
    // Below the frontmatter fence, so a mention in the file header comment
    // cannot satisfy this on its own.
    const body = block.split(/^---$/m).slice(2).join('---')
    expect(body).toMatch(/class="source-equivalence"/)
    expect(body).toMatch(/the service is the same/i)
    expect(body).toMatch(/the source is the only difference/i)
  })

  it('says it ONCE — the equivalence is not repeated per source', () => {
    // Three pseudo-differentiated lines is what was deleted; three
    // identical lines is the same defect with the pretence removed. Either
    // way the statement belongs above the row, not inside it, so it must
    // appear exactly once in the rendered markup and never inside the
    // helperSources.map() that draws the three names.
    const block = readFileSync('src/sections/HelperSources.astro', 'utf8')
    const occurrences = block.match(/The source is the only difference/g) ?? []
    expect(occurrences).toHaveLength(1)

    const rowStart = block.indexOf('helperSources.map(')
    const rowEnd = block.indexOf('</div>', block.indexOf('</h3>'))
    expect(rowStart).toBeGreaterThan(-1)
    expect(block.slice(rowStart, rowEnd)).not.toMatch(/source-equivalence/)
  })

  it('never characterises a nationality in the helper content', () => {
    // Master brief §42. The three bodies say what the SERVICE is, never
    // what people from a given place are like, and the block itself adds
    // no framing of its own. This catches the most likely regression: a
    // well-meaning contributor answering "what makes them different?" with
    // an adjective.
    const sources = [
      ...files.map((f) => `src/content/helpers/${f}`),
      'src/sections/HelperSources.astro',
    ]
    // "Helpers from X are/tend to be/are known for ..." in any spelling.
    const CHARACTERISATION =
      /(helpers|candidates|women|they)\s+from\s+\w+\s+(are|tend|typically|generally|usually|often)\b/i
    const KNOWN_FOR = /\b(known|renowned|prized|valued|sought[- ]after)\s+for\b/i
    for (const file of sources) {
      const content = readFileSync(file, 'utf8')
      expect(content, `${file} characterises a nationality`).not.toMatch(CHARACTERISATION)
      expect(content, `${file} characterises a nationality`).not.toMatch(KNOWN_FOR)
    }
  })
})

describe('the site never calls Mizoram a country', () => {
  /*
   * Mizoram is a STATE OF INDIA. Two of the three helper sources are
   * countries and the third is not, so no sentence may describe the set as
   * countries — and none may describe Mizoram as India either. Master brief
   * §412, and the same fact src/content/config.ts records as the reason the
   * `flag` field's "IN" was deleted.
   *
   * That flag error was caught and fixed, and then written straight back in
   * prose across five surfaces, because the only guard was a literal search
   * for "India" in one file. A single string in a single file is not enough:
   * the error came back wearing the opposite word. This sweep runs over
   * EVERY surface a visitor reads and covers both directions.
   *
   * The vocabulary that is true of all three sources, and stays true of a
   * fourth, is "source" / "where a helper comes from". Use it.
   */
  const copy = renderedCopy()

  it('scans the surfaces it claims to scan (guards the sweep itself)', () => {
    // Without this, a broken walker would make both assertions below pass
    // vacuously — which is the precise failure this whole fix wave exists
    // to remove from the suite.
    const all = copy.map((c) => c.text).join('\n')
    expect(copy.length).toBeGreaterThanOrEqual(20)
    expect(copy.map((c) => c.file)).toContain('src/content/helpers/mizoram.md')
    expect(copy.map((c) => c.file)).toContain('src/sections/HelperSources.astro')
    expect(all).toContain('Mizoram')
    expect(all).toContain('The source is the only difference')
  })

  it('reads the template and the frontmatter, and not the scoped CSS (F-2)', () => {
    /*
     * The two directions of what these sweeps are allowed to see, asserted
     * together so neither can be traded for the other.
     *
     * CSS OUT. `font-family: Georgia, serif` and `background: peru` are a
     * font stack and a named colour, not statements about a helper source,
     * and both fired the allowlist while <style> was swept. Checked over
     * every markup file rather than one, and paired with a raw-source
     * reading, so this cannot go green because the declaration was deleted
     * from the site instead of stripped from the sweep.
     *
     * TEMPLATE AND FRONTMATTER IN. The narrowing must stop at </style>.
     * HelperSources.astro is the file to prove it on: it has a scoped
     * stylesheet AND the one sentence tests above depend on, and its
     * frontmatter is where a source name would be typed as data.
     */
    const markup = copy.filter((c) => c.file.endsWith('.astro'))
    expect(markup.length).toBeGreaterThanOrEqual(20)

    const raw = markup.filter((c) => /font-family:/.test(readFileSync(c.file, 'utf8')))
    expect(raw.length, 'no .astro file declares a font-family to strip').toBeGreaterThan(10)
    expect(markup.filter((c) => /font-family:/.test(c.text)).map((c) => c.file)).toEqual([])

    const block = markup.find((c) => c.file === 'src/sections/HelperSources.astro')!
    expect(block).toBeDefined()
    expect(block.text).toContain('The source is the only difference') // template
    expect(block.text).toContain('helperSources') // frontmatter
    expect(block.text).not.toContain('font-family')
  })

  it('says "source", never "country", of where a helper comes from', () => {
    const offenders = copy
      .filter(({ text }) => /\bcountr(y|ies)\b/i.test(text))
      .map(({ file }) => file)
    expect(offenders).toEqual([])
  })

  it('never names India in copy a visitor reads', () => {
    const offenders = copy.filter(({ text }) => /\bIndian?\b/.test(text)).map(({ file }) => file)
    expect(offenders).toEqual([])
  })
})

describe('no helper source beyond Indonesia, Myanmar and Mizoram is ever named', () => {
  /*
   * Spec §7 and master brief §22: the Philippines is never named, including
   * as "coming soon". Sri Lanka, Cambodia and Bangladesh are the three
   * neighbouring sources a writer reaches for by habit.
   *
   * WHY THIS EXISTS WHEN tests/pages.test.ts ALREADY BANS THEM. That ban
   * runs over dist/, so it only ever sees copy a page currently renders.
   * Nine content files — the six services and the three helper sources —
   * are not rendered by either page built today: /services/[slug] and
   * /helpers/[slug] land in a later sub-project. Writing "the Philippines"
   * into the body of src/content/services/transfer-helper.md scored a full
   * green suite, verified by mutation, twice, by two independent reviewers.
   *
   * That is the worst shape a gap can have. The rule is spec §7's strongest,
   * the files already exist, and they would arrive in the routing commit as
   * PRE-EXISTING CONTENT rather than as a diff anyone would connect back to
   * the rule. Nobody re-reads a file they did not touch.
   *
   * So the ban is asserted against the SOURCES as well as the build.
   * renderedCopy() is the same sweep the Mizoram rules above use: every
   * content markdown file verbatim, plus the comment-free source of every
   * .astro. Comments are stripped, so a comment naming a banned source in
   * order to ban it — the paragraph you are reading, if it were in an
   * .astro file — is not itself a violation.
   */
  const copy = renderedCopy()

  /*
   * Kept byte-identical to the pattern in tests/pages.test.ts, and the
   * assertion below is what keeps it that way. Two copies of a regex is the
   * lesser evil here: the alternative is exporting it from a test file into
   * another test file, and the repo's existing convention for a literal that
   * two files must agree on is to state it twice and assert the agreement
   * (see --bp-desktop in tokens.css and tests/header-fit.test.ts).
   */
  const FORBIDDEN_SOURCE = /\b(?:philippin\w*|filipin\w*|sri\s?lank\w*|cambodi\w*|banglades\w*)\b/i

  it('sweeps the nine files the dist/ ban cannot see (guards the gap this closes)', () => {
    // Named individually, not counted. A count would survive the walker
    // silently dropping src/content/services and picking up nine .astro
    // files instead — which is exactly the class of vacuous pass that let
    // the gap exist in the first place.
    const files = copy.map((c) => c.file)
    for (const unrendered of [
      'src/content/services/transfer-helper.md',
      'src/content/services/new-helper-placement.md',
      'src/content/services/direct-hire-processing.md',
      'src/content/services/maid-insurance.md',
      'src/content/services/maid-replacement.md',
      'src/content/services/medical-examination.md',
      'src/content/helpers/indonesia.md',
      'src/content/helpers/myanmar.md',
      'src/content/helpers/mizoram.md',
    ]) {
      expect(files, `${unrendered} is not being swept`).toContain(unrendered)
    }
  })

  it('names none of them in any surface a visitor reads', () => {
    const offenders = copy
      .filter(({ text }) => FORBIDDEN_SOURCE.test(text))
      .map(({ file }) => file)
    expect(offenders).toEqual([])
  })

  it('states the same pattern tests/pages.test.ts applies to the build', () => {
    // Hand-synced, and asserted rather than trusted. If someone widens one
    // pattern to catch a fifth source, this fails until they widen both —
    // which is the only way two copies of a rule stay one rule.
    const pagesTest = readFileSync('tests/pages.test.ts', 'utf8')
    expect(pagesTest).toContain(FORBIDDEN_SOURCE.source)
  })

  it('really does fire on the sentence the mutation used', () => {
    // Non-vacuity. A pattern that matched nothing would make the sweep above
    // green for the wrong reason. These strings live in this test file and
    // are never built or published.
    expect(FORBIDDEN_SOURCE.test('We also place helpers from the Philippines.')).toBe(true)
    expect(FORBIDDEN_SOURCE.test('Filipino helpers coming soon.')).toBe(true)
    expect(FORBIDDEN_SOURCE.test('Sri Lanka and Cambodia and Bangladesh.')).toBe(true)
    // ...and not on the three real sources, or the suite would be
    // unsatisfiable by correct copy.
    expect(FORBIDDEN_SOURCE.test('Indonesia, Myanmar and Mizoram.')).toBe(false)
  })
})

describe('the source rule is enforced as the allowlist it is written as', () => {
  /*
   * Task 5B, G-1. Spec §7 says "never name the Philippines OR ANY SOURCE
   * BEYOND Indonesia, Myanmar and Mizoram". The describe above implements
   * the first half — four named countries — and nothing implemented the
   * second. Appending "We also place helpers from Nepal and Thailand." to
   * src/content/services/transfer-helper.md scored 317 green.
   *
   * This closes it by inverting the rule: every country on earth is a
   * candidate source, the three permitted ones and two documented
   * exemptions are subtracted, and whatever is left is a violation. The
   * country list is derived from Node's ICU data rather than maintained
   * here — see tests/support/helper-sources.ts for the full reasoning,
   * including the two alternatives that were rejected and why.
   *
   * This runs BEFORE the five Phase B pages are written, deliberately.
   * /why-directhired, /about and /faq are the three that discuss where
   * helpers come from; hardening afterwards would mean shaping the guard
   * around copy that had already shipped.
   */
  const copy = renderedCopy()

  it('derives a real country list, not an empty one (guards the whole sweep)', () => {
    // Intl.DisplayNames comes from the runtime's ICU data. A Node built with
    // small-icu returns the alpha-2 code for most regions, which would leave
    // this list nearly empty and every assertion below vacuously green — the
    // exact failure this fix wave exists to remove. So the list is checked
    // for size AND for the specific names the rule is about.
    const names = forbiddenPlaceNames()
    expect(names.length).toBeGreaterThan(200)
    for (const name of ['Philippines', 'Nepal', 'Thailand', 'Sri Lanka', 'Cambodia', 'Bangladesh']) {
      expect(names, `${name} is not in the derived list`).toContain(name)
    }
    // ...and the permitted three are absent from it, or correct copy could
    // never pass.
    for (const permitted of [...PERMITTED_SOURCES, 'Burma', ...EXEMPT_PLACES.keys()]) {
      expect(names, `${permitted} must not be flagged`).not.toContain(permitted)
    }
  })

  it('flags a source the old denylist could not see', () => {
    // The mutation that scored 317 green, plus the four the denylist already
    // covered, plus a demonym no suffix rule derives. These strings live in
    // this test file and are never built or published.
    const found = (sentence: string) => namedSources(sentence).sort()
    expect(found('We also place helpers from Nepal and Thailand.')).toEqual(['Nepal', 'Thailand'])
    expect(found('Vietnamese and Cambodian candidates are available.')).toEqual([
      'Cambodian',
      'Vietnamese',
    ])
    expect(found('We also place helpers from the Philippines.')).toEqual(['Philippines'])
    expect(found('Filipina helpers coming soon.')).toEqual(['Filipina'])
    expect(found('Sri Lankan and Bangladeshi helpers.')).toEqual(['Bangladeshi', 'Sri Lankan'])
  })

  it('does not fire on the copy this site legitimately writes', () => {
    // The half that decides whether the guard survives contact with the
    // site. A sweep that fires on a real sentence gets loosened by the next
    // person to meet it, and then it guards nothing.
    expect(namedSources('Indonesia, Myanmar and Mizoram.')).toEqual([])
    expect(namedSources('Indonesian and Burmese helpers, placed in Singapore.')).toEqual([])
    expect(
      namedSources('DirectHired is a Singapore maid agency placing helpers with Singaporean families.'),
    ).toEqual([])
    // India-as-a-state. Mizoram cannot be described without the word, and
    // this sweep is not the rule that governs it — see the exemption test
    // below, and EXEMPT_PLACES for why.
    expect(namedSources('Mizoram is a state in the north-east of India.')).toEqual([])
  })

  it('reads a derived country name as the proper noun it is (F-3)', () => {
    /*
     * The sweep carried `i` over 260-odd derived names, so it fired on
     * ordinary English nouns that happen to double as place names — the
     * defect this whole file's docblock warns about, arriving from the
     * inside.
     *
     * Derived names are now matched case-sensitively; the irregulars are
     * not, because none of them is an English word in lower case. What the
     * narrowing gives up is a lower-cased spelling of a country nobody has
     * ever written here. What it does not give up is the case that
     * happens: FORBIDDEN_SOURCE in the describe above is case-insensitive
     * and stem-based, and runs over these same two corpora.
     */
    expect(namedSources('We also place helpers from Nepal.')).toEqual(['Nepal'])
    expect(namedSources('we washed the jersey')).toEqual([])
    expect(namedSources('roast turkey')).toEqual([])
    // ...and the one lower-case spelling that matters is still caught here
    // by the irregulars, on top of the four-name denylist above.
    expect(namedSources('helpers from the philippines')).toEqual(['philippines'])
  })

  it('exempts India only because a stricter rule already bans it outright', () => {
    /*
     * The one exemption that could hide something, so the thing that makes
     * it safe is asserted rather than described. Both guards ban the word
     * India in copy a visitor reads — over the source sweep here and over
     * every built page in tests/pages.test.ts — which is strictly stronger
     * than flagging it as a source would be. If either of those bans is
     * ever deleted, this fails and the exemption has to be reconsidered in
     * the same commit.
     *
     * FIX ROUND, F-1. This searched both files for the bare `INDIA.source`
     * — `\bIndian?\b`. Against tests/pages.test.ts that worked. Against
     * tests/content.test.ts it searched THE FILE THAT HOLDS ITS OWN
     * DEFINITION LINE, four lines below, so the literal was present whether
     * or not the real ban still existed: replacing the pattern at the
     * "never names India in copy a visitor reads" test with
     * /\bZZZNOPEZZZ\b/ scored a full green file. Proven by mutation.
     *
     * Each half now names the expression at its OWN ban site — the filter
     * call in this file, the FORBIDDEN_CLAIMS entry in the other — neither
     * of which occurs at a definition. Both are still built from
     * INDIA.source, so the pattern itself cannot drift out from under them.
     * Strictly narrower than what it replaced: each expected string
     * CONTAINS the old one, so nothing that used to fail can now pass.
     */
    expect(EXEMPT_PLACES.has('India')).toBe(true)
    const INDIA = /\bIndian?\b/
    expect(INDIA.test('Mizoram is a state in the north-east of India.')).toBe(true)
    const BAN_SITES: Record<string, string> = {
      // The sweep over renderedCopy() in the describe above.
      'tests/content.test.ts': `copy.filter(({ text }) => /${INDIA.source}/.test(text))`,
      // The FORBIDDEN_CLAIMS entry applied to every built page.
      'tests/pages.test.ts': `pattern: /${INDIA.source}/,`,
    }
    for (const [file, banSite] of Object.entries(BAN_SITES)) {
      expect(readFileSync(file, 'utf8'), `${file} no longer bans the word India`).toContain(banSite)
    }
  })

  it('names no source beyond the three in any surface a visitor reads', () => {
    const offenders = copy.flatMap(({ file, text }) =>
      namedSources(text).map((place) => `${file}: ${place}`),
    )
    expect(offenders).toEqual([])
  })
})

describe("/pricing puts a price above the fold", () => {
  /*
   * The hero summary line — "$1,640.10 with a replacement · $1,140.10
   * without" — and the one thing about it that is load-bearing: WHERE it is.
   *
   * WHY THIS NEEDED ITS OWN GUARD. Deleting the whole `.page-summary` block
   * from src/pages/pricing.astro dropped two figures from the page and left
   * the suite fully green: the money floor still saw 26 figures, and the
   * "every distinct figure is printed" assertion is satisfied by the two
   * cards alone. So the page could silently go back to a first screen with a
   * headline, two lines of lede and 452px of empty cream, on the page whose
   * entire job is answering "how much does this cost", and nothing would
   * say so.
   *
   * That is the G-1 regression one layer further in. G-1 was "the money
   * sweep proves every figure is real but no longer proves /pricing has
   * any"; this is "the sweep proves /pricing has figures but not that a
   * reader meets one before scrolling". Each time, a property that was
   * genuinely being relied on was asserted by nothing.
   *
   * ORDER IS THE ASSERTION, not the mere presence of the element. Measured
   * in Chrome at 320x568 with the sticky header and the fixed CTA bar
   * accounted for, 448px of viewport is usable. With this block after the
   * lede it rendered at y=527 — still below the fold, which is the exact
   * defect it exists to fix. Before the lede it renders at y=263. Presence
   * without position would pass in both cases, so both are checked.
   *
   * Static, from the built HTML: position in source order is what the
   * measurement came down to, and re-measuring in a headless browser here
   * would only be as trustworthy as its layout engine.
   */
  function pricingBody(): string {
    const html = readFileSync('dist/pricing/index.html', 'utf8')
    // <style> holds the scoped CSS, which mentions every one of these class
    // names before the markup does — comparing raw indices would compare
    // stylesheet positions and pass on anything.
    return html
      .slice(html.indexOf('<body'))
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  }

  it('finds the markers it orders (guards the assertion itself)', () => {
    const body = pricingBody()
    for (const marker of ['<h1', 'page-summary', 'page-lede', 'pkg-total', 'package-grid']) {
      expect(body.indexOf(marker), `${marker} not found in the built page body`).toBeGreaterThan(-1)
    }
  })

  it('renders the summary between the <h1> and the lede', () => {
    const body = pricingBody()
    const h1 = body.indexOf('<h1')
    const summary = body.indexOf('page-summary')
    const lede = body.indexOf('page-lede')
    expect(h1).toBeLessThan(summary)
    // The load-bearing half. At 320 the lede is 210px tall, so a summary
    // after it starts below the fold no matter how short the summary is.
    expect(summary, 'the price summary must precede the lede').toBeLessThan(lede)
  })

  it('reaches the reader before either package card does', () => {
    const body = pricingBody()
    expect(body.indexOf('page-summary')).toBeLessThan(body.indexOf('package-grid'))
    expect(body.indexOf('page-summary')).toBeLessThan(body.indexOf('pkg-total'))
  })

  it('carries both package totals, derived rather than typed', () => {
    const body = pricingBody()
    const start = body.indexOf('class="page-summary"')
    const summary = body.slice(start, body.indexOf('</p>', start))
    for (const pkg of packages) {
      const total = formatSgd(packageTotalCents(pkg))
      expect(summary, `the hero summary omits ${total}`).toContain(total)
    }
    // Two packages, two figures — not one restated. Guards against the
    // block surviving as a single-number teaser.
    expect(new Set(packages.map((p) => formatSgd(packageTotalCents(p))))).toHaveProperty('size', 2)
  })
})

describe('services', () => {
  it('has the six current services', () => {
    expect(readdirSync('src/content/services')).toHaveLength(6)
  })
})

describe('faq categories', () => {
  // Task 1 (core-pages): `category` groups /faq's grouped layout. Required,
  // no default — a default would let a miscategorised entry silently land
  // in the wrong bucket. This table is the source of truth for every
  // entry; it must fail loudly if an entry's category drifts.
  //
  // Task 3 added the eight entries below the rule. The table is exhaustive
  // BY DESIGN — `toEqual` on the directory listing means a new entry
  // cannot be dropped into src/content/faq without someone stating its
  // category here, which is the only reason this assertion catches
  // anything. Extend it when the collection grows; do not relax it to a
  // subset check.
  const EXPECTED_CATEGORIES: Record<string, string> = {
    'cost.md': 'cost',
    'fly-in-package.md': 'cost',
    'helper-sources.md': 'sources',
    'how-matching-works.md': 'process',
    'new-vs-transfer.md': 'sources',
    'submit-requirements.md': 'process',
    // --- Task 3 (core-pages), authored from design spec §2 ---
    'helper-loan-placement-fee.md': 'cost',
    'insurance.md': 'cost',
    'how-long-does-it-take.md': 'process',
    'response-time.md': 'process',
    'medical-examination.md': 'process',
    'direct-hire-processing.md': 'process',
    'replacement-six-months.md': 'replacement',
    'replacement-what-covered.md': 'replacement',
  }

  it('has the 14 current entries, each carrying the category from the table', () => {
    const files = readdirSync('src/content/faq')
    expect(files.sort()).toEqual(Object.keys(EXPECTED_CATEGORIES).sort())

    for (const [file, expected] of Object.entries(EXPECTED_CATEGORIES)) {
      const content = readFileSync(`src/content/faq/${file}`, 'utf8')
      const match = content.match(/^category:\s*(.+)$/m)
      expect(match, `${file} has no frontmatter "category:" field`).not.toBeNull()
      expect(match![1].trim(), `${file} category`).toBe(expected)
    }
  })

  it('declares category as a required enum on the faq schema, with no default', () => {
    const schema = readFileSync('src/content/config.ts', 'utf8').replace(/\/\/[^\n]*/g, ' ')
    // Scoped to the faq collection's own schema block, not the whole file,
    // so a `.default(...)` on an unrelated field elsewhere in config.ts
    // cannot satisfy this assertion vacuously.
    const faqBlock = schema.slice(
      schema.indexOf('const faq = defineCollection('),
      schema.indexOf('const helperProfiles'),
    )
    expect(faqBlock).toMatch(/category: z\.enum\(\['cost', 'sources', 'process', 'replacement'\]\)/)
    expect(faqBlock).not.toMatch(/category:[^\n]*\.default\(/)
    expect(faqBlock).not.toMatch(/category:[^\n]*\.optional\(/)
  })
})

describe('content never hardcodes a conversion CTA', () => {
  const contentDirs = ['src/content/faq', 'src/content/helpers', 'src/content/services']

  it('no wa.me link appears anywhere under src/content', () => {
    for (const dir of contentDirs) {
      for (const file of readdirSync(dir)) {
        const content = readFileSync(`${dir}/${file}`, 'utf8')
        expect(content).not.toMatch(/wa\.me/)
      }
    }
  })

  it('no content file links directly to /find-your-helper', () => {
    for (const dir of contentDirs) {
      for (const file of readdirSync(dir)) {
        const content = readFileSync(`${dir}/${file}`, 'utf8')
        expect(content).not.toMatch(/\/find-your-helper/)
      }
    }
  })
})

describe('faq pricing figures stay in sync with pricing.ts', () => {
  // EVERY dollar figure written into FAQ markdown must be a real amount from
  // pricing.ts — a package total OR an individual line item. Markdown can't
  // import pricing.ts, so the literal strings are unavoidable duplication and
  // this test is the only guard: a price change in pricing.ts that isn't
  // mirrored in the FAQ copy must fail here rather than silently disagreeing
  // with what is published.
  //
  // The pattern was originally /\$\d{1,3}(?:,\d{3})+\.\d{2}/ — comma-thousands
  // WITH cents — which validated the two four-figure totals and silently
  // ignored all six line items in fly-in-package.md ($888, $70, $425.10, $77,
  // $60, $120), i.e. most of the published figures were unguarded. The pattern
  // below matches any dollar amount, with or without thousands separators and
  // with or without a cents part.
  const amountsCents = packages.flatMap((pkg) => [
    packageTotalCents(pkg),
    ...(pkg.kind === 'itemised' ? pkg.lineItems.map((item) => item.amountCents) : []),
  ])

  // Both renderings are accepted for the same amount: formatSgd always emits
  // cents ("$888.00"), while FAQ prose writes whole dollars as "$888". Only
  // the trailing ".00" may be dropped — "$425.10" has no whole-dollar form.
  const validAmounts = new Set<string>()
  for (const cents of amountsCents) {
    const formatted = formatSgd(cents)
    validAmounts.add(formatted)
    if (formatted.endsWith('.00')) validAmounts.add(formatted.slice(0, -3))
  }

  const dollarPattern = /\$\d{1,3}(?:,\d{3})*(?:\.\d{2})?/g

  it('has package totals and line items to check against (sanity check)', () => {
    // HARDCODED on purpose. This was briefly derived — `expected` was
    // recomputed from the same flatMap that built `amountsCents` — which
    // made the assertion a restatement of its own subject: it held for any
    // pricing.ts whatsoever, including an empty one, and could not fail.
    //
    // 14 = 2 package totals + 12 line items (6 per itemised package). The
    // point of a literal is that it breaks LOUDLY when a package changes
    // shape, because that is the moment somebody must go and re-check the
    // dollar figures typed into the FAQ markdown below — the very thing
    // this describe block exists to keep in sync. A count that quietly
    // follows the data notices nothing.
    //
    // If a package is added, removed or re-itemised: update this number,
    // then check src/content/faq/*.md against the new figures.
    const EXPECTED_AMOUNTS = 14
    expect(amountsCents.length).toBe(EXPECTED_AMOUNTS)
    expect(validAmounts.size).toBeGreaterThanOrEqual(EXPECTED_AMOUNTS)
    // ...and the shape that number describes is the shape that ships.
    expect(packages).toHaveLength(2)
    expect(packages.every((p) => p.kind === 'itemised')).toBe(true)
  })

  it('every dollar figure in FAQ content matches a real package total or line item', () => {
    const files = readdirSync('src/content/faq')
    let matchCount = 0
    for (const file of files) {
      const content = readFileSync(`src/content/faq/${file}`, 'utf8')
      const matches = content.match(dollarPattern) ?? []
      for (const amount of matches) {
        matchCount += 1
        expect(validAmounts.has(amount), `${file}: ${amount} is not a figure in pricing.ts`).toBe(
          true,
        )
      }
    }
    // Guards against the pattern silently matching nothing (a vacuous pass).
    // 2 totals in cost.md + 1 total + 6 line items + 1 total in
    // fly-in-package.md = 10 figures currently published.
    //
    // Task 5 (core-pages) left this at 10 deliberately: it authored no FAQ
    // content and changed no figure, so the number it describes has not
    // moved. Changing it would only have hidden that.
    expect(matchCount).toBe(10)
  })

  // --- extended to EVERY built page (design spec §5.3) -----------------
  //
  // "That page repeats figures in prose, which is exactly where a stale
  // number hides." So the same rule now runs against the BUILT output, not
  // just the FAQ markdown: every dollar figure a visitor can read anywhere
  // on the site must be a real amount from pricing.ts.
  //
  // Fix round 1, F-2. This read `dist/pricing/index.html` by name — the one
  // page list in this task that stayed hardcoded, and the one guarding
  // money. The homepage publishes 14 distinct figures it never looked at,
  // and a reviewer's scratch /about page carrying two hardcoded totals in
  // its meta description tripped twelve other assertions while every money
  // assertion stayed green. Deriving the list was free: the homepage's
  // figures were already all in the allowed set, so this passes today and
  // covers every Phase B page the moment it builds.
  //
  // Three amounts are not from pricing.ts and must not be: the loan
  // carry-forward worked sum in ReplacementTerms.astro is illustrative by
  // design (spec §2.3 forbids publishing any loan figure or range), so its
  // values are read from that file's own constants rather than exempted by
  // pattern. If someone edits the example, this stays correct; if someone
  // types a fourth figure into the prose beside it, this fails.

  /** Every built page, derived from dist/ — never a hardcoded page list. */
  function builtPages(): { file: string; text: string }[] {
    const walkDist = (dir: string): string[] =>
      readdirSync(dir).flatMap((entry) => {
        const full = join(dir, entry).split('\\').join('/')
        return statSync(full).isDirectory() ? walkDist(full) : [full]
      })

    return walkDist('dist')
      .filter((f) => f.endsWith('.html'))
      .map((file) => ({
        file,
        text: readFileSync(file, 'utf8')
          .replace(/<script[\s\S]*?<\/script>/gi, ' ')
          .replace(/<style[\s\S]*?<\/style>/gi, ' ')
          .replace(/<[^>]+>/g, ' '),
      }))
  }

  /** The illustrative carry-forward amounts, read from their definitions. */
  function illustrativeAmounts(): string[] {
    const source = readFileSync('src/sections/ReplacementTerms.astro', 'utf8')
    const read = (name: string): number => {
      const match = source.match(new RegExp(`${name}\\s*=\\s*([\\d_]+)`))
      if (!match) throw new Error(`ReplacementTerms.astro no longer defines ${name}`)
      return Number(match[1].replace(/_/g, ''))
    }
    const newLoan = read('EXAMPLE_NEW_LOAN_CENTS')
    const outstanding = read('EXAMPLE_OUTSTANDING_CENTS')
    return [newLoan, outstanding, newLoan - outstanding].map(formatSgd)
  }

  it('reads the illustrative example from its source constants (sanity check)', () => {
    // A broken read would silently widen — or empty — the allowlist below.
    const amounts = illustrativeAmounts()
    expect(amounts).toHaveLength(3)
    expect(amounts.every((a) => /^\$[\d,]+\.\d{2}$/.test(a))).toBe(true)
    // The example is a subtraction; if it ever stops being one, the copy
    // around it ("that balance is subtracted from what you advance") is
    // wrong and somebody must look.
    const [a, b, c] = amounts.map((s) => Number(s.replace(/[$,]/g, '')))
    expect(a - b).toBeCloseTo(c, 2)
  })

  /*
   * The gap between two package totals — "the one line that differs is our
   * agent fee, a gap of $500.00". Derived from the same totals the cards
   * print, exactly as src/pages/pricing.astro derives it, so a price change
   * moves both together and neither can go stale against the other. Every
   * ordered pair, because nothing here should depend on which package is
   * listed first.
   */
  function packageDifferences(): string[] {
    const totals = packages.map(packageTotalCents)
    // Both renderings, for the same reason `validAmounts` above accepts
    // both: formatSgd() always emits cents because a column has to align on
    // its decimal point, and formatSgdProse() drops a trailing ".00"
    // because "a gap of $500.00" reads as a printed field rather than an
    // amount someone has named. The gap is quoted in prose on /pricing, so
    // the allowlist has to know the prose form of it. Derived from the same
    // subtraction either way — neither form can go stale against the data.
    return totals.flatMap((a) =>
      totals.filter((b) => b < a).flatMap((b) => [formatSgd(a - b), formatSgdProse(a - b)]),
    )
  }

  it('walks every built page, not just /pricing (guards the sweep itself)', () => {
    // F-2's own regression guard. A mis-walked dist/ would make the money
    // sweep below pass on nothing, which is how the hardcoded version hid
    // the homepage's 14 figures in the first place.
    const built = builtPages()
    expect(built.length).toBeGreaterThanOrEqual(2)
    expect(built.map((p) => p.file)).toContain('dist/index.html')
    expect(built.map((p) => p.file)).toContain('dist/pricing/index.html')
  })

  it('every dollar figure on every built page is a real amount', () => {
    const allowed = new Set([
      ...validAmounts,
      ...packageDifferences(),
      ...illustrativeAmounts(),
    ])

    const strays = builtPages().flatMap(({ file, text }) =>
      [...new Set(text.match(dollarPattern) ?? [])]
        .filter((amount) => !allowed.has(amount))
        .map((amount) => `${file}: ${amount}`),
    )
    expect(strays).toEqual([])
  })

  it('the money sweep really does find figures to check (sanity check)', () => {
    // Non-vacuous: the site really does print figures. If this ever reads
    // zero, the check above means nothing. Asserted across the whole build
    // rather than per page, because a Phase B page with no prices on it is
    // legitimate — /about and /contact will both be one.
    //
    // A global floor is the right shape for "the sweep found something",
    // and the WRONG shape for "this particular page still shows prices".
    // See the /pricing floor below, which is not redundant with it.
    const total = builtPages().reduce((n, { text }) => n + (text.match(dollarPattern) ?? []).length, 0)
    expect(total).toBeGreaterThanOrEqual(20)
  })

  it('/pricing still prints prices', () => {
    /*
     * Fix round 2, G-1 — a regression this suite introduced and then
     * failed to notice.
     *
     * Before F-2 the money check read dist/pricing/index.html by name and
     * carried `found.length >= 10`, so it asserted two things at once:
     * every figure on /pricing is real, AND /pricing has figures.
     * Generalising the sweep to all pages correctly fixed the first and
     * silently dropped the second — the replacement floor is global, and
     * the homepage alone prints 24 figures, so /pricing could have
     * rendered zero and the whole suite would still have been green.
     * Nothing else covered it: tests/pricing.test.ts asserts totals
     * against the DATA, not against the built page, and
     * tests/compliance-gate.test.ts reads that page for other properties
     * entirely. A property that was asserted before the commit was not
     * asserted after it.
     *
     * Naming one page here does not contradict "derive the page list from
     * dist/". Derivation exists so that UNKNOWN future pages are covered
     * without anyone remembering them; it is not a rule against asserting
     * something specific about a page whose entire job is the thing being
     * asserted. /pricing showing no prices is a page-specific catastrophe
     * and needs a page-specific guard.
     *
     * A floor of 10, not today's 28: the coarse check restored verbatim
     * from before F-2, so it fails when the prices go rather than when the
     * copy is edited. The sharp check is the assertion below it, which is
     * derived and needs no chosen number at all.
     */
    const pricing = builtPages().find((p) => p.file === 'dist/pricing/index.html')
    expect(pricing, 'dist/pricing/index.html was not built').toBeDefined()
    const found = pricing!.text.match(dollarPattern) ?? []
    expect(found.length).toBeGreaterThanOrEqual(10)
  })

  it('/pricing prints every distinct figure pricing.ts holds', () => {
    /*
     * The sharp half of G-1, and the reason the floor above is not left to
     * do this on its own.
     *
     * /pricing prints 28 figures, but only 14 of them come from the two
     * package cards — the pricing-tagged FAQ answers repeat 10 more in
     * prose, and the carry-forward example adds 3. So a count floor loose
     * enough not to break on a copy edit is also loose enough to survive
     * both cards disappearing, which is the regression that actually
     * matters on this page.
     *
     * This asserts the property instead: every distinct amount in
     * pricing.ts is printed somewhere on the page. It needs no chosen
     * number, it tracks the data, and it is not satisfiable by the FAQ
     * prose alone — $388.00, the without-replacement agent fee, appears
     * only on the cards. Both renderings of a whole-dollar amount are
     * accepted, for the same reason the FAQ drift guard accepts both:
     * formatSgd always emits cents, prose does not.
     */
    const pricing = builtPages().find((p) => p.file === 'dist/pricing/index.html')
    expect(pricing, 'dist/pricing/index.html was not built').toBeDefined()

    const distinct = [...new Set(amountsCents)]
    expect(distinct.length, 'no figures in pricing.ts to look for').toBeGreaterThan(0)

    // Tokenised, not substring-matched: `$70` is a substring of `$700.00`,
    // and a guard that accepted that would pass on the wrong figure.
    const printed = new Set(pricing!.text.match(dollarPattern) ?? [])
    const missing = distinct
      .map(formatSgd)
      .filter((amount) => !printed.has(amount))
      .filter((amount) => !(amount.endsWith('.00') && printed.has(amount.slice(0, -3))))
    expect(missing).toEqual([])
  })
})

// --- the other half of §5.3: no dollar literal in the pricing sources ---
//
// Extending the drift guard to /pricing passes on day one and would never
// have been shown to fail, because every figure on that page is already
// derived through packageTotalCents() and formatSgd(). That is a property
// worth ASSERTING rather than relying on: the guard above can only compare
// what is printed against what pricing.ts holds, so a hand-typed "$1,988.10"
// that happens to still be correct passes it — and stays passing on the day
// pricing.ts changes and the literal does not.
//
// This assertion is the cheap one that can actually fail: no dollar literal
// appears in these three files at all, outside comments. Comments are
// stripped first because ReplacementTerms.astro's header explains the
// illustrative $2,500 in prose, and a rule's own explanation must not read
// as a violation of it — the same technique, for the same reason, as the
// Mizoram sweep above.
describe('the /pricing sources contain no hardcoded money', () => {
  const PRICING_SOURCES = [
    'src/pages/pricing.astro',
    'src/sections/ReplacementTerms.astro',
    'src/sections/LoanAndPlacement.astro',
  ]

  // `$` followed by a digit. `${...}` template interpolations — which are
  // how every real figure on the page arrives — are `$` followed by `{`,
  // so they are not matched and do not need exempting.
  const DOLLAR_LITERAL = /\$\s*\d/

  it('scans the files it claims to scan (sanity check)', () => {
    for (const file of PRICING_SOURCES) {
      const source = readFileSync(file, 'utf8')
      expect(source.length, `${file} is empty or missing`).toBeGreaterThan(1_000)
      // Each of these files renders money through the shared formatter.
      // If one stops, the assertion below is guarding a file that no
      // longer has anything to guard.
      expect(source, `${file} no longer references a money value`).toMatch(
        /formatSgd|packageTotalCents|amount/,
      )
    }
  })

  it('no dollar figure is typed into any of them outside a comment', () => {
    const offenders = PRICING_SOURCES.flatMap((file) => {
      const stripped = code(readFileSync(file, 'utf8'))
      const matches = stripped.match(/\$\s*\d[\d,]*(?:\.\d{2})?/g) ?? []
      return matches.map((m) => `${file}: ${m}`)
    })
    expect(offenders).toEqual([])
    // DOLLAR_LITERAL is the rule this test states; referenced so the
    // constant cannot drift away from the pattern actually applied.
    expect(PRICING_SOURCES.every((f) => !DOLLAR_LITERAL.test(code(readFileSync(f, 'utf8'))))).toBe(
      true,
    )
  })

  it('the comment stripper is what makes this pass, not an absence of dollars', () => {
    // ReplacementTerms.astro's header DOES contain "$2,500", in the
    // paragraph explaining that the figure is illustrative. If code()
    // stopped stripping block comments this test would go green for the
    // wrong reason — an absent violation rather than a stripped comment —
    // so the stripping is asserted directly.
    const raw = readFileSync('src/sections/ReplacementTerms.astro', 'utf8')
    expect(raw).toMatch(DOLLAR_LITERAL)
    expect(code(raw)).not.toMatch(DOLLAR_LITERAL)
  })
})
