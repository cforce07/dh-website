/**
 * WCAG 2.x relative luminance and contrast ratio utilities.
 * https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 * https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
 */

function expand(hex: string): string {
  const raw = hex.replace('#', '')
  return raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw
}

function channelLuminance(value: number): number {
  const srgb = value / 255
  return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4
}

export function relativeLuminance(hex: string): number {
  const raw = expand(hex)
  const r = channelLuminance(parseInt(raw.slice(0, 2), 16))
  const g = channelLuminance(parseInt(raw.slice(2, 4), 16))
  const b = channelLuminance(parseInt(raw.slice(4, 6), 16))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrastRatio(hexA: string, hexB: string): number {
  const a = relativeLuminance(hexA)
  const b = relativeLuminance(hexB)
  const [lighter, darker] = a > b ? [a, b] : [b, a]
  return (lighter + 0.05) / (darker + 0.05)
}
