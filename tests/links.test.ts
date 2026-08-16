import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
import { join, extname } from 'node:path'

// dist/ is built once by tests/global-setup.ts, before any file here is
// collected. This suite used to run `npm run build:dev` in its own
// `beforeAll`; that build moved out when a third build-driven suite
// (tests/pages.test.ts) arrived and vitest.config.ts's promised globalSetup
// was finally written. The reasoning for build:dev over build — the suite
// must be able to inspect dist/ whether or not a <Tbd> placeholder is
// outstanding — is unchanged and now lives in tests/global-setup.ts.

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

  // The five built-HTML assertions that used to sit here — form URL,
  // WhatsApp number, no "Contact Us" primary CTA, no "perfect match",
  // exactly one <h1> — were all scoped to dist/index.html, i.e. they
  // covered the homepage and nothing else. Task 5 moved them to
  // tests/pages.test.ts, which derives its page list from dist/ and runs
  // every one of them against EVERY built page. They are not duplicated
  // back here: two copies of the same assertion, one of which silently
  // stops covering new pages, is how a suite starts lying about its
  // coverage. What stays here is the one check that is about SOURCE
  // files rather than built pages, which has no page list to derive.
})

// --- internal link resolution -----------------------------------------
//
// Nav, footer, and a couple of homepage sections (HelperSources, Services)
// legitimately link to routes that do not exist as pages yet. They belong
// to Phase B of this sub-project and to sub-project 3 (see src/lib/nav.ts's
// own comment, and core-pages design spec §1).
//
// WHY THIS LIST IS TYPED OUT BY HAND, WHEN IT USED TO BE DERIVED.
//
// The previous version built the allowlist from `navItems`, `legalItems`
// and `slugsIn('src/content/services')` / `slugsIn('src/content/helpers')`
// — i.e. from the same data the site generates its links from. That reads
// as elegant and is in fact an allowlist-by-construction: it permitted
// `/services/<slug>` for EVERY slug in the collection, forever, whether or
// not a page would ever exist at that route, and it widened itself the
// moment anyone added a markdown file. A real dead link —
// `/services/direct-hire-processing`, shipped inside an FAQ answer — sat
// inside that allowlist and this test could not fail on it. It was caught
// by a human reading the copy, which is precisely the job the test was
// supposed to be doing.
//
// So the list below is an enumeration, not a derivation. Adding content can
// no longer widen what links are permitted; only editing this array can,
// and that is a diff a reviewer sees. The three assertions underneath keep
// the enumeration honest in both directions: nothing may link outside it,
// nothing in it may already be built, and nothing in it may be unreferenced.

/**
 * Routes that are deliberately linked before they exist. Every entry is a
 * page this project has committed to building, with the sub-project that
 * owns it. Delete an entry in the same commit that ships its page — the
 * "no entry already resolves" assertion below will insist on it.
 */
const DEFERRED_ROUTES: readonly string[] = [
  // --- Phase B of THIS sub-project (core pages), spec §1 ---
  //
  // '/find-your-helper' was here until Task 6 shipped it. Deleted in the
  // same commit as the page, which the "no enumerated deferred route has
  // already been built" assertion below insists on: an entry left behind
  // for a route that now exists would exempt that route from ever having
  // to resolve again, so a later regression deleting the page would not
  // fail this suite. '/why-directhired' went the same way when Task 7
  // shipped it, and '/about' when Task 8 did. The last one goes the same
  // way as its task lands.
  //
  // '/faq' went the same way when Task 9 shipped it, in the same commit as
  // the page. That empties the Phase B section of this list: every core
  // page spec §1 names now resolves, and everything below belongs to
  // sub-project 3.

  // --- Sub-project 3: the two family index pages, spec §1 ---
  '/services',
  '/helpers',

  // --- Sub-project 3: the 6 service detail pages ---
  '/services/direct-hire-processing',
  '/services/maid-insurance',
  '/services/maid-replacement',
  '/services/medical-examination',
  '/services/new-helper-placement',
  '/services/transfer-helper',

  // --- Sub-project 3: the 3 helper-source detail pages ---
  '/helpers/indonesia',
  '/helpers/mizoram',
  '/helpers/myanmar',

  // --- Sub-project 3: the 4 legal pages ---
  '/privacy-policy',
  '/terms',
  '/pdpa',
  '/disclaimer',
]

function resolvesInDist(hrefPath: string): boolean {
  const target = join('dist', hrefPath)
  if (existsSync(target) && statSync(target).isFile()) return true
  if (existsSync(join(target, 'index.html'))) return true
  if (existsSync(`${target}.html`)) return true
  return false
}

