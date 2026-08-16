/**
 * The per-page guards. Everything in this file runs against EVERY built
 * page, and the page list is derived from dist/ — never written down.
 *
 * WHY DERIVED. Sub-project 1's guards inspected dist/index.html by name,
 * which is fine while one page exists and silently stops covering anything
 * the moment a second lands. Five more pages ship next week. A hardcoded
 * list would need someone to remember them; a derived one covers them the
 * moment they exist, which is the whole reason design spec §5 asks for
 * "all seven pages" rather than a list.
 *
 * That derivation is itself asserted (see "the page sweep") — a walker that
 * silently returned [] would make every assertion below pass vacuously,
 * which on a suite of negative checks is the worst way to be green.
 *
 * The build comes from tests/global-setup.ts and has completed before this
 * file is collected, so reading dist/ at collection time (to generate one
 * `it` per page, named after the route) is safe here. See that file for the
 * ordering guarantee, and tests/compliance-gate.test.ts for what happens
 * when it does not hold.
 */
import { describe, it, expect } from 'vitest'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { company } from '../src/data/company'
import { forbiddenPlaceNames, namedSources } from './support/helper-sources'

interface Page {
  /** Path on disk, e.g. `dist/pricing/index.html`. */
  file: string
  /** Route as served, e.g. `/` or `/pricing/`. Canonical URLs use this. */
  route: string
  html: string
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry).split('\\').join('/')
    return statSync(full).isDirectory() ? walk(full) : [full]
  })
}

function builtPages(): Page[] {
  return walk('dist')
    .filter((f) => f.endsWith('.html'))
    .map((file) => ({
      file,
      // dist/index.html → "/", dist/pricing/index.html → "/pricing/".
      // Astro's default `directory` build format emits index.html per route
      // and the canonical URL it writes carries the trailing slash, so the
      // route string keeps it too.
      route: file.replace(/^dist/, '').replace(/index\.html$/, '').replace(/\.html$/, ''),
      html: readFileSync(file, 'utf8'),
    }))
    .sort((a, b) => a.route.localeCompare(b.route))
}

/**
 * What a visitor actually reads: markup, <script> and <style> removed,
 * entities decoded, whitespace collapsed.
 *
 * Several checks below MUST run on this rather than on raw HTML, and the
 * reason is not cosmetic. `<strong>helper’s</strong> cost` is one phrase to
 * a reader and two fragments to a regex. In the other direction, the page's
 * JSON-LD contains `"@type":"Country"` and `addressCountry` — a raw-HTML
 * search for /\bcountry\b/ fires on structured data that is correctly
 * describing DirectHired's own Singapore address, which is a country. The
 * rule in design spec §7 is about prose describing a helper source, so the
 * scan has to see what the prose says and nothing else.
 */
function renderedText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const pages = builtPages()

// ---------------------------------------------------------------------
// The sweep itself
// ---------------------------------------------------------------------

describe('the page sweep', () => {
  it('finds every built page by walking dist/, and finds more than one', () => {
    expect(pages.length).toBeGreaterThanOrEqual(2)
    expect(pages.map((p) => p.route)).toContain('/')
    expect(pages.map((p) => p.route)).toContain('/pricing/')
  })

  it('reads real pages, not empty shells', () => {
    for (const page of pages) {
      expect(renderedText(page.html).length, `${page.file} rendered almost no text`).toBeGreaterThan(
        2_000,
      )
    }
  })

  it('built a page for every static route file in src/pages', () => {
    // The other half of "derive the list from dist/": dist/ is only the
    // right source of truth if the build actually emitted a page per route.
    // A build that silently dropped one would otherwise shrink this whole
    // suite's coverage without failing anything.
    //
    // Fix round 1, F-6. This was `pages.length === routeFiles.length`, a
    // 1:1 assumption the roadmap already breaks: sub-project 3 ships the 6
    // service and 3 helper detail pages from two `[slug].astro` files, so a
    // count comparison would have failed with a bare "expected 15 to be 4".
    // It now asserts the property actually wanted — every STATIC route file
    // produced its page — and treats dynamic route files as contributing an
    // unknown number of extra pages rather than one each.
    const routeFiles = walk('src/pages')
      .filter((f) => f.endsWith('.astro'))
      // Astro does not route files or directories prefixed with "_".
      .filter((f) => !f.split('/').some((segment) => segment.startsWith('_')))

    const isDynamic = (file: string) => /\[.+\]/.test(file)
    const staticFiles = routeFiles.filter((f) => !isDynamic(f))
    const dynamicFiles = routeFiles.filter(isDynamic)

    /**
     * src/pages/index.astro → "/", src/pages/a/b.astro → "/a/b/".
     *
     * Task 10, ONE EXCEPTION, AND IT IS ASTRO'S RATHER THAN OURS. Every
     * other route builds as `<route>/index.html` under `build.format:
     * 'directory'` (the default, and what astro.config.mjs leaves alone).
     * `src/pages/404.astro` does not: Astro emits it as `dist/404.html`,
     * a file rather than a directory, because a CDN's error-page mapping
     * needs a single object key to point at — which is exactly what
     * scripts/deploy-cloudfront-error-pages.sh points its
     * `ResponsePagePath` at. The route this file's own walker derives from
     * that output is therefore "/404", not "/404/".
     *
     * Written as a mapping rather than by filtering 404 out of the check.
     * Filtering would exempt the page from "every static route file built a
     * page", which is the assertion that would notice if the 404 stopped
     * building at all — and a 404 that silently stopped building is a site
     * that silently goes back to serving a bare 403.
     */
    const expectedRoute = (file: string) =>
      file === 'src/pages/404.astro'
        ? '/404'
        : file.replace(/^src\/pages/, '').replace(/index\.astro$/, '').replace(/\.astro$/, '/')

    const built = new Set(pages.map((p) => p.route))
    const missing = staticFiles.map(expectedRoute).filter((route) => !built.has(route))
    expect(missing).toEqual([])

    // Dynamic route files emit one page per entry, so the total can only be
    // greater. With none present it must be exact — which keeps the check
    // as tight as it is today and loosens it only when it has to.
    if (dynamicFiles.length === 0) {
      expect(pages.length).toBe(staticFiles.length)
    } else {
      expect(pages.length).toBeGreaterThan(staticFiles.length)
    }
  })
})

