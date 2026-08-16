/**
 * The compliance gate.
 *
 * DirectHired supplied the helper loan's repayment mechanics on
 * 2026-08-16: the range it runs over, where in the helper's pay it is
 * taken from, and what she receives alongside it. Core-pages design spec
 * §2.5 withholds all three from publication. Not because they are doubted
 * — they came from the client — but because they describe a
 * salary-deduction arrangement on a licensed employment agency's public
 * website, in an area MOM regulates closely, and source brief §19 requires
 * the final wording to be reviewed against DirectHired's actual commercial
 * and regulatory terms first. It is the highest-liability sentence on the
 * site. What is missing is sign-off, not information.
 *
 * WHAT IS SCANNED, AND WHY IT IS THE BUILT HTML.
 *
 * dist/, not src/. The gate is about what is PUBLISHED. Several source
 * files — LoanAndPlacement.astro, PricingSection.astro, this test, and
 * scripts/generate-info-required.mjs — necessarily name the gated facts in
 * order to explain that they are gated, and a source-level scan would
 * either fail on those comments or need an exemption list long enough to
 * be worth nothing. Astro emits no frontmatter comments into the build, so
 * the built HTML contains exactly what a visitor can read. That is the
 * artefact the rule is about.
 *
 * PARAPHRASE COUNTS. "Over several months", "from what she earns", "she
 * keeps only her rest-day pay" would each publish the same arrangement in
 * different words while passing a literal search for the client's phrasing
 * — so the patterns below cover the mechanism, not the wording. They are
 * necessarily incomplete: no regex catches every way of saying a thing.
 * They are a backstop under the actual rule, which is written in
 * src/sections/LoanAndPlacement.astro's header — write around the
 * mechanism entirely, do not gesture at it.
 *
 * WHAT IS DELIBERATELY STILL ALLOWED. "One month's salary" is the
 * placement fee and is published on purpose; "6 months" is the replacement
 * window; "repayment" with no schedule, source or duration attached is the
 * §2.4 framing that ships. None of the patterns below may catch those, and
 * the positive assertions at the end of this file prove they do not — a
 * gate that also swallowed the copy it is protecting would be "fixed" by
 * deleting the section, which is the failure mode worth guarding against.
 *
 * RESOLVING THIS. When DirectHired signs off, the paragraph goes in and
 * the expectations here come out — in the same commit that removes the
 * declared input from scripts/generate-info-required.mjs. Deliberately not
 * a one-line switch: this should cost a moment's thought.
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { execSync } from 'node:child_process'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

// build:dev, not build — `npm run build` pipes through
// scripts/check-tbd.mjs and would couple this suite to the client's
// outstanding-<Tbd> state. Same reasoning, and the same command, as
// tests/links.test.ts.
beforeAll(() => {
  execSync('npm run build:dev', { stdio: 'inherit' })
}, 180_000)

/**
 * Reads dist/ fresh on every call, and every caller below calls it from
 * INSIDE an `it`. That placement is load-bearing, not stylistic. Hoisting
 * it to a `const pages = builtPages()` in a describe body — which is where
 * it sat when this file was first written — evaluates it during vitest's
 * collection phase, which runs BEFORE `beforeAll`. The suite then asserts
 * against whatever dist/ happened to be left on disk by a previous run
 * rather than against the build it just made.
 *
 * That was caught by the mutation check: a paragraph publishing all three
 * gated facts was added to LoanAndPlacement.astro and all 25 assertions
 * still passed, because they were reading the previous, clean build. A
 * compliance gate that reports on a stale artefact is worse than none —
 * it is green for the wrong reason at the exact moment it matters.
 */
function builtPages(): { file: string; html: string }[] {
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((entry) => {
      const full = join(dir, entry).split('\\').join('/')
      return statSync(full).isDirectory() ? walk(full) : [full]
    })

  return walk('dist')
    .filter((f) => f.endsWith('.html'))
    .map((file) => ({ file, html: readFileSync(file, 'utf8') }))
}

/**
 * Each entry is one way of publishing the gated arrangement. `label` names
 * the fact, not the string, so a failure message says what was published
 * rather than which regex fired.
 */
