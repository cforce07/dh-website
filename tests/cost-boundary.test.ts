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
 * WHY ATTRIBUTES AND JSON-LD ARE IN THE CORPUS, AND WHY THEY WERE NOT.
 * Until 2026-08-17 `blocksOf` stripped every tag WITH ITS ATTRIBUTES
 * (`.replace(/<[^>]+>/g, ' ')`), so only <title> text and body text ever
 * reached the rules. A reviewer proved the hole end to end: /pricing's meta
 * `description` was replaced with "The insurance is billed to the helper and
 * you recover it through her repayment", it shipped into
 * <meta name="description"> AND og:description, and the suite scored 771/771
 * green. That string is the search-result snippet and the WhatsApp link
 * preview — a channel this project's own docs call a secondary conversion
 * channel — carrying verbatim the claim MOM forbids (spec §2.6.11: "You
 * cannot pass on the cost of purchasing the insurance to your helper").
 *
 * tests/compliance-gate.test.ts, written days apart, runs its patterns over
 * the RAW html and so has covered meta and JSON-LD all along. Two guards made
 * opposite choices and the weaker one guarded the MOM rule. This file now has
 * the same reach, by a route that keeps what it had.
 *
 * THE BLOCK-SPLITTING IS KEPT, because the rules need sentence-level context
 * to bind a line-item label to a recovery verb, and the raw-html approach
 * would concatenate a <meta> to the <link> after it. So attribute values and
 * JSON-LD strings are lifted out as blocks of their own, and the body pass is
 * unchanged.
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

/** HTML entities to the characters a reader actually sees. */
function decodeEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&[a-z]+;/gi, ' ')
}

/**
 * Attributes whose values are PROSE — text a reader, a screen reader, a search
 * engine or a link-preview crawler consumes as a sentence.
 *
 * `content` is the one the reviewer's mutation used: it carries every
 * <meta name="description"> and every og:/twitter: property, which is the
 * search-result snippet and the WhatsApp link preview. `alt` and
 * `aria-label` are read aloud, which makes them published copy under any
 * reading of the rule.
 *
 * `href`, `src`, `class` and `srcset` are deliberately absent — they are
 * machine addresses, not claims, and sweeping them would put URL slugs like
 * /helper-loan-placement-fee in front of rules whose whole job is to notice
 * the words "loan" and "helper" near each other. The rule of thumb: if a human
 * reads it as a sentence it is in; if a browser resolves it, it is not.
 */
const TEXT_ATTRS = new Set([
  'content',
  'alt',
  'title',
  'label',
  'placeholder',
  'aria-label',
  'aria-description',
  'aria-placeholder',
  'aria-roledescription',
  'aria-valuetext',
])

