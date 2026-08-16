import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { company } from '../src/data/company'

describe('company data', () => {
  it('carries the verified contact details', () => {
    expect(company.phoneE164).toBe('+6598556637')
    expect(company.phoneDisplay).toBe('+65 9855 6637')
    expect(company.email).toBe('hello@directhired.com')
    expect(company.address.postalCode).toBe('730119')
    expect(company.openingHours).toBe('24 hours')
  })

  it('carries the confirmed company facts', () => {
    expect(company.foundedYear).toBe(2022)
    expect(company.placementCount).toBe('500+')
  })

  it('carries the MOM licence and the entity it is held in', () => {
    // Master brief §70: never invent, modify, guess or substitute the
    // licence. Pinning it here means a stray edit to src/data/company.ts —
    // the one file the "never retyped" sweep below deliberately exempts —
    // still has to be a deliberate change to two files.
    //
    // The UEN joins them: DirectHired supplied it on 2026-08-16 (spec
    // §2.6.9), it is published on /about, and nobody in this repository has
    // read it off a register. A value that rests on the client's word alone
    // is exactly the kind that must not drift by a keystroke.
    expect(company.momLicence).toBe('23C1443')
    expect(company.registeredName).toBe('DIRECT HIRED PTE. LTD.')
    expect(company.uen).toBe('202240964Z')
  })

  it('states a UEN in the shape a Singapore registry issues', () => {
    /*
     * NOT A VERIFICATION, and the name of this test says so. Nobody here has
     * read this number off ACRA or MOM — see src/data/company.ts's docblock
     * for the attempt and its failure. What this asserts is the one property
     * that CAN be checked from inside the repository: that the published
     * value still parses as a UEN, and that its year half still agrees with
     * the founding year published two rows above it on the same page.
     *
     * It exists because a typo in a nine-character identifier is invisible
     * to every other assertion in this file, and because the year is the one
     * part of a UEN that can be cross-checked against another supplied fact.
     */
    expect(company.uen).toMatch(/^\d{4}\d{5}[A-Z]$/)
    expect(Number(company.uen.slice(0, 4))).toBe(company.foundedYear)
  })

  it('exposes exactly one requirement-form URL', () => {
    expect(company.requirementFormUrl).toMatch(/^https?:\/\//)
  })

  it('links the official social profiles', () => {
    expect(company.socials.facebook).toBe('https://www.facebook.com/directhired')
    expect(company.socials.instagram).toBe('https://www.instagram.com/directhired_sg')
  })
})

describe('the placement count is published the way it was measured', () => {
  /*
   * The BASIS on company.placementCount is DirectHired's own sentence:
   * "500+ placements across all services since 2022", and the note beneath
   * it says that explicitly includes transfers, replacements and
   * direct-hire processing.
   *
   * The trust bar published it as "500+ Helpers Placed" while the footer
   * published it as "500+ placements since 2022" — the same fact, two
   * wordings, one of them a narrower and therefore stronger claim than its
   * own source. Master brief §68 forbids publishing a figure without the
   * scope it was measured over, so "helpers placed" is not available to
   * this number no matter how it is capitalised.
   */
  const surfaces = ['src/sections/TrustBar.astro', 'src/components/Footer.astro']

  /**
   * Comments stripped: both files now explain this rule in prose directly
   * above the markup that obeys it, quoting the wording that is forbidden.
   * Matching raw source would make the explanation indistinguishable from a
   * violation.
   */
  const rendered = (file: string) =>
    readFileSync(file, 'utf8')
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')

  it('every surface reads "placements", never "helpers placed"', () => {
    for (const file of surfaces) {
      const source = rendered(file)
      expect(source, `${file} narrows the placement count`).not.toMatch(/helpers\s+placed/i)
      expect(source, `${file} lost the placement count`).toMatch(/placementCount/)
      expect(source, `${file} lost the word it is counted in`).toMatch(/placements?\b/i)
    }
  })

  it('neither surface retypes the number', () => {
    // The figure is revisable — it was revised down from "1,000+" once
    // already — and a literal on a page is how a revision half-lands.
    for (const file of surfaces) {
      expect(rendered(file), `${file} hardcodes a placement figure`).not.toMatch(
        /\b\d[\d,]*\+\s*(placement|helper)/i,
      )
    }
  })
})

describe('the placement count is published that way on EVERY surface', () => {
  /*
   * Task 5B, G-2. The describe above enforces master brief §68 against a
   * two-element literal — TrustBar.astro and Footer.astro — which were the
   * only two surfaces carrying the figure when it was written.
   *
   * /about is required by the core-pages plan to restate the count, and
   * /why-directhired is the other likely site for it. An /about page typing
   * "500+ Helpers Placed" publishes the narrower, stronger claim §68
   * forbids, with the suite fully green: pages.test.ts's FORBIDDEN_CLAIMS
   * has no pattern for it, links.test.ts's hardcode scan filters only the
   * requirement-form URL, and the money sweep validates $-prefixed amounts
   * only. Nothing else in the suite reads the phrase at all.
   *
   * So the rule is asserted over a DERIVED corpus instead of an enumerated
   * one: every file that renders markup, every content file that becomes
   * markup, and every built page. The two-file describe above is kept as
   * it stands — it asserts that those two specific surfaces still PUBLISH
   * the count, which a derived "every file that mentions it" list cannot
   * say, because a file that dropped the count would simply leave the list.
   * Written before Phase B, so the five new pages meet a guard that was not
   * shaped around their copy.
   */

  function walk(dir: string): string[] {
    return readdirSync(dir).flatMap((entry) => {
      const full = join(dir, entry).split('\\').join('/')
      return statSync(full).isDirectory() ? walk(full) : [full]
    })
  }

  /**
   * The same comment stripper the two-file describe above uses, restated
   * rather than shared — the repo's convention for a small reader two
   * suites need (see `code()` in tests/content.test.ts and
   * tests/header-fit.test.ts). A rule explained in prose directly above the
   * markup that obeys it must not read as a violation of itself.
   */
  const sourceText = (file: string) =>
    readFileSync(file, 'utf8')
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')

  /**
   * Files under public/ that could carry a legible literal. Fonts and any
   * other binary are filtered out by extension rather than read as utf8 —
   * a woff2 read as text is noise, and noise in a negative sweep is how a
   * false positive arrives. Same filter, for the same reason, as the
   * licence/entity/UEN sweep below.
   */
  const PUBLIC_TEXT = /\.(txt|xml|json|webmanifest|svg|html)$/

  /**
   * Every surface a visitor's words can come from: the markup files with
   * their comments stripped (both existing surfaces explain this very rule
   * in prose above the markup that obeys it, quoting the forbidden wording),
   * plus content markdown verbatim — a FAQ answer is published copy too, and
   * /faq is one of the five pages Phase B adds.
   *
   * ---------------------------------------------------------------------
   * THE src/lib HOLE, CLOSED 2026-08-16.
   * ---------------------------------------------------------------------
   *
   * This corpus was markup and src/content and nothing else, which is the
   * IDENTICAL hole the licence/entity/UEN sweep below carried until Task 8
   * closed it. That sweep's own header records how the hole was proved
   * rather than argued: adding a literal to employmentAgencySchema() in
   * src/lib/structured-data.ts scored a fully green suite, because the
   * function that writes the site's JSON-LD was not in anybody's corpus.
   *
   * The placement count is reachable by exactly the same route and is a
   * better fit for it than the licence ever was. `numberOfEmployees`,
   * `slogan`, `description` — an EmploymentAgency schema has obvious
   * places for "500+ helpers placed", and structured data is READ BY
   * SEARCH ENGINES AND RENDERED TO NOBODY, so a narrowed claim there is
   * the one copy on the site that no human proofreads. The figure has
   * already been revised once (down from "1,000+"), which is the other
   * half of why a second copy anywhere is a problem.
   *
   * The previous implementer found this hole while closing the licence one
   * and flagged it rather than widening scope unasked. Closed here, with
   * the same corpus and the same exclusions, so the two sweeps cannot
   * disagree about what a surface is:
   *
   *   src/lib/*.ts  — the modules that BUILD strings the pages emit.
   *   src/data/*.ts — except company.ts, the single definition, excluded
   *                   by name exactly as it is below. Its BASIS comment
   *                   quotes "500+ placements across all services since
   *                   2022" in a `//` comment, which sourceText() does not
   *                   strip, so including it would fail the retyping check
   *                   on the file the value is defined in.
   *   public/**     — text files only; everything there is served verbatim.
   *
   * docs/ and scripts/ stay out for the reasons the sweep below gives:
   * docs/OPEN-DECISIONS.md must be able to state the figure and its basis,
   * because it is the document that asked for them.
   */
  function authoredSurfaces(): { file: string; text: string }[] {
    const markup = ['src/components', 'src/sections', 'src/layouts', 'src/pages']
      .flatMap(walk)
      .filter((f) => f.endsWith('.astro'))
      .map((file) => ({ file, text: sourceText(file) }))
    const markdown = walk('src/content')
      .filter((f) => f.endsWith('.md'))
      .map((file) => ({ file, text: readFileSync(file, 'utf8') }))
    const modules = ['src/lib', 'src/data']
      .flatMap(walk)
      .filter((f) => f.endsWith('.ts') && f !== 'src/data/company.ts')
      .map((file) => ({ file, text: sourceText(file) }))
    const served = walk('public')
      .filter((f) => PUBLIC_TEXT.test(f))
      .map((file) => ({ file, text: readFileSync(file, 'utf8') }))
    return [...markup, ...markdown, ...modules, ...served]
  }

  /** Every built page's rendered text — derived from dist/, never listed. */
  function builtPages(): { file: string; text: string }[] {
    return walk('dist')
      .filter((f) => f.endsWith('.html'))
      .map((file) => ({
        file,
        text: readFileSync(file, 'utf8')
          .replace(/<script[\s\S]*?<\/script>/gi, ' ')
          .replace(/<style[\s\S]*?<\/style>/gi, ' ')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' '),
      }))
  }

  /** "500+" as a literal, for searching rendered prose. */
  const FIGURE = company.placementCount.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

  const NARROWED = /helpers?\s+placed/i

  it('sweeps real surfaces and real pages (guards the sweep itself)', () => {
    // Every assertion below is a negative one, so a broken walk would make
    // all of them pass on nothing.
    const authored = authoredSurfaces()
    expect(authored.length).toBeGreaterThanOrEqual(20)
    expect(authored.map((s) => s.file)).toContain('src/sections/TrustBar.astro')
    expect(authored.map((s) => s.file)).toContain('src/components/Footer.astro')
    // The 2026-08-16 corpus extension, named file by file. Every assertion
    // in this describe is a negative one, so a walk that quietly stopped
    // covering src/lib would reopen the exact hole this closed and report
    // nothing at all — which is how the hole existed in the first place.
    expect(authored.map((s) => s.file)).toContain('src/lib/structured-data.ts')
    expect(authored.map((s) => s.file)).toContain('src/data/pricing.ts')
    expect(authored.map((s) => s.file)).toContain('public/robots.txt')
    // ...and the single definition stays out, or the retyping check below
    // would fail on the file the value is defined in.
    expect(authored.map((s) => s.file)).not.toContain('src/data/company.ts')
    expect(authored.some((s) => s.file.startsWith('docs/'))).toBe(false)
    expect(authored.some((s) => s.file.startsWith('scripts/'))).toBe(false)

    const built = builtPages()
    expect(built.length).toBeGreaterThanOrEqual(2)
    expect(built.map((p) => p.file)).toContain('dist/index.html')
  })

  it('the count really is published, on every page (the checks below have a subject)', () => {
    // The footer carries it site-wide, so every built page states it. If a
    // page ever stops, the "every printing says placements" assertion below
    // is checking nothing on that page — and the fact worth knowing is that
    // the figure vanished, which nothing else would report.
    const missing = builtPages()
      .filter(({ text }) => !new RegExp(FIGURE).test(text))
      .map(({ file }) => file)
    expect(missing).toEqual([])
  })

  it('no surface anywhere narrows it to "helpers placed"', () => {
    const offenders = [...authoredSurfaces(), ...builtPages()]
      .filter(({ text }) => NARROWED.test(text))
      .map(({ file }) => file)
    expect(offenders).toEqual([])
  })

  it('every printing of the figure names what it counts', () => {
    /*
     * The assertion that actually catches "500+ Helpers Placed" on a page
     * nobody has written yet, and it catches "500+ families served" and
     * "500+ helpers" with it. §68 forbids publishing the figure without the
     * scope it was measured over; the noun is the smallest part of that
     * scope and the part a headline drops first.
     *
     * A window rather than a whole-page search: "the page says 500+
     * somewhere and says placements somewhere" is satisfied by a trust bar
     * two thousand pixels below an /about headline that reads "500+ Helpers
     * Placed".
     */
    const offenders = builtPages().flatMap(({ file, text }) =>
      [...text.matchAll(new RegExp(FIGURE, 'g'))]
        .map((m) => text.slice(m.index!, m.index! + 40))
        .filter((window) => !/placements?\b/i.test(window))
        .map((window) => `${file}: "${window.trim()}"`),
    )
    expect(offenders).toEqual([])
  })

  /**
   * THE PATTERN THIS REPLACED, kept as a value rather than only as prose,
   * because the assertion below compares the two rather than describing
   * them. It required the `+` ADJACENT to the noun, so it caught
   * "500+ placements" and nothing else. Every one of these walked straight
   * through it:
   *
   *   "over 500 placements"            no plus at all
   *   "more than 500 families served"  no plus, and two words in between
   *   "500 helpers placed"             no plus
   *
   * The `+` is not the fact. Master brief §68's rule is about publishing a
   * COUNT without the period and scope it was measured over, and a count
   * loses its plus before it loses anything else — "over 500" is what a
   * writer reaches for when the plus reads as clumsy. Worse, dropping the
   * plus changes the claim: "500+" is a floor, "500" is a figure, and the
   * count came down from "1,000+" once already, so a literal typed into a
   * page is exactly how a revision half-lands.
   */
  const OLD_PATTERN = /\b\d[\d,]*\+\s*(?:placement|helper|famil|client|customer)/i

  /*
   * ---------------------------------------------------------------------
   * CORRECTION TO COMMIT e8219f7's MESSAGE, WHICH CANNOT BE EDITED.
   * ---------------------------------------------------------------------
   *
   * That commit widened this pattern and said two things about the widening
   * that were not true. This comment is where the next reviewer will look,
   * so the correction lives here rather than only in a report.
   *
   * IT CLAIMED the superset was "asserted explicitly in the fixtures". No
   * such assertion existed — the fixtures were a flat list of strings the
   * new pattern must catch, and OLD_PATTERN appeared nowhere in this file
   * except inside a comment. The assertion now exists, below, and it is the
   * only thing that could have caught what follows.
   *
   * IT CLAIMED "strictly more strings match; the old pattern's language is a
   * subset". FALSE. The widened pattern required two or more digits and a
   * following noun, and the old one required neither. These were caught
   * before it and walked through it after:
   *
   *   "5+ placements"          single digit
   *   "9+ helpers placed"      single digit
   *   "8+ clients"             single digit
   *   "500+placements"         no space between the plus and the noun
   *   "1,000+family stories"   no space, and "family" is not "families"
   *
   * Two were verified live: publishing "We have completed 5+ placements."
   * and "We have completed 500+placements." on /about scored a fully green
   * suite, and both failed it before the branch. The practical exposure was
   * small — company.placementCount is "500+", so a single-digit retype would
   * have been a different fabrication rather than a stale copy — but the
   * pattern lost reach while its commit message said it could not, and that
   * is the defect being fixed here.
   *
   * ---------------------------------------------------------------------
   * SO THE PATTERN IS TWO BRANCHES, and the split is the fix: the floor is
   * only ever applied where it is actually needed.
   * ---------------------------------------------------------------------
   */

  /**
   * Branch 1 — a floor typed WITH its plus. This is OLD_PATTERN's own shape,
   * noun stems included, with one extra optional space allowed before the
   * plus, so every string the old pattern caught is caught here BY
   * CONSTRUCTION rather than by fixture: same digits (one is enough), same
   * `\s*` before the noun (so a glued "500+placements" still fires), same
   * five stems (so "family" and "clientele" still fire).
   *
   * No digit floor on this branch, and none is wanted: the plus IS the
   * anchor. A bare "$500 —" cannot reach it, and "1+ placements" is a retype
   * whatever its magnitude.
   */
  const WITH_PLUS = /\d[\d,]*\s*\+\s*(?:placement|helper|famil|client|customer)/

  /**
   * Branch 2 — a figure typed WITHOUT its plus, which is the reach commit
   * e8219f7 was right to add: "over 500 placements", "more than 500 families
   * served", "500 helpers placed". With no plus to anchor on, two constraints
   * keep it from crying wolf, and both were measured against the real corpus
   * rather than guessed:
   *
   *   AT LEAST TWO DIGITS. "1 replacement within 6 months" is published copy
   *   and "1 replacement" is not a count of placements. Requiring two digits
   *   drops every single-digit quantity on the site. The floor costs nothing
   *   now that branch 1 carries every plus-bearing string past it.
   *
   *   A PLURAL OR COUNT NOUN FOLLOWS, within two words. "The two packages
   *   differ by $500 — the agent fee" is published on /pricing and must not
   *   fire; it does not, because no count noun follows the number.
   */
  const WITHOUT_PLUS =
    /\d{2,}[\d,]*\s*\+?(?:\s+[a-z]+){0,2}\s+(?:placements?|helpers?|famil(?:y|ies)|clients?|customers?)\b/

  /**
   * A count of placements, helpers, families, clients or customers, typed as
   * a literal, by either route.
   *
   * Swept over the whole authored corpus: ZERO matches, which is the correct
   * answer — every surface reads company.placementCount.
   */
  const COUNT_LITERAL = new RegExp(`\\b(?:${WITH_PLUS.source}|${WITHOUT_PLUS.source})`, 'i')

  it('nothing the pattern it replaced caught walks through the one that replaced it', () => {
    /*
     * THE ASSERTION COMMIT e8219f7 SAID IT HAD MADE. Measured against the
     * pattern that commit actually shipped, it fails on seven of the nine
     * named strings below and on 96 of the 150 generated ones. That is the
     * size of the reach the "strictly more strings match" claim covered.
     *
     * The generated corpus is what makes this a superset claim rather than a
     * sample: it is the cross product of the shapes OLD_PATTERN accepts —
     * one to five digits with and without a comma group, nought to two
     * spaces after the plus, and all ten singular and plural forms of the
     * five nouns it knew. Every one is asserted to be a string the old
     * pattern really caught, so the check cannot pass by generating strings
     * that were never in its language in the first place.
     */
    const named = [
      '500+ placements',
      '1,000+ placements',
      '5+ placements',
      '9+ helpers placed',
      '8+ clients',
      '500+placements',
      '1,000+family stories',
      'We have completed 5+ placements.',
      'We have completed 500+placements.',
    ]

    const generated: string[] = []
    for (const number of ['5', '9', '12', '500', '1,000']) {
      for (const gap of ['', ' ', '  ']) {
        for (const noun of [
          'placement',
          'placements',
          'helper',
          'helpers',
          'family',
          'families',
          'client',
          'clients',
          'customer',
          'customers',
        ]) {
          generated.push(`We have completed ${number}+${gap}${noun}.`)
        }
      }
    }
    expect(generated).toHaveLength(150)

    const corpus = [...named, ...generated]

    // Not vacuous: every string here is one the old pattern genuinely caught.
    expect(corpus.filter((s) => !OLD_PATTERN.test(s))).toEqual([])

    // ...and not one of them has been let go.
    expect(corpus.filter((s) => !COUNT_LITERAL.test(s))).toEqual([])
  })

  it('the count pattern catches a figure typed without its plus', () => {
    /*
     * Fixtures first, because the sweep below is a negative over a corpus
     * that contains none of these — a pattern that had quietly stopped
     * matching would report nothing forever. The first three are the exact
     * forms the old pattern let through.
     */
    for (const retype of [
      'over 500 placements',
      'more than 500 families served',
      '500 helpers placed',
      '500+ placements',
      '1,000+ placements',
      'We have completed 500 successful placements',
    ]) {
      expect(COUNT_LITERAL.test(retype), `not caught: ${retype}`).toBe(true)
    }
  })

  it('the count pattern does not fire on the numbers the site legitimately publishes', () => {
    // Every one of these is real published copy. A guard that failed them is
    // a guard the next person loosens.
    for (const published of [
      '1 replacement within 6 months',
      'The fly-in package with replacement ($1,640.10) covers',
      'approximately 2 weeks after confirmation',
      'an annual claim limit of at least $60,000 per year',
      'We aim to respond within 1 business day',
      'The two packages differ by $500 — the agent fee',
      'Medical checkup — $60',
      'placements across all services since 2022',
    ]) {
      expect(COUNT_LITERAL.test(published), `false positive: ${published}`).toBe(false)
    }
  })

  it('no authored surface retypes the figure', () => {
    // The two-file version of this rule, widened to every surface. The
    // number is revisable — it came down from "1,000+" once already — and a
    // literal typed into a page is how a revision half-lands.
    const offenders = authoredSurfaces()
      .filter(({ text }) => COUNT_LITERAL.test(text))
      .map(({ file, text }) => `${file}: "${text.match(COUNT_LITERAL)![0]}"`)
    expect(offenders).toEqual([])
  })
})

