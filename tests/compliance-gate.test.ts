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
/*
 * Vocabulary shared by several patterns below, kept in one place so the
 * three axes stay coherent as they are extended.
 *
 * SETTLE covers the verbs a writer reaches for instead of "repay":
 * clear, settle, spread, work off. PERIOD covers the nouns a writer
 * reaches for instead of "month": a pay cycle IS a month, said in HR
 * vocabulary, and "seven salary cycles" is the gated range with the word
 * "month" removed. FUNDS covers the nouns a writer reaches for instead of
 * "salary" — take-home, income, remuneration all name the same money.
 *
 * NUMBER includes word forms because "seven monthly amounts" and "7
 * monthly amounts" are the same published fact.
 */
const SETTLE = 'repay|repaid|repayment|repaying|settle|settled|settles|settling|clear|cleared|clears|clearing|spread|recover|recovered|recovers|work(?:ed|s|ing)?\\s+off'
const PERIOD =
  'months?|monthly|pay\\s*cycles?|salary\\s*cycles?|wage\\s*cycles?|pay\\s*runs?|pay\\s*periods?|payslips?|pay\\s*packets?|instal?ments?|portions?|tranches?'
const FUNDS = 'salary|salaries|wages?|pay|payslip|earnings|income|remuneration|take[-\\s]home'
const NUMBER = '\\d+|one|two|three|four|five|six|seven|eight|nine|ten|a few|several|first few'

const GATED_PATTERNS: { label: string; pattern: RegExp }[] = [
  // --- AXIS 1: how long repayment runs ---
  {
    // Broadened from /\b1\s*(?:-|–|—|to)\s*7\s*months?\b/, which was fully
    // subsumed by "the 7-month maximum" below and so could never fire on
    // its own — a dead detector wearing a useful label. It now catches ANY
    // published month range, which is independently meaningful: "3 to 5
    // months" is a repayment range the spec forbids and contains no 7.
    label: 'a repayment range expressed in months',
    pattern: new RegExp(`\\b(?:${NUMBER})\\s*(?:-|–|—|to)\\s*(?:${NUMBER})\\s*months?\\b`, 'i'),
  },
  {
    label: 'the 7-month maximum',
    pattern: /\b(?:7|seven)\s*months?\b/i,
  },
  {
    // The client's own maximum, said without the word "month": "no longer
    // than seven salary cycles", "a maximum of seven monthly amounts".
    label: 'the 7-period maximum expressed in pay cycles',
    pattern: new RegExp(`\\b(?:7|seven)\\s*(?:${PERIOD})\\b`, 'i'),
  },
  {
    label: 'a repayment duration',
    pattern: new RegExp(`\\b(?:${SETTLE})\\b[^.!?]{0,70}\\b(?:${PERIOD}|weeks?|years?)\\b`, 'i'),
  },
  {
    // The mirror of the one above — the period noun first, the verb after:
    // "across her first few pay cycles, she settles the advance".
    label: 'a repayment cadence',
    pattern: new RegExp(`\\b(?:${PERIOD})\\b[^.!?]{0,70}\\b(?:${SETTLE}|deduct|advance)`, 'i'),
  },
  {
    // Standalone, because any of these nouns on this site is about this
    // arrangement and nothing else. "The arrangement lasts no longer than
    // seven salary cycles" has no repayment verb in it at all.
    label: 'a repayment period expressed in pay cycles',
    pattern: /\b(?:pay|salary|wage)\s*cycles?\b|\bpay\s*runs?\b|\bpayslips?\b|\bpay\s*packets?\b/i,
  },
  {
    label: 'a duration attached to the loan or placement fee',
    pattern: new RegExp(
      `\\b(?:loan|placement fee|advance)\\b[^.!?]{0,70}\\b(?:over|within|across|takes?|lasts?|no longer than|up to)\\s+[^.!?]{0,20}?\\b(?:${PERIOD})\\b`,
      'i',
    ),
  },
  {
    label: 'a repayment schedule',
    pattern: /\b(?:repayment|instal?ment|deduction)\s+(?:period|schedule|term|plan|window|arrangement)\b/i,
  },
  {
    label: 'repayment described as instalments',
    pattern: /\binstal?ments?\b/i,
  },
  {
    label: 'a monthly repayment cadence',
    pattern: /\bmonthly\b[^.!?]{0,40}\b(?:repa|deduct|instal|portion|amount)/i,
  },
  {
    // "within" is deliberately NOT in this alternation. The replacement
    // window — "requested within 6 months of the deployment date" — is
    // published on purpose, and including "within" here fired on it on
    // both pages. A repayment duration phrased with "within" is still
    // caught by "a repayment duration" above, which requires a settling
    // verb nearby; the replacement window has none.
    label: 'repayment described as running over a span of months',
    pattern: new RegExp(
      `\\b(?:over|across|during|throughout|spanning)\\s+(?:the\\s+)?(?:${NUMBER})\\s+(?:${PERIOD})\\b`,
      'i',
    ),
  },

  // --- AXIS 2: where the money comes from ---
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
    pattern: new RegExp(`\\bdeduct(?:ed|ion|ions|s|ing)?\\b[^.!?]{0,50}\\b(?:${FUNDS})\\b`, 'i'),
  },
  {
    // Loosened: the possessive and the funds noun no longer have to be
    // adjacent. "from her regular monthly income" put two words between
    // them and walked straight through the old version.
    label: 'repayment taken out of the helper’s pay',
    pattern: new RegExp(
      `\\b(?:from|out of|against|towards?)\\s+(?:her|his|their|the helper[’']?s?)\\s+[^.!?]{0,30}?\\b(?:${FUNDS})\\b`,
      'i',
    ),
  },
  {
    // Any of these on this site is about this arrangement. "Take-home" and
    // "remuneration" have no other reason to appear on a page about what
    // an employer pays an agency.
    label: 'the helper’s take-home pay',
    pattern: /\btake[-\s]home\b|\bremuneration\b/i,
  },
  {
    label: 'pay withheld towards the balance',
    pattern: /\bwith(?:hold|holds|holding|held)\b/i,
  },
  {
    label: 'a portion of the helper’s pay',
    pattern: new RegExp(
      `\\b(?:portions?|parts?|shares?|slices?)\\s+of\\s+(?:her|his|their|the helper[’']?s?)\\b|\\b(?:${FUNDS})\\b\\s+is\\s+reduced`,
      'i',
    ),
  },
  {
    label: 'repayment described as coming from what the helper earns',
    pattern: /\bwhat\s+(?:she|he|they|the helper)\s+earns?\b/i,
  },

  // --- AXIS 3: what the helper receives during repayment ---
  {
    // Deliberately the bare nouns, not "rest day" + a compensation word.
    // "She still gets paid for her rest days during this time" states the
    // gated fact and contains no word from the compensation list. The
    // tradeoff is accepted knowingly: a future page that legitimately
    // discusses rest days — an employer-obligations page, say — will fail
    // here, and that failure is the correct prompt to decide deliberately
    // whether the sentence beside it is the gated one. Verified against
    // the current build: "rest day", "day off" and "in lieu" appear zero
    // times anywhere in dist/, so this bans nothing already published.
    label: 'rest days / off days',
    pattern: /\b(?:off|rest)[-\s]days?\b|\bdays?[-\s]off\b/i,
  },
  {
    label: 'compensation in lieu',
    pattern: /\bin lieu\b/i,
  },
  {
    label: 'what the helper keeps or still receives during repayment',
    pattern:
      /\b(?:she|he|they|the helper)\s+(?:still\s+)?(?:keeps?|retains?|receives?|gets?)\s+(?:only\s+|paid\s+)?(?:her|his|their)\b/i,
  },
  {
    label: 'the arrangement described as continuing',
    pattern: /\bcompensation\b[^.!?]{0,40}\bcontinues?\b/i,
  },
]

