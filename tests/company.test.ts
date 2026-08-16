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
   * Every surface a visitor's words can come from: the markup files with
   * their comments stripped (both existing surfaces explain this very rule
   * in prose above the markup that obeys it, quoting the forbidden wording),
   * plus content markdown verbatim — a FAQ answer is published copy too, and
   * /faq is one of the five pages Phase B adds.
   */
  function authoredSurfaces(): { file: string; text: string }[] {
    const markup = ['src/components', 'src/sections', 'src/layouts', 'src/pages']
      .flatMap(walk)
      .filter((f) => f.endsWith('.astro'))
      .map((file) => ({ file, text: sourceText(file) }))
    const markdown = walk('src/content')
      .filter((f) => f.endsWith('.md'))
      .map((file) => ({ file, text: readFileSync(file, 'utf8') }))
    return [...markup, ...markdown]
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
   * src/data/company.ts is the single definition, and it is excluded by not
   * being walked at all rather than by a filter: this sweep reads the four
   * markup directories and src/content, which is the corpus that can put a
   * value in front of a visitor. src/data and src/lib are deliberately
   * outside it, exactly as tests/content.test.ts's renderedCopy() leaves
   * them out for the same reason.
   */
  function walk(dir: string): string[] {
    return readdirSync(dir).flatMap((entry) => {
      const full = join(dir, entry).split('\\').join('/')
      return statSync(full).isDirectory() ? walk(full) : [full]
    })
  }

  /**
   * Comments stripped: both values are explained in prose above the markup
   * that renders them, and company.ts's own docblock quotes the licence. A
   * rule explained next to the code obeying it must not read as a breach.
   */
  const sourceText = (file: string) =>
    readFileSync(file, 'utf8')
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')

  /** Every file that can put one of these values in front of a visitor. */
  function authoredSurfaces(): { file: string; text: string }[] {
    const markup = ['src/components', 'src/sections', 'src/layouts', 'src/pages']
      .flatMap(walk)
      .filter((f) => f.endsWith('.astro'))
      .map((file) => ({ file, text: sourceText(file) }))
    const markdown = walk('src/content')
      .filter((f) => f.endsWith('.md'))
      .map((file) => ({ file, text: readFileSync(file, 'utf8') }))
    return [...markup, ...markdown]
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

  it('no authored surface types the registered entity as a literal', () => {
    // Case-insensitive: "Direct Hired Pte. Ltd." is the same second copy as
    // the shouted form, and it is the spelling a writer reaches for.
    const needle = new RegExp(
      company.registeredName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+'),
      'i',
    )
    const offenders = authoredSurfaces()
      .filter(({ text }) => needle.test(text))
      .map(({ file }) => file)
    expect(offenders).toEqual([])
  })
})
