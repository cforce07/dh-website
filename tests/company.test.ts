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

  it('no authored surface retypes the figure', () => {
    // The two-file version of this rule, widened to every surface. The
    // number is revisable — it came down from "1,000+" once already — and a
    // literal typed into a page is how a revision half-lands.
    const offenders = authoredSurfaces()
      .filter(({ text }) => /\b\d[\d,]*\+\s*(?:placement|helper|famil|client|customer)/i.test(text))
      .map(({ file }) => file)
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
})