/*
 * The reviewer's paraphrase corpus, kept as a permanent fixture rather
 * than run once and thrown away.
 *
 * Fix round 1 (F-3): 24 paraphrases were run against the original 17
 * patterns — 9 caught, 15 missed, 0 false positives. Every sentence below
 * is one that got through, or one built to probe the same axis. Holding
 * them here means the coverage cannot silently regress the next time a
 * pattern is narrowed to quiet a false positive, which is exactly how a
 * gate like this decays.
 *
 * These are NOT scanned by the page assertions — they are strings in a
 * test file, never built, never published.
 */
const PARAPHRASES_THAT_MUST_BE_CAUGHT = [
  // Duration, without the client's numbers or the word "month"
  'Repayment is spread across a maximum of seven monthly amounts',
  'She clears it in monthly portions until it is done',
  'The arrangement lasts no longer than seven salary cycles',
  'The helper settles the advance across her first few pay cycles',
  'The balance is cleared over three to five months',
  'Deductions appear on each payslip until the advance is settled',
  'The loan is repaid in equal instalments',
  // Source of funds
  'Her take-home pay is reduced until the advance is cleared',
  'The repayment is drawn from her regular monthly income',
  'Her employer withholds a portion of her monthly pay towards the balance',
  'A share of her remuneration goes towards the outstanding amount',
  'It comes out of her basic salary each month',
  // What she receives meanwhile
  'She still gets paid for her rest days during this time',
  'Compensation in lieu of rest days continues',
  'She keeps her off-day pay throughout',
  'Her days off are still compensated while the balance is outstanding',
]

/*
 * The other half of the same fixture: copy the plan explicitly clears for
 * publication. A pattern broad enough to catch everything above must not
 * catch anything here, or the gate would be "satisfiable" by deleting the
 * section it protects. Taken verbatim from what the pages actually render.
 */
const COPY_THAT_MUST_NOT_BE_CAUGHT = [
  'Fixed at one month’s salary, and the same amount whether you take on a new helper or a transfer helper.',
  'The loan depends on the individual helper, so there is no standard figure to publish.',
  'You advance both amounts at the start, and you recover them through the helper’s repayment.',
  'They are ultimately the helper’s cost, not an additional charge you carry on top of the package.',
  'One replacement, requested within 6 months of your helper’s deployment date.',
  'The 6 months runs from deployment rather than from the day you sign.',
  'The helper’s loan and placement fee sit outside these packages.',
  'Our agent fee is not charged again.',
  'The third-party components are paid a second time for the new helper: MOM, Insurance, SIP, Medical and Handling & transport.',
  'Both packages cover the same components at the same amounts.',
  'Our team goes through the exact amount for the helper you choose before you commit to anything.',
]

/** Every pattern label that fires on a string. */
function labelsFiring(text: string): string[] {
  return GATED_PATTERNS.filter(({ pattern }) => pattern.test(text)).map(({ label }) => label)
}

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

describe('the patterns catch paraphrases, not just the client’s wording', () => {
  // The corpus, asserted one sentence per test so a regression names the
  // exact sentence that got through rather than a count.
  for (const sentence of PARAPHRASES_THAT_MUST_BE_CAUGHT) {
    it(`catches: "${sentence}"`, () => {
      expect(labelsFiring(sentence), 'no pattern fired').not.toEqual([])
    })
  }
})

describe('the patterns produce no false positives on shipped copy', () => {
  for (const sentence of COPY_THAT_MUST_NOT_BE_CAUGHT) {
    it(`allows: "${sentence.slice(0, 60)}…"`, () => {
      expect(labelsFiring(sentence)).toEqual([])
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
