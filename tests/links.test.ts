import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
import { join, extname } from 'node:path'
import { company } from '../src/data/company'
import { navItems, footerItems, legalItems } from '../src/lib/nav'

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

/*
 * THE NEEDLES THIS SWEEP LOOKS FOR, DERIVED FROM THE SINGLE DEFINITION.
 *
 * This test filtered on the literal `'/employer-requirement'` for the whole
 * of the project. That string was the requirement form's path until
 * 2026-08-17, when DirectHired supplied the real address and
 * `company.requirementFormUrl` was repointed — at which moment the guard
 * protecting the site's single most important URL was searching for a string
 * that no longer existed anywhere. It would have reported "no offenders"
 * against a codebase in which every file had hardcoded the new one.
 *
 * A guard that has to be hand-edited whenever the value it guards changes is
 * a guard that is green precisely when it matters most. Both needles now come
 * from the constant.
 *
 * TWO NEEDLES, NOT ONE, AND THE SECOND MATTERS MORE THAN IT USED TO.
 *
 *   THE ABSOLUTE URL — the obvious retype, `href="https://…/app/requirements"`.
 *
 *   THE PATH ALONE — `href="/app/requirements"`. This is what the old literal
 *   actually matched, and it is now the DANGEROUS one: the form moved onto
 *   this site's own domain, so a site-relative hardcode WORKS. It renders, it
 *   resolves, a visitor reaches the form, every other assertion in this suite
 *   passes — and the constant has silently stopped being the single
 *   definition. A broken hardcode announces itself; a working one does not.
 */
const FORM_URL = company.requirementFormUrl
const FORM_PATH = new URL(FORM_URL).pathname

