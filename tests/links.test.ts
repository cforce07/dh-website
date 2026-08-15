import { describe, it, expect, beforeAll } from 'vitest'
import { execSync } from 'node:child_process'
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
import { join, extname } from 'node:path'
import { company } from '../src/data/company'
import { navItems, legalItems } from '../src/lib/nav'

// npm run build:dev (not `npm run build`) deliberately: `build` pipes through
// scripts/check-tbd.mjs, which fails the build on the MOM licence <Tbd> by
// design (see TrustBar.astro). That gate protects production, but it would
// also block this suite from ever inspecting dist/ at all. build:dev is the
// same astro build without the gate.
beforeAll(() => {
  execSync('npm run build:dev', { stdio: 'inherit' })
}, 180_000)

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry)
    return statSync(full).isDirectory() ? sources(full) : [full]
  })
}

// Task 16 review, fix round 1: the hardcode scan originally walked only
// src/. public/ ships HTML/JS/JSON verbatim to the browser, so a hardcoded
// URL there is just as real a violation as one in src/ — extend the scan
// to cover it too.
//
// Root-level files are scanned too, but only ones with a code/config
// extension (astro.config.mjs, package.json, tsconfig.json, ...) — NOT
// every root-level file. The repo root also holds prose docs (e.g. the
// master context brief) that legitimately quote the production URL as
// documentation; including those would make this test permanently fail
// for a reason that isn't a bug. node_modules/, dist/, and .superpowers/
// are excluded simply by never being walked: only src/, public/, and
// top-level files are.
const ROOT_CODE_EXTENSIONS = new Set(['.mjs', '.cjs', '.js', '.ts', '.json', '.astro'])

function rootLevelConfigFiles(): string[] {
  return readdirSync('.').filter((entry) => {
    if (statSync(entry).isDirectory()) return false
    return ROOT_CODE_EXTENSIONS.has(extname(entry))
  })
}

function hardcodeScanFiles(): string[] {
  return [...sources('src'), ...sources('public'), ...rootLevelConfigFiles()]
}

