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
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { company } from '../src/data/company'

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

    /** src/pages/index.astro → "/", src/pages/a/b.astro → "/a/b/". */
    const expectedRoute = (file: string) =>
      file.replace(/^src\/pages/, '').replace(/index\.astro$/, '').replace(/\.astro$/, '/')

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
