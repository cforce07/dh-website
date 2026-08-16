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
