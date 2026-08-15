import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
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