describe('the licence number, the registered entity and the UEN are never retyped', () => {
  /*
   * Task 8. The placement count has had a "never retyped" sweep since G-2,
   * for a good reason: it was revised once and a literal on a page is how a
   * revision half-lands. THE LICENCE NUMBER HAD NONE, and it is the value
   * master brief §70 is strictest about — "never invent, modify, guess or
   * substitute", verified against MOM's own source before publication.
   *
   * It was already retyped when this was written: src/pages/why-directhired
   * .astro's meta description carried the literal '23C1443' while the same
   * page's credentials block read it from company.ts. Two copies of a
   * regulator-issued identifier, one of them invisible in the rendered page
   * and therefore the one nobody would re-check. Fixed in the same commit as
   * this guard.
   *
   * The registered entity joins it because /about publishes it and because
   * it has the same property: one authoritative source, no reason for a
   * second copy, and a typo in it is a misstatement about a legal person.
   * THE UEN JOINS THEM BOTH (2026-08-16, spec §2.6.9) for the same reason
   * and one more: it is the handle a family or a regulator looks the company
   * up BY, so a second copy that drifts by one character does not merely
   * misstate the company, it points at a different one or at nothing.
   *
   * ---------------------------------------------------------------------
   * THE CORPUS, AND WHY IT IS NO LONGER THE FOUR MARKUP DIRECTORIES ALONE.
   * ---------------------------------------------------------------------
   *
   * This sweep used to read src/components, src/sections, src/layouts,
   * src/pages and src/content, and its own comment claimed that was "the
   * corpus that can put a value in front of a visitor", with src/lib and
   * src/data deliberately outside it. THAT CLAIM WAS FALSE, and the /about
   * review proved it by measurement rather than by argument: adding
   *
   *     identifier: 'MOM Employment Agency Licence 23C1443',
   *     legalName:  'Direct Hired Pte. Ltd.',
   *
   * to employmentAgencySchema() in src/lib/structured-data.ts scored 455/455
   * green. That function's JSON-LD ships on the homepage TODAY, and spec §3.2
   * puts EmploymentAgency structured data on /contact — so the one un-swept
   * file was exactly the file the next task edits. A literal there is worse
   * than one in a page, not better: it reaches Google rather than a reader,
   * so nobody ever sees it rendered and nobody ever re-checks it.
   *
   * INCLUDED, and what each one is:
   *
   *   src/components, src/sections, src/layouts, src/pages — markup.
   *   src/content/**.md — copy that becomes markup.
   *   src/lib/*.ts       — the modules that BUILD strings the pages emit:
   *                        structured-data.ts writes JSON-LD, whatsapp.ts
   *                        builds the message a visitor sends, nav.ts builds
   *                        the labels in the header.
   *   src/data/*.ts      — except company.ts. pricing.ts's package names and
   *                        line-item labels and images.ts's exported strings
   *                        are rendered copy that merely happens to live in
   *                        a data module.
   *   public/**          — text files only. Everything in public/ is served
   *                        verbatim at the site root; robots.txt is already
   *                        asserted to derive its host from company.ts, which
   *                        settles that public/ is a surface. Fonts and other
   *                        binaries are filtered by extension rather than
   *                        read, since they cannot carry a legible literal.
   *
   * EXCLUDED, on the record so the next reader does not have to re-derive it:
   *
   *   src/data/company.ts — the single definition. Excluded by not being
   *                        walked rather than by a filter.
   *   src/data/images.json — a provenance registry with no field that becomes
   *                        visitor copy; every string in it is `provenance`,
   *                        `renderedAt`, `depicts`, `notes` or
   *                        `aiForbiddenReason`. It is documentation in data
   *                        form — the JSON analogue of the comments this
   *                        sweep already strips — and its one mention of the
   *                        licence is inside a prohibition ABOUT that licence
   *                        ("a claim about a real, licensed business (MOM
   *                        23C1443) that is simply false"). JSON has no
   *                        comment syntax to strip it with.
   *   scripts/           — build and deploy tooling. Nothing under it is
   *                        served or rendered. generate-info-required.mjs
   *                        writes a client checklist, which is a document.
   *   docs/              — and this is the load-bearing exclusion.
   *                        docs/OPEN-DECISIONS.md must state the entity name
   *                        and the UEN verbatim, because it is the document
   *                        that asked DirectHired to confirm them. A sweep
   *                        that reached docs/ would forbid asking the
   *                        question.
   */
  function walk(dir: string): string[] {
    return readdirSync(dir).flatMap((entry) => {
      const full = join(dir, entry).split('\\').join('/')
      return statSync(full).isDirectory() ? walk(full) : [full]
    })
  }

  /**
   * Comments stripped: all three values are explained in prose above the
   * markup that renders them, and company.ts's own docblock quotes every one
   * of them. A rule explained next to the code obeying it must not read as a
   * breach.
   *
   * BLOCK COMMENTS ONLY — `//` line comments are deliberately left in place,
   * including in the .ts files this sweep now reads. A naive `//` stripper
   * deletes everything after the `//` in `https://…`, so a literal typed
   * after a URL on the same line would be erased from the text this sweep
   * searches. Hiding a retyped licence number is the one failure mode this
   * file cannot afford, and the cost of not stripping is small: a `//`
   * comment mentioning one of these values fails here, and the fix is to
   * write it as a block comment, which is this repo's convention for an
   * explanation of any length anyway.
   */
  const sourceText = (file: string) =>
    readFileSync(file, 'utf8')
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')

  /**
   * Files under public/ that could carry a legible literal. Fonts and any
   * other binary are filtered out by extension rather than read as utf8 —
   * a woff2 read as text is noise, and noise in a negative sweep is how a
   * false positive arrives.
   */
  const PUBLIC_TEXT = /\.(txt|xml|json|webmanifest|svg|html)$/

  /** Every file that can put one of these values in front of a visitor. */
  function authoredSurfaces(): { file: string; text: string }[] {
    const markup = ['src/components', 'src/sections', 'src/layouts', 'src/pages']
      .flatMap(walk)
      .filter((f) => f.endsWith('.astro'))
      .map((file) => ({ file, text: sourceText(file) }))
    const markdown = walk('src/content')
      .filter((f) => f.endsWith('.md'))
      .map((file) => ({ file, text: readFileSync(file, 'utf8') }))
    // The modules that build strings the pages emit. company.ts is the
    // single definition and is excluded by name; images.json is excluded by
    // the .ts filter, which is also what the header says about it.
    const modules = ['src/lib', 'src/data']
      .flatMap(walk)
      .filter((f) => f.endsWith('.ts') && f !== 'src/data/company.ts')
      .map((file) => ({ file, text: sourceText(file) }))
    const served = walk('public')
      .filter((f) => PUBLIC_TEXT.test(f))
      .map((file) => ({ file, text: readFileSync(file, 'utf8') }))
    return [...markup, ...markdown, ...modules, ...served]
  }

  function builtPages(): { file: string; text: string }[] {
    return walk('dist')
      .filter((f) => f.endsWith('.html'))
      .map((file) => ({ file, text: readFileSync(file, 'utf8') }))
  }

  it('sweeps real surfaces (guards the sweep itself)', () => {
    const files = authoredSurfaces().map((s) => s.file)
    expect(files.length).toBeGreaterThanOrEqual(20)
    expect(files).toContain('src/sections/TrustBar.astro')
    expect(files).toContain('src/pages/why-directhired.astro')
    // The corpus extension, named file by file. Every assertion below is a
    // negative one, so a walk that quietly stopped covering src/lib would
    // reopen the exact hole this extension closed and report nothing.
    expect(files).toContain('src/lib/structured-data.ts')
    expect(files).toContain('src/data/pricing.ts')
    expect(files).toContain('public/robots.txt')
  })

  it('does not sweep the single definition, or documentation, or tooling', () => {
    /*
     * The other half of the corpus decision, asserted rather than left to a
     * comment. company.ts quotes all three values and is the source of all
     * three; docs/OPEN-DECISIONS.md states the entity name and the UEN
     * verbatim because it is the file that asked DirectHired to confirm
     * them; images.json quotes the licence inside a prohibition about that
     * licence. If any of the three ever entered the corpus, the sweep would
     * fail on a file that is right — and the temptation would be to weaken
     * the rule rather than to fix the corpus.
     */
    const files = authoredSurfaces().map((s) => s.file)
    expect(files).not.toContain('src/data/company.ts')
    expect(files).not.toContain('src/data/images.json')
    expect(files.some((f) => f.startsWith('docs/'))).toBe(false)
    expect(files.some((f) => f.startsWith('scripts/'))).toBe(false)
  })

  it('all three values really are published (the checks below have a subject)', () => {
    // A guard against retyping a value nothing prints would be green
    // forever and mean nothing. The trust bar carries the licence on every
    // page; the registered entity and the UEN are published by /about alone,
    // which is also the assertion that catches that page silently dropping
    // either of them.
    const pages = builtPages()
    expect(pages.some((p) => p.text.includes(company.momLicence))).toBe(true)
    expect(pages.some((p) => p.text.includes(company.registeredName))).toBe(true)
    expect(pages.some((p) => p.text.includes(company.uen))).toBe(true)
  })

  it('no authored surface types the licence number as a literal', () => {
    const offenders = authoredSurfaces()
      .filter(({ text }) => text.includes(company.momLicence))
      .map(({ file }) => file)
    expect(offenders).toEqual([])
  })

  it('no authored surface types the UEN as a literal', () => {
    const offenders = authoredSurfaces()
      .filter(({ text }) => text.includes(company.uen))
      .map(({ file }) => file)
    expect(offenders).toEqual([])
  })

  /**
   * The registered entity, in any spelling a human would type.
   *
   * THE OLD PATTERN WAS CASE-INSENSITIVE AND NOTHING ELSE, so it matched
   * only the punctuated form. Hand-typing `Direct Hired Pte Ltd` — no full
   * stops — into a rendered element scored 455/455 green, and that is not a
   * contrived variant: it is the exact string company.ts's own docblock
   * records the public search returning against licence 23C1443, which makes
   * it the likeliest thing a writer copies in.
   *
   * DERIVED FROM company.registeredName, never re-typed here, so the guard
   * cannot describe a name the site no longer publishes. Three relaxations,
   * each for a spelling that is the same second copy:
   *
   *   full stops optional   PTE. LTD.  ·  PTE LTD
   *   comma optional        Pte. Ltd.  ·  Pte., Ltd.
   *   any gap, or none      Direct Hired  ·  DirectHired
   *
   * The last one cannot false-positive on the brand name alone: the pattern
   * still requires PTE and LTD after it, and "DirectHired Pte Ltd" is a
   * retyping of the entity by any reading.
   */
  const entityNeedle = new RegExp(
    company.registeredName
      .trim()
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\\\./g, '\\.?')
      .replace(/\s+/g, '\\s*,?\\s*'),
    'i',
  )

  it('the entity pattern reads every spelling of the name (guards the check below)', () => {
    /*
     * The assertion below is a negative one over a corpus that contains none
     * of these, so a pattern that had quietly stopped matching would report
     * nothing forever. These four spellings are asserted directly against the
     * pattern instead — the punctuated form the site publishes, the
     * unpunctuated form the public search returns, the title-cased form a
     * writer reaches for, and the shouted unpunctuated one.
     */
    for (const spelling of [
      'DIRECT HIRED PTE. LTD.',
      'Direct Hired Pte Ltd',
      'Direct Hired Pte. Ltd.',
      'DIRECT HIRED PTE LTD',
      'Direct Hired Pte., Ltd.',
      'DirectHired Pte Ltd',
    ]) {
      expect(entityNeedle.test(`<dd class="record-value">${spelling}</dd>`), spelling).toBe(true)
    }
    // ...and it must not match the brand name, which is on every page.
    expect(entityNeedle.test('DirectHired is a Singapore employment agency.')).toBe(false)
  })

  it('no authored surface types the registered entity as a literal', () => {
    const offenders = authoredSurfaces()
      .filter(({ text }) => entityNeedle.test(text))
      .map(({ file }) => file)
    expect(offenders).toEqual([])
  })

  /* =====================================================================
   * THE SWEEPS ABOVE ONLY CATCH AN EXACT COPY OF THE *CORRECT* VALUE.
   *
   * Every one of them filters with `text.includes(company.momLicence)` — a
   * value equality. A page that types `23C1444` contains no such substring,
   * so it passes; so does `202240965Z`, and so does `DIRECT HIRE PTE. LTD.`
   * with the D missing.
   *
   * MASTER BRIEF §70 FORBIDS FOUR THINGS: "invent, modify, guess or
   * SUBSTITUTE" these values. A value-equality sweep can see only the fourth
   * failure mode's harmless twin — a correct duplicate. The three that
   * matter, and the one the rule names last, are precisely the ones it is
   * blind to, because a wrong value is not a copy of the right one.
   *
   * A licence number is the highest-stakes string on the site: it identifies
   * a regulated entity to a family and to MOM. `23C1444` is somebody else's
   * licence or nobody's, and it would ship green.
   *
   * SO THESE SWEEP BY SHAPE. Anything with the SHAPE of one of the three
   * values must BE that value, or it is reported — whether it is right, wrong
   * or invented.
   *
   * SVG GEOMETRY IS STRIPPED FIRST, and it has to be. The logo's path data
   * contains `52S1176`, `91S1150`, `62H1199`, `94C1331`, `83S1278` and
   * `73S1404` — coordinate pairs separated by path commands, which read as
   * licence numbers to any pattern of that shape. They are inlined into every
   * built page. Stripping `d`, `points`, `viewBox`, `transform` and
   * `preserveAspectRatio` removes all six and leaves the real licence
   * standing, verified by measurement. Same principle as this file's existing
   * exclusion of binaries: "noise in a negative sweep is how a false positive
   * arrives".
   * ================================================================== */

  /** SVG coordinate data — geometry, never copy, and it is full of noise. */
  const withoutGeometry = (text: string) =>
    text.replace(
      /\s(?:d|points|viewBox|transform|preserveAspectRatio)\s*=\s*(?:"[^"]*"|'[^']*')/gi,
      ' ',
    )

  /** A MOM employment-agency licence: two digits, a letter, four digits. */
  const LICENCE_SHAPE = /\b\d{2}[A-Z]\d{4}\b/g
  /** A Singapore UEN of the local-company form: nine digits, a check letter. */
  const UEN_SHAPE = /\b\d{9}[A-Z]\b/g
  /** Any "<name> PTE LTD", punctuated or not. */
  const ENTITY_SHAPE = /\b[A-Za-z][A-Za-z&.'’-]*(?:\s+[A-Za-z&.'’-]+){0,4}\s+PTE\.?\s*,?\s*LTD\.?/gi

  /** Collapsed and upper-cased, so punctuation and spacing cannot hide a swap. */
  const normEntity = (s: string) => s.replace(/\s+/g, ' ').trim().toUpperCase()

  const shapesIn = (text: string, shape: RegExp) => [
    ...new Set(withoutGeometry(text).match(new RegExp(shape.source, shape.flags)) ?? []),
  ]

  it('the shape patterns match the real values (or every sweep below is vacuous)', () => {
    expect(company.momLicence).toMatch(new RegExp(LICENCE_SHAPE.source))
    expect(company.uen).toMatch(new RegExp(UEN_SHAPE.source))
    expect(company.registeredName).toMatch(new RegExp(ENTITY_SHAPE.source, 'i'))
  })

  it('the shape patterns match a SUBSTITUTED value, which is the whole point', () => {
    /*
     * The failure mode the value-equality sweeps cannot see. Each of these is
     * one character away from the truth and identifies a different company,
     * or none.
     */
    expect('23C1444').toMatch(new RegExp(LICENCE_SHAPE.source))
    expect('23C1443'.replace('C', 'S')).toMatch(new RegExp(LICENCE_SHAPE.source))
    expect('202240965Z').toMatch(new RegExp(UEN_SHAPE.source))
    expect('202240964A').toMatch(new RegExp(UEN_SHAPE.source))
    expect('DIRECT HIRE PTE. LTD.').toMatch(new RegExp(ENTITY_SHAPE.source, 'i'))
    expect('Direct Hired Pty Ltd'.replace('Pty', 'Pte')).toMatch(
      new RegExp(ENTITY_SHAPE.source, 'i'),
    )
    // …and none of them is caught by the value-equality the sweeps above use.
    expect('23C1444'.includes(company.momLicence)).toBe(false)
    expect('202240965Z'.includes(company.uen)).toBe(false)
    expect('DIRECT HIRE PTE. LTD.'.includes(company.registeredName)).toBe(false)
  })

  it('the geometry stripper removes the logo path data and nothing else', () => {
    // Asserted directly, because if it ever over-reached it would silently
    // delete the very strings the sweeps below exist to find.
    const logo = readFileSync('src/assets/logo-lockup.svg', 'utf8')
    expect(logo.match(LICENCE_SHAPE)?.length ?? 0).toBeGreaterThan(0)
    expect(shapesIn(logo, LICENCE_SHAPE)).toEqual([])
    expect(shapesIn(`<p>${company.momLicence}</p>`, LICENCE_SHAPE)).toEqual([company.momLicence])
    expect(shapesIn(`<dd>${company.uen}</dd>`, UEN_SHAPE)).toEqual([company.uen])
  })

  it('no built page publishes a licence-shaped string that is not the licence', () => {
    const offenders = builtPages().flatMap(({ file, text }) =>
      shapesIn(text, LICENCE_SHAPE)
        .filter((found) => found !== company.momLicence)
        .map((found) => `${file}: ${found}`),
    )
    expect(offenders).toEqual([])
  })

  it('no built page publishes a UEN-shaped string that is not the UEN', () => {
    const offenders = builtPages().flatMap(({ file, text }) =>
      shapesIn(text, UEN_SHAPE)
        .filter((found) => found !== company.uen)
        .map((found) => `${file}: ${found}`),
    )
    expect(offenders).toEqual([])
  })

  it('no built page publishes a PTE LTD name that is not the registered entity', () => {
    const offenders = builtPages().flatMap(({ file, text }) =>
      shapesIn(text, ENTITY_SHAPE)
        .filter((found) => normEntity(found) !== normEntity(company.registeredName))
        .map((found) => `${file}: ${found}`),
    )
    expect(offenders).toEqual([])
  })

  it('no authored surface types ANY string of these three shapes', () => {
    /*
     * Stricter than the built-page sweeps on purpose, and it can be: every
     * one of these values reaches a page from company.ts, so a source file
     * has no business containing the shape AT ALL — not the right value, not
     * a wrong one.
     *
     * This subsumes the three value-equality sweeps above, which are kept
     * because they name the failure precisely when it is a duplicate, and
     * because their fixtures document the entity spellings.
     */
    const offenders = authoredSurfaces().flatMap(({ file, text }) => [
      ...shapesIn(text, LICENCE_SHAPE).map((f) => `${file}: licence-shaped "${f}"`),
      ...shapesIn(text, UEN_SHAPE).map((f) => `${file}: UEN-shaped "${f}"`),
      ...shapesIn(text, ENTITY_SHAPE).map((f) => `${file}: entity-shaped "${f}"`),
    ])
    expect(offenders).toEqual([])
  })

})

