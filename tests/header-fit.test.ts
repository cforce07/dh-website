/**
 * Header-fit regression guard.
 *
 * Two failures this file exists to catch, both of which have already
 * happened on this site and both of which passed every other test:
 *
 *   1. The four-way breakpoint hand-sync. --bp-desktop's literal is
 *      repeated in tokens.css, Header.astro, MobileNav.astro and
 *      MobileCtaBar.astro because CSS custom properties do not resolve
 *      inside an @media condition. Change three of the four and a
 *      viewport band opens in which the desktop nav is still hidden and
 *      the mobile nav is already hidden — no navigation at all.
 *
 *   2. The header outgrowing its column. The header lives inside
 *      Container (72rem, minus 2x --space-8 of padding), and the desktop
 *      breakpoint is only honest if the header's natural width actually
 *      fits that box. It did not for a long time: the token had been
 *      pushed out to 96em/1536px to hide a header that overflowed at
 *      every desktop width.
 *
 * WHY THIS FILE DOES NOT ASSERT `scrollWidth <= clientWidth`
 * ---------------------------------------------------------
 * That was the originally-specified check and it is a tautology on this
 * component. `.header-inner` is a flex row; a flex row always "fits" by
 * shrinking its items, so scrollWidth tracks clientWidth no matter how
 * much content is in it. Measured in real Chrome at a 1040px viewport
 * with the desktop nav forced visible: scrollWidth === clientWidth ===
 * 961px, while the wordmark's <svg> painted 61px past its own shrunken
 * box and straight through the first nav item. The metric was clean and
 * the header was broken.
 *
 * The fix in Header.astro is `flex: 0 0 auto` on all three children, so
 * a header that does not fit overflows for real. This file guards the
 * inputs to that arithmetic — the width budget itself — rather than
 * re-reading a runtime number that cannot fail. A jsdom-free static
 * check is also the right tool here: the numbers below came from real
 * Chrome (see --bp-desktop's comment in tokens.css), and a headless
 * re-measurement would only be as trustworthy as its font stack.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { navItems } from '../src/lib/nav'

/**
 * Every file in this shell is heavily commented, and the comments quote
 * the very things these assertions look for — "there is deliberately no
 * padding-inline override here", "this file has no <title>", and so on.
 * Matching raw source would make a comment explaining a rule indis-
 * tinguishable from a violation of it, which is how the first draft of
 * this file failed on four correct files. Strip comments first; assert
 * against code.
 */
