import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import type { TotalOnlyPackage } from '../src/data/pricing'
import { packages, packageTotalCents } from '../src/data/pricing'
import { formatSgd } from '../src/lib/money'
import PricingCard from '../src/components/PricingCard.astro'

const withReplacement = packages.find((p) => p.id === 'fly-in-with-replacement')!
const withoutReplacement = packages.find((p) => p.id === 'fly-in-without-replacement')!

describe('fly-in with replacement', () => {
  it('derives its total from line items, matching the published price', () => {
    expect(formatSgd(packageTotalCents(withReplacement))).toBe('$1,640.10')
  })

  it('is itemised with the six published components', () => {
    expect(withReplacement.kind).toBe('itemised')
    if (withReplacement.kind !== 'itemised') throw new Error('unreachable')
    expect(withReplacement.lineItems).toEqual([
      { label: 'Agent fees', amountCents: 88800 },
      { label: 'MOM', amountCents: 7000 },
      { label: 'Insurance', amountCents: 42510 },
      { label: 'SIP', amountCents: 7700 },
      { label: 'Medical', amountCents: 6000 },
      { label: 'Handling & transport', amountCents: 12000 },
    ])
  })

  it('states the confirmed replacement term', () => {
    expect(withReplacement.replacementTerm).toBe('1 replacement within 6 months')
  })

  it('carries the audience DirectHired recommended it to, and only that', () => {
    expect(withReplacement.recommendedFor).toBe('first-time employers')
  })
})

/*
 * The recommendation, asserted as the SHAPE of a claim rather than as a
 * string that happens to be present.
 *
 * DirectHired answered one question on 2026-08-16 (core-pages design spec
 * §2.6.3): do you recommend the with-replacement package to first-time
 * employers? Yes. Everything below follows from how narrow that is.
 *
 * The failure this guards against is not a typo. It is the recommendation
 * drifting from "for first-time employers" into "better" — by losing its
 * audience, by appearing on both cards, or by acquiring a counterpart that
 * marks the other package as the lesser one. Each is a claim DirectHired
 * did not make, and each would be invisible to a test that only checked
 * that the words "Recommended for" appear somewhere.
 */