/*
 * THE CREDENTIALS TELL ONE STORY, ON BOTH PAGES — W-5, 2026-08-17.
 *
 * /about and /why-directhired each publish a block of the company's
 * particulars, and they framed the same values in opposite directions.
 *
 *   /about:318            "DirectHired’s particulars, as the company gives
 *                          them." — accurate, and flat: it put the MOM
 *                          licence, which is on a public register, on the
 *                          same footing as a placement count that is
 *                          registered nowhere. The page's own comment at :303
 *                          already noted that only the licence is
 *                          independently checkable; the copy did not.
 *
 *   /why-directhired:292  "What you can check"
 *                   :300  "Everything above is a description of how we work.
 *                          These three are not." — a claim that all three
 *                          values are matters of record.
 *                   :323  "…the one fact on this page that does not rest on
 *                          our word." — the page contradicting itself three
 *                          rows later.
 *
 * WHAT IS TRUE. The MOM licence is the one published value a family can check
 * without asking DirectHired. The registered entity and the UEN are
 * client-supplied and verification of both was ATTEMPTED AND FAILED (spec
 * §2.6.8, §2.6.9; src/data/company.ts records how). The founded year is
 * DirectHired's. The placement count is DirectHired's and no register holds
 * it.
 *
 * THE FIX IS STRUCTURAL, not a pair of edits. Both sentences are single
 * definitions in src/data/company.ts and both pages render both, because two
 * pages hand-writing the same claim is how these two came to disagree — the
 * same failure W-4 records for the founding story, in the same week.
 */