// ---------------------------------------------------------------------
// Step 1 — structural guards, one `it` per page
// ---------------------------------------------------------------------

describe.each(pages)('$route', (page) => {
  it('has exactly one <h1>', () => {
    const matches = page.html.match(/<h1[\s>]/g) ?? []
    expect(matches).toHaveLength(1)
  })

  it('starts at <h1> and never skips a heading level', () => {
    // NOTHING ELSE IN THIS PROJECT CATCHES THIS. The first version of this
    // comment said "axe's heading-order rule fires on a skip", implying the
    // assertion was a convenience duplicate of the a11y run. It is not:
    // scripts/run-axe.mjs filters to wcag2a,wcag2aa,wcag21a,wcag21aa, and
    // `heading-order` is an axe BEST-PRACTICE rule, outside every one of
    // those tags. Verified in fix round 1 — a page carrying two <h1>s AND
    // an h1 → h3 skip scores zero axe violations under our invocation. So
    // this assertion and the one above it are the only thing standing
    // between the site and a broken document outline.
    //
    // It is also the defect that a section component moved between pages
    // produces most often: /pricing needed its "The two fly-in packages"
    // <h2> for exactly this reason, because PricingCard sets each package
    // name as an <h3>.
    const levels = [...page.html.matchAll(/<h([1-6])[\s>]/g)].map((m) => Number(m[1]))
    expect(levels.length, 'page has no headings at all').toBeGreaterThan(0)
    expect(levels[0], 'first heading on the page is not the <h1>').toBe(1)

    const skips: string[] = []
    for (let i = 1; i < levels.length; i += 1) {
      if (levels[i] > levels[i - 1] + 1) skips.push(`h${levels[i - 1]} → h${levels[i]}`)
    }
    expect(skips).toEqual([])
  })

  it('has a non-empty <title>', () => {
    const match = page.html.match(/<title>([\s\S]*?)<\/title>/)
    expect(match, 'no <title> element').not.toBeNull()
    expect(match![1].trim().length).toBeGreaterThan(10)
  })

  it('has a non-empty meta description', () => {
    const match = page.html.match(/<meta name="description" content="([^"]*)"/)
    expect(match, 'no meta description').not.toBeNull()
    expect(match![1].trim().length).toBeGreaterThan(50)
  })

  it('has a canonical URL matching its own route', () => {
    // Not merely "a canonical exists". A canonical copied from another page
    // is worse than none: it tells Google this page is a duplicate of that
    // one and de-indexes it. BaseLayout builds it from Astro.url, so the
    // failure mode is a page hardcoding its own — which this catches.
    //
    // ONE PAGE HAS NO CANONICAL, AND THAT IS THE POINT OF IT (Task 10).
    // /404 is served in place of every URL that does not exist, so it has no
    // URL of its own; BaseLayout's `noindex` prop drops the tag and the
    // robots meta together. Its absence is asserted, in both directions, in
    // "the 404 page is the only page kept out of the index" below — this is
    // not an exemption that quietly checks nothing.
    if (page.route === '/404') return
    const match = page.html.match(/<link rel="canonical" href="([^"]*)"/)
    expect(match, 'no canonical link').not.toBeNull()
    expect(match![1]).toBe(`${company.siteUrl}${page.route}`)
  })
})

describe('page metadata is unique across the site', () => {
  // Duplicate titles or descriptions across pages are a direct SEO defect
  // (spec §4 requires a distinct pair per page) and the exact thing that
  // happens when a new page is built by copying an existing one.
  //
  // SOMETHING ELSE DEPENDS ON THE TITLE ASSERTION (fix round 2, G-3).
  // scripts/run-axe.mjs's preflight proves the preview server is serving
  // OUR build of a given route by matching that route's <title> against the
  // fetched body. That marker is only discriminating while titles are
  // unique: two routes sharing one would let a mis-resolved route — a
  // fallback port, a squatter, a bad rewrite — pass the preflight and be
  // audited as though it were the right page. So relaxing the assertion
  // below to a subset check, or dropping it for a page, silently weakens
  // the accessibility run of every page on the site. Do not weaken it
  // without giving run-axe.mjs a different marker first.
  it('every <title> is distinct', () => {
    const titles = pages.map((p) => p.html.match(/<title>([\s\S]*?)<\/title>/)?.[1].trim() ?? '')
    expect(new Set(titles).size).toBe(pages.length)
  })

  it('every meta description is distinct', () => {
    const descriptions = pages.map(
      (p) => p.html.match(/<meta name="description" content="([^"]*)"/)?.[1].trim() ?? '',
    )
    expect(new Set(descriptions).size).toBe(pages.length)
  })
})

// ---------------------------------------------------------------------
// Step 2 — the CTA guards, extended from the homepage to every page
// ---------------------------------------------------------------------

describe.each(pages)('$route CTA integrity', (page) => {
  it('links to the configured requirement-form URL', () => {
    expect(page.html).toContain(company.requirementFormUrl)
  })

  it('links to the official WhatsApp number', () => {
    expect(page.html).toContain('wa.me/6598556637')
  })

  it('never uses "Contact Us" as a primary CTA', () => {
    expect(page.html).not.toMatch(/class="btn primary"[^>]*>\s*Contact Us/)
  })
})

// ---------------------------------------------------------------------
// Step 4 — the invented-information greps, extended to every page
// ---------------------------------------------------------------------

/**
 * Claims the site is not entitled to make. Master brief §78 (never invent
 * business information), §42 (never characterise a nationality), and
 * core-pages design spec §7.
 *
 * Each entry names the CLAIM, not the string, so a failure says what was
 * published rather than which regex fired.
 */
