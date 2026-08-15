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
    // 2 totals + 6 line items = 8 amounts; whole-dollar ones add a second
    // accepted rendering, so the set is larger than the amount count.
    expect(amountsCents.length).toBe(8)
    expect(validAmounts.size).toBeGreaterThanOrEqual(8)
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
    expect(matchCount).toBe(10)
  })
})