describe('the package recommendation', () => {
  it('is carried by exactly one package', () => {
    const recommended = packages.filter((pkg) => pkg.recommendedFor !== null)
    expect(recommended.map((pkg) => pkg.id)).toEqual(['fly-in-with-replacement'])
  })

  it('names an audience — there is no bare "recommended"', () => {
    for (const pkg of packages) {
      if (pkg.recommendedFor === null) continue
      expect(pkg.recommendedFor.trim().length).toBeGreaterThan(0)
    }
  })

  it('renders as "Recommended for <audience>" on the card that carries it', async () => {
    const container = await AstroContainer.create()
    const html = await container.renderToString(PricingCard, { props: { pkg: withReplacement } })

    expect(html).toContain('Recommended for first-time employers')
  })

  it('says nothing at all on the card that does not', async () => {
    const container = await AstroContainer.create()
    const html = await container.renderToString(PricingCard, { props: { pkg: withoutReplacement } })

    // No recommendation, and — the part that matters — no anti-recommendation
    // either. The without-replacement package is the right choice for an
    // experienced employer; nothing here may suggest it is second best.
    expect(html).not.toContain('Recommended')
    expect(html).not.toMatch(/\b(?:less suitable|not recommended|basic|budget|limited)\b/i)
  })

  it('reserves the same box on both cards, so the comparison stays aligned', async () => {
    const container = await AstroContainer.create()
    const [recommended, plain] = await Promise.all([
      container.renderToString(PricingCard, { props: { pkg: withReplacement } }),
      container.renderToString(PricingCard, { props: { pkg: withoutReplacement } }),
    ])

    // Both cards render the flag element. It is what keeps every row on the
    // two cards on the same baseline between 768 and 828px, where the card
    // titles wrap differently — see the note on .pkg-name in PricingCard. A
    // flag rendered on one card only would reintroduce that defect.
    expect(recommended).toMatch(/class="[^"]*\bpkg-flag\b/)
    expect(plain).toMatch(/class="[^"]*\bpkg-flag\b/)
    // ...and the empty one is marked as empty, so it can be unfilled and
    // hidden from assistive technology rather than announced as a blank.
    expect(recommended).not.toMatch(/class="[^"]*\bis-empty\b/)
    expect(plain).toMatch(/class="[^"]*\bis-empty\b/)
    expect(plain).toMatch(/aria-hidden="true"/)
  })

  /*
   * THE ASSERTION THE MARKUP TESTS ABOVE COULD NOT MAKE.
   *
   * The recommendation flag shipped broken and the five tests added
   * alongside it all passed, because every one of them asserts MARKUP —
   * both cards render .pkg-flag, the empty one is aria-hidden — and all of
   * that was equally true of the broken version. The defect was in one
   * declaration: `min-block-size: 1lh` floors the BORDER box (global.css
   * sets box-sizing: border-box), so the empty flag's 24px of vertical
   * padding already cleared an 18px floor and it rendered 24px tall
   * against the filled flag's 42px. Every row on the two cards sat 18px
   * apart — the exact defect the element was added to prevent, visible only
   * by measuring, and invisible to a test that reads the DOM.
   *
   * That is three times on this branch that a defect was visible only by
   * measuring, so this asserts the arithmetic itself.
   *
   * WHY HERE. tests/section-rhythm.test.ts is this project's precedent for
   * asserting a CSS source pattern, and the reasoning it records for doing
   * so applies unchanged: a floor is decided at author time, and a jsdom
   * re-measurement would only be as trustworthy as jsdom's layout engine
   * (which does not implement `lh` at all). But that file reads
   * `src/sections/*.astro` by construction — its whole subject is the order
   * and grounds of page sections — and .pkg-flag is in src/components. It
   * would have to grow a second, unrelated reader to host this.
   *
   * This file is where the recommendation flag's other five assertions
   * live, and this is the sixth thing that has to hold about the same
   * element. Someone changing the flag reads this describe; nobody changing
   * the flag reads the section-rhythm file. Cohesion with the feature beats
   * cohesion with the technique.
   *
   * It is deliberately written against the RELATIONSHIP, not the literal
   * string: it reads the padding token out of the rule and requires the
   * floor to include twice that same token. Retuning the padding cannot
   * leave the floor behind.
   */
  it('floors the flag at one line PLUS its own vertical padding, not a bare 1lh', () => {
    const source = readFileSync('src/components/PricingCard.astro', 'utf8')
    // Comments in this file quote both the broken and the fixed value while
    // explaining the difference, so they must not be read as declarations.
    const css = source.replace(/\/\*[\s\S]*?\*\//g, ' ')

    // `.pkg-flag {`, not `.pkg-flag.is-empty {` — the second only clears the
    // background and carries no geometry.
    const rule = /\.pkg-flag\s*\{([^}]*)\}/.exec(css)
    expect(rule, 'no .pkg-flag rule in PricingCard.astro').not.toBeNull()
    const body = rule![1]

    // The block padding, read from the shorthand rather than assumed, so
    // this test tracks the rule instead of duplicating it.
    const padding = /padding:\s*var\((--space-\d+)\)\s+var\(--space-\d+\)/.exec(body)
    expect(padding, 'no two-value padding shorthand on .pkg-flag').not.toBeNull()
    const blockPadding = padding![1]

    const floors = [...body.matchAll(/min-block-size:\s*([^;]+);/g)].map((m) => m[1].trim())

    // Two declarations: the calc() fallback for engines without `lh`, then
    // the `lh` version. Both are floors, so both have to include the
    // padding — fixing only the second leaves Chrome <109 and Safari <16.4
    // rendering the original defect.
    expect(floors).toHaveLength(2)
    for (const floor of floors) {
      expect(floor, `min-block-size: ${floor} omits its own vertical padding`).toMatch(
        new RegExp(`\\+\\s*2\\s*\\*\\s*var\\(${blockPadding}\\)`),
      )
    }
    // Named explicitly because it is the exact value that shipped broken.
    expect(floors).not.toContain('1lh')
    expect(floors.some((floor) => /\b1lh\b/.test(floor))).toBe(true)
  })
})

describe('fly-in without replacement', () => {
  it('reports the published total', () => {
    expect(formatSgd(packageTotalCents(withoutReplacement))).toBe('$1,140.10')
  })

  // Was 'total-only' while the breakdown was unknown. DirectHired supplied
  // the real line items on 2026-08-16, so this package is now honestly
  // itemisable and the total-only guard is no longer needed for it.
  it('is itemised, from the breakdown DirectHired supplied', () => {
    expect(withoutReplacement.kind).toBe('itemised')
  })

  // Label/amount pairs, not labels alone: a transposition would preserve the
  // total and the label order while publishing wrong per-item amounts.
  it('carries the supplied line items exactly', () => {
    if (withoutReplacement.kind !== 'itemised') throw new Error('unreachable')
    expect(withoutReplacement.lineItems).toEqual([
      { label: 'Agent fees', amountCents: 38800 },
      { label: 'MOM', amountCents: 7000 },
      { label: 'Insurance', amountCents: 42510 },
      { label: 'SIP', amountCents: 7700 },
      { label: 'Medical', amountCents: 6000 },
      { label: 'Handling & transport', amountCents: 12000 },
    ])
  })

  // States the absence rather than leaving it null. A null rendered nothing,
  // so the one difference a visitor is comparing was communicated by a gap
  // where the other card has a line.
  it('states that no replacement is included, rather than saying nothing', () => {
    expect(withoutReplacement.replacementTerm).toBe('No replacement')
  })

  it('does not promise a replacement it excludes', () => {
    expect(withoutReplacement.replacementTerm).not.toMatch(/within|\d+\s*month/i)
  })
})