const GATED_PATTERNS: { label: string; pattern: RegExp }[] = [
  // --- the 1-7 month repayment range, in the client's own terms ---
  {
    label: 'the 1-7 month repayment range',
    pattern: /\b1\s*(?:-|–|—|to)\s*7\s*months?\b/i,
  },
  {
    label: 'the 7-month maximum',
    pattern: /\b(?:7|seven)\s*months?\b/i,
  },
  // --- and the paraphrases of it: any duration attached to repaying ---
  {
    label: 'a repayment duration',
    pattern: /\brepay(?:ment|ing|s|ed)?\b[^.!?]{0,60}\b(?:months?|weeks?|years?)\b/i,
  },
  {
    label: 'a duration attached to the loan or placement fee',
    pattern: /\b(?:loan|placement fee)\b[^.!?]{0,60}\b(?:over|within|across|takes?)\s+\w+\s+months?\b/i,
  },
  {
    label: 'a repayment schedule',
    pattern: /\b(?:repayment|instal?ment)\s+(?:period|schedule|term|plan|window)\b/i,
  },
  {
    label: 'repayment described as instalments',
    pattern: /\binstal?ments?\b/i,
  },
  {
    label: 'a monthly repayment cadence',
    pattern: /\bmonthly\b[^.!?]{0,40}\b(?:repa|deduct|instal)/i,
  },
  {
    label: 'repayment described as running over a span of months',
    pattern: /\bover\s+(?:several|a few|the first|\d+|one|two|three|four|five|six|seven)\s+months?\b/i,
  },

  // --- that repayment comes from the helper's basic salary ---
  {
    label: "the helper's basic salary as the source of repayment",
    pattern: /\bbasic (?:salary|pay|wage)\b/i,
  },
  {
    label: 'a salary deduction',
    pattern: /\b(?:salary|wage|pay)[- ]deduction/i,
  },
  {
    label: 'an amount deducted from pay',
    pattern: /\bdeduct(?:ed|ion|ions|s|ing)?\b[^.!?]{0,40}\b(?:salary|wages?|pay|earnings)\b/i,
  },
  {
    label: 'repayment taken out of the salary',
    pattern:
      /\b(?:from|out of|against)\s+(?:her|his|their|the helper[’']?s?)\s+(?:monthly\s+)?(?:salary|wages?|pay|earnings)\b/i,
  },
  {
    label: 'repayment described as coming from what the helper earns',
    pattern: /\bwhat\s+(?:she|he|they|the helper)\s+earns?\b/i,
  },

  // --- that the helper receives off-day compensation during repayment ---
  {
    label: 'off-day compensation',
    pattern: /\boff[- ]days?\s+(?:compensation|pay|allowance)\b/i,
  },
  {
    label: 'rest-day compensation',
    pattern: /\brest[- ]days?\s+(?:compensation|pay|allowance)\b/i,
  },
  {
    label: 'day-off compensation',
    pattern: /\bdays?[- ]off\s+(?:compensation|pay|allowance)\b/i,
  },
  {
    label: 'what the helper keeps during repayment',
    pattern: /\b(?:she|he|they|the helper)\s+(?:still\s+)?keeps?\s+(?:only\s+)?(?:her|his|their)\b/i,
  },
]

describe('the gate scans what it claims to scan', () => {
  // Without this every assertion below passes vacuously on an empty or
  // mis-walked dist/ — which, on a test whose whole job is to say "this
  // was not published", is the worst possible way to be green.
  it('finds the built pages', () => {
    const pages = builtPages()
    expect(pages.length).toBeGreaterThanOrEqual(2)
    expect(pages.map((p) => p.file)).toContain('dist/index.html')
    expect(pages.map((p) => p.file)).toContain('dist/pricing/index.html')
  })

  it('reads real page copy, not empty shells', () => {
    const pricing = builtPages().find((p) => p.file === 'dist/pricing/index.html')!
    expect(pricing.html).toContain('placement fee')
    expect(pricing.html.length).toBeGreaterThan(10_000)
  })
})

describe('the gated repayment mechanics are published nowhere', () => {
  for (const { label, pattern } of GATED_PATTERNS) {
    it(`no page publishes ${label}`, () => {
      const offenders = builtPages()
        .filter(({ html }) => pattern.test(html))
        .map(({ file }) => `${file} (matched ${pattern})`)
      expect(offenders).toEqual([])
    })
  }
})

describe('the framing that DOES ship is not caught by the gate', () => {
  // The gate must not be satisfiable by deleting the section it protects.
  // These assert the §2.4 copy the plan explicitly clears for publication,
  // so a pattern written too broadly fails here instead of silently
  // eating the page's most important paragraph.
  const pricing = () => builtPages().find((p) => p.file === 'dist/pricing/index.html')!.html

  it('publishes the placement fee as one month’s salary', () => {
    expect(pricing()).toMatch(/one month[’']s salary/i)
  })

  it('publishes that the loan is assessed case by case, with no figure', () => {
    expect(pricing()).toMatch(/case by case/i)
  })

  it('publishes both halves of the §2.4 framing — advanced, and recovered', () => {
    const html = pricing()
    expect(html).toMatch(/\badvance\b/i)
    expect(html).toMatch(/\brecover\b/i)
    expect(html).toMatch(/helper[’']s<\/strong>\s*cost|helper[’']s\s*cost/i)
  })

  it('still states the 6-month replacement window, which is not gated', () => {
    expect(pricing()).toMatch(/6 months/i)
  })
})

describe('the gate is recorded as a declared input, not just enforced here', () => {
  // A test that quietly blocks a fact is a test that will one day be
  // deleted by someone who cannot tell why it exists. The client-facing
  // record of WHY has to exist too, in the document DirectHired actually
  // reads before launch.
  // These two read source and docs, not build output, so reading them at
  // collection time is safe — neither is produced by the beforeAll build.
  const script = () => readFileSync('scripts/generate-info-required.mjs', 'utf8')
  const checklist = () => readFileSync('docs/INFORMATION-REQUIRED-BEFORE-PRODUCTION.md', 'utf8')

  it('is declared in DECLARED_INPUTS', () => {
    expect(script()).toContain('Compliance sign-off on loan repayment terms')
  })

  it('appears in the generated checklist under Category C', () => {
    const doc = checklist()
    const categoryC = doc.slice(
      doc.indexOf('## Category C'),
      doc.indexOf('## Category D'),
    )
    expect(categoryC).toContain('Compliance sign-off on loan repayment terms')
    expect(categoryC).toContain('what is missing is sign-off, not information')
  })
})
