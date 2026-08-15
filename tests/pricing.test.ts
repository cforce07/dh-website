import { describe, it, expect } from 'vitest'
import { packages, packageTotalCents } from '../src/data/pricing'
import { formatSgd } from '../src/lib/money'

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
      { label: 'Transport', amountCents: 12000 },
    ])
  })

  it('has no replacement term', () => {
    expect(withoutReplacement.replacementTerm).toBeNull()
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

  it('differ only in the agent fee — every other line item is identical', () => {
    if (withReplacement.kind !== 'itemised' || withoutReplacement.kind !== 'itemised') {
      throw new Error('unreachable')
    }
    const strip = (p: typeof withReplacement) =>
      p.lineItems.filter((i) => i.label !== 'Agent fees').map((i) => i.amountCents)
    expect(strip(withoutReplacement)).toEqual(strip(withReplacement))
  })
})