const FORBIDDEN_CLAIMS: { label: string; pattern: RegExp }[] = [
  {
    label: 'a promise of a perfect match',
    pattern: /\bperfect\s+(?:match|fit|helper|candidate)\b/i,
  },
  {
    // There is no matching algorithm. Matching is people reading
    // requirements (spec §3.2, §40 forbids search/filter/browse entirely),
    // and describing it as software is both untrue and the single most
    // common thing a marketing rewrite adds.
    label: 'matching described as AI, an algorithm, or automated',
    pattern:
      /\b(?:AI|A\.I\.|artificial intelligence|machine learning|algorithm\w*|automated|automatic\w*|smart)\b[^.!?]{0,40}\b(?:match\w*|recommend\w*|shortlist\w*|select\w*)\b|\bmatch\w*\b[^.!?]{0,40}\b(?:AI|A\.I\.|artificial intelligence|machine learning|algorithm\w*)\b/i,
  },
  {
    // No instant-response commitment has been supplied. The only response
    // figure DirectHired gave is "within 1 business day"
    // (src/content/faq/response-time.md), which is a business day and not
    // an instant, and is deliberately NOT caught here.
    label: 'a promise of an instant or immediate response',
    pattern:
      /\b(?:instant\w*|immediate\w*|right away|straight away|within minutes|in minutes|within seconds|real[-\s]?time)\b[^.!?]{0,40}\b(?:repl\w*|respon\w*|answer\w*|get back|match\w*)\b|\b(?:repl\w*|respon\w*|answer\w*|get back)\b[^.!?]{0,40}\b(?:instant\w*|immediate\w*|within minutes|within seconds)\b/i,
  },
  {
    label: 'a helper source beyond Indonesia, Myanmar and Mizoram',
    // §22 and §7: the Philippines is never named, including as "coming
    // soon". The other three are the neighbouring sources a writer reaches
    // for by habit.
    pattern: /\b(?:philippin\w*|filipin\w*|sri\s?lank\w*|cambodi\w*|banglades\w*)\b/i,
  },
  {
    label: 'Mizoram or the source set described as a country',
    pattern: /\bcountr(?:y|ies)\b/i,
  },
  {
    label: 'India named in copy a visitor reads',
    pattern: /\bIndian?\b/,
  },
  {
    label: 'a nationality characterised',
    pattern:
      /\b(?:helpers|candidates|women|they)\s+from\s+\w+\s+(?:are|tend|typically|generally|usually|often)\b/i,
  },
  {
    label: 'a source or nationality described as known for something',
    pattern: /\b(?:known|renowned|prized|valued|sought[-\s]after)\s+for\b/i,
  },
]

describe.each(pages)('$route publishes no invented information', (page) => {
  for (const { label, pattern } of FORBIDDEN_CLAIMS) {
    it(`does not publish ${label}`, () => {
      // Rendered text, not raw HTML — see renderedText()'s docblock for why
      // the country check in particular cannot run against the markup.
      expect(renderedText(page.html)).not.toMatch(pattern)
    })
  }
})

// ---------------------------------------------------------------------
// The source rule as an allowlist, over the build
// ---------------------------------------------------------------------
//
// Task 5B, G-1. FORBIDDEN_CLAIMS above carries the four-name denylist —
// Philippines, Sri Lanka, Cambodia, Bangladesh — and keeps it byte-identical
// with tests/content.test.ts's copy, which is asserted there. That list is
// the four a Singapore agency writer reaches for by habit, and spec §7 is
// not a list of four: it is "any source beyond Indonesia, Myanmar and
// Mizoram". "We also place helpers from Nepal and Thailand." satisfied every
// assertion in this file.
//
// So the same rule also runs as an ALLOWLIST here: every country name on
// earth, derived from Node's ICU data, minus the three permitted sources and
// two documented exemptions. The denylist is kept as well — it is
// case-insensitive and stem-based, so it catches a lowercased or mangled
// spelling that a proper-noun sweep can miss. See
// tests/support/helper-sources.ts for the choice and the two rejected
// alternatives.

describe.each(pages)('$route names no source beyond the three', (page) => {
  it('names no country except the permitted sources and the documented exemptions', () => {
    const offenders = namedSources(renderedText(page.html))
    expect(offenders).toEqual([])
  })
})

describe('the source allowlist is doing real work', () => {
  it('derives a real country list, not an empty one', () => {
    // Same non-vacuity guard as the content-side sweep, for the same reason:
    // a small-icu Node would empty the list and make every assertion above
    // pass on anything. Asserted in both files because either could be run
    // alone.
    const names = forbiddenPlaceNames()
    expect(names.length).toBeGreaterThan(200)
    expect(names).toContain('Philippines')
    expect(names).toContain('Nepal')
    expect(names).not.toContain('Singapore')
  })

  it('fires on the sentence a built page would have to carry', () => {
    // These strings live in this test file and are never built or published.
    expect(namedSources('We also place helpers from Nepal and Thailand.').sort()).toEqual([
      'Nepal',
      'Thailand',
    ])
    // ...and not on what every page on this site actually says.
    expect(namedSources('DirectHired is a Singapore maid agency.')).toEqual([])
  })
})

/**
 * Every duration the site is permitted to state, and where it comes from.
 * Keys are in normal form: lowercased, separators collapsed, the UNIT word
 * singularised and nothing else (see normaliseDuration, and F-1 for what
 * happens when "nothing else" is not enforced).
 *
 * This is an ALLOWLIST rather than a list of banned phrasings, and that is
 * the point. Design spec §7 forbids "a timeline beyond §2.2's figures" —
 * which is unbounded, so it cannot be enumerated as patterns. Enumerating
 * what is ALLOWED turns an open-ended rule into a closed one: any new
 * duration anywhere on any page fails here until somebody adds it with a
 * source, which is exactly the moment to check that a source exists.
 */
const APPROVED_DURATIONS = new Map<string, string>([
  ['6 month', 'spec §2.1 — the replacement window, measured from deployment'],
  ['2 week', 'spec §2.2 — a helper coming from a source country, after confirmation'],
  ['1 week', 'spec §2.2 — a transfer helper already in Singapore'],
  ['one month', "spec §2.3 — the placement fee, fixed at one month's salary"],
  [
    '24 hour',
    'master brief, Opening Hours (line 345) — the stated availability, carried by company.ts openingHours into the footer. Not a timeline.',
  ],
  [
    '1 business day',
    'master brief, Opening Hours (line 353), cited as §10/§74 by foundation spec §235 — "a target response within 1 business day", with an explicit instruction not to claim instant human response. Published in faq/response-time.md and faq/submit-requirements.md; renders on /faq.',
  ],
])

