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
    expect(formatSgd(packageTotalCents(withoutReplacement))).toBe('$1,252.10')
  })

  it('is total-only, because the brief does not state its breakdown', () => {
    expect(withoutReplacement.kind).toBe('total-only')
  })

  it('has no replacement term', () => {
    expect(withoutReplacement.replacementTerm).toBeNull()
  })
})

describe('the two packages', () => {
  it('differ by the documented $388', () => {
    const difference = packageTotalCents(withReplacement) - packageTotalCents(withoutReplacement)
    expect(formatSgd(difference)).toBe('$388.00')
  })
})
