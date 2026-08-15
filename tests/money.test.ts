import { describe, it, expect } from 'vitest'
import { sumCents, formatSgd } from '../src/lib/money'

describe('sumCents', () => {
  it('sums the published fly-in line items exactly', () => {
    expect(sumCents([88800, 7000, 42510, 7700, 6000, 12000])).toBe(164010)
  })

  it('returns 0 for an empty list', () => {
    expect(sumCents([])).toBe(0)
  })

  it('rejects non-integer input', () => {
    expect(() => sumCents([1640.1])).toThrow(/integer cents/)
  })
})

describe('formatSgd', () => {
  it('formats the with-replacement total', () => {
    expect(formatSgd(164010)).toBe('$1,640.10')
  })

  it('formats the without-replacement total', () => {
    expect(formatSgd(125210)).toBe('$1,252.10')
  })

  it('pads a trailing zero in the cents', () => {
    expect(formatSgd(88800)).toBe('$888.00')
  })

  it('rejects non-integer input', () => {
    expect(() => formatSgd(164010.5)).toThrow(/integer cents/)
  })

  it('formats negative amounts with sign first', () => {
    expect(formatSgd(-38800)).toBe('-$388.00')
  })

  it('formats small negative amounts', () => {
    expect(formatSgd(-150)).toBe('-$1.50')
  })

  it('formats large values with multiple thousand separators', () => {
    expect(formatSgd(1000000000)).toBe('$10,000,000.00')
  })

  it('formats zero', () => {
    expect(formatSgd(0)).toBe('$0.00')
  })
})