describe('the two packages', () => {
  // $500, not the $388 the master brief describes: the brief's
  // without-replacement total ($1,252.10) was stale. The real gap is the
  // agent fee, $888 against $388.
  it('differ by $500 — the agent fee, and nothing else', () => {
    const difference = packageTotalCents(withReplacement) - packageTotalCents(withoutReplacement)
    expect(formatSgd(difference)).toBe('$500.00')
  })

  // Labels as well as amounts. Comparing amounts alone is how the two cards
  // came to show "Handling & transport" and "Transport" for the same $120 —
  // identical prices reading as different line items in a side-by-side
  // comparison.
  it('differ only in the agent fee — every other line item is identical, label included', () => {
    if (withReplacement.kind !== 'itemised' || withoutReplacement.kind !== 'itemised') {
      throw new Error('unreachable')
    }
    const strip = (p: typeof withReplacement) =>
      p.lineItems.filter((i) => i.label !== 'Agent fees')
    expect(strip(withoutReplacement)).toEqual(strip(withReplacement))
  })
})

describe('TotalOnlyPackage — the guard against an invented breakdown', () => {
  /*
   * Both shipped packages are itemised as of 2026-08-16, so `TotalOnlyPackage`
   * has ZERO instances in src/. That left the whole mechanism unexercised:
   * `packageTotalCents`'s non-itemised branch, PricingCard's total-only
   * branch, and the `.total-only` CSS rule were all dead, and both files
   * describe that mechanism as the thing making a fabricated breakdown "a
   * type error". A guarantee nothing runs is a guarantee nobody has checked.
   *
   * This fixture is the missing instance. It is a TEST fixture and must never
   * be added to `packages` — it is not DirectHired's pricing, and inventing a
   * package is exactly the master brief §78 violation the type exists to make
   * impossible. It is here so that the next real package with an unpublished
   * breakdown finds the path already working.
   */
  const totalOnly: TotalOnlyPackage = {
    kind: 'total-only',
    id: 'fixture-total-only',
    name: 'Fixture Package',
    totalCents: 123456,
    replacementTerm: null,
    recommendedFor: null,
  }

  it('has no lineItems property at all — the structural reason a guess cannot be written', () => {
    // Not `lineItems: undefined`, not an empty array. The property is absent
    // from the type, so `pkg.lineItems` outside the `kind === 'itemised'`
    // narrowing does not compile.
    expect('lineItems' in totalOnly).toBe(false)
    // @ts-expect-error `lineItems` does not exist on TotalOnlyPackage. This
    // line is the compile-time half of the claim both src/data/pricing.ts and
    // src/components/PricingCard.astro make in prose; if the union is ever
    // flattened so that a total-only package silently accepts line items,
    // this stops being an error and a typecheck fails here.
    expect(totalOnly.lineItems).toBeUndefined()
  })

  it('reports its stated total rather than summing anything', () => {
    // packageTotalCents' second branch, which no shipped package reaches.
    expect(packageTotalCents(totalOnly)).toBe(123456)
    expect(formatSgd(packageTotalCents(totalOnly))).toBe('$1,234.56')
  })

  it('renders as a total with no breakdown, and nothing invented in its place', async () => {
    const container = await AstroContainer.create()
    const html = await container.renderToString(PricingCard, { props: { pkg: totalOnly } })

    expect(html).toContain('$1,234.56')
    // The empty space where a breakdown would be stays empty. No <ul> of
    // line items, and no "breakdown unavailable" copy standing in for one.
    expect(html).not.toMatch(/<ul[^>]*class="[^"]*line-items/)
    expect(html).not.toContain('Agent fees')
    // ...and the branch that draws it is the total-only one, so the
    // `.total-only` rule in PricingCard.astro has an element to match.
    expect(html).toMatch(/class="[^"]*\btotal-only\b/)
  })

  it('still renders every line item when the package IS itemised (the other branch)', async () => {
    const container = await AstroContainer.create()
    const html = await container.renderToString(PricingCard, {
      props: { pkg: packages.find((p) => p.id === 'fly-in-with-replacement') },
    })

    expect(html).toContain('Agent fees')
    expect(html).toContain('$1,640.10')
    expect(html).not.toMatch(/class="[^"]*\btotal-only\b/)
  })
})