/** Any start tag, with its attribute run captured. */
const TAG_WITH_ATTRS =
  /<[a-zA-Z][-\w:]*((?:\s+[^\s"'>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'`=<>]+))?)*)\s*\/?>/g
/** One attribute inside such a run. */
const ONE_ATTR = /([^\s"'>/=]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'`=<>]+))/g

/**
 * Every prose-bearing attribute value on the page, ONE BLOCK PER VALUE.
 *
 * One block per value for the same reason a <li> is one block: it is the unit
 * a claim is made in. A meta description is a sentence or two, which is
 * exactly the context rule A needs to bind a line-item label to a recovery
 * verb — and exactly what the raw-html sweep tests/compliance-gate.test.ts
 * runs cannot give it, since that concatenates the whole document.
 */
function attributeBlocks(html: string): string[] {
  const blocks: string[] = []
  for (const tag of html.matchAll(TAG_WITH_ATTRS)) {
    const attrRun = tag[1]
    if (!attrRun) continue
    for (const attr of attrRun.matchAll(ONE_ATTR)) {
      if (!TEXT_ATTRS.has(attr[1].toLowerCase())) continue
      const value = decodeEntities(attr[2] ?? attr[3] ?? attr[4] ?? '')
        .replace(/\s+/g, ' ')
        .trim()
      if (value) blocks.push(value)
    }
  }
  return blocks
}

/**
 * Every string value inside every JSON-LD graph, one block each.
 *
 * Structured data is published copy: Google renders `description` and
 * `acceptedAnswer` into rich results, and src/lib/structured-data.ts feeds
 * them the same sentences the pages carry. A blur that reached only the
 * FAQPage answers would be invisible to the body pass below, which throws
 * every <script> away.
 *
 * A graph that will not parse is pushed whole rather than skipped — a
 * malformed graph is a thing to look at, not a thing to be silently exempt.
 *
 * WHY THESE ARE SPLIT ON SENTENCES WHERE THE BODY IS SPLIT ON BLOCKS, and it
 * is not the file changing its mind. The body pass splits on blocks because
 * the block structure is THERE to split on, and a price list's <li> rows carry
 * no terminal punctuation. In a JSON-LD graph there is no block structure
 * left: schema.org's `text` is a single string, so src/lib/structured-data.ts
 * flattens a whole multi-paragraph FAQ answer into one field, joining the
 * paragraphs with a space. Keeping that as one block is what the header's
 * "does NOT glue a price row to the paragraph after it" warns against, in a
 * worse form — the FIRST sweep after attributes were added reported three
 * violations, all of them the same shape: a paragraph listing "MOM;
 * Insurance; SIP; Medical checkup" glued to a paragraph three paragraphs
 * later saying "you advance them at the start and recover them", copy which
 * spec §2.4 requires and which the body pass passes correctly.
 *
 * So the sentence is the largest unit here that is still ONE claim. This is
 * the granularity tests/compliance-gate.test.ts's inverse sweep already uses,
 * and it is not a loosening of rule A: a block is only ever the unit a claim
 * is made in, and a flattened four-paragraph answer is four claims.
 */
const SENTENCE_BREAK = /(?<=[.!?])\s+(?=[A-Z“"'(])/

function jsonLdBlocks(html: string): string[] {
  const blocks: string[] = []
  const collect = (value: unknown): void => {
    if (typeof value === 'string') {
      value
        .replace(/\s+/g, ' ')
        .trim()
        .split(SENTENCE_BREAK)
        .map((sentence) => sentence.trim())
        .filter(Boolean)
        .forEach((sentence) => blocks.push(sentence))
    } else if (Array.isArray(value)) {
      value.forEach(collect)
    } else if (value && typeof value === 'object') {
      Object.values(value as Record<string, unknown>).forEach(collect)
    }
  }
  const scripts = html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )
  for (const script of scripts) {
    try {
      collect(JSON.parse(script[1]))
    } catch {
      const raw = script[1].replace(/\s+/g, ' ').trim()
      if (raw) blocks.push(raw)
    }
  }
  return blocks
}

/**
 * The published text of one built page — one entry per BLOCK, where a block is
 * a block-level element, a prose-bearing attribute value, or one string inside
 * the JSON-LD graph.
 *
 * `bodyBlocks` is byte-for-byte what `blocksOf` was the day it was written.
 * The two passes joined to it are purely additive: nothing that used to be a
 * block stopped being one, and nothing that used to be caught can now escape.
 */
function blocksOf(html: string): string[] {
  return [...bodyBlocks(html), ...attributeBlocks(html), ...jsonLdBlocks(html)]
}

/** The visible body text of one built page, one entry per block-level element. */
function bodyBlocks(html: string): string[] {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(BLOCK_TAG, '\u0000')
      .replace(/<[^>]+>/g, ' '),
  )
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
 * The vocabularies. Each is one side of the boundary.
 *
 * WHY THERE ARE MORE OF THEM THAN THERE WERE, and the lesson that produced
 * them. This file originally fired on §2.4's OWN verbs and nothing else:
 * advance / recover / recoup / repay, plus three fixed "helper's cost"
 * phrases. Both mutations that were used to prove it worked were written
 * with words taken from that same list, so what they demonstrated was that
 * the rule fires on its own vocabulary — which it could hardly fail to do.
 *
 * A reviewer then wrote the adversarial sentences FROM MOM'S LANGUAGE
 * INSTEAD, which is where the actual prohibition is written, and appended
 * two of them to src/content/faq/insurance.md:
 *
 *   "The insurance is billed to the helper."
 *   "What you put in comes back: you front the whole amount at the start,
 *    and every dollar of it is ultimately hers."
 *
 * That rebuilt, published to /faq, and scored a fully green suite. The first
 * sentence states outright the thing MOM forbids.
 *
 * So the vocabularies below are written from the REGULATED MECHANISM rather
 * than from §2.4's framing: MOM's prohibition is "you cannot PASS ON the
 * cost of purchasing the insurance to your helper", and a cost can be passed
 * on in a dozen registers that never once say "recover". The rule of thumb
 * for anyone extending this: write the sentence you are afraid of first, in
 * the words a regulator or a salesperson would use, and only then look at
 * what is here.
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
 * THE REGULATED MECHANISM'S OWN VERBS — the ways a cost is moved onto the
 * worker that have nothing to do with §2.4's advance-and-recover framing.
 *
 * `pass on` is MOM's verb, taken from the sentence spec §2.6.11 quotes
 * verbatim, and it is here in two shapes because English splits the
 * particle: "passed on to your helper" and "pass the premium on to her" are
 * the same claim. `deduct` is the salary-deduction mechanism MOM regulates;
 * it is ALSO caught by tests/compliance-gate.test.ts today, but only
 * coincidentally — that gate exists to withhold §2.3's repayment mechanics
 * and covers neither "billed to" nor "passed on", so nothing here may lean
 * on it.
 *
 * Every one of these has ZERO occurrences in the current build (swept block
 * by block when they were added), so none of them bans a word the site is
 * already using. `charged to` is deliberately written with the preposition:
 * /pricing publishes "Our agent fee is not charged again" and "not an extra
 * charge you carry", and a bare `charge` would fire on both.
 */
const PASSED_TO_HELPER =
  /\bdeduct\w*\b|\bpass(?:es|ed|ing)?\s+on\b|\bpass(?:es|ed|ing)?\b[^.!?]{0,40}?\bon\s+to\s+(?:the\s+helper|your\s+helper|her)\b|\bcharge[sd]?\s+to\b|\bchargeable\s+to\b|\bbill(?:s|ed|ing)?\s+to\b|\b(?:come|comes|coming|came)\s+out\s+of\b|\boffsets?\b|\boffsetting\b|\breimburs\w*\b/i

/**
 * The conclusion the framing reaches: that the amount is ultimately borne by
 * the helper. Carried separately from the verbs because a sentence can reach
 * it without using one ("They are ultimately the helper's cost"), and
 * because the three are used differently below — see RULES B and C.
 *
 * `hers` IS NOT HERE ON ITS OWN, and that is a judgement rather than an
 * oversight. The insurance policy genuinely is the helper's — she is the
 * insured — so "the policy is hers" is a true sentence somebody may one day
 * write, and a bare `\bhers\b` would fail it. What is banned is `hers` used
 * as a verdict about who PAYS: "ultimately hers", "hers in the end". That is
 * the register the reviewer's mutation was written in.
 */
const BORNE_BY_HELPER =
  /\bhelper[’'`]s\s+(?:own\s+)?cost\b|\bcost\s+(?:to|of)\s+the\s+helper\b|\bborne\s+by\s+(?:the\s+helper|her)\b|\b(?:ultimately|in\s+the\s+end|effectively|really)\s+hers\b|\bhers\s+(?:in\s+the\s+end|ultimately)\b|\b(?:the\s+helper|she)\s+bears\b|\bat\s+(?:the\s+helper[’'`]s|her)\s+expense\b|\b(?:the\s+helper[’'`]s|hers)\s+to\s+bear\b/i

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
 *
 * THE SINGULAR IS DERIVED, AND IT WAS A REAL HOLE. The data label is
 * `Agent fees`; the site's own prose says "Our agent fee is not charged
 * again" and "the two packages differ by $500 — the agent fee". The
 * whole-phrase matcher below tolerates a MISSING plural on a label that has
 * none, not a missing one on a label that has it, so every sentence on the
 * site that names that line item in the singular was invisible to rule A.
 * Stripping a trailing `s` keeps the derivation honest — a hand-typed
 * `'agent fee'` would go on guarding a label that a rename had moved, which
 * is the failure the `Medical` -> `Medical checkup` note above records.
 */
function employerBorneTerms(): string[] {
  const labels = packages.flatMap((pkg) =>
    pkg.kind === 'itemised' ? pkg.lineItems.map((item) => item.label) : [],
  )
  const singulars = labels
    .filter((label) => /[^s]s$/i.test(label))
    .map((label) => label.slice(0, -1))
  return [...new Set([...labels, ...singulars, 'insurance', 'medical'])]
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

/**
 * The package named as the SUBJECT of a borne-by-the-helper verdict.
 *
 * Rule B keys on the recovery verbs, and it has to: /pricing publishes
 * "These sit alongside the fly-in package, and they are ultimately the
 * helper's cost rather than yours", where "they" is the loan and the
 * placement fee and the package is only the thing they sit BESIDE. Feeding
 * the whole of BORNE_BY_HELPER into rule B would fail that sentence, which
 * is compliant copy saying the correct thing.
 *
 * "The whole package is ultimately the helper's cost" is the same words in
 * the other grammatical role and it is a flat violation — so the subject is
 * pinned instead of the vocabulary widened. A regex cannot resolve a pronoun
 * (the reviewer traced all twelve by hand); it can insist that the noun
 * immediately before the verdict is the package itself.
 *
 * THE CLAUSE-OPENER ANCHOR IS NOT DECORATION. Written without it, this fired
 * on a published /faq answer at the first sweep: "The medical in your
 * package is the helper's pre-employment medical checkup" — where the
 * subject is "the medical", "in your package" is a prepositional phrase, and
 * the sentence says nothing whatever about who pays. So the package phrase
 * must OPEN a clause: start of block, after terminal punctuation, or after a
 * conjunction. A preposition in front of it means it is not the subject.
 */
const PACKAGE_AS_SUBJECT =
  /(?:^|[.,;:!?—–]\s*|\b(?:and|but|so|because|since|meaning)\s+)(?:the|this|that|your|our|a)?\s*(?:whole\s+|entire\s+|full\s+|fly-?in\s+){0,2}packages?\s+(?:is|are)\s+(?:ultimately\s+|in\s+the\s+end\s+|effectively\s+|really\s+)?(?:the\s+helper[’'`]s|hers|borne\s+by)/i

/**
 * WHOLE-AMOUNT SUBJECTS — the blur that names no money at all.
 *
 * "The total is ultimately the helper's cost", "you front the whole amount
 * and recover it", "what you put in comes back". None of these contains a
 * line-item label, so rule A has nothing to key on, and none contains the
 * word "package", so rule B does not see them either. They were the second
 * half of the reviewer's mutation and they escaped both rules completely.
 *
 * `totals` IS DELIBERATELY EXCLUDED and the exclusion is load-bearing. Four
 * blocks the site publishes today say "the loan and placement fee sit
 * outside both totals — you advance them at the start and recover them",
 * which is spec §2.4's required sentence. `\btotals?\b` fires on every one
 * of them. So this matches "the total" and never a bare "total(s)", and the
 * whole set has zero occurrences in the current build.
 */
const WHOLE_AMOUNT =
  /\bthe\s+total\b|\bthe\s+(?:whole|entire|full)\s+amount\b|\beverything\s+you\s+pay\b|\bevery\s+(?:dollar|cent)\b|\bwhat\s+you\s+put\s+in\b/i

/**
 * The whole-amount subject SCOPED to the two amounts §2.4 covers: "the whole
 * amount of the loan", "every dollar of the placement fee". Saying that is
 * legitimate and rule C lets it through.
 *
 * The scoping has to be TIGHT — the loan or the fee named right after the
 * subject phrase, not merely somewhere in the same block. Rule A's header
 * explains why: on /pricing the word "loan" is never far away, so a
 * block-wide exemption would launder "Beyond the loan, the total is
 * ultimately the helper's cost", which is a violation with a true clause in
 * front of it.
 */
const WHOLE_AMOUNT_SCOPED_TO_LOAN =
  /(?:the\s+total|the\s+(?:whole|entire|full)\s+amount|everything\s+you\s+pay|every\s+(?:dollar|cent)|what\s+you\s+put\s+in)\b[^.!?]{0,30}?\b(?:loans?|placement\s+fees?)\b/i

/**
 * "…and it comes back." The money-returns-to-you half of the framing, said
 * without any of §2.4's verbs.
 *
 * Loose on purpose, and safe only because rule C is a conjunction: /faq and
 * /find-your-helper both publish "a consultant will come back to you", and
 * neither of those blocks contains a whole-amount subject. This is never
 * consulted on its own.
 */
const RETURNS_TO_YOU =
  /\b(?:come|comes|coming|came)\s+back\b|\bgets?\s+(?:it|them)\s+back\b|\bis\s+returned\s+to\s+you\b|\bfind\s+(?:it|your\s+way)\s+back\b/i

/* -------------------------------------------------------------------------
 * RULE A — a package line item is NEVER associated with the recovery
 * framing, nor with the mechanism MOM forbids. Unconditional: no exemption,
 * on any page, in any block.
 * ---------------------------------------------------------------------- */

/** Every violation of rule A on the built site. */
function lineItemViolations(): string[] {
  return publishedBlocks()
    .filter(
      ({ block }) =>
        RECOVERY_VERB.test(block) ||
        PASSED_TO_HELPER.test(block) ||
        BORNE_BY_HELPER.test(block),
    )
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
    .filter(
      ({ block }) =>
        (THE_PACKAGE.test(block) &&
          (RECOVERY_VERB.test(block) || PASSED_TO_HELPER.test(block)) &&
          !LOAN_OR_PLACEMENT_FEE.test(block)) ||
        PACKAGE_AS_SUBJECT.test(block),
    )
    .map(({ file, block }) => `${file}: ${block}`)
}

/* -------------------------------------------------------------------------
 * RULE C — a WHOLE-AMOUNT subject is never advanced, recovered, passed on or
 * called the helper's. The blur that names neither a line item nor the
 * package, and so escapes both rules above.
 * ---------------------------------------------------------------------- */

/** Every violation of rule C on the built site. */
function wholeAmountViolations(): string[] {
  return publishedBlocks()
    .filter(({ block }) => WHOLE_AMOUNT.test(block))
    .filter(({ block }) => !WHOLE_AMOUNT_SCOPED_TO_LOAN.test(block))
    .filter(
      ({ block }) =>
        RECOVERY_VERB.test(block) ||
        PASSED_TO_HELPER.test(block) ||
        BORNE_BY_HELPER.test(block) ||
        RETURNS_TO_YOU.test(block),
    )
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
     * the splitter ever started cutting on inline elements, BORNE_BY_HELPER
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

  /* -----------------------------------------------------------------------
   * THE ATTRIBUTE AND JSON-LD CORPUS.
   *
   * These four assertions are the ones that would have failed on 2026-08-16,
   * and they are unit assertions rather than sweeps so that a regression names
   * the surface that went blind rather than a count that moved.
   * -------------------------------------------------------------------- */

  it('reads the meta description and og:description, which the search snippet and the link preview are', () => {
    const html =
      '<meta name="description" content="The insurance is billed to the helper." />' +
      '<meta property="og:description" content="You recover the insurance through her repayment." />'
    expect(blocksOf(html)).toEqual([
      'The insurance is billed to the helper.',
      'You recover the insurance through her repayment.',
    ])
  })

  it('reads alt and aria-label, which a screen reader speaks aloud', () => {
    const html =
      '<img src="/a.png" alt="Insurance is charged to the helper." />' +
      '<a href="/x" aria-label="The medical checkup is deducted from her salary.">More</a>'
    expect(blocksOf(html)).toContain('Insurance is charged to the helper.')
    expect(blocksOf(html)).toContain('The medical checkup is deducted from her salary.')
  })

  it('reads the JSON-LD graph, string by string', () => {
    const html =
      '<script type="application/ld+json">' +
      JSON.stringify({
        '@type': 'FAQPage',
        mainEntity: [
          { name: 'Who pays?', acceptedAnswer: { text: 'The insurance is ultimately hers.' } },
        ],
      }) +
      '</script>'
    expect(blocksOf(html)).toContain('The insurance is ultimately hers.')
  })

  it('does not sweep href, src or class, which are addresses rather than claims', () => {
    // A URL slug is not a sentence, and feeding one to rules that key on the
    // words "loan", "helper" and "placement fee" is how a guard starts crying
    // wolf. This pins the exclusion so nobody widens TEXT_ATTRS by reflex.
    const html = '<a href="/faq/helper-loan-placement-fee" class="recover-loan">Read</a>'
    expect(blocksOf(html)).toEqual(['Read'])
  })

  it('the built site really does publish attribute-borne and JSON-LD copy', () => {
    /*
     * Otherwise the three passes could quietly stop finding anything and the
     * rules would go green over the body text alone — which is exactly the
     * state this file was in until 2026-08-17.
     */
    const pricing = readFileSync('dist/pricing/index.html', 'utf8')
    expect(attributeBlocks(pricing).length).toBeGreaterThan(5)
    expect(attributeBlocks(pricing).some((b) => /\bpricing\b/i.test(b))).toBe(true)
    const jsonLd = walk('dist')
      .filter((f) => f.endsWith('.html'))
      .flatMap((f) => jsonLdBlocks(readFileSync(f, 'utf8')))
    expect(jsonLd.length).toBeGreaterThan(20)
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
    // The singular, derived rather than typed. The site's prose says "our
    // agent fee"; the data label is plural, and rule A saw straight through
    // every singular use until this derivation existed.
    expect(terms).toContain('Agent fee')
  })

  it('the recovery framing really is published, so both rules have a subject', () => {
    /*
     * If §2.4's framing ever disappeared from the site, both rules below
     * would pass by having nothing to test — and the fact worth knowing
     * would be that the framing had gone, which is a spec §2.4 violation in
     * its own right and nothing else here would report it.
     */
    const framed = publishedBlocks().filter(
      ({ block }) => RECOVERY_VERB.test(block) || BORNE_BY_HELPER.test(block),
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

describe('no whole-amount subject is ever recovered or called the helper’s', () => {
  /*
   * RULE C. The blur that names no money at all — "the total", "the whole
   * amount", "everything you pay", "every dollar", "what you put in".
   *
   * It exists because the reviewer's mutation used exactly this shape and
   * neither rule above could see it: no line-item label for rule A, no word
   * "package" for rule B. A sentence does not have to name the insurance to
   * tell a reader the insurance comes back.
   *
   * The exemption is narrow by construction — see WHOLE_AMOUNT_SCOPED_TO_LOAN
   * — because a block-wide one would be laundered by /pricing's ever-present
   * "loan".
   */
  it('publishes no such block, on any page', () => {
    expect(wholeAmountViolations()).toEqual([])
  })
})

/* -------------------------------------------------------------------------
 * THE FIXTURES — kept permanently, so the rules cannot be quietly narrowed.
 * These are strings in a test file. They are never built and never
 * published.
 * ---------------------------------------------------------------------- */

/** Sentences that blur the boundary. Every one must be caught. */
const BLURS_THAT_MUST_BE_CAUGHT: { why: string; text: string; rule: 'A' | 'B' | 'C' }[] = [
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

  /*
   * ------------------------------------------------------------------
   * WRITTEN FROM MOM'S LANGUAGE, NOT FROM THE RULE'S — and written before
   * the vocabularies above were widened, which is the only order in which
   * this exercise means anything.
   *
   * The eight fixtures above were all built out of `advance`, `recover`,
   * `repay` and `borne by the helper`: the rule's own words. They proved
   * that the rule fires on its own vocabulary. Not one of them tests the
   * prohibition MOM actually writes, which is about PASSING A COST ON —
   * "You cannot pass on the cost of purchasing the insurance to your
   * helper" — a mechanism that has its own verbs and needs none of §2.4's.
   *
   * The two marked ‡ are the reviewer's live mutation, appended verbatim to
   * src/content/faq/insurance.md, rebuilt and published to /faq. Before this
   * round the whole suite went green on them.
   * ------------------------------------------------------------------
   */
  {
    // ‡ the reviewer's first mutation sentence, and the plainest statement
    // of the thing MOM forbids that anyone could write.
    why: 'insurance billed directly to the helper',
    text: 'The insurance is billed to the helper.',
    rule: 'A',
  },
  {
    why: 'MOM’s own verb, applied to MOM’s own example',
    text: 'The cost of purchasing the insurance is passed on to your helper.',
    rule: 'A',
  },
  {
    // The particle split off the verb, which is what English does as soon as
    // the object is longer than a pronoun.
    why: 'the same claim with the phrasal verb split around its object',
    text: 'We pass the insurance premium on to the helper over her first year.',
    rule: 'A',
  },
  {
    why: 'a line item charged to the helper',
    text: 'The medical checkup is charged to the helper rather than to you.',
    rule: 'A',
  },
  {
    // Caught here in its own right. tests/compliance-gate.test.ts also fires
    // on this, but only because §2.3's salary-deduction gate happens to
    // overlap; that gate covers neither "billed to" nor "passed on", so this
    // file may not lean on it.
    why: 'a line item deducted from the helper’s salary',
    text: 'The SIP premium is deducted from her monthly salary.',
    rule: 'A',
  },
  {
    why: 'the helper reimbursing the employer for a line item',
    text: 'The helper reimburses you for the MOM levy once she starts work.',
    rule: 'A',
  },
  {
    // The SINGULAR agent fee — the form the site's own prose uses, and the
    // form the plural-only label list could not see.
    why: 'the agent fee, in the singular, coming out of the helper’s pay',
    text: 'The agent fee comes out of what the helper takes home.',
    rule: 'A',
  },
  {
    why: 'a line item offset against what the helper earns',
    text: 'Handling & transport is offset against her wages.',
    rule: 'A',
  },
  {
    why: 'a line item called the helper’s without the word "cost"',
    text: 'The insurance is ultimately hers.',
    rule: 'A',
  },
  {
    why: 'a line item stated as being at the helper’s expense',
    text: 'Insurance is arranged at the helper’s expense.',
    rule: 'A',
  },
  {
    why: 'the package billed to the helper, with no recovery verb anywhere',
    text: 'The fly-in package is billed to the helper.',
    rule: 'B',
  },
  {
    // The package as the SUBJECT of the verdict, which is the grammatical
    // difference between this and the compliant published sentence "These
    // sit alongside the fly-in package, and they are ultimately the helper's
    // cost rather than yours."
    why: 'the package itself named as the helper’s cost',
    text: 'The whole package is ultimately the helper’s cost.',
    rule: 'B',
  },
  {
    why: 'a whole-amount subject called the helper’s cost, naming no line item',
    text: 'The total is ultimately the helper’s cost.',
    rule: 'C',
  },
  {
    why: 'the whole amount fronted and recovered, naming no line item',
    text: 'You front the whole amount at the start and recover every cent of it.',
    rule: 'C',
  },
  {
    // ‡ the reviewer's second mutation sentence.
    why: 'the money described as coming back, in a sentence with no nouns in it at all',
    text: 'What you put in comes back: you front the whole amount at the start, and every dollar of it is ultimately hers.',
    rule: 'C',
  },
  {
    why: 'everything the employer pays described as passed on',
    text: 'Everything you pay is passed on to the helper in the end.',
    rule: 'C',
  },
  {
    // The exemption is scoped to the two amounts §2.4 covers, and it must
    // not be reachable by putting the word "loan" somewhere else in the
    // block. Rule A's header explains why: on /pricing it is never far away.
    why: 'a true clause about the loan in front of a false one about the total',
    text: 'Beyond the loan, the total is ultimately the helper’s cost.',
    rule: 'C',
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
  // The trailing "Our team will go through the exact figures for the helper
  // you choose." was deleted from src/content/faq/helper-loan-placement-fee.md
  // on 2026-08-17 as an unapproved promise (see
  // src/sections/LoanAndPlacement.astro's header). This fixture is verbatim
  // published copy, so it follows the copy rather than preserving it.
  'As the employer you advance both amounts at the start, and you recover them through the helper’s repayment. The money leaves your account first, but it is not a cost you carry.',
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
  (RECOVERY_VERB.test(text) || PASSED_TO_HELPER.test(text) || BORNE_BY_HELPER.test(text)) &&
  employerBorneTermsIn(text).length > 0

/** Rule B applied to one string, as `packageViolations` applies it. */
const breaksRuleB = (text: string) =>
  (THE_PACKAGE.test(text) &&
    (RECOVERY_VERB.test(text) || PASSED_TO_HELPER.test(text)) &&
    !LOAN_OR_PLACEMENT_FEE.test(text)) ||
  PACKAGE_AS_SUBJECT.test(text)

/** Rule C applied to one string, as `wholeAmountViolations` applies it. */
const breaksRuleC = (text: string) =>
  WHOLE_AMOUNT.test(text) &&
  !WHOLE_AMOUNT_SCOPED_TO_LOAN.test(text) &&
  (RECOVERY_VERB.test(text) ||
    PASSED_TO_HELPER.test(text) ||
    BORNE_BY_HELPER.test(text) ||
    RETURNS_TO_YOU.test(text))

const BREAKS = { A: breaksRuleA, B: breaksRuleB, C: breaksRuleC } as const

describe('the rules catch the blurs they exist for', () => {
  for (const { why, text, rule } of BLURS_THAT_MUST_BE_CAUGHT) {
    it(`catches ${why}`, () => {
      expect(BREAKS[rule](text), `rule ${rule} did not fire on: ${text}`).toBe(true)
    })
  }
})

/*
 * THE SURFACE MUTATIONS — the reviewer's sentence in each place the guard used
 * to be blind, run through the WHOLE pipeline rather than against a regex.
 *
 * `BLURS_THAT_MUST_BE_CAUGHT` above tests the rules against bare strings, and
 * every one of them passed on 2026-08-16 while the guard was blind, because
 * the defect was never in the rules — it was in what reached them. So these
 * assert the composition: HTML in, violation out. If anybody ever narrows
 * `blocksOf` back to body text, the rules stay green and these do not.
 */
describe('a blur in an attribute or in JSON-LD is caught, not just one in body text', () => {
  const MUTATION =
    'The insurance is billed to the helper and you recover it through her repayment.'

  const violationsIn = (html: string) =>
    blocksOf(html).filter((block) => breaksRuleA(block) || breaksRuleB(block) || breaksRuleC(block))

  const SURFACES: { surface: string; html: string }[] = [
    {
      surface: 'the meta description — the search-result snippet',
      html: `<html><head><meta name="description" content="${MUTATION}"></head><body><p>Hello.</p></body></html>`,
    },
    {
      surface: 'og:description — the WhatsApp link preview',
      html: `<html><head><meta property="og:description" content="${MUTATION}"></head><body><p>Hello.</p></body></html>`,
    },
    {
      surface: 'an image alt, which a screen reader speaks',
      html: `<body><img src="/a.png" alt="${MUTATION}"></body>`,
    },
    {
      surface: 'an aria-label on a link, which a screen reader speaks instead of the anchor text',
      html: `<body><a href="/pricing" aria-label="${MUTATION}">Pricing</a></body>`,
    },
    {
      surface: 'a JSON-LD description, which Google renders into a rich result',
      html: `<script type="application/ld+json">${JSON.stringify({
        '@type': 'WebPage',
        description: MUTATION,
      })}</script>`,
    },
  ]

  for (const { surface, html } of SURFACES) {
    it(`catches the blur in ${surface}`, () => {
      expect(violationsIn(html), `no rule fired on ${surface}`).not.toEqual([])
    })
  }

  it('catches it in the body text too, which is the case that already worked', () => {
    expect(violationsIn(`<body><p>${MUTATION}</p></body>`)).not.toEqual([])
  })
})

describe('the rules pass everything the site legitimately publishes', () => {
  for (const text of PUBLISHED_COPY_THAT_MUST_NOT_BE_CAUGHT) {
    it(`allows: "${text.slice(0, 60)}…"`, () => {
      expect(breaksRuleA(text), 'rule A fired on published copy').toBe(false)
      expect(breaksRuleB(text), 'rule B fired on published copy').toBe(false)
      expect(breaksRuleC(text), 'rule C fired on published copy').toBe(false)
    })
  }
})

/*
 * THE INVERSE SWEEP, and it is the half of this round that mattered most.
 *
 * The fixture above is a hand-picked sample. The three rule assertions
 * further up already run over every block of every built page, so a false
 * positive anywhere in dist/ fails them — but it fails them with a message
 * about a VIOLATION, which is exactly the wrong thing to tell someone whose
 * compliant sentence just tripped a widened regex. A guard that cries wolf
 * is a guard the next person loosens, and this project has had that happen.
 *
 * So the same sweep runs once more here, per rule, saying what it is: a
 * check that widening the vocabulary did not start failing the copy the site
 * has always published. It also pins the corpus size, because a sweep over
 * an empty dist/ is a sweep that proves nothing.
 */
describe('widening the rules did not start catching compliant copy', () => {
  it('sweeps a corpus worth sweeping', () => {
    const blocks = publishedBlocks()
    expect(blocks.length).toBeGreaterThan(200)
    expect(new Set(blocks.map((b) => b.file)).size).toBeGreaterThanOrEqual(6)
    // The three vocabularies must each still have a subject somewhere on the
    // site, or "no false positives" is a claim about nothing.
    expect(blocks.some(({ block }) => RECOVERY_VERB.test(block))).toBe(true)
    expect(blocks.some(({ block }) => BORNE_BY_HELPER.test(block))).toBe(true)
    expect(blocks.some(({ block }) => THE_PACKAGE.test(block))).toBe(true)
  })

  it('every block of every built page passes all three rules', () => {
    const offenders = publishedBlocks().flatMap(({ file, block }) =>
      (['A', 'B', 'C'] as const)
        .filter((rule) => BREAKS[rule](block))
        .map((rule) => `${file}: [rule ${rule}] ${block}`),
    )
    expect(offenders).toEqual([])
  })
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
    for (const file of ['insurance.md', 'medical-checkup.md']) {
      const content = readFileSync(`${FAQ}/${file}`, 'utf8')
      expect(content, `${file} applies §2.4's framing to an employer-borne cost`).not.toMatch(
        RECOVERY_VERB,
      )
      // The mechanism MOM actually prohibits, and the file the reviewer's
      // mutation was appended to. "The insurance is billed to the helper"
      // contains not one word of §2.4's framing, so the assertion above
      // passed on it — this is the one that fails.
      expect(content, `${file} passes an employer-borne cost to the helper`).not.toMatch(
        PASSED_TO_HELPER,
      )
      expect(content, `${file} calls an employer-borne cost the helper's`).not.toMatch(
        BORNE_BY_HELPER,
      )
      expect(content, `${file} makes a whole-amount blur`).not.toMatch(WHOLE_AMOUNT)
    }
  })
})