function code(source: string): string {
  return source
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ') // JSX/Astro template comments
    .replace(/\/\*[\s\S]*?\*\//g, ' ') // JS and CSS block comments
    .replace(/<!--[\s\S]*?-->/g, ' ') // HTML and SVG comments
}

const read = (path: string) => readFileSync(path, 'utf8')

const tokens = read('src/styles/tokens.css')
const header = code(read('src/components/Header.astro'))
const mobileNav = code(read('src/components/MobileNav.astro'))
const mobileBar = code(read('src/components/MobileCtaBar.astro'))
const footer = code(read('src/components/Footer.astro'))
const layout = code(read('src/layouts/BaseLayout.astro'))

/** The single declared value, parsed from the token it is declared in. */
function declaredBpDesktopEm(): number {
  const match = tokens.match(/--bp-desktop:\s*([\d.]+)em/)
  if (!match) throw new Error('tokens.css no longer declares --bp-desktop in em')
  return Number(match[1])
}

/** Every `min-width:`/`max-width:` em literal in a component's <style>. */
function mediaEmLiterals(source: string): number[] {
  return [...source.matchAll(/\((?:min|max)-width:\s*([\d.]+)em\)/g)].map((m) => Number(m[1]))
}

describe('--bp-desktop stays synchronised across all four files', () => {
  const bp = declaredBpDesktopEm()

  it('Header.astro switches the desktop nav on at exactly --bp-desktop', () => {
    expect(mediaEmLiterals(header)).toContain(bp)
    expect(header).toContain(`@media (min-width: ${bp}em)`)
  })

  it('MobileNav.astro hides the mobile nav at exactly --bp-desktop', () => {
    expect(mobileNav).toContain(`@media (min-width: ${bp}em)`)
  })

  it('MobileCtaBar.astro shows the bar up to exactly one hair below --bp-desktop', () => {
    // 0.01em below, so this query and the two min-width queries above can
    // never both match at the same viewport width.
    expect(mobileBar).toContain(`@media (max-width: ${bp - 0.01}em)`)
  })

  it('no stale copy of the previous 96em breakpoint survives in any shell file', () => {
    // The literal 96em meant "desktop breakpoint" in all four files. If it
    // reappears in a media query, one file was missed during a sync.
    for (const [name, source] of [
      ['Header.astro', header],
      ['MobileNav.astro', mobileNav],
      ['MobileCtaBar.astro', mobileBar],
    ] as const) {
      const stale = mediaEmLiterals(source).filter((em) => em !== bp && em !== bp - 0.01 && em >= 64)
      expect(stale, `${name} carries a shell breakpoint that is not --bp-desktop`).toEqual([])
    }
  })

  it('leaves no viewport width without a nav surface', () => {
    // Header/MobileNav switch ON at >= bp; MobileCtaBar and the mobile nav
    // are visible at <= bp - 0.01. Those two ranges must be contiguous and
    // non-overlapping, which is exactly the -0.01em relationship above.
    const desktopFrom = bp
    const mobileUpTo = bp - 0.01
    expect(mobileUpTo).toBeLessThan(desktopFrom)
    expect(desktopFrom - mobileUpTo).toBeCloseTo(0.01, 5)
  })
})

describe('the header still fits the column at --bp-desktop', () => {
  /*
   * Measured in real Chrome, 2026-08-16, at the natural (max-content)
   * width of .header-inner with the desktop nav visible. Re-measure and
   * update these together if the header's contents change; the writeup
   * lives on --bp-desktop in tokens.css.
   */
  const MEASURED = {
    logoPx: 178.01, // logo-wordmark.svg at height: 26px
    navPx: 568.76, // 7 nav items, --space-3 (12px) gaps
    ctaPx: 242.52, // one primary Button at its normal --space-6 padding
    gapPx: 32, // 2 x --space-4 between the three children
    navItemCount: 7,
    scrollbarPx: 15, // classic Windows Chrome; the worst case we design for
  }
  const CONTAINER_MAX_PX = 72 * 16 // Container.astro .default max-width: 72rem
  const CONTAINER_PADDING_PX = 32 * 2 // --space-8 each side above --bp-tablet
  const naturalPx = MEASURED.logoPx + MEASURED.navPx + MEASURED.ctaPx + MEASURED.gapPx

  it('the measured nav width still describes the nav that ships', () => {
    // Guards the measurement itself: add or remove a nav item and the
    // numbers above stop describing reality, so the budget below silently
    // stops meaning anything. This is the check that fires first.
    expect(navItems).toHaveLength(MEASURED.navItemCount)
  })

  it('the natural header width fits inside Container at --bp-desktop', () => {
    const bpPx = declaredBpDesktopEm() * 16
    const clientPx = bpPx - MEASURED.scrollbarPx
    const contentPx = Math.min(clientPx, CONTAINER_MAX_PX) - CONTAINER_PADDING_PX
    expect(naturalPx).toBeLessThanOrEqual(contentPx)
  })

  it('keeps at least 5% of margin over the crossover for font-rendering variance', () => {
    // The header is measured on one machine's font stack. Figtree renders
    // a few px wider on some platforms, and a breakpoint set exactly at
    // the crossover would overflow on those. 5% of the natural width is
    // the floor; the shipped value currently clears it by much more.
    const bpPx = declaredBpDesktopEm() * 16
    const crossoverPx = naturalPx + CONTAINER_PADDING_PX + MEASURED.scrollbarPx
    expect(bpPx - crossoverPx).toBeGreaterThanOrEqual(naturalPx * 0.05)
  })

  it('would fail if the header regained the content that forced 96em', () => {
    // Proves the budget check above is load-bearing rather than trivially
    // satisfiable: the pre-trim header (8 nav items, 2 CTAs, compacted
    // padding) measured 1251.60px natural and must NOT fit at the current
    // breakpoint. If this ever passes, the arithmetic has gone slack.
    const preTrimNaturalPx = 1251.6
    const bpPx = declaredBpDesktopEm() * 16
    const contentPx = Math.min(bpPx - MEASURED.scrollbarPx, CONTAINER_MAX_PX) - CONTAINER_PADDING_PX
    expect(preTrimNaturalPx).toBeGreaterThan(contentPx)
  })
})

describe('the header cannot silently squeeze its contents', () => {
  it('Header.astro pins its three children to flex: 0 0 auto', () => {
    // Without this, overflow is invisible: the flex line shrinks the logo
    // box while the SVG keeps painting at its intrinsic width, so the
    // wordmark renders through the nav with every metric reading clean.
    expect(header).toMatch(/\.logo,\s*\.primary-nav,\s*\.header-ctas\s*\{\s*flex:\s*0\s+0\s+auto/)
  })

  it('the header CTA carries no width-compaction padding override', () => {
    // The override existed only to squeeze a header that no longer needs
    // squeezing; re-adding it would hide a fit problem rather than fix it.
    expect(header).not.toMatch(/\.header-ctas\s*:global\(\.btn\)\s*\{[^}]*padding-inline/)
  })
})

describe('conversion surfaces after the header CTA trim', () => {
  it('the header carries the primary CTA and not the secondary', () => {
    expect(header).toContain('variant="primary"')
    expect(header).not.toContain('variant="secondary"')
  })

  it('the header never hardcodes either CTA URL', () => {
    expect(header).toContain('company.requirementFormUrl')
    expect(header).not.toMatch(/wa\.me|https?:\/\/[^\s"']*employer-requirement/)
  })

  it('every surface that carries BOTH CTAs still orders primary before secondary', () => {
    // The hierarchy rule governs order within a surface. The header now
    // carries one CTA so it is out of scope; these two still carry both.
    for (const [name, source] of [
      ['MobileNav.astro', mobileNav],
      ['MobileCtaBar.astro', mobileBar],
    ] as const) {
      const primaryAt = source.indexOf('variant="primary"')
      const secondaryAt = source.indexOf('variant="secondary"')
      expect(primaryAt, `${name} lost its primary CTA`).toBeGreaterThan(-1)
      expect(secondaryAt, `${name} lost its secondary CTA`).toBeGreaterThan(-1)
      expect(primaryAt, `${name} orders secondary before primary`).toBeLessThan(secondaryAt)
    }
  })

  it('MobileCtaBar keeps both buttons at every width, including the stacked range', () => {
    // R-7: removing WhatsApp below 416px was proposed and rejected. That
    // range is the cheapest-device, least-likely-to-fill-a-form segment,
    // and this bar is the only surface keeping WhatsApp permanently on
    // screen now that the header's secondary is gone.
    const stacked = mobileBar.slice(mobileBar.indexOf('@media (max-width: 26em)'))
    expect(stacked).not.toMatch(/display:\s*none/)
    expect(mobileBar.match(/variant="secondary"/g) ?? []).toHaveLength(1)
  })
})

describe('the brand mark is the real one', () => {
  it('the header renders logo-wordmark.svg, not typeset text or a generic square', () => {
    expect(header).toContain("from '../assets/logo-wordmark.svg'")
    expect(header).not.toContain('logo-mark')
    expect(header).not.toMatch(/\.logo\s*\{[^}]*font-family/)
  })

  it('the footer uses the on-deep variant, which is a contrast requirement', () => {
    expect(footer).toContain("from '../assets/logo-wordmark-on-deep.svg'")
    // The standard wordmark's charcoal (#4d4d4d) measures 1.47:1 on
    // --color-deep (#0E3A3B). The lockup's tagline is the same charcoal.
    expect(footer).not.toMatch(/from '\.\.\/assets\/logo-(wordmark|lockup)\.svg'/)
  })

  it('the inlined wordmarks carry no <style> block', () => {
    // An SVG <style> inlined into an HTML document is DOCUMENT-scoped.
    // With both wordmark variants on one page, whichever `.cls-1` rule
    // came last in the DOM repainted the other one — the header wordmark
    // rendered cream-on-cream. Fills must stay as attributes.
    for (const asset of ['logo-wordmark.svg', 'logo-wordmark-on-deep.svg']) {
      const svg = code(read(`src/assets/${asset}`))
      expect(svg, `${asset} reintroduced a document-scoped <style>`).not.toContain('<style>')
      expect(svg).not.toContain('class="cls-')
    }
  })

  it('the inlined wordmarks name nothing, so the link owns the accessible name', () => {
    for (const asset of ['logo-wordmark.svg', 'logo-wordmark-on-deep.svg']) {
      const svg = code(read(`src/assets/${asset}`))
      expect(svg).not.toContain('<title>')
      expect(svg).not.toContain('role="img"')
      expect(svg).not.toContain('aria-label')
    }
    // ...and each consuming link supplies one.
    for (const source of [header, mobileNav, footer]) {
      expect(source).toMatch(/aria-label=\{`\$\{company\.name\} home`\}/)
      expect(source).toContain('aria-hidden="true"')
    }
  })

  it('the favicon is DirectHired’s mark and no Astro starter asset survives', () => {
    const favicon = read('public/favicon.svg')
    const mark = read('src/assets/logo-mark.svg')
    expect(favicon).toBe(mark)
    expect(favicon).toContain('#00a4a6')
    // Astro's starter favicon is a black-on-transparent rocket path on a
    // 0 0 128 128 viewBox. The mark's viewBox is the H's tight crop.
    expect(favicon).toContain('viewBox="1010.5 559 147 147"')
  })

  it('BaseLayout links no favicon.ico while none is shipped', () => {
    // A <link> to a missing .ico is a guaranteed 404 on every page load;
    // a shipped .ico that is not the H is a wrong mark in Windows
    // shortcuts and bookmark bars. Either both or neither.
    const linksIco = /<link[^>]+href="\/favicon\.ico"/.test(layout)
    let shipsIco = true
    try {
      read('public/favicon.ico')
    } catch {
      shipsIco = false
    }
    expect(linksIco).toBe(shipsIco)
  })
})

describe('the tagline appears exactly once on the site', () => {
  const TAGLINE = 'Make It Easier For You'

  it('is in the footer', () => {
    expect(read('src/components/Footer.astro')).toContain(TAGLINE)
  })

  it('is nowhere else in the rendered shell or sections', () => {
    // Its scarcity is what makes it a signature rather than a slogan. The
    // logo-lockup.svg asset is excluded: it carries the tagline as
    // artwork and is not rendered on the site.
    const files = [
      'src/components/Header.astro',
      'src/components/MobileNav.astro',
      'src/components/MobileCtaBar.astro',
      'src/layouts/BaseLayout.astro',
      'src/sections/Hero.astro',
      'src/sections/FinalCta.astro',
    ]
    for (const file of files) {
      expect(code(read(file)), `${file} repeats the tagline`).not.toContain(TAGLINE)
    }
  })
})