describe('the credentials tell the same story on both pages', () => {
  const PAGES = {
    '/about': 'dist/about/index.html',
    '/why-directhired': 'dist/why-directhired/index.html',
  } as const

  /** Rendered text, entities decoded, so a sentence matches as a reader reads it. */
  function rendered(file: string): string {
    return readFileSync(file, 'utf8')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
      .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/\s+/g, ' ')
  }

  it('both pages publish the licence standing, verbatim and from the constant', () => {
    for (const [page, file] of Object.entries(PAGES)) {
      expect(rendered(file), `${page} does not publish company.licenceStanding`).toContain(
        company.licenceStanding,
      )
    }
  })

  it('both pages publish the supplied-value standing, verbatim and from the constant', () => {
    for (const [page, file] of Object.entries(PAGES)) {
      expect(rendered(file), `${page} does not publish company.suppliedStanding`).toContain(
        company.suppliedStanding,
      )
    }
  })

  it('the two sentences say what they are claimed to say', () => {
    /*
     * Named parts rather than a byte comparison, so a rewrite of either
     * constant that quietly dropped the register — or quietly promoted a
     * client-supplied value to a checked one — fails here.
     */
    expect(company.licenceStanding).toMatch(/Ministry of Manpower/)
    expect(company.licenceStanding).toMatch(/public register/i)
    expect(company.licenceStanding).toMatch(/check without asking us/i)
    expect(company.suppliedStanding).toMatch(/every other value/i)
    expect(company.suppliedStanding).toMatch(/company[’']s word/i)
    // It must NOT claim no register holds them. ACRA holds an entity name and
    // a UEN; what this repository lacks is a READING of them, which is a
    // different and much smaller claim — see company.ts.
    expect(company.suppliedStanding).not.toMatch(/no (?:public )?register/i)
  })

  it('neither page retypes either sentence', () => {
    // The whole mechanism. If a page ever holds its own copy, the two can
    // drift apart again and nothing above would notice — both would still be
    // "published verbatim", from two different literals.
    for (const file of ['src/pages/about.astro', 'src/pages/why-directhired.astro']) {
      const source = readFileSync(file, 'utf8')
      const markup = source.slice(source.indexOf('---', 3))
      expect(markup, `${file} retypes licenceStanding`).not.toContain(company.licenceStanding)
      expect(markup, `${file} retypes suppliedStanding`).not.toContain(company.suppliedStanding)
      expect(markup, `${file} does not read company.licenceStanding`).toContain(
        'company.licenceStanding',
      )
      expect(markup, `${file} does not read company.suppliedStanding`).toContain(
        'company.suppliedStanding',
      )
    }
  })

  it('neither page publishes the claims that contradicted each other', () => {
    /*
     * The three sentences that shipped, banned by their distinguishing
     * wording rather than in full, so a lightly-reworded return is caught
     * too. Each is a claim about the STANDING of the block, which is the
     * thing the two constants above now own.
     */
    const BANNED: { why: string; pattern: RegExp }[] = [
      {
        why: '/about flattening the licence onto the client-supplied values',
        pattern: /particulars,\s*as the company gives them/i,
      },
      {
        why: '/why-directhired claiming every value in the block is a matter of record',
        pattern: /description of how we work\.\s*These three are not/i,
      },
      {
        why: '/why-directhired scoping the licence claim to the whole page',
        pattern: /the one fact on this page that does not rest on our word/i,
      },
      {
        why: 'a heading that claims checkability for values that are not checkable',
        pattern: /<h2[^>]*>\s*What you can check\s*<\/h2>/i,
      },
    ]
    const offenders = Object.entries(PAGES).flatMap(([page, file]) => {
      const html = readFileSync(file, 'utf8')
      const text = rendered(file)
      return BANNED.filter(({ pattern }) => pattern.test(text) || pattern.test(html)).map(
        ({ why }) => `${page}: ${why}`,
      )
    })
    expect(offenders).toEqual([])
  })

  it('the licence is still named on both pages, so the story has a subject', () => {
    // A rule made only of prohibitions passes on a page that deleted the
    // block. This is the half that says the credentials are still published.
    for (const [page, file] of Object.entries(PAGES)) {
      expect(rendered(file), `${page} no longer publishes the licence`).toContain(
        company.momLicence,
      )
    }
  })
})
