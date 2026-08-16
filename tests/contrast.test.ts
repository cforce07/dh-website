/**
 * contrastRatio / relativeLuminance — WCAG 2.x.
 *
 * WHY THIS FILE GREW (2026-08-17). It had four cases and every one of them
 * was MATHEMATICALLY INVARIANT under the two errors this code can actually
 * make:
 *
 *   black on white returns 21 FOR ANY GAMMA EXPONENT — 0 and 1 are the two
 *   fixed points of x ** n, so the transfer curve could be squared, cubed or
 *   dropped entirely and this case would not move. Two of the four cases were
 *   black on white (the second via shorthand).
 *
 *   the other two used GREYS AND SELF-PAIRS — #4a7c59 against itself, and
 *   #333333 against #eeeeee. When R = G = B the three coefficients only ever
 *   appear as their sum, which is 1 by construction, so permuting them is
 *   invisible; and a colour against itself returns 1 whatever the luminance
 *   function is.
 *
 * So all four passed on a broken implementation. That matters because
 * `contrastRatio` is not decoration: tests/tokens.test.ts uses it to enforce
 * WCAG AA across the whole palette (spec §6), and a swapped red/blue weight
 * would quietly pass teal-on-cream while failing nothing.
 *
 * THE FOUR ORIGINAL CASES ARE ALL STILL HERE. Nothing below replaces them —
 * they are correct, they are cheap, and they cover the shorthand parser and
 * the order-independence of the ratio, which the new cases do not.
 *
 * WHAT THE NEW CASES ARE. Published values for NON-GREY pairs, every one of
 * which a reader can check against a source that is not this repository:
 *
 *   L(#ff0000) = 0.2126   the sRGB coefficients, read straight out of the
 *   L(#00ff00) = 0.7152   WCAG definition. A full-intensity primary passes
 *   L(#0000ff) = 0.0722   through the transfer curve unchanged (1 ** n = 1),
 *                         so these three isolate the WEIGHTS exactly.
 *   L(#808080) = 0.2159   50% grey. R = G = B, so the weights cancel and this
 *                         isolates the GAMMA exactly — at 2.2 it would be
 *                         0.2159 -> 0.2088, at 1.0 it would be ~0.502.
 *   red on white   3.998  ) published everywhere as 4.0 / 8.59 / 1.37, and
 *   blue on white  8.592  ) the red-vs-blue gap is the single sharpest test
 *   green on white 1.372  ) of the weights there is: swap those two
 *                           coefficients and red returns blue's number.
 *   yellow on black 19.56 two channels at once, still gamma-invariant
 *   #767676 on white 4.54 the canonical darkest grey that passes AA on white
 *   #1976d2 on white 4.60 Material Blue 700, published by Material as 4.6:1.
 *                         A real UI colour, non-grey and non-saturated, so it
 *                         is the one case here sensitive to BOTH errors at
 *                         once: swap red and blue and it reads 3.31.
 */
import { describe, it, expect } from 'vitest'
import { contrastRatio, relativeLuminance } from '../src/lib/contrast'

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

  it('expands shorthand to the same colour, on a pair that is not black and white', () => {
    // The case above cannot tell a working expander from one that returns
    // black for everything: '#000' and '#fff' are their own expansions in
    // effect. This one fails if `expand` drops or duplicates the wrong nibble.
    expect(contrastRatio('#c00', '#fff')).toBeCloseTo(contrastRatio('#cc0000', '#ffffff'), 10)
    expect(contrastRatio('#1a2', '#fff')).toBeCloseTo(contrastRatio('#11aa22', '#ffffff'), 10)
  })
})

