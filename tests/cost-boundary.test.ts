/**
 * THE COST BOUNDARY — what the employer bears, and what is recovered from
 * the helper. They are two different sets of money and the site must never
 * let them blur.
 *
 * THE RULE, stated by DirectHired on 2026-08-16 and by MOM before them:
 *
 *   INSURANCE IS 100% THE EMPLOYER'S COST, ALWAYS. It is never the
 *   helper's, and it is never recovered from her. MOM's own words, from the
 *   insurance-requirements page core-pages design spec §2.6.11 quotes
 *   verbatim: "You cannot pass on the cost of purchasing the insurance to
 *   your helper." The same is true of every other line in the fly-in
 *   package — MOM, SIP, the medical checkup, handling & transport, the
 *   agent fee — and of the package as a whole.
 *
 *   ONLY THE LOAN AND THE PLACEMENT FEE are advanced by the employer and
 *   recovered through the helper's repayment. That is spec §2.4's framing,
 *   it is binding on all copy, and it is scoped to those two amounts and
 *   nothing else.
 *
 * SPEC §2.6.11 ALREADY WARNS THAT THE GAP IS ONE WORD WIDE: "§2.4 sits
 * close to it and points the other way… the boundary between the two
 * framings is one word of drift wide. §2.4's framing is unchanged by this
 * entry and must not be extended to reach the package."
 *
 * THE SITE DRAWS IT CORRECTLY TODAY. Every one of the seventeen blocks in
 * the current build that carries the advance-and-recover framing is scoped
 * to the loan and the placement fee — verified block by block when this
 * file was written. Nothing here is a fix. It exists so that the next
 * person who edits that copy cannot blur it by accident, because the edit
 * that would blur it is a small and natural-looking one: adding "insurance"
 * to a list, or changing "these two amounts" to "the package".
 *
 * WHY BLOCKS RATHER THAN SENTENCES. tests/compliance-gate.test.ts splits
 * rendered text on sentence punctuation, which is right for its job. It is
 * wrong for this one: a price table's rows and a list's items carry no
 * terminal punctuation, so sentence-splitting glues "Insurance $425.10" to
 * whatever paragraph follows the list and would report a violation that no
 * reader could ever see. So this splits on BLOCK-LEVEL ELEMENTS instead —
 * <p>, <li>, <td>, <dd>, a heading — which is the unit a claim is actually
 * made in. Inline tags are NOT split on, deliberately:
 * `<strong>helper's</strong> cost` is one phrase to a reader and must be
 * one string here.
 *
 * WHY dist/ RATHER THAN src/. The rule is about what is PUBLISHED, and
 * several source files necessarily name both framings in order to explain
 * where the line between them falls — this file, spec §2.6.11,
 * LoanAndPlacement.astro's header, src/data/pricing.ts's docblock. Astro
 * emits no frontmatter comments into the build, so the built HTML contains
 * exactly what a visitor can read. Same artefact, same reasoning, as the
 * compliance gate.
 */
import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { packages } from '../src/data/pricing'

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry).split('\\').join('/')
    return statSync(full).isDirectory() ? walk(full) : [full]
  })
}

/**
 * Block-level elements only. `<a>`, `<strong>`, `<em>`, `<span>` and the
 * rest are deliberately absent: splitting on them would cut phrases in half
 * and hide exactly the sentences this file is looking for.
 */
const BLOCK_TAG =
  /<\/?(?:p|li|h[1-6]|td|th|tr|dt|dd|dl|ul|ol|table|thead|tbody|tfoot|blockquote|figcaption|summary|details|div|section|main|header|footer|nav|article|aside)\b[^>]*>/gi

/** The visible text of one built page, one entry per block-level element. */
function blocksOf(html: string): string[] {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(BLOCK_TAG, '\u0000')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&[a-z]+;/gi, ' ')
    .split('\u0000')
    .map((block) => block.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
}

