import { describe, it, expect } from 'vitest'
import { contrastRatio } from '../src/lib/contrast'

describe('contrastRatio', () => {
  it('returns 21 for black on white', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1)
  })

  it('returns 1 for identical colours', () => {
    expect(contrastRatio('#4a7c59', '#4a7c59')).toBeCloseTo(1, 5)
  })

  it('is order-independent', () => {
    expect(contrastRatio('#333333', '#eeeeee')).toBeCloseTo(
      contrastRatio('#eeeeee', '#333333'), 5,
    )
  })

  it('accepts shorthand hex', () => {
    expect(contrastRatio('#000', '#fff')).toBeCloseTo(21, 1)
  })
})