describe('CTA integrity', () => {
  it('no component hardcodes the requirement-form URL', () => {
    // Task 16 review, fix round 1: `!f.endsWith('company.ts')` was a
    // suffix match, not a path match — it would also exclude any future
    // src/lib/mock-company.ts or test-company.ts, silently removing it
    // from the one scan that protects the launch-critical URL's single
    // definition. Compare the normalised path exactly instead.
    const offenders = hardcodeScanFiles()
      .filter((f) => normalize(f) !== 'src/data/company.ts')
      .filter((f) => {
        const text = readFileSync(f, 'utf8')
        return text.includes(FORM_URL) || text.includes(FORM_PATH)
      })
    expect(offenders.map(normalize)).toEqual([])
  })

  it('the sweep above is looking for something real (its needles are not vacuous)', () => {
    /*
     * The assertion above is a negative over a corpus that contains neither
     * needle, so a needle that had quietly become unmatchable — an empty
     * string, a `/`, a value read from the wrong property — would report
     * nothing forever. That is exactly the failure the derivation replaced,
     * in a new form.
     *
     * src/data/company.ts is the one file that MUST contain both, and it is
     * the one file the sweep excludes. Reading it back through the same
     * predicate is the proof that the predicate can fire at all.
     */
    const definition = readFileSync('src/data/company.ts', 'utf8')
    expect(definition, 'the URL needle matches nothing, even at its definition').toContain(FORM_URL)
    expect(definition, 'the path needle matches nothing, even at its definition').toContain(
      FORM_PATH,
    )

    // A bare `/` would match every href on the site and every offender list
    // would be the whole corpus — the opposite failure, and just as useless.
    expect(FORM_PATH.replace(/\/+$/, ''), 'the form URL has no path to match on').not.toBe('')
    // ...and the two needles must be different strings, or the path check is
    // doing nothing the URL check does not already do.
    expect(FORM_PATH).not.toBe(FORM_URL)
  })

  it('the requirement form is not a route this build produces', () => {
    /*
     * THE SAME-ORIGIN HAZARD, which did not exist before 2026-08-17 and now
     * does. The form is at `/app/requirements` on this site's own host —
     * served from a different S3 origin behind the shared CloudFront
     * distribution, and built by a codebase that is not this one.
     *
     * If a page ever appeared in THIS build at that path, CloudFront would
     * have two origins claiming one route and the primary CTA would lead to
     * whichever won. Equally, if `requirementFormUrl` were ever pointed at a
     * route this site does serve — `https://www.directhired.com/contact`,
     * say — all 46 CTAs would loop back into the marketing site and every
     * other assertion here would pass.
     *
     * This is also what keeps the path needle above honest: a form URL whose
     * path collides with one of this site's own routes would make that sweep
     * fire on nav.ts and read as a false positive. It fails here instead,
     * where the message says what is actually wrong.
     *
     * It is the assertion a host-equality check in tests/company.test.ts was
     * reaching for, without that check's cost — see the reasoning recorded
     * there for why no host is asserted.
     */
    expect(
      resolvesInDist(FORM_PATH),
      `this build serves a page at ${FORM_PATH}, which is also the requirement form`,
    ).toBe(false)
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
  //
  // '/services' and '/helpers' WERE HERE AND ARE NOT ANY MORE, 2026-08-17.
  //
  // Both were in the header nav and the mobile panel on all 8 built pages —
  // 16 broken links — and this enumeration is what made that legal. Worse,
  // the third assertion below ("every enumerated deferred route is actually
  // linked") REQUIRED them to stay linked, so the suite was actively
  // enforcing two broken nav items. DirectHired chose to remove them from the
  // navigation until sub-project 3 ships the index pages
  // (src/lib/nav.ts records the decision), and the prose link to '/helpers'
  // in src/content/faq/helper-sources.md went with them.
  //
  // WHY THEY ARE DROPPED FROM THE ENUMERATION RATHER THAN MOVED TO A SECOND,
  // "RESERVED" LIST. This array means one thing: "linked before it exists".
  // Nothing links these two now, so by the array's own definition they do not
  // belong in it, and the third assertion below would fail if they stayed —
  // correctly, since an entry nothing links is "an exemption granted in
  // advance", which is that assertion's own wording. A parallel
  // reserved-and-unlinked list would be a list of routes with no assertions
  // attached, i.e. a comment with array syntax.
  //
  // THE PROPERTY THIS PRESERVES — and it is preserved STRICTLY MORE STRONGLY
  // than before: a link to a route that does not exist fails. Today a link to
  // '/services' is not allowlisted by anything, so the first assertion below
  // fails on it. Before this change it was allowlisted and could not fail.
  // Sub-project 3 adds the entries back in the same commit as the links, and
  // deletes them again as soon as the pages resolve, which the second
  // assertion insists on.

  // --- Sub-project 3: the 6 service detail pages ---
  '/services/direct-hire-processing',
  '/services/maid-insurance',
  '/services/maid-replacement',
  '/services/medical-checkup',
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

// --- the internal linking triangle --------------------------------------
//
// Core-pages design spec §4: "Pricing ↔ Find Your Helper ↔ FAQ, all three ↔
// the requirement form." Foundation spec §7 asked for it and sub-project 1
// could not build it, because there was nowhere to link.
//
// IN <main>, NOT ANYWHERE ON THE PAGE, and that is the whole assertion. The
// header, the footer and the mobile CTA bar already link every page to every
// other page from every page — so a triangle check over the raw HTML would
// pass on a site with no editorial links at all, which is the vacuous form
// of this guard and the only form worth avoiding. What §4 is asking for is
// a link a reader meets inside the argument, placed where the question it
// answers arises. Only those count here.
//
// WHAT THIS GUARD MUST NOT BECOME. A link added to satisfy a test rather
// than to serve a reader is worse than no link: it is furniture, it dilutes
// the ones that mean something, and it is exactly what an assertion like
// this one invites. Five of these six edges existed before the assertion did
// — this was written to stop them being deleted, not to force them into
// existence. If a page ever legitimately loses its reason to carry one, the
// answer is to argue the change here, not to leave a bare anchor behind.

/** The `<main>` of a built page: nav, footer and mobile CTA bar excluded. */
function mainOf(html: string): string {
  return html.match(/<main[^>]*>([\s\S]*?)<\/main>/)?.[1] ?? ''
}

describe('the internal linking triangle (spec §4)', () => {
  const requirementForm = company.requirementFormUrl

  /** The three corners, by the route each page is served at. */
  const CORNERS = ['/pricing', '/find-your-helper', '/faq'] as const

  const mainByRoute = new Map(
    builtHtmlFiles().map((file) => [
      file.replace(/^dist/, '').replace(/\/index\.html$/, '').replace(/\.html$/, '') || '/',
      mainOf(readFileSync(file, 'utf8')),
    ]),
  )

  const linksTo = (from: string, target: string) => {
    const main = mainByRoute.get(from)
    if (main === undefined) throw new Error(`no built page at ${from}`)
    // Trailing slash optional: the site writes href="/pricing" today, and
    // href="/pricing/" would be the same link.
    return new RegExp(`href="${target}/?"`).test(main)
  }

  it('reads the body of each corner, not the whole page (guards the assertions below)', () => {
    for (const corner of CORNERS) {
      const main = mainByRoute.get(corner)
      expect(main, `no built page at ${corner}`).toBeDefined()
      expect(main!.length, `${corner} has an empty <main>`).toBeGreaterThan(2_000)
      // The header links every corner to every other one. If <main> ever
      // started including it, every assertion below would pass for free.
      expect(main!).not.toContain('site-header')
    }
  })

  for (const from of CORNERS) {
    for (const to of CORNERS) {
      if (from === to) continue
      it(`${from} links to ${to} from inside its own body`, () => {
        expect(linksTo(from, to)).toBe(true)
      })
    }
  }

  for (const corner of CORNERS) {
    it(`${corner} links to the requirement form from inside its own body`, () => {
      expect(mainByRoute.get(corner)).toContain(requirementForm)
    })
  }

  it('a corner that dropped an edge would be caught (the matcher is not always true)', () => {
    // The matcher must be able to say no. /pricing does not link to
    // /contact from its body — nothing on this site does except the footer,
    // which is exactly what mainOf() excludes.
    expect(linksTo('/pricing', '/contact')).toBe(false)
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
// THE PAGE. Every check here read `dist/index.html` BY NAME, so it covered
// the homepage and nothing else — green on any other page, watching
// nothing, guarding a defect that actually shipped once. So the two
// class-string checks now run over EVERY built page, derived from dist/ the
// way every other page-scoped guard in this suite is. Same assertions,
// wider corpus: strictly stronger, and nothing was removed to make room.
//
// THIS PARAGRAPH USED TO JUSTIFY ITSELF WITH A PREDICTION, AND THE
// PREDICTION WAS WRONG. It said "MeetHelpers moves to /find-your-helper and
// Reviews to /why-directhired in Phase B, and on the day they do…". Phase B
// shipped all six pages; both components stayed on the homepage, and
// src/pages/index.astro is still the only file that renders either. Task 11
// corrected the wording rather than the code, because nothing depends on
// the prediction: the guard was generalised to every page in dist/, so it
// covers both components wherever they are rendered and would cover them if
// they moved tomorrow. A comment that says WHY a check is general is worth
// keeping; one that dates it to a move that never happened teaches the next
// reader that the file is describing a site that does not exist.
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
     * every test green — and it keeps catching it wherever the two
     * components are rendered. Both are on the homepage today and Phase B
     * did not move either, which is exactly why the guard is derived from
     * dist/ rather than pointed at a page: it does not need to know.
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

/*
 * WHAT REMOVING THE TWO NAV ITEMS ACTUALLY BOUGHT — W-9, 2026-08-17.
 *
 * DirectHired removed 'Services' and 'Helper Sources' from the navigation
 * until sub-project 3 ships /services and /helpers. Measured on the build,
 * before and after:
 *
 *                        before   after
 *   broken link instances   57      41
 *   per page                 6       4
 *   homepage                15      13
 *
 * ZERO IS NOT REACHED, AND CANNOT BE BY THIS CHANGE. What is left is two
 * groups, both of them deliberate and neither of them navigation:
 *
 *   4 per page  the legal routes in the footer's BOTTOM BAR
 *               (src/lib/nav.ts's `legalItems`): /privacy-policy, /terms,
 *               /pdpa, /disclaimer. Sub-project 3 owns them.
 *   9 on /      the detail links inside two homepage SECTIONS —
 *               Services.astro's six cards (/services/<slug>) and
 *               HelperSources.astro's three (/helpers/<slug>).
 *
 * Removing those would not be the same kind of change and was not what
 * DirectHired decided. The nav items were TOP-LEVEL NAVIGATION on every page;
 * the card links are the content of two sections that would have to be
 * redesigned to lose them, and the legal links are the four a Singapore
 * footer is expected to carry. They are reported here rather than fixed, and
 * they remain enumerated in DEFERRED_ROUTES above, which is what keeps them
 * from being forgotten.
 *
 * SO THE ASSERTIONS BELOW STATE WHAT IS TRUE AND LOAD-BEARING:
 *   - the navigation itself has zero broken links, with NO allowlist
 *   - /services and /helpers are linked from nothing, anywhere
 *   - the residual set is EXACTLY the enumerated deferred routes, so it
 *     cannot grow by one without a visible diff
 */
describe('the navigation links nothing that does not exist', () => {
  it('every navItems and footerItems href resolves — no allowlist consulted', () => {
    /*
     * The strongest statement this change supports, and the reason it is
     * stated without the allowlist: the allowlist is what let two broken
     * routes sit in the header for weeks. Navigation is the one surface
     * where "deferred" is not an excuse a visitor can see.
     */
    const unresolved = [...navItems, ...footerItems]
      .filter(({ href }) => !resolvesInDist(href))
      .map(({ label, href }) => `${label} → ${href}`)
    expect(unresolved).toEqual([])
  })

  it('/services and /helpers are linked from no built page', () => {
    // Named, because these two are the decision. If either comes back before
    // its page does, this says so by name rather than as an allowlist diff.
    const linked = allInternalLinks().filter(({ href }) => href === '/services' || href === '/helpers')
    expect(linked.map(({ page, href }) => `${page} → ${href}`)).toEqual([])
  })

  it('neither route is in navItems, footerItems or legalItems', () => {
    const hrefs = [...navItems, ...footerItems, ...legalItems].map((item) => item.href)
    expect(hrefs).not.toContain('/services')
    expect(hrefs).not.toContain('/helpers')
    // …and the nav still has the pages that DO exist, so this is not passing
    // because somebody emptied the array.
    expect(hrefs).toContain('/find-your-helper')
    expect(hrefs).toContain('/pricing')
    expect(hrefs).toContain('/faq')
    expect(hrefs).toContain('/contact')
  })

  it('the only broken links left are the enumerated deferred routes, exactly', () => {
    /*
     * The residual, stated as a set rather than as a count — a count would
     * break the moment a page is added, which is the defect W-7 records in
     * tests/pages.test.ts. Set equality cannot go slack in either direction:
     * a new broken link fails it, and so does a route that quietly stopped
     * being linked while staying enumerated.
     */
    const unresolved = new Set(
      allInternalLinks()
        .filter(({ href }) => !resolvesInDist(href))
        .map(({ href }) => href),
    )
    expect([...unresolved].sort()).toEqual([...DEFERRED_ROUTES].sort())
  })

  it('the residual is legal pages and section detail links, and nothing else', () => {
    // Named by shape, so the character of what is left is asserted rather
    // than left to a reader to infer from the list. A broken TOP-LEVEL route
    // reappearing would not match either shape and fails here.
    const LEGAL = new Set(['/privacy-policy', '/terms', '/pdpa', '/disclaimer'])
    const stray = [...DEFERRED_ROUTES].filter(
      (route) => !LEGAL.has(route) && !/^\/(?:services|helpers)\/[a-z0-9-]+$/.test(route),
    )
    expect(stray).toEqual([])
  })
})
