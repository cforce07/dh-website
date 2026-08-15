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
    // The three summaries were one sentence with the country name swapped,
    // which is the clearest generated-content tell on the page. They were
    // deleted rather than rewritten, and DirectHired then closed the
    // question on 2026-08-16 (implementation plan D-5): there is no real
    // difference between the sources. Same service, same package, same
    // matching process; only the source country differs.
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
    // what people from a country are like, and the block itself adds no
    // framing of its own. This catches the most likely regression: a
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
    // Derived, not hardcoded: both packages are now itemised, so this is
    // 2 totals + 12 line items. A hardcoded count silently becomes wrong
    // the moment a package changes shape — which is exactly what happened
    // when the without-replacement package gained its breakdown.
    const expected =
      packages.length +
      packages.reduce((n, p) => n + (p.kind === 'itemised' ? p.lineItems.length : 0), 0)
    expect(amountsCents.length).toBe(expected)
    expect(validAmounts.size).toBeGreaterThanOrEqual(expected)
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
