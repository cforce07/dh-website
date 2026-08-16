import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { packages, packageTotalCents } from '../src/data/pricing'
import { formatSgd } from '../src/lib/money'

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
 * Everything a visitor can actually read: the content collections verbatim,
 * plus the comment-free source of every file that renders markup. Data and
 * lib files are deliberately NOT included — src/data/company.ts's
 * `address.country: 'SG'` and structured-data.ts's `areaServed: Country`
 * are the business's own Singapore address, which is a country, and
 * neither is prose about a helper source.
 */
function renderedCopy(): { file: string; text: string }[] {
  const markdown = walk('src/content')
    .filter((f) => f.endsWith('.md'))
    .map((file) => ({ file, text: readFileSync(file, 'utf8') }))

  const markup = ['src/sections', 'src/components', 'src/layouts', 'src/pages']
    .flatMap(walk)
    .filter((f) => f.endsWith('.astro'))
    .map((file) => ({ file, text: code(readFileSync(file, 'utf8')) }))

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

  // --- extended to /pricing (design spec §5.3) -------------------------
  //
  // "That page repeats figures in prose, which is exactly where a stale
  // number hides." So the same rule now runs against the BUILT page, not
  // just the FAQ markdown: every dollar figure a visitor can read on
  // /pricing must be a real amount from pricing.ts.
  //
  // Two amounts on that page are not from pricing.ts and must not be: the
  // loan carry-forward worked sum in ReplacementTerms.astro is illustrative
  // by design (spec §2.3 forbids publishing any loan figure or range), so
  // its three values are read from that file's own constants rather than
  // exempted by pattern. If someone edits the example, this stays correct;
  // if someone types a fourth figure into the prose beside it, this fails.

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

  it('every dollar figure on the built /pricing page is a real amount', () => {
    const html = readFileSync('dist/pricing/index.html', 'utf8')
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')

    /*
     * The gap between the two package totals — "the one line that differs
     * is our agent fee, a gap of $500.00". Derived from the same totals the
     * cards print, exactly as src/pages/pricing.astro derives it, so a
     * price change moves both together and neither can go stale against the
     * other. Every ordered pair, because nothing here should depend on
     * which package is listed first.
     */
    const totals = packages.map(packageTotalCents)
    const differences = totals.flatMap((a) =>
      totals.filter((b) => b < a).map((b) => formatSgd(a - b)),
    )

    const allowed = new Set([...validAmounts, ...differences, ...illustrativeAmounts()])
    const found = text.match(dollarPattern) ?? []

    const strays = [...new Set(found)].filter((amount) => !allowed.has(amount))
    expect(strays).toEqual([])

    // Non-vacuous: the page really does print figures. It is the pricing
    // page — if this ever reads zero, the check above means nothing and the
    // page has a much bigger problem.
    expect(found.length).toBeGreaterThanOrEqual(10)
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