/** Every built page's blocks, derived from dist/ — never a listed page set. */
function publishedBlocks(): { file: string; block: string }[] {
  return walk('dist')
    .filter((f) => f.endsWith('.html'))
    .flatMap((file) => blocksOf(readFileSync(file, 'utf8')).map((block) => ({ file, block })))
}

/* -------------------------------------------------------------------------
 * The three vocabularies. Each is one side of the boundary.
 * ---------------------------------------------------------------------- */

/**
 * The verbs of §2.4's framing — the employer ADVANCES an amount and RECOVERS
 * it through the helper's REPAYMENT.
 *
 * "Advances" is here in its noun-ish table form too ("Employer advances"),
 * which is how ReplacementTerms.astro's worked sum labels its result row.
 */
const RECOVERY_VERB = /\b(?:advance|advances|advanced|advancing|recover|recovers|recovered|recovering|recoup\w*|repay|repays|repaid|repaying|repayment)\b/i

/**
 * The conclusion the framing reaches: that the amount is ultimately borne by
 * the helper. Carried separately from the verbs because a sentence can reach
 * it without using one ("They are ultimately the helper's cost"), and
 * because the two are used differently below — see RULE B.
 */
const HELPERS_COST = /\bhelper[’'`]s\s+(?:own\s+)?cost\b|\bcost\s+(?:to|of)\s+the\s+helper\b|\bborne\s+by\s+the\s+helper\b/i

/**
 * The two amounts, and the ONLY two, that §2.4's framing may be applied to.
 * A block that names one of them has said which money it is talking about.
 */
const LOAN_OR_PLACEMENT_FEE = /\bloans?\b|\bplacement\s+fees?\b/i

/**
 * Everything the EMPLOYER bears: every line item in the fly-in package,
 * derived from src/data/pricing.ts rather than typed here.
 *
 * DERIVED, and that is load-bearing rather than tidy. `Medical` became
 * `Medical checkup` on 2026-08-16 (spec §2.6.10) because a bare `Medical`
 * under a bare `Insurance` read as "the medical part of the insurance". A
 * hand-typed list here would have gone on guarding a label that no longer
 * existed, i.e. guarding nothing, and the assertion below that the derived
 * set really contains `Insurance` is what stops the derivation quietly
 * emptying.
 *
 * Two one-word forms are added on top of the labels, and only two.
 * `insurance` is already a label, so it costs nothing; `medical` is the
 * word a writer will actually reach for when they mean the checkup, and the
 * label is two words. Nothing else is added: this is not a thesaurus, it is
 * the price list.
 */
function employerBorneTerms(): string[] {
  const labels = packages.flatMap((pkg) =>
    pkg.kind === 'itemised' ? pkg.lineItems.map((item) => item.label) : [],
  )
  return [...new Set([...labels, 'insurance', 'medical'])]
}

/** A case-insensitive whole-phrase matcher for one line-item label. */
function termPattern(term: string): RegExp {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(?:^|[^\\w])${escaped}(?:s\\b|[^\\w]|$)`, 'i')
}

/** Every employer-borne term a block names. */
function employerBorneTermsIn(text: string): string[] {
  return employerBorneTerms().filter((term) => termPattern(term).test(text))
}

/** "the package" / "these packages" — the whole thing rather than a line. */
const THE_PACKAGE = /\bpackages?\b/i

/* -------------------------------------------------------------------------
 * RULE A — a package line item is NEVER associated with the recovery
 * framing. Unconditional: no exemption, on any page, in any block.
 * ---------------------------------------------------------------------- */

/** Every violation of rule A on the built site. */
function lineItemViolations(): string[] {
  return publishedBlocks()
    .filter(({ block }) => RECOVERY_VERB.test(block) || HELPERS_COST.test(block))
    .flatMap(({ file, block }) =>
      employerBorneTermsIn(block).map((term) => `${file}: [${term}] ${block}`),
    )
}

/* -------------------------------------------------------------------------
 * RULE B — "the package" is never SAID TO BE advanced or recovered, unless
 * the block names the loan or the placement fee, in which case it is saying
 * what the package is not.
 * ---------------------------------------------------------------------- */

/** Every violation of rule B on the built site. */
function packageViolations(): string[] {
  return publishedBlocks()
    .filter(({ block }) => THE_PACKAGE.test(block))
    .filter(({ block }) => RECOVERY_VERB.test(block))
    .filter(({ block }) => !LOAN_OR_PLACEMENT_FEE.test(block))
    .map(({ file, block }) => `${file}: ${block}`)
}

describe('the guard reads what it claims to read', () => {
  /*
   * Every assertion in this file is a negative one, so a broken extractor
   * would make all of them pass on nothing — which on a rule about what must
   * never be published is the worst possible way to be green.
   */
  it('finds real blocks on real pages', () => {
    const blocks = publishedBlocks()
    expect(new Set(blocks.map((b) => b.file)).size).toBeGreaterThanOrEqual(2)
    expect(blocks.map((b) => b.file)).toContain('dist/pricing/index.html')
    expect(blocks.length).toBeGreaterThan(200)
  })

  it('keeps a phrase whole across inline tags', () => {
    /*
     * `<strong>helper’s</strong> cost` is the exact markup
     * LoanAndPlacement.astro renders, and it is one phrase to a reader. If
     * the splitter ever started cutting on inline elements, HELPERS_COST
     * would stop firing anywhere and rule A would go quietly green.
     */
    expect(blocksOf('<p>ultimately the <strong>helper&#8217;s</strong> cost</p>')).toEqual([
      'ultimately the helper’s cost',
    ])
  })

  it('does NOT glue a price row to the paragraph after it', () => {
    /*
     * The reason this file splits on blocks rather than on sentences. A
     * price list carries no terminal punctuation, so a sentence splitter
     * runs "Insurance $425.10" straight into whatever paragraph follows —
     * and would report a violation no reader could ever see. A guard that
     * cries wolf is a guard the next person loosens.
     */
    expect(
      blocksOf('<ul><li>Insurance — $425.10</li></ul><p>You advance the loan.</p>'),
    ).toEqual(['Insurance — $425.10', 'You advance the loan.'])
  })

  it('derives the package line items from pricing.ts, and finds Insurance among them', () => {
    // Named, not counted. A derivation that silently returned [] would make
    // rule A vacuous, and `Insurance` is the specific label this whole file
    // was written for.
    const terms = employerBorneTerms()
    expect(terms).toContain('Insurance')
    expect(terms).toContain('MOM')
    expect(terms).toContain('SIP')
    expect(terms).toContain('Medical checkup')
    expect(terms).toContain('Handling & transport')
    expect(terms).toContain('Agent fees')
  })

  it('the recovery framing really is published, so both rules have a subject', () => {
    /*
     * If §2.4's framing ever disappeared from the site, both rules below
     * would pass by having nothing to test — and the fact worth knowing
     * would be that the framing had gone, which is a spec §2.4 violation in
     * its own right and nothing else here would report it.
     */
    const framed = publishedBlocks().filter(
      ({ block }) => RECOVERY_VERB.test(block) || HELPERS_COST.test(block),
    )
    expect(framed.length).toBeGreaterThanOrEqual(10)
    expect(new Set(framed.map((f) => f.file)).size).toBeGreaterThanOrEqual(2)
  })
})

describe('no package line item is ever associated with the recovery framing', () => {
  /*
   * RULE A, and it has no exemption. Insurance, MOM, SIP, the medical
   * checkup, handling & transport and the agent fee are the employer's cost
   * in full, forever; there is no wording in which one of them is advanced,
   * recovered, repaid or "ultimately the helper's cost".
   *
   * Note this is stricter than rule B on purpose. Rule B lets a block off
   * when it names the loan or the placement fee, because such a block is
   * saying what sits OUTSIDE the package. No equivalent sentence exists for
   * a line item: there is nothing true to say that puts "insurance" and
   * "recovered" in one paragraph, so nothing needs an escape hatch — and an
   * escape hatch is exactly what a blurring edit would slip through, since
   * on /pricing the word "loan" is never far away.
   */
  it('publishes none, on any page', () => {
    expect(lineItemViolations()).toEqual([])
  })
})

describe('the package as a whole is never described as advanced or recovered', () => {
  /*
   * RULE B. The employer pays the package. It is not advanced against
   * anything and none of it comes back.
   *
   * THE EXEMPTION, AND WHY IT IS NOT A HOLE. A block naming the loan or the
   * placement fee alongside the word "package" is doing the one legitimate
   * thing: saying those two amounts sit OUTSIDE it. That is four of the
   * blocks on the site today, and it is the sentence spec §2.4 requires.
   * The exemption cannot launder a line-item blur, because rule A above has
   * no exemption at all and runs over the same blocks.
   */
  it('publishes no such block, on any page', () => {
    expect(packageViolations()).toEqual([])
  })
})

/* -------------------------------------------------------------------------
 * THE FIXTURES — kept permanently, so the rules cannot be quietly narrowed.
 * These are strings in a test file. They are never built and never
 * published.
 * ---------------------------------------------------------------------- */

/** Sentences that blur the boundary. Every one must be caught. */
const BLURS_THAT_MUST_BE_CAUGHT: { why: string; text: string; rule: 'A' | 'B' }[] = [
  {
    why: 'insurance named as something the employer advances and recovers',
    text: 'You advance the insurance at the start and recover it through the helper’s repayment.',
    rule: 'A',
  },
  {
    why: 'insurance folded into a list of amounts that come back',
    text: 'The loan, the placement fee and the insurance are all recovered from the helper.',
    rule: 'A',
  },
  {
    why: 'insurance called the helper’s cost without any verb at all',
    text: 'The insurance is ultimately the helper’s cost.',
    rule: 'A',
  },
  {
    why: 'a third-party line item described as repaid',
    text: 'MOM, SIP and handling & transport are repaid to you over time.',
    rule: 'A',
  },
  {
    why: 'the medical checkup described as recovered',
    text: 'The medical checkup is recovered from the helper.',
    rule: 'A',
  },
  {
    why: 'the agent fee described as borne by the helper',
    text: 'Agent fees are borne by the helper in the end.',
    rule: 'A',
  },
  {
    why: 'the package as a whole described as advanced',
    text: 'You advance the package at the start, and it comes back to you.',
    rule: 'B',
  },
  {
    why: 'the package as a whole described as recovered, in the passive',
    text: 'The whole fly-in package is recovered through her repayment.',
    rule: 'B',
  },
]

/**
 * Copy the site actually publishes, verbatim from the current build. A rule
 * broad enough to catch everything above must catch nothing here, or it
 * would be "satisfiable" by deleting spec §2.4's framing — which is the
 * failure mode worth guarding against, since that framing corrects a real
 * error the site used to ship ("further fees may apply").
 */
const PUBLISHED_COPY_THAT_MUST_NOT_BE_CAUGHT = [
  'The helper’s loan and placement fee sit outside these packages. You advance both at the start and recover them through the helper’s repayment, so they are ultimately the helper’s cost rather than an extra charge you carry — see how that works.',
  'The package without replacement is $1,140.10 . The helper’s loan and placement fee sit outside both totals — you advance them at the start and recover them through the helper’s repayment, so they are ultimately the helper’s cost rather than an extra charge you carry.',
  'These sit alongside the fly-in package, and they are ultimately the helper’s cost rather than yours.',
  'As the employer you advance both amounts at the start, and you recover them through the helper’s repayment. The money leaves your account first, but it is not a cost you carry. Our team will go through the exact figures for the helper you choose.',
  'You advance both amounts at the start, and you recover them through the helper’s repayment. Both halves matter: the money does leave your account first, and it does come back.',
  'They are ultimately the helper’s cost, not an additional charge you carry on top of the package.',
  'Two further amounts — the helper’s loan and the placement fee — sit outside both totals. They are not an extra charge you carry: you advance them and recover them, and they are explained further down this page.',
  'If the helper being replaced still has an outstanding loan balance, that balance is subtracted from what you advance for the new helper — so the same amount is not funded twice.',
  'Employer advances',
  // The two blocks the boundary is drawn in, from the FAQ answers that draw
  // it. Both name insurance and the package and neither carries the framing.
  'Yes. DirectHired arranges the helper’s insurance as part of your placement, so it is not cover you have to go and source yourself.',
  'The insurance sits inside the fly-in package rather than beside it — it is one of the package’s own line items, and you can see what it costs on our Pricing page.',
  'It is a checkup, not insurance. The two are separate obligations that happen to sit next to each other in the fly-in package: this is a one-off examination before the helper starts work, while the insurance is cover that runs while the helper is here. Each is its own line item, priced separately on our Pricing page.',
  'Agent fees — $888',
  'Insurance — $425.10',
  'Medical checkup — $60',
  'Handling & transport — $120',
]

/** Rule A applied to one string, as `lineItemViolations` applies it. */
const breaksRuleA = (text: string) =>
  (RECOVERY_VERB.test(text) || HELPERS_COST.test(text)) && employerBorneTermsIn(text).length > 0

/** Rule B applied to one string, as `packageViolations` applies it. */
const breaksRuleB = (text: string) =>
  THE_PACKAGE.test(text) && RECOVERY_VERB.test(text) && !LOAN_OR_PLACEMENT_FEE.test(text)

describe('the rules catch the blurs they exist for', () => {
  for (const { why, text, rule } of BLURS_THAT_MUST_BE_CAUGHT) {
    it(`catches ${why}`, () => {
      const caught = rule === 'A' ? breaksRuleA(text) : breaksRuleB(text)
      expect(caught, `rule ${rule} did not fire on: ${text}`).toBe(true)
    })
  }
})

describe('the rules pass everything the site legitimately publishes', () => {
  for (const text of PUBLISHED_COPY_THAT_MUST_NOT_BE_CAUGHT) {
    it(`allows: "${text.slice(0, 60)}…"`, () => {
      expect(breaksRuleA(text), 'rule A fired on published copy').toBe(false)
      expect(breaksRuleB(text), 'rule B fired on published copy').toBe(false)
    })
  }
})

describe('the insurance answer never reaches for the recovery framing', () => {
  /*
   * The source-side half, and the only one that can see a content file
   * before a page renders it. src/content/faq/insurance.md is where a
   * well-meaning edit would put the blur — it is the one file on the site
   * whose whole subject is the insurance, and the sentence "and you recover
   * it through the helper's repayment" is one clause away from what is
   * already there.
   *
   * The dist/ rules above would catch it today, because /faq renders that
   * answer. This catches it whether or not any page happens to render it,
   * which is the same gap tests/content.test.ts closes for the helper-source
   * rule: nine content files are not rendered by any page that exists yet.
   */
  const FAQ = 'src/content/faq'

  it('reads the answer it claims to read', () => {
    const content = readFileSync(`${FAQ}/insurance.md`, 'utf8')
    expect(content).toMatch(/insurance/i)
    expect(content).toMatch(/Ministry of Manpower|\bMOM\b/)
  })

  it('states no recovery framing, in the insurance answer or the medical one', () => {
    // Both, because spec §2.6.10 records that these two were already
    // confused once — the medical answer used to open "Like the insurance,
    // it is one of the components inside the fly-in package…", drawing an
    // equivalence between an examination and an insurance policy. Whatever
    // blurs one of them will be written next to the other.
    for (const file of ['insurance.md', 'medical-examination.md']) {
      const content = readFileSync(`${FAQ}/${file}`, 'utf8')
      expect(content, `${file} applies §2.4's framing to an employer-borne cost`).not.toMatch(
        RECOVERY_VERB,
      )
      expect(content, `${file} calls an employer-borne cost the helper's`).not.toMatch(HELPERS_COST)
    }
  })
})
