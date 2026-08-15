import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { contrastRatio } from '../src/lib/contrast'

const css = readFileSync('src/styles/tokens.css', 'utf8')

function token(name: string): string {
  const match = css.match(new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{3,6})`))
  if (!match) throw new Error(`Token --color-${name} not found in tokens.css`)
  return match[1]
}

describe('token contrast', () => {
  it('body text on surface meets AA', () => {
    expect(contrastRatio(token('ink'), token('surface'))).toBeGreaterThanOrEqual(4.5)
  })

  it('muted text on surface meets AA', () => {
    expect(contrastRatio(token('ink-muted'), token('surface'))).toBeGreaterThanOrEqual(4.5)
  })

  it('accent meets AA against surface', () => {
    expect(contrastRatio(token('accent'), token('surface'))).toBeGreaterThanOrEqual(4.5)
  })

  it('text on the deep brand surface meets AA', () => {
    expect(contrastRatio(token('on-deep'), token('deep'))).toBeGreaterThanOrEqual(4.5)
  })

  it('accent-on-deep meets AA against the deep brand surface', () => {
    expect(contrastRatio(token('accent-on-deep'), token('deep'))).toBeGreaterThanOrEqual(4.5)
  })

  // The softer steps of the deep register. These replaced eight inline
  // rgba(250, 248, 245, α) literals in Footer.astro; the tokens are those
  // composites pre-flattened over --color-deep, so their contrast is
  // directly assertable here — which is the point of flattening them.
  // Footer's body copy and small labels are real text and must clear AA.
  it('soft text on the deep brand surface meets AA', () => {
    expect(contrastRatio(token('on-deep-soft'), token('deep'))).toBeGreaterThanOrEqual(4.5)
  })

  it('muted text on the deep brand surface meets AA', () => {
    // Was rgba(...,0.6) in Footer.astro — the footer headings, copyright,
    // and legal links. Measures 5.28:1; do not darken it below 4.5:1.
    expect(contrastRatio(token('on-deep-muted'), token('deep'))).toBeGreaterThanOrEqual(4.5)
  })

  it('the control boundary on the deep brand surface meets the non-text threshold', () => {
    // Was rgba(...,0.5) — the secondary Button's outline in the footer,
    // where the border is the only thing distinguishing the control from
    // the background. Measures 4.14:1, comfortably past the 3:1 floor.
    expect(contrastRatio(token('border-on-deep'), token('deep'))).toBeGreaterThanOrEqual(3)
  })

  // Controller ruling overrides the brief's original assertion here:
  // --color-border (#DDD8D1) is a decorative hairline at ~1.3:1 against
  // surface and is not a contrast-bearing element, so the 3:1 non-text
  // threshold does not properly apply to it. Where a border is the *only*
  // thing distinguishing a control from its background, --color-ink-muted
  // must be used instead — so the non-text threshold is asserted against
  // that token, which is the one actually relied on for that purpose.
  it('the control-boundary colour meets the non-text threshold', () => {
    expect(contrastRatio(token('ink-muted'), token('surface'))).toBeGreaterThanOrEqual(3)
  })
})