/*
 * Fix round 2, G-2. These strings exist so that the next person meeting a
 * red here finds an AUTHORITY and can decide whether the new duration has
 * one — so each must name the document that SUPPLIED the figure, never the
 * file that publishes it. The '1 business day' entry cited
 * faq/response-time.md, which is output: following it would have led to a
 * page repeating the number rather than to the brief that authorised it,
 * and "it already appears on the site" is precisely the reasoning this
 * allowlist exists to refuse. Publication files are named after the
 * authority, if at all, and never instead of it.
 */

/*
 * "2 business days" is deliberately NOT here. The only response figure
 * DirectHired supplied is one business day; a second is a timeline nobody
 * gave us, and spec §7 forbids stating one. normaliseDuration handles the
 * plural correctly (asserted below) — it produces "2 business day", which
 * then fails this allowlist, which is the designed behaviour. If the client
 * ever revises the commitment, the guard fires and the entry gets added
 * here with its source, which is the moment to check that a source exists.
 */

const DURATION_PATTERN =
  /\b(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|a few|several)[\s-]+(?:business[\s-]+)?(?:hour|day|week|month|year)s?\b/gi

/**
 * The same shape DURATION_PATTERN matches, anchored and captured, so
 * normalisation can act on the UNIT WORD specifically.
 *
 * Fix round 1, F-1. The first version was
 * `.replace(/[\s-]+/g, ' ').replace(/s\b/, '')` — strip the first
 * word-final "s" anywhere in the string. On "1 business day" that "s" is
 * the one in "business": the phrase normalised to "1 busines day", which
 * matched no allowlist key, so the `'1 business day'` entry was unreachable
 * dead code and any page carrying that phrase would have failed. Two FAQ
 * entries publish it today (response-time.md, submit-requirements.md);
 * neither renders on the two pages that exist, so the suite was green by
 * accident and /faq — the next task — would have turned it red on
 * client-approved copy. A false positive on real copy is what teaches the
 * next person to loosen the guard, which is the one thing this allowlist
 * must not invite.
 */
const DURATION_SHAPE = /^(.+?) ((?:business )?)(hour|day|week|month|year)s?$/

/** "6-months" → "6 month"; "2 Business Days" → "2 business day". */
function normaliseDuration(raw: string): string {
  const collapsed = raw.toLowerCase().replace(/[\s-]+/g, ' ').trim()
  const match = collapsed.match(DURATION_SHAPE)
  // DURATION_PATTERN only ever yields strings of this shape, so a miss means
  // the pattern and the shape have drifted apart. Throw rather than return
  // something that silently matches no allowlist key — a silent mismatch is
  // exactly the bug this function is being fixed for.
  if (!match) {
    throw new Error(`normaliseDuration: "${raw}" is not a duration shape this guard understands`)
  }
  const [, count, qualifier, unit] = match
  return `${count} ${qualifier}${unit}`
}

describe.each(pages)('$route states no timeline it was not given', (page) => {
  it('every duration on the page is one of the approved figures', () => {
    const found = renderedText(page.html).match(DURATION_PATTERN) ?? []
    const unapproved = [...new Set(found.map(normaliseDuration))].filter(
      (d) => !APPROVED_DURATIONS.has(d),
    )
    expect(unapproved).toEqual([])
  })
})

describe('the duration normaliser', () => {
  // Fix round 1, F-1. These run against the function directly rather than
  // against a page, because the bug they exist for was invisible from the
  // page side: the guard was green on the two pages that happen not to
  // carry the phrase, and would have gone red the moment /faq shipped.
  it('normalises the unit word, not the first "s" in the string', () => {
    expect(normaliseDuration('1 business day')).toBe('1 business day')
    expect(normaliseDuration('2 business days')).toBe('2 business day')
    expect(normaliseDuration('6 months')).toBe('6 month')
    expect(normaliseDuration('6-Month')).toBe('6 month')
    expect(normaliseDuration('Two Weeks')).toBe('two week')
    expect(normaliseDuration('24 hours')).toBe('24 hour')
  })

  it('every allowlist key is reachable — none is dead code', () => {
    // The general form of F-1. An allowlist entry that is not its own
    // normal form can never be produced by normaliseDuration, so it
    // permits nothing while looking as though it permits something. This
    // catches that for every entry, present and future, without anyone
    // having to notice it on a page first.
    for (const key of APPROVED_DURATIONS.keys()) {
      expect(normaliseDuration(key), `"${key}" is unreachable: it permits nothing`).toBe(key)
    }
  })

  it('every allowlist key is a phrase DURATION_PATTERN would actually find', () => {
    // The other half: an entry the scanner can never emit is equally dead,
    // even if it is its own normal form.
    for (const key of APPROVED_DURATIONS.keys()) {
      const found = key.match(new RegExp(DURATION_PATTERN.source, 'i'))
      expect(found?.[0], `"${key}" is not a phrase the duration scanner matches`).toBe(key)
    }
  })
})

describe('the timeline allowlist is doing real work', () => {
  // Without this the check above passes on any page that happens to state
  // no duration at all, and would keep passing if DURATION_PATTERN were
  // broken. At least one page must actually exercise the allowlist.
  it('the built pages really do state approved durations', () => {
    const all = pages.flatMap((p) => (renderedText(p.html).match(DURATION_PATTERN) ?? []))
    expect(all.length).toBeGreaterThan(0)
    expect(new Set(all.map(normaliseDuration)).size).toBeGreaterThan(1)
  })
})

// ---------------------------------------------------------------------
// The `surface` prop — the one that nothing typechecks
// ---------------------------------------------------------------------
//
// Faq.astro declares `surface?: 'home' | 'faq' | 'pricing'`, and the faq
// collection's schema declares the same three values. Neither is checked at
// build time: this project runs `astro build` with no `astro check` and no
// `tsc`, and nothing typechecks .astro files at all. So `<Faq
// surface="priciing" />` builds clean, filters to an empty list, and
// renders a heading with no questions under it — which reads to a visitor
// as content that failed to load, not as a typo.
//
// Two assertions, because they fail at different times. The first catches
// the typo at its source and names it. The second catches the SYMPTOM —
// an empty FAQ section — whatever produced it: a surface with no entries
// tagged for it, a limit of 0, a collection query that silently returned
// nothing. The empty section is the thing worth catching; the typo is only
// its most likely cause.