/** Every built page, derived from dist/ — never a hardcoded page list. */
function builtHtmlFiles(): string[] {
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((entry) => {
      const full = join(dir, entry).split('\\').join('/')
      return statSync(full).isDirectory() ? walk(full) : [full]
    })
  return walk('dist').filter((f) => f.endsWith('.html'))
}

function internalHrefsIn(html: string): string[] {
  const hrefs = [...html.matchAll(/href="(\/[^"]*)"/g)].map((m) => m[1].split(/[?#]/)[0])
  return [...new Set(hrefs)]
}

/** Every internal href across every built page, with the page it came from. */
function allInternalLinks(): { page: string; href: string }[] {
  return builtHtmlFiles().flatMap((page) =>
    internalHrefsIn(readFileSync(page, 'utf8')).map((href) => ({ page, href })),
  )
}

describe('internal link resolution', () => {
  it('scans every built page, not just the homepage (guards the sweep itself)', () => {
    // Without this the three assertions below could pass on an empty walk.
    const files = builtHtmlFiles()
    expect(files.length).toBeGreaterThanOrEqual(2)
    expect(files).toContain('dist/index.html')
    expect(allInternalLinks().length).toBeGreaterThan(20)
  })

  it('every internal link on every built page resolves, or is an enumerated deferred route', () => {
    const allowlist = new Set(DEFERRED_ROUTES)
    const unresolved = allInternalLinks()
      .filter(({ href }) => !resolvesInDist(href) && !allowlist.has(href))
      .map(({ page, href }) => `${page} → ${href}`)
    expect(unresolved).toEqual([])
  })

  // The allowlist must shrink as pages ship. Without this, an entry for a
  // route that now exists would sit here forever, quietly exempting that
  // route from ever having to resolve again — so a later regression that
  // deleted the page would not fail this suite.
  it('no enumerated deferred route has already been built', () => {
    const shipped = DEFERRED_ROUTES.filter((route) => resolvesInDist(route))
    expect(shipped).toEqual([])
  })

  // ...and it must not grow speculatively. An entry nothing links to is an
  // exemption granted in advance, which is how the derived version got its
  // reach. It also proves the allowlist is load-bearing rather than
  // decorative: if this passes, the resolution test above is genuinely
  // exercising the not-yet-built-route case.
  it('every enumerated deferred route is actually linked from a built page', () => {
    const linked = new Set(allInternalLinks().map(({ href }) => href))
    const unreferenced = DEFERRED_ROUTES.filter((route) => !linked.has(route))
    expect(unreferenced).toEqual([])
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
// the same artifact a real deploy would ship. It reuses the single build
// made by tests/global-setup.ts rather than triggering one of its own.
// (This sentence used to say "this file's beforeAll"; that beforeAll was
// deleted when the build moved to globalSetup, and the sentence survived
// the change for one commit.)
//
// On a site whose master brief's central rule is "never invent business
// information" (§78: no fabricated helper profiles, no invented
// testimonials), this is the check that would have caught the actual
// shipped defect — a collection-only test could not have.
//
// Coupling warning: the two class-string checks below (meet-helpers /
// reviews and their child classes) are coupled to those literal class
// names. If a future refactor renames .meet-helpers, .helper-card,
// .helpers-grid, .reviews, .review-card, or .reviews-grid, these two
// checks will silently pass even if a stale-cache section is still
// shipping under the new name — a quiet false negative on a safety
// test, which is worse than a loud failure, since green means nobody
// looks. The section-count check further below is deliberately
// name-independent for exactly this reason: keep both, don't replace
// the string checks with the count, since a class-name match still
// catches things a bare count cannot (e.g. a renamed section that
// coincidentally keeps the total at 11 by also removing an unrelated
// section elsewhere on the same build).
//
// --- Task 5B, G-4 ------------------------------------------------------
//
// THE PAGE. Every check here read `dist/index.html` BY NAME. MeetHelpers
// moves to /find-your-helper and Reviews to /why-directhired in Phase B,
// and on the day they do this guard goes on inspecting a page that no
// longer renders either of them — green, watching nothing, guarding a
// defect that actually shipped once. So the two class-string checks now
// run over EVERY built page, derived from dist/ the way every other
// page-scoped guard in this suite is. Same assertions, wider corpus:
// strictly stronger, and nothing was removed to make room.
//
// THE NAMES. The coupling warning above turned out to be describing
// something that had already happened. `class="review-card"` and
// `class="reviews-grid"` appear nowhere in src/ — Reviews.astro renders
// .quote-wall, .quote, .review-stars, .review-body and .review-meta. Two
// of the four child-class assertions were checking for the absence of
// strings that were absent by construction and could not fail. They are
// replaced below by classes DERIVED from the component itself, which is
// the only version of this check that cannot drift: rename a class in
// Reviews.astro and the assertion renames with it.
//
// The 11-section count further down stays exactly as it is, homepage and
// all. It is a reviewed literal about one page's composition (see its own
// comment), not a page list that should have been derived — and the
// derived checks above it are what cover the pages it does not.

/** A section whose entire <section> is gated on a content collection. */
interface ConditionalSection {
  file: string
  /** The collection name passed to getCollection(). */
  collection: string
  /** The directory that collection reads from. */
  directory: string
  /** The class on its top-level <section>. */
  sectionClass: string
  /** Classes this component uses and no other .astro file does. */
  ownClasses: string[]
}

const withoutComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')

function classesIn(source: string): string[] {
  return [...withoutComments(source).matchAll(/class="([a-z0-9 -]+)"/g)].flatMap((m) =>
    m[1].split(/\s+/).filter(Boolean),
  )
}

/**
 * Every component that renders its section only when a collection has
 * entries — discovered from the source, never listed. A new conditional
 * block gets this guard automatically, which is the difference between a
 * rule and a habit.
 */
function conditionalSections(): ConditionalSection[] {
  const astroFiles = sources('src').map(normalize).filter((f) => f.endsWith('.astro'))
  const sourceOf = new Map(astroFiles.map((f) => [f, readFileSync(f, 'utf8')]))

  return astroFiles.flatMap((file) => {
    const source = withoutComments(sourceOf.get(file)!)
    const collection = source.match(/getCollection\(\s*['"]([a-z0-9-]+)['"]/i)
    // The gate itself: `xs.length > 0 &&` wrapping the whole section.
    if (!collection || !/\.length\s*>\s*0\s*&&/.test(source)) return []
    const section = source.match(/<section[^>]*class="([a-z0-9-]+)/)
    if (!section) return []

    const used = new Set(classesIn(sourceOf.get(file)!))
    const elsewhere = new Set(
      astroFiles.filter((f) => f !== file).flatMap((f) => classesIn(sourceOf.get(f)!)),
    )
    return [
      {
        file,
        collection: collection[1],
        directory: `src/content/${collection[1]}`,
        sectionClass: section[1],
        ownClasses: [...used].filter((c) => !elsewhere.has(c)),
      },
    ]
  })
}

/** Entries on disk, ignoring the .gitkeep that holds an empty directory. */
const entriesIn = (dir: string) => readdirSync(dir).filter((f) => f !== '.gitkeep')

describe('conditional block content-cache guard', () => {
  it('helper-profiles and reviews collections are currently empty (precondition for the checks below)', () => {
    const helperProfileFiles = readdirSync('src/content/helper-profiles').filter((f) => f !== '.gitkeep')
    const reviewFiles = readdirSync('src/content/reviews').filter((f) => f !== '.gitkeep')
    expect(helperProfileFiles).toHaveLength(0)
    expect(reviewFiles).toHaveLength(0)
  })

  it('discovers the conditional blocks from source, and finds the two that exist', () => {
    /*
     * Named individually rather than counted. A count would survive the
     * discovery silently matching two unrelated components — which is the
     * class of vacuous pass this whole guard exists to prevent, on the one
     * defect in this repo that reached a build.
     */
    const found = conditionalSections()
    const byFile = new Map(found.map((s) => [s.file, s]))

    const helpers = byFile.get('src/sections/MeetHelpers.astro')
    expect(helpers, 'MeetHelpers.astro is no longer detected as conditional').toBeDefined()
    expect(helpers!.collection).toBe('helper-profiles')
    expect(helpers!.sectionClass).toBe('meet-helpers')

    const reviews = byFile.get('src/sections/Reviews.astro')
    expect(reviews, 'Reviews.astro is no longer detected as conditional').toBeDefined()
    expect(reviews!.collection).toBe('reviews')
    expect(reviews!.sectionClass).toBe('reviews')

    // The derived child classes are what replaced two dead literals, so an
    // empty list would put the same hole back.
    //
    // FIX ROUND, F-4. The directory line read
    // `expect(entriesIn(block.directory)).toBeDefined()`.
    // readdirSync().filter() always returns an array, so that assertion
    // could not fail; it worked only as an implicit "the directory exists"
    // check, via the exception readdirSync throws on a missing path — which
    // is not what it read as, and would have surfaced as an error rather
    // than as a failed expectation. The property it was reaching for is
    // stated directly instead, because the emptiness check further down
    // (`entriesIn(s.directory).length === 0`) is only meaningful if the
    // directory the collection is derived from is really there: a
    // mis-derived path would otherwise read as "empty collection" and make
    // the whole guard vacuously green.
    for (const block of found) {
      expect(block.ownClasses.length, `${block.file} contributed no distinctive classes`).toBeGreaterThan(2)
      expect(existsSync(block.directory), `${block.directory} does not exist`).toBe(true)
    }
  })

  it('every conditional block is still rendered by some page (the guard has a subject)', () => {
    // A component nothing renders cannot leak into a build, so the checks
    // below would be true of it for the wrong reason.
    const pageSources = sources('src/pages')
      .filter((f) => f.endsWith('.astro'))
      .map((f) => readFileSync(f, 'utf8'))
      .join('\n')
    const unrendered = conditionalSections()
      .map((s) => s.file.split('/').pop()!.replace('.astro', ''))
      .filter((name) => !new RegExp(`<${name}[\\s/>]`).test(pageSources))
    expect(unrendered).toEqual([])
  })

  it('NO BUILT PAGE renders a conditional block whose collection is empty', () => {
    /*
     * The guard itself, over every page in dist/ rather than over
     * dist/index.html. This is the check that would have caught the
     * fabricated "Test Helper" profile a stale
     * node_modules/.astro/data-store.json rendered into the homepage with
     * every test green — and it keeps catching it after Phase B moves
     * MeetHelpers to /find-your-helper and Reviews to /why-directhired.
     *
     * Both halves matter. The <section> class catches the block shipping
     * whole; the distinctive child classes catch a fragment of it shipping
     * without its wrapper. Both are read from the component's own source,
     * so a rename moves the assertion with it.
     */
    const empty = conditionalSections().filter((s) => entriesIn(s.directory).length === 0)
    expect(empty.length, 'no conditional collection is empty — nothing to check').toBeGreaterThan(0)

    const leaks = builtHtmlFiles().flatMap((page) => {
      const html = readFileSync(page, 'utf8')
      return empty.flatMap((block) => {
        const found: string[] = []
        if (new RegExp(`<section[^>]*class="[^"]*\\b${block.sectionClass}\\b`).test(html)) {
          found.push(`${page}: <section class="${block.sectionClass}"> from empty ${block.collection}`)
        }
        for (const cls of block.ownClasses) {
          if (new RegExp(`class="[^"]*\\b${cls}\\b`).test(html)) {
            found.push(`${page}: .${cls} from empty ${block.collection}`)
          }
        }
        return found
      })
    })
    expect(leaks).toEqual([])
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
    // .review-card and .reviews-grid used to be asserted here. Neither
    // string exists anywhere in src/ — Reviews.astro renders .quote-wall
    // and .quote — so both assertions were unfailable. These are the
    // classes the component actually uses; the derived check above is what
    // keeps them from going stale again.
    expect(html).not.toMatch(/class="quote-wall"/)
    expect(html).not.toMatch(/class="review-body"/)
  })

  // Rename-proof backstop for the two class-string checks above. Those
  // checks are load-bearing (a class-name match catches things a bare
  // count can't), but they are coupled to literal class names — see the
  // coupling warning in this describe block's docblock. This check does
  // not depend on any class name at all: while both conditional
  // collections are empty, the homepage must render exactly the 11
  // <section> elements from the 11 always-on section components (Hero,
  // TrustBar, Problem, Difference, Process, PricingSection, TwoSidedMatch,
  // HelperSources, Services, Faq, FinalCta — see src/pages/index.astro).
  // MeetHelpers and Reviews render zero <section> elements each when
  // their collection is empty (asserted separately by
  // tests/conditional-blocks.test.ts), so 11 is also the total page
  // count today. A stale-cache leak renders a 12th (or 13th) <section>
  // regardless of what its class is called, so this catches the same
  // failure mode as the two checks above even if MeetHelpers/Reviews (or
  // their child elements) are ever renamed and those checks stop firing.
  //
  // Update this number if an always-on section is added/removed from
  // src/pages/index.astro, or if a section component starts rendering
  // more than one top-level <section> — it is not derived automatically
  // because a static source count would have to distinguish real JSX
  // from the word "<section>" appearing in a docblock comment (both
  // MeetHelpers.astro and Reviews.astro currently have exactly that in
  // their header comments), which is more fragile than a reviewed
  // literal with this explanation attached.
  it('the BUILT homepage renders exactly 11 <section> elements while both conditional collections are empty', () => {
    const html = readFileSync('dist/index.html', 'utf8')
    const sectionOpenTags = html.match(/<section[\s>]/g) ?? []
    expect(sectionOpenTags).toHaveLength(11)
  })
})