// Normalises a path (Windows backslashes, a leading "./") so an exact-path
// comparison works regardless of how the entry was joined.
function normalize(f: string): string {
  return f.split('\\').join('/').replace(/^\.\//, '')
}

describe('CTA integrity', () => {
  it('no component hardcodes the requirement-form URL', () => {
    // Task 16 review, fix round 1: `!f.endsWith('company.ts')` was a
    // suffix match, not a path match — it would also exclude any future
    // src/lib/mock-company.ts or test-company.ts, silently removing it
    // from the one scan that protects the launch-critical URL's single
    // definition. Compare the normalised path exactly instead.
    const offenders = hardcodeScanFiles()
      .filter((f) => normalize(f) !== 'src/data/company.ts')
      .filter((f) => readFileSync(f, 'utf8').includes('/employer-requirement'))
    expect(offenders.map(normalize)).toEqual([])
  })

  it('the built homepage links to the configured form URL', () => {
    const html = readFileSync('dist/index.html', 'utf8')
    expect(html).toContain(company.requirementFormUrl)
  })

  it('the built homepage links to the official WhatsApp number', () => {
    expect(readFileSync('dist/index.html', 'utf8')).toContain('wa.me/6598556637')
  })

  it('never uses "Contact Us" as a primary CTA', () => {
    const html = readFileSync('dist/index.html', 'utf8')
    expect(html).not.toMatch(/class="btn primary"[^>]*>\s*Contact Us/)
  })

  it('never promises a perfect match', () => {
    expect(readFileSync('dist/index.html', 'utf8')).not.toMatch(/perfect match/i)
  })

  it('has exactly one h1', () => {
    const matches = readFileSync('dist/index.html', 'utf8').match(/<h1[\s>]/g) ?? []
    expect(matches).toHaveLength(1)
  })
})

// --- internal link resolution -----------------------------------------
//
// This sub-project ships exactly one page (src/pages/index.astro). Nav,
// footer, and a couple of homepage sections (HelperSources, Services)
// legitimately link to routes that don't exist as pages yet:
//   - /pricing, /faq, /about, /helpers, /services, /find-your-helper,
//     /why-directhired, and the four legal pages, from src/lib/nav.ts
//   - /helpers/<slug> and /services/<slug> detail pages, generated per
//     content-collection entry by HelperSources.astro / Services.astro
// Those belong to later sub-projects (see src/lib/nav.ts's own comment).
//
// Approach chosen: an EXPLICIT ALLOWLIST, not "scope the check to pages
// that exist in this sub-project". Scoping would only ever verify "/"
// resolves, which is checked elsewhere anyway and would leave this test
// unable to catch anything (a vacuous pass by construction, no matter
// what breaks). Building the allowlist from the same data the site uses
// to generate its own links — navItems, legalItems, and the real
// helpers/services collection slugs — means a genuine typo or a stray
// link this task didn't account for still fails the test, while intended
// future routes don't. The "sanity check" test below proves the allowlist
// is doing real work rather than papering over a check that always passes.

function resolvesInDist(hrefPath: string): boolean {
  const target = join('dist', hrefPath)
  if (existsSync(target) && statSync(target).isFile()) return true
  if (existsSync(join(target, 'index.html'))) return true
  if (existsSync(`${target}.html`)) return true
  return false
}

function slugsIn(contentDir: string): string[] {
  return readdirSync(contentDir)
    .filter((f) => f !== '.gitkeep')
    .map((f) => {
      const content = readFileSync(join(contentDir, f), 'utf8')
      const match = content.match(/^slug:\s*(.+)$/m)
      if (!match) throw new Error(`${contentDir}/${f} has no frontmatter "slug:" field`)
      return match[1].trim()
    })
}

function internalHrefsIn(html: string): string[] {
  const hrefs = [...html.matchAll(/href="(\/[^"]*)"/g)].map((m) => m[1].split(/[?#]/)[0])
  return [...new Set(hrefs)]
}

function knownFutureRoutes(): Set<string> {
  return new Set([
    ...navItems.map((item) => item.href),
    ...legalItems.map((item) => item.href),
    ...slugsIn('src/content/helpers').map((slug) => `/helpers/${slug}`),
    ...slugsIn('src/content/services').map((slug) => `/services/${slug}`),
  ])
}

describe('internal link resolution', () => {
  it('every internal link on the built homepage resolves to a real file or a known future route', () => {
    const html = readFileSync('dist/index.html', 'utf8')
    const allowlist = knownFutureRoutes()

    const unresolved = internalHrefsIn(html).filter(
      (href) => !resolvesInDist(href) && !allowlist.has(href),
    )

    expect(unresolved).toEqual([])
  })

  // Proves the allowlist is load-bearing, not decorative: if this fails,
  // the test above would trivially pass with an empty allowlist too,
  // meaning it isn't actually exercising the not-yet-built-pages case.
  it('the homepage really does link to not-yet-built routes covered only by the allowlist (sanity check)', () => {
    const html = readFileSync('dist/index.html', 'utf8')
    const allowlist = knownFutureRoutes()

    const coveredOnlyByAllowlist = internalHrefsIn(html).filter(
      (href) => allowlist.has(href) && !resolvesInDist(href),
    )

    expect(coveredOnlyByAllowlist.length).toBeGreaterThan(0)
  })
})

// --- conditional-block content-cache guard ------------------------------
//
// Task 17 audit found that `node_modules/.astro/data-store.json` — Astro's
// persistent content-layer cache, gitignored and environment-local — can
// go stale relative to the actual content directories on disk. When it
// does, `getCollection()` returns a cached entry that no longer exists as
// a file, and a component that correctly guards on `.length > 0` renders
// it anyway. This shipped a fabricated "Test Helper" profile into
// dist/index.html's meet-helpers section in this exact environment, with
// every test passing, because tests/conditional-blocks.test.ts checks
// MeetHelpers/Reviews via Astro's container API against the *collection*
// (which was correctly empty) — it never inspects what the *build*
// actually produced. The stale cache sits between those two things, so a
// collection-level check alone cannot catch it.
//
// This guard closes that gap by asserting against dist/index.html itself,
// the same artifact a real deploy would ship. It reuses the build from
// this file's beforeAll rather than triggering a second one.
//
// On a site whose master brief's central rule is "never invent business
// information" (§78: no fabricated helper profiles, no invented
// testimonials), this is the check that would have caught the actual
// shipped defect — a collection-only test could not have.
describe('conditional block content-cache guard', () => {
  it('helper-profiles and reviews collections are currently empty (precondition for the checks below)', () => {
    const helperProfileFiles = readdirSync('src/content/helper-profiles').filter((f) => f !== '.gitkeep')
    const reviewFiles = readdirSync('src/content/reviews').filter((f) => f !== '.gitkeep')
    expect(helperProfileFiles).toHaveLength(0)
    expect(reviewFiles).toHaveLength(0)
  })

  it('the BUILT homepage contains no meet-helpers section or profile markup while helper-profiles is empty', () => {
    const html = readFileSync('dist/index.html', 'utf8')
    expect(html).not.toMatch(/<section[^>]*class="meet-helpers"/)
    expect(html).not.toMatch(/class="helper-card"/)
    expect(html).not.toMatch(/class="helpers-grid"/)
  })

  it('the BUILT homepage contains no reviews section or review markup while reviews is empty', () => {
    const html = readFileSync('dist/index.html', 'utf8')
    expect(html).not.toMatch(/<section[^>]*class="reviews"/)
    expect(html).not.toMatch(/class="review-card"/)
    expect(html).not.toMatch(/class="reviews-grid"/)
  })
})