describe('the Faq surface prop', () => {
  const SCHEMA_ENUM_PATTERN = /surfaces: z\.array\(z\.enum\(\[([^\]]*)\]\)\)/

  function schemaSurfaces(): string[] {
    const config = readFileSync('src/content/config.ts', 'utf8')
    const match = config.match(SCHEMA_ENUM_PATTERN)
    if (!match) throw new Error('src/content/config.ts: could not find the faq surfaces enum')
    return match[1].split(',').map((s) => s.trim().replace(/^'|'$/g, ''))
  }

  function faqSurfaceUsages(): { file: string; surface: string }[] {
    return walk('src/pages')
      .filter((f) => f.endsWith('.astro'))
      .flatMap((file) => {
        const source = readFileSync(file, 'utf8')
        return [...source.matchAll(/<Faq\b[^>]*?\bsurface="([^"]*)"/g)].map((m) => ({
          file,
          surface: m[1],
        }))
      })
  }

  it('reads the enum from the schema and the usages from src/pages (sanity check)', () => {
    expect(schemaSurfaces()).toEqual(['home', 'faq', 'pricing'])
    // The homepage renders <Faq /> with no surface (the default), so one
    // explicit usage is what exists today. If this drops to zero the
    // assertion below stops checking anything.
    expect(faqSurfaceUsages().length).toBeGreaterThan(0)
  })

  it('every explicit surface="..." in src/pages is a value the schema knows', () => {
    const allowed = new Set(schemaSurfaces())
    const offenders = faqSurfaceUsages()
      .filter(({ surface }) => !allowed.has(surface))
      .map(({ file, surface }) => `${file}: surface="${surface}"`)
    expect(offenders).toEqual([])
  })

  it("Faq.astro's own prop type offers exactly the schema's values", () => {
    // The prop union and the schema enum are two hand-maintained copies of
    // one list. Nothing reconciles them, so a value added to the schema and
    // not to the prop (or the reverse) is a silent divergence.
    const source = readFileSync('src/sections/Faq.astro', 'utf8')
    const match = source.match(/surface\?:\s*([^\n]+)/)
    expect(match, 'Faq.astro no longer declares a `surface` prop').not.toBeNull()
    const declared = match![1]
      .split('|')
      .map((s) => s.trim().replace(/^'|'$/g, ''))
      .filter(Boolean)
    expect(declared.sort()).toEqual([...schemaSurfaces()].sort())
  })
})

describe.each(pages)('$route renders no empty FAQ section', (page) => {
  it('every FAQ section on the page contains at least one <details>', () => {
    // Sections are sliced on the opening tag rather than parsed, which is
    // enough here: <section class="faq"> never nests another <section>.
    const starts = [...page.html.matchAll(/<section class="faq"/g)].map((m) => m.index!)
    const sections = starts.map((start, i) => page.html.slice(start, starts[i + 1] ?? undefined))
    const empty = sections.filter((s) => !/<details[\s>]/.test(s))
    expect(empty.map(() => 'a faq section with no questions in it')).toEqual([])
  })
})