describe('relativeLuminance uses the sRGB coefficients WCAG specifies', () => {
  /*
   * A full-intensity primary is 1.0 after the transfer curve for any
   * exponent, so each of these returns its coefficient and nothing else.
   * They are the definition, not a derived figure:
   * https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
   *
   * Asserted to 6 places, one per channel, so a PERMUTATION of the three
   * fails on two of the three tests and names which.
   */
  it('weights red at 0.2126', () => {
    expect(relativeLuminance('#ff0000')).toBeCloseTo(0.2126, 6)
  })

  it('weights green at 0.7152', () => {
    expect(relativeLuminance('#00ff00')).toBeCloseTo(0.7152, 6)
  })

  it('weights blue at 0.0722', () => {
    expect(relativeLuminance('#0000ff')).toBeCloseTo(0.0722, 6)
  })

  it('the three weights sum to 1, which is why greys can never detect a swap', () => {
    // Stated as an assertion because it is the reason the original four cases
    // were blind, and the reason no case above this line uses a grey.
    const sum =
      relativeLuminance('#ff0000') + relativeLuminance('#00ff00') + relativeLuminance('#0000ff')
    expect(sum).toBeCloseTo(1, 6)
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 6)
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 6)
  })
})

describe('relativeLuminance applies the sRGB transfer curve, not a linear one', () => {
  /*
   * 50% grey is the standard demonstration that sRGB is not linear: the
   * midpoint of the encoding is roughly a fifth of the light, not half of it.
   *
   *   exponent 2.4 (correct)   0.2159
   *   exponent 2.2             0.2088
   *   no curve at all          0.5020
   *
   * R = G = B here, so the weights cancel entirely and this measures the
   * curve and nothing else.
   */
  it('puts #808080 at 0.2159, not 0.502', () => {
    expect(relativeLuminance('#808080')).toBeCloseTo(0.2159, 4)
  })

  it('uses the linear segment below the 0.03928 threshold', () => {
    // #030303 is 3/255 = 0.01176, under the threshold, so the correct answer
    // is a straight divide by 12.92 rather than the power curve. The two
    // branches differ by a factor of ~4 here, and nothing else in this file
    // exercises the low branch at all.
    const linear = 3 / 255 / 12.92
    expect(relativeLuminance('#030303')).toBeCloseTo(linear, 8)
  })
})

describe('contrastRatio matches published ratios for non-grey pairs', () => {
  /*
   * Every expected value here is published outside this repository, which is
   * the property that makes them worth having: a test whose expectations were
   * computed by the code under test asserts only that the code is
   * self-consistent.
   *
   * The red/blue pair is the sharpest of them. Swap the two coefficients and
   * red-on-white returns 8.59 while blue-on-white returns 4.00 — the two
   * assertions trade places, and both fail.
   */
  const PUBLISHED: { why: string; fg: string; bg: string; ratio: number }[] = [
    { why: 'pure red on white, published as 4.0:1', fg: '#ff0000', bg: '#ffffff', ratio: 3.998 },
    { why: 'pure blue on white, published as 8.59:1', fg: '#0000ff', bg: '#ffffff', ratio: 8.592 },
    { why: 'pure green on white, published as 1.37:1', fg: '#00ff00', bg: '#ffffff', ratio: 1.372 },
    { why: 'yellow on black, published as 19.56:1', fg: '#ffff00', bg: '#000000', ratio: 19.556 },
    {
      why: 'the darkest grey that passes AA on white, published as 4.54:1',
      fg: '#767676',
      bg: '#ffffff',
      ratio: 4.542,
    },
    {
      why: 'Material Blue 700 on white, published by Material as 4.6:1',
      fg: '#1976d2',
      bg: '#ffffff',
      ratio: 4.602,
    },
    { why: 'red on blue, two non-grey colours', fg: '#ff0000', bg: '#0000ff', ratio: 2.149 },
  ]

  for (const { why, fg, bg, ratio } of PUBLISHED) {
    it(`${fg} on ${bg} — ${why}`, () => {
      expect(contrastRatio(fg, bg)).toBeCloseTo(ratio, 2)
    })
  }

  it('the red and blue results really are far apart, so a swap cannot hide in the tolerance', () => {
    // The assertions above use toBeCloseTo(…, 2), which is a window of
    // ±0.005. This says the thing they are distinguishing is four whole
    // ratio points apart, so the tolerance is nowhere near wide enough to
    // admit the wrong answer.
    const red = contrastRatio('#ff0000', '#ffffff')
    const blue = contrastRatio('#0000ff', '#ffffff')
    expect(Math.abs(blue - red)).toBeGreaterThan(4)
  })
})
