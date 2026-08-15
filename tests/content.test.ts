import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { packages, packageTotalCents } from '../src/data/pricing'
import { formatSgd } from '../src/lib/money'

describe('helper sources', () => {
  const files = readdirSync('src/content/helpers')

  it('has the three current sources', () => {
    expect(files.sort()).toEqual(['indonesia.md', 'mizoram.md', 'myanmar.md'])
  })

  it('never labels Mizoram as India', () => {
    const content = readFileSync('src/content/helpers/mizoram.md', 'utf8')
    expect(content).not.toMatch(/\bIndia\b/)
  })
})

describe('services', () => {
  it('has the six current services', () => {
    expect(readdirSync('src/content/services')).toHaveLength(6)
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
  // Any "$N,NNN.NN" figure (comma thousands separator + cents) written into FAQ
  // markdown must be one of the real package totals. Markdown can't import
  // pricing.ts, so the literal strings are unavoidable duplication — this test
  // is the guard: a price change in pricing.ts that isn't mirrored in the FAQ
  // copy fails here instead of silently disagreeing with what's published.
  const validAmounts = new Set(packages.map((pkg) => formatSgd(packageTotalCents(pkg))))
  const thousandsPattern = /\$\d{1,3}(?:,\d{3})+\.\d{2}/g

  it('has at least one package total to check against (sanity check)', () => {
    expect(validAmounts.size).toBeGreaterThan(0)
  })

  it('every comma-thousands dollar figure in FAQ content matches a real package total', () => {
    const files = readdirSync('src/content/faq')
    let matchCount = 0
    for (const file of files) {
      const content = readFileSync(`src/content/faq/${file}`, 'utf8')
      const matches = content.match(thousandsPattern) ?? []
      for (const amount of matches) {
        matchCount += 1
        expect(validAmounts.has(amount)).toBe(true)
      }
    }
    // Guards against the pattern silently matching nothing (a vacuous pass).
    expect(matchCount).toBeGreaterThan(0)
  })
})