describe('the empty-FAQ check has sections to check (sanity check)', () => {
  it('at least one built page renders a FAQ section', () => {
    const total = pages.reduce(
      (n, p) => n + (p.html.match(/<section class="faq"/g) ?? []).length,
      0,
    )
    expect(total).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------
// Rendered markdown must LOOK like more than one block when it is more
// than one block
// ---------------------------------------------------------------------
//
// A live readability defect, found by the /faq task on 2026-08-16 and fixed
// in the same round. global.css resets `* { margin: 0 }`. All four surfaces
// that render a content collection's markdown through <Content /> —
// Faq.astro, FaqGrouped.astro, MeetHelpers.astro's helper bio and
// Reviews.astro's review quote — carried `p:first-child { margin-top: 0 }`
// and `p:last-child { margin-bottom: 0 }`, which zero margins that are
// already zero, and not one restored spacing BETWEEN blocks. A
// two-paragraph answer rendered as one unbroken block on the homepage and
// on /pricing; measured in Chrome at 320px, both paragraphs of faq/cost.md
// computing 0px. The other two surfaces render nothing today only because
// their collections are deliberately empty.
//
// A second divergence rode along with it: FaqGrouped.astro alone styled
// answer links, so the same answer's link was rgb(4,106,108) with a
// bordered underline on /faq and rgb(77,77,77) with a plain underline on /
// and /pricing.
//
// Both are fixed at one level — `.rich-text` in src/styles/global.css — and
// asserted here, over dist/ rather than over a component, because the
// question is what a visitor's browser is handed: the markdown and the CSS
// that styles it have to arrive on the SAME page, and a component-level
// check cannot say that.

/** Every rule in a built page's CSS, inlined or linked, as selector/body. */
function styleRules(html: string): { selector: string; body: string }[] {
  const inline = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1])
  const linked = [...html.matchAll(/<link[^>]+href="(\/[^"]+\.css)"/g)]
    .map((m) => `dist${m[1]}`)
    .filter((file) => existsSync(file))
    .map((file) => readFileSync(file, 'utf8'))
  return [...inline, ...linked]
    .join('\n')
    .split(/@media[^{]*\{/)
    .flatMap((chunk) => [...chunk.matchAll(/([^{}]+)\{([^{}]*)\}/g)])
    .map((m) => ({ selector: m[1].trim(), body: m[2].trim() }))
}

/** Each rendered-markdown container on a page, with its inner markup. */
function markdownContainers(html: string): string[] {
  return [...html.matchAll(/<(\w+) class="[^"]*\brich-text\b[^"]*"[^>]*>([\s\S]*?)<\/\1>/g)].map(
    (m) => m[2],
  )
}

describe('every <Content /> in the source is wrapped in .rich-text', () => {
  /*
   * THE SOURCE-SIDE HALF, AND THE ONLY ONE THAT CAN SEE TWO OF THE FOUR
   * SURFACES.
   *
   * MeetHelpers.astro's helper bio and Reviews.astro's review quote render
   * nothing today — both collections are deliberately empty — so no built
   * page carries them and the dist/-derived rules below cannot say a word
   * about either. Both carried the identical defect, and both would have
   * shipped it the day DirectHired supplies profiles or reviews, as a
   * rendering fault in content nobody changed.
   *
   * So the opt-in is asserted where it is written. DERIVED from the
   * <Content /> call sites rather than from a list of files: a fifth
   * markdown surface is caught by this the moment it exists, which is the
   * whole reason the treatment was moved to one shared class.
   */
  const astroFiles = walk('src').filter((f) => f.endsWith('.astro'))
  const CONTENT_TAG = /<Content\s*\/>/g
  const WRAPPED = /<[a-z]+ class="([^"]*)"[^>]*>\s*<Content\s*\/>/g

  /**
   * Comments stripped, or every file that EXPLAINS <Content /> counts as
   * four more call sites — Faq.astro's header alone mentions it twice. The
   * repo's convention: a rule explained next to the code obeying it must
   * not read as a breach of itself.
   */
  const template = (file: string) =>
    readFileSync(file, 'utf8')
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      // `//` only at the start of a line: a `//` mid-line is the one in an
      // https:// URL, and eating the rest of that line could hide real code.
      .replace(/^[ \t]*\/\/.*$/gm, ' ')

  it('finds the call sites it claims to check (guards the assertion below)', () => {
    const total = astroFiles.reduce((n, f) => n + (template(f).match(CONTENT_TAG) ?? []).length, 0)
    // Four today: the two FAQ layouts, the helper bio and the review quote.
    // A floor rather than an equality, so adding a fifth surface fails on
    // the class rather than on the count.
    expect(total).toBeGreaterThanOrEqual(4)
  })

  it('wraps every one of them in an element carrying the class', () => {
    const offenders: string[] = []
    for (const file of astroFiles) {
      const source = template(file)
      const calls = (source.match(CONTENT_TAG) ?? []).length
      const wrapped = [...source.matchAll(WRAPPED)].filter((m) => /\brich-text\b/.test(m[1]))
      if (wrapped.length !== calls) offenders.push(`${file}: ${wrapped.length}/${calls} wrapped`)
    }
    expect(offenders).toEqual([])
  })
})

describe('every built page spaces the markdown it renders', () => {
  const withMarkdown = pages.filter((p) => markdownContainers(p.html).length > 0)

  it('has pages to check, and a multi-paragraph block among them', () => {
    /*
     * Both halves matter. Without the first, a page sweep that stopped
     * finding markdown containers would make the rules below pass on an
     * empty list. Without the second, they would be about a defect no
     * visitor could meet — and the whole point is that this one HAS been
     * shipping, on the two pages named here, apparently since sub-project 1.
     */
    expect(withMarkdown.map((p) => p.route)).toEqual(
      expect.arrayContaining(['/', '/pricing/', '/faq/']),
    )
    const multiParagraph = withMarkdown.flatMap((p) =>
      markdownContainers(p.html)
        .filter((inner) => (inner.match(/<p[\s>]/g) ?? []).length > 1)
        .map(() => p.route),
    )
    expect(multiParagraph).toEqual(expect.arrayContaining(['/', '/pricing/']))
  })

  /**
   * A rule that puts space between ANY two adjacent blocks — the `* + *`
   * shape, whatever combinator and whitespace it is written with.
   *
   * SPECIFIC ON PURPOSE, and a mutation is why. The first version of this
   * accepted any `.rich-text` rule containing a `+`, which the `li + li`
   * rule below satisfies on its own: zeroing the block margin left the
   * paragraphs running together again and the assertion still passed,
   * because a different rule in the same family carried a non-zero value.
   * A between-BLOCKS guarantee has to be checked against the between-blocks
   * rule.
   */
  const BETWEEN_BLOCKS = /\.rich-text\b[^,{]*\*\s*\+\s*\*/
  const BETWEEN_LIST_ITEMS = /\.rich-text\b[^,{]*\bli\s*\+\s*li\b/
  const NON_ZERO_TOP = /margin-top:\s*var\(--space-[1-9]\d*\)/

  it.each(withMarkdown)('$route separates one markdown block from the next', (page) => {
    const rules = styleRules(page.html)
    const between = rules.filter((rule) => BETWEEN_BLOCKS.test(rule.selector))
    expect(between.length, `${page.route} has no rule between markdown blocks`).toBeGreaterThan(0)
    expect(
      between.some((rule) => NON_ZERO_TOP.test(rule.body)),
      `${page.route} declares a between-blocks rule with no non-zero top margin`,
    ).toBe(true)

    // Asserted separately rather than folded in above, so neither can stand
    // in for the other: a list of stacked lines and two paragraphs running
    // together are the same defect at two scales.
    const items = rules.filter((rule) => BETWEEN_LIST_ITEMS.test(rule.selector))
    expect(
      items.some((rule) => NON_ZERO_TOP.test(rule.body)),
      `${page.route} does not separate markdown list items`,
    ).toBe(true)
  })

  it.each(withMarkdown)('$route styles links inside markdown the same way', (page) => {
    /*
     * The other half of the divergence, and it is asserted per page for the
     * reason it went unnoticed: the defect was not that a link was
     * unstyled, it was that the SAME answer's link was styled on one page
     * and not on another. A rule that exists on every page carrying
     * markdown is the only form of that guarantee.
     */
    const links = styleRules(page.html).filter((rule) =>
      /\.rich-text\b[^,{]*\sa\b/.test(rule.selector),
    )
    expect(
      links.some((rule) => /color:\s*var\(--color-accent\)/.test(rule.body)),
      `${page.route} does not give markdown links the accent colour`,
    ).toBe(true)
  })
})

// ---------------------------------------------------------------------
// BreadcrumbList — built by Task 11, and now policed in both directions
// ---------------------------------------------------------------------
//
// Task 7 fix round, W-2 recorded spec §4's `BreadcrumbList` requirement as
// failing by OMISSION and shipped a self-policing deferral list —
// ROUTES_AWAITING_BREADCRUMBS — so that the gap could neither widen silently
// nor be forgotten. Task 11 built the thing: `breadcrumbSchema` in
// src/lib/structured-data.ts, applied through BaseLayout's `breadcrumb` prop,
// on every page that has a position in the hierarchy.
//
// THE DEFERRAL LIST IS GONE BECAUSE IT REACHED ZERO, which is what its own
// comment asked for. What survives is the permanent exemption below, and the
// assertions are unchanged in shape: the set of pages carrying no
// BreadcrumbList must equal the exempt set EXACTLY, so a page that loses its
// trail fails just as loudly as a page that gains one it should not have.
//
// The CONTENT of every trail — positions, names, absolute URLs, and whether
// each URL resolves to a page that exists — is validated in
// tests/json-ld.test.ts, over every JSON-LD block on every built page. This
// block answers "is there one"; that file answers "is it true".

/**
 * Routes that must NEVER carry a `BreadcrumbList`.
 *
 * '/404' — decided by Task 10, for three reasons, any one of which would be
 * enough:
 *
 *   1. A BreadcrumbList states WHERE A PAGE SITS in the site's hierarchy.
 *      A 404 sits nowhere. The URL that produced it is not a node in any
 *      hierarchy — that is the entire meaning of the response — and
 *      /404.html itself is not a destination anybody navigates to. Any
 *      trail written here would be fiction: either a trail to the missing
 *      URL, which does not exist, or a trail to /404, which nothing links
 *      to.
 *   2. Google's breadcrumb guidance requires the markup to describe a real
 *      navigational path to the page. Structured data that describes a
 *      position the page does not occupy is a structured-data mismatch, and
 *      the penalty for those falls on the whole site rather than on the one
 *      page.
 *   3. It could never be used anyway. Once
 *      scripts/deploy-cloudfront-error-pages.sh is applied this page is
 *      served with a 404 STATUS, and a crawler drops a 404 rather than
 *      indexing it — while the directly-reachable /404.html carries
 *      `noindex`. Rich results are computed for indexed pages.
 *
 * '/' — decided by Task 11, which is the call ROUTES_AWAITING_BREADCRUMBS's
 * docblock explicitly delegated to it ("the one entry that may legitimately
 * survive that task is '/'... That is Task 11's call to make and to record
 * here"). The homepage is EXEMPT, and this is the argument:
 *
 *   1. FOUNDATION SPEC §242 SCOPES THE REQUIREMENT: "`BreadcrumbList` on
 *      nested pages". The site root is not nested. Core-pages spec §4's
 *      "per page" list does not overrule that — it is the same requirement
 *      restated for the six pages that task was about, all six of which are
 *      nested.
 *   2. THE ONLY TRAIL IT COULD CARRY WOULD DESCRIBE NOTHING. Every trail on
 *      this site starts at the root, so the homepage's own trail is a single
 *      ListItem whose `item` is the page it is already on. That states no
 *      position: it is a path of length zero written down as if it were a
 *      path. Google's breadcrumb guidance is about the route to a page, and
 *      there is no route to the root.
 *   3. IT IS NOT A GAP IN COVERAGE. The homepage is position 1 of all six
 *      trails the site does ship, so the root's place in the hierarchy is
 *      already stated six times, by the pages that actually have a position
 *      relative to it.
 *
 * NOTE THE ASYMMETRY WITH THE DELETED LIST, because it is the point. This
 * list is not a to-do: an entry here is a decision that has been made and
 * argued, and both assertions below run in both directions over it. Nothing
 * may be added without an argument of the same kind, and the moment a route
 * here starts shipping a BreadcrumbList the first assertion fails.
 */
const ROUTES_EXEMPT_FROM_BREADCRUMBS: readonly string[] = ['/', '/404']

const ROUTES_WITHOUT_BREADCRUMBS: readonly string[] = ROUTES_EXEMPT_FROM_BREADCRUMBS

/**
 * Every `@type` in every JSON-LD block on a page, however nested — an array at
 * the top level, a `@graph`, an `itemListElement`, all of it.
 *
 * A raw string search for "BreadcrumbList" would also fire on the word
 * appearing in page copy or in a comment, which would let a page look
 * compliant without carrying any structured data at all. A block that does not
 * parse contributes nothing, which is the right reading: malformed JSON-LD is
 * not a shipped BreadcrumbList.
 */
function jsonLdTypes(html: string): string[] {
  const blocks = [
    ...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi),
  ].map((m) => m[1])

  const types: string[] = []
  const visit = (node: unknown): void => {
    if (Array.isArray(node)) {
      node.forEach(visit)
      return
    }
    if (node && typeof node === 'object') {
      for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
        if (key === '@type' && typeof value === 'string') types.push(value)
        else visit(value)
      }
    }
  }

  for (const block of blocks) {
    try {
      visit(JSON.parse(block))
    } catch {
      // Unparseable — contributes no types, deliberately.
    }
  }
  return types
}

describe('the 404 page is the only page kept out of the index', () => {
  /*
   * Task 10. Two halves of one property, asserted together so neither can be
   * traded for the other.
   *
   * THE 404 MUST CARRY noindex. Once
   * scripts/deploy-cloudfront-error-pages.sh is applied, a missing route is
   * served this page's body with a 404 STATUS, which a crawler drops. But
   * the file also sits at /404.html as a real object, where it answers 200
   * and is a perfectly indexable thin page with no content of its own. The
   * robots meta is what closes that, and it is invisible on the rendered
   * page — exactly the kind of thing a tidy-up deletes.
   *
   * NO OTHER PAGE MAY CARRY IT. A stray `noindex` on /contact or /pricing
   * removes that page from Google silently: nothing breaks, nothing looks
   * wrong, and the traffic simply stops. This is the cheapest possible guard
   * against the single most expensive one-line mistake on a marketing site.
   */
  const NOINDEX = /<meta[^>]+name="robots"[^>]+content="[^"]*noindex/i

  it('the 404 page declines indexing', () => {
    const notFound = pages.find((p) => p.route === '/404')
    expect(notFound, 'dist/404.html was not built').toBeDefined()
    expect(notFound!.html).toMatch(NOINDEX)
  })

  it('no other page does', () => {
    const offenders = pages
      .filter((p) => p.route !== '/404')
      .filter((p) => NOINDEX.test(p.html))
      .map((p) => p.route)
    expect(offenders).toEqual([])
  })

  it('the 404 page claims no canonical URL, and every other page does', () => {
    /*
     * The other half of the same flag. BaseLayout drops the self-canonical
     * and the og:url with the robots meta, because all three are claims
     * about "this page's URL" and a 404 has none — it is served in place of
     * every URL that does not exist, and the tag BaseLayout would otherwise
     * write (…/404/) is itself a URL that returns 404.
     *
     * Asserted here rather than only as an early return in the per-page
     * canonical check above, which is what keeps that early return from
     * being an exemption that checks nothing. Both directions, so a change
     * that dropped canonicals site-wide fails loudly.
     */
    const CANONICAL = /<link rel="canonical"/i
    const notFound = pages.find((p) => p.route === '/404')!
    expect(notFound.html).not.toMatch(CANONICAL)
    expect(notFound.html).not.toMatch(/<meta property="og:url"/i)

    const withoutCanonical = pages
      .filter((p) => p.route !== '/404')
      .filter((p) => !CANONICAL.test(p.html))
      .map((p) => p.route)
    expect(withoutCanonical).toEqual([])
  })
})

describe('BreadcrumbList (spec §4)', () => {
  it('the pages carrying no BreadcrumbList are exactly the exempt ones', () => {
    const missing = pages
      .filter((p) => !jsonLdTypes(p.html).includes('BreadcrumbList'))
      .map((p) => p.route)
      .sort()
    expect(missing).toEqual([...ROUTES_WITHOUT_BREADCRUMBS].sort())
  })

  it('every other page carries exactly one, and never two', () => {
    /*
     * The other direction, and it is not implied by the assertion above.
     * That one asks whether the type appears at all; a page emitting two
     * BreadcrumbList blocks — the layout's plus a hand-rolled one — would
     * satisfy it while shipping a structured-data defect of exactly the kind
     * /faq avoids by not rendering <Faq /> alongside <FaqGrouped />.
     */
    const counts = pages
      .filter((p) => !ROUTES_WITHOUT_BREADCRUMBS.includes(p.route))
      .map((p) => ({
        route: p.route,
        n: jsonLdTypes(p.html).filter((t) => t === 'BreadcrumbList').length,
      }))
    expect(counts.length, 'no page is required to carry a breadcrumb').toBeGreaterThan(0)
    expect(counts.filter((c) => c.n !== 1)).toEqual([])
  })

  it('every exempt route is a page that actually exists', () => {
    // The DEFERRED_ROUTES lesson: an entry for a route nothing builds is an
    // exemption granted in advance, and it would let a deleted page hide here.
    const built = new Set(pages.map((p) => p.route))
    expect(ROUTES_WITHOUT_BREADCRUMBS.filter((r) => !built.has(r))).toEqual([])
  })

  it('the detector recognises a BreadcrumbList, and does not invent one', () => {
    /*
     * Without this, a detector that found nothing anywhere would report every
     * page as missing, the enumeration would match, and the whole guard would
     * be green while checking nothing — the vacuous pass this suite keeps
     * finding. These strings live in this file and are never built.
     */
    const script = (json: string) =>
      `<script type="application/ld+json">${json}</script>`
    expect(
      jsonLdTypes(
        script(
          '{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Home","item":"https://x/"}]}',
        ),
      ),
    ).toContain('BreadcrumbList')
    // Nested inside a @graph, which is how a page carrying two schemas would
    // most likely ship it.
    expect(
      jsonLdTypes(script('{"@graph":[{"@type":"EmploymentAgency"},{"@type":"BreadcrumbList"}]}')),
    ).toContain('BreadcrumbList')
    // The word in prose is not structured data.
    expect(jsonLdTypes('<p>We add a BreadcrumbList later.</p>')).toEqual([])
    expect(jsonLdTypes(script('{"@type":"FAQPage"}'))).not.toContain('BreadcrumbList')
  })

  it('reads the structured data the site really ships (the detector is wired to dist/)', () => {
    // The other half of non-vacuity: the detector must work on real built
    // markup, not only on the literals above.
    const all = pages.flatMap((p) => jsonLdTypes(p.html))
    expect(all).toContain('EmploymentAgency')
    expect(all).toContain('FAQPage')
  })
})

// ---------------------------------------------------------------------
// The sitemap — every real page, and nothing that is not a page
// ---------------------------------------------------------------------
//
// Task 11. @astrojs/sitemap generates this from the build, so nobody
// maintains a list — which is exactly why nobody would notice it going
// wrong. Two things can, and both are silent:
//
//   A PAGE MISSING FROM IT is a page Google is never told about. The
//   integration has options (`filter`, `exclude`) that make that a one-line
//   change, and public/robots.txt points crawlers at the sitemap as the
//   authoritative list, so an omission here is not softened by the site's
//   internal linking.
//
//   /404 PRESENT IN IT is the opposite defect: submitting an error page for
//   indexing, on the one page of the site that carries `noindex`. The
//   integration excludes it today because Astro emits it as `dist/404.html`
//   rather than as a route; nothing about that is guaranteed, and it is
//   cheaper to assert than to re-derive.
//
// The expected list is DERIVED from dist/ rather than typed, for the reason
// this whole file is: a page added next month has to appear here without
// anybody remembering this test exists.

describe('the sitemap', () => {
  const sitemap = readFileSync('dist/sitemap-0.xml', 'utf8')
  const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])

  /** Routes that belong in a sitemap: every built page except the 404. */
  const indexableRoutes = pages.map((p) => p.route).filter((r) => r !== '/404')

  it('lists every built page except the 404, and nothing else', () => {
    expect(indexableRoutes.length, 'no indexable pages were found').toBe(7)
    expect([...locations].sort()).toEqual(
      indexableRoutes.map((r) => `${company.siteUrl}${r}`).sort(),
    )
  })

  it('does not list the 404, under any spelling of it', () => {
    /*
     * Asserted separately from the equality above, and deliberately not by
     * the same means. The equality compares against routes derived from
     * dist/, so a build that stopped emitting the 404 page altogether would
     * make it pass with nothing to say — and "/404.html" and "/404/" are two
     * different strings, only one of which the derived route can be.
     */
    const notFound = locations.filter((loc) => /\/404(\.html|\/)?$/.test(loc))
    expect(notFound).toEqual([])
    // ...and the page really is built, so the check above has a subject.
    expect(pages.map((p) => p.route)).toContain('/404')
  })

  it('is reachable from the sitemap index robots.txt points at', () => {
    // public/robots.txt names sitemap-index.xml, not sitemap-0.xml. A
    // sitemap file nothing indexes is a sitemap nothing reads.
    const index = readFileSync('dist/sitemap-index.xml', 'utf8')
    expect(index).toContain(`${company.siteUrl}/sitemap-0.xml`)
  })
})
