/**
 * EVERY JSON-LD BLOCK ON EVERY BUILT PAGE, PARSED AND CHECKED.
 *
 * NOTHING ON THIS PROJECT PARSED IT UNTIL NOW. Three components emit
 * structured data — BaseLayout (BreadcrumbList), Faq/FaqGrouped (FAQPage),
 * index/contact (EmploymentAgency) — and the only assertions that ever
 * touched the output were tests/pages.test.ts's `jsonLdTypes`, which reads
 * @type strings and deliberately swallows a parse error, and
 * tests/structured-data.test.ts, which calls the builder functions directly
 * and never looks at a page. A block that emitted `undefined` for a name, a
 * relative URL for an item, or positions 1, 2, 2 would have shipped green.
 *
 * WHY THAT IS WORSE THAN EMITTING NOTHING. Google treats structured data
 * that misdescribes a page as a mismatch rather than as missing markup, and
 * the manual action for one lands on the site, not on the page. A breadcrumb
 * pointing at a URL that 404s, or claiming a position the page does not
 * occupy, is a claim about the whole hierarchy. So the rule this file
 * enforces is not "some structured data exists" — pages.test.ts already says
 * that — it is that everything published is WELL-FORMED AND TRUE.
 *
 * THE VALIDATORS RETURN PROBLEMS, THEY DO NOT ASSERT. That is what makes
 * them testable against fixtures: the same function that runs over dist/
 * runs over the malformed literals at the bottom of this file, so a
 * validator that stopped catching something fails HERE rather than going
 * quietly green over a site that happens to be correct today. This repo has
 * shipped nine assertions that could not fail; a validator that passes
 * malformed input would be the tenth and the most expensive, because its
 * whole value is the promise that somebody checked.
 */
import { describe, it, expect } from 'vitest'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { company } from '../src/data/company'

// dist/ is built once by tests/global-setup.ts, before this file is
// collected — the same guarantee tests/pages.test.ts relies on.

interface Page {
  file: string
  /** Route as served: '/' , '/pricing/', '/404'. */
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
      route: file.replace(/^dist/, '').replace(/index\.html$/, '').replace(/\.html$/, ''),
      html: readFileSync(file, 'utf8'),
    }))
    .sort((a, b) => a.route.localeCompare(b.route))
}

/** The raw text of every `application/ld+json` script on a page, in order. */
function jsonLdBlocks(html: string): string[] {
  return [
    ...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi),
  ].map((m) => m[1])
}

/**
 * What a visitor reads. Used by the FAQPage check below, because Google
 * requires an FAQPage's questions and answers to be VISIBLE on the page —
 * schema describing content a reader cannot find is the mismatch this file
 * exists for, in its most common form.
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

/* -------------------------------------------------------------------------
 * The validators. Each returns a list of problems; an empty list is a pass.
 * ---------------------------------------------------------------------- */

type Json = Record<string, unknown>

const isObject = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v)

const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0

/**
 * Does this absolute URL name a page this build actually emitted?
 *
 * The whole point of an absolute `item` is that a crawler follows it, so
 * "well-formed" is not enough: a trail that points at a URL returning 404
 * describes a hierarchy the site does not have. Resolution is checked
 * against dist/ rather than against a route list, because dist/ is what is
 * deployed.
 */
function resolvesToBuiltPage(url: string): boolean {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return false
  }
  if (`${parsed.protocol}//${parsed.host}` !== company.siteUrl) return false
  const target = join('dist', parsed.pathname)
  if (existsSync(join(target, 'index.html'))) return true
  if (existsSync(`${target}.html`)) return true
  return existsSync(target) && statSync(target).isFile()
}

/**
 * The rules every top-level block obeys, whatever its type. A block missing
 * @context is not JSON-LD a consumer will read; a block missing @type is not
 * a claim about anything.
 */
function envelopeProblems(node: unknown): string[] {
  if (!isObject(node)) return ['not a JSON object at the top level']
  const problems: string[] = []
  if (node['@context'] !== 'https://schema.org') {
    problems.push(`@context is ${JSON.stringify(node['@context'])}, not "https://schema.org"`)
  }
  if (!isNonEmptyString(node['@type'])) problems.push('no @type')
  return problems
}

/**
 * A BreadcrumbList, checked against what it is claiming: a real navigational
 * path, on this host, to this page.
 *
 * `selfUrl` is the page's own absolute URL. The last crumb must equal it —
 * a trail whose final item is a DIFFERENT page is the breadcrumb form of a
 * copied canonical, and it is the single most damaging thing this markup can
 * get wrong.
 */
function breadcrumbProblems(node: unknown, selfUrl: string | null): string[] {
  const problems = envelopeProblems(node)
  if (!isObject(node)) return problems
  if (node['@type'] !== 'BreadcrumbList') return [...problems, 'not a BreadcrumbList']

  const items = node.itemListElement
  if (!Array.isArray(items)) return [...problems, 'itemListElement is not an array']
  if (items.length === 0) return [...problems, 'itemListElement is empty']

  const names: string[] = []
  items.forEach((raw, index) => {
    const at = `itemListElement[${index}]`
    if (!isObject(raw)) {
      problems.push(`${at} is not an object`)
      return
    }
    if (raw['@type'] !== 'ListItem') problems.push(`${at} is not a ListItem`)
    if (raw.position !== index + 1) {
      problems.push(`${at} has position ${JSON.stringify(raw.position)}, expected ${index + 1}`)
    }
    if (!isNonEmptyString(raw.name)) problems.push(`${at} has no name`)
    else names.push(raw.name)

    const item = raw.item
    if (!isNonEmptyString(item)) {
      problems.push(`${at} has no item URL`)
      return
    }
    if (!item.startsWith(`${company.siteUrl}/`)) {
      problems.push(`${at} item "${item}" is not an absolute URL on ${company.siteUrl}`)
      return
    }
    if (!resolvesToBuiltPage(item)) problems.push(`${at} item "${item}" resolves to no built page`)
  })

  if (new Set(names).size !== names.length) {
    problems.push(`the trail repeats a crumb name: ${names.join(' > ')}`)
  }

  const first = isObject(items[0]) ? items[0].item : undefined
  if (first !== `${company.siteUrl}/`) {
    problems.push(`the trail does not start at the site root (starts at ${JSON.stringify(first)})`)
  }

  const last = items[items.length - 1]
  const lastUrl = isObject(last) ? last.item : undefined
  if (selfUrl !== null && lastUrl !== selfUrl) {
    problems.push(`the trail ends at ${JSON.stringify(lastUrl)}, not at this page (${selfUrl})`)
  }

  return problems
}

/** An FAQPage, checked against the page it sits on. */
function faqProblems(node: unknown, visibleText: string | null): string[] {
  const problems = envelopeProblems(node)
  if (!isObject(node)) return problems
  if (node['@type'] !== 'FAQPage') return [...problems, 'not an FAQPage']

  const entities = node.mainEntity
  if (!Array.isArray(entities)) return [...problems, 'mainEntity is not an array']
  if (entities.length === 0) return [...problems, 'mainEntity is empty']

  entities.forEach((raw, index) => {
    const at = `mainEntity[${index}]`
    if (!isObject(raw)) {
      problems.push(`${at} is not an object`)
      return
    }
    if (raw['@type'] !== 'Question') problems.push(`${at} is not a Question`)
    if (!isNonEmptyString(raw.name)) problems.push(`${at} has no question text`)
    else if (visibleText !== null && !visibleText.includes(raw.name)) {
      // Google requires the marked-up Q&A to be visible on the page.
      problems.push(`${at} asks "${raw.name}", which no reader can find on the page`)
    }

    const answer = raw.acceptedAnswer
    if (!isObject(answer)) {
      problems.push(`${at} has no acceptedAnswer`)
      return
    }
    if (answer['@type'] !== 'Answer') problems.push(`${at}.acceptedAnswer is not an Answer`)
    if (!isNonEmptyString(answer.text)) problems.push(`${at}.acceptedAnswer has no text`)
  })

  return problems
}

/** An EmploymentAgency, checked for the fields that make it findable. */
function agencyProblems(node: unknown): string[] {
  const problems = envelopeProblems(node)
  if (!isObject(node)) return problems
  if (node['@type'] !== 'EmploymentAgency') return [...problems, 'not an EmploymentAgency']

  if (!isNonEmptyString(node.name)) problems.push('no name')
  if (!isNonEmptyString(node.url)) problems.push('no url')
  else if (!node.url.startsWith('https://')) problems.push(`url "${node.url}" is not absolute`)
  if (!isNonEmptyString(node.telephone)) problems.push('no telephone')

  const address = node.address
  if (!isObject(address)) problems.push('no address')
  else {
    if (address['@type'] !== 'PostalAddress') problems.push('address is not a PostalAddress')
    for (const field of ['streetAddress', 'addressLocality', 'postalCode', 'addressCountry']) {
      if (!isNonEmptyString(address[field])) problems.push(`address has no ${field}`)
    }
  }
  return problems
}

/** Dispatch by @type, so an unknown type is reported rather than skipped. */
function problemsFor(node: unknown, ctx: { selfUrl: string | null; visibleText: string | null }) {
  const type = isObject(node) ? node['@type'] : undefined
  switch (type) {
    case 'BreadcrumbList':
      return breadcrumbProblems(node, ctx.selfUrl)
    case 'FAQPage':
      return faqProblems(node, ctx.visibleText)
    case 'EmploymentAgency':
      return agencyProblems(node)
    default:
      return [...envelopeProblems(node), `no validator for @type ${JSON.stringify(type)}`]
  }
}

/* -------------------------------------------------------------------------
 * Over the build
 * ---------------------------------------------------------------------- */

interface Block {
  page: Page
  index: number
  raw: string
}

const blocks: Block[] = pages.flatMap((page) =>
  jsonLdBlocks(page.html).map((raw, index) => ({ page, index, raw })),
)

/** A page's own absolute URL, read from its canonical. Null for the 404. */
function selfUrlOf(page: Page): string | null {
  return page.html.match(/<link rel="canonical" href="([^"]*)"/)?.[1] ?? null
}

describe('the JSON-LD sweep reads what it claims to read', () => {
  /*
   * Every assertion below reports a list of problems and expects it to be
   * empty, so an extractor that found no blocks would make all of them pass
   * on nothing. Both halves are named rather than counted: the sweep has to
   * find pages, and it has to find blocks of each type the site emits.
   */
  it('finds structured data on real pages', () => {
    expect(pages.length).toBeGreaterThanOrEqual(8)
    expect(blocks.length).toBeGreaterThanOrEqual(8)
    expect(new Set(blocks.map((b) => b.page.route)).size).toBeGreaterThanOrEqual(7)
  })

  it('finds each of the three types the site emits', () => {
    const types = blocks.map((b) => {
      try {
        return (JSON.parse(b.raw) as Json)['@type']
      } catch {
        return null
      }
    })
    expect(types).toContain('BreadcrumbList')
    expect(types).toContain('FAQPage')
    expect(types).toContain('EmploymentAgency')
  })
})

describe('every JSON-LD block on every built page', () => {
  it('is well-formed JSON', () => {
    const broken = blocks
      .filter((b) => {
        try {
          JSON.parse(b.raw)
          return false
        } catch {
          return true
        }
      })
      .map((b) => `${b.page.file} block ${b.index}: ${b.raw.slice(0, 80)}`)
    expect(broken).toEqual([])
  })

  it('validates against its own type, with no unrecognised types', () => {
    const failures = blocks.flatMap((b) => {
      let parsed: unknown
      try {
        parsed = JSON.parse(b.raw)
      } catch {
        return [`${b.page.file} block ${b.index}: unparseable`]
      }
      return problemsFor(parsed, {
        selfUrl: selfUrlOf(b.page),
        visibleText: renderedText(b.page.html),
      }).map((problem) => `${b.page.file} block ${b.index}: ${problem}`)
    })
    expect(failures).toEqual([])
  })

  it('never emits two blocks of the same type on one page', () => {
    // Two FAQPage blocks on one page is a structured-data defect rather than
    // twice the signal — the reason /faq renders FaqGrouped instead of both
    // it and <Faq />. The same is true of two breadcrumbs or two agencies.
    const duplicates = pages.flatMap((page) => {
      const types = jsonLdBlocks(page.html).map((raw) => {
        try {
          return (JSON.parse(raw) as Json)['@type']
        } catch {
          return null
        }
      })
      const seen = new Map<unknown, number>()
      for (const type of types) seen.set(type, (seen.get(type) ?? 0) + 1)
      return [...seen.entries()]
        .filter(([, n]) => n > 1)
        .map(([type, n]) => `${page.file}: ${n} × ${String(type)}`)
    })
    expect(duplicates).toEqual([])
  })
})

/* -------------------------------------------------------------------------
 * THE FIXTURES — kept permanently, so the validators cannot be quietly
 * narrowed. These are strings in a test file. They are never built and never
 * published.
 * ---------------------------------------------------------------------- */

const ROOT = `${company.siteUrl}/`
const PRICING = `${company.siteUrl}/pricing/`

const goodCrumb = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: ROOT },
    { '@type': 'ListItem', position: 2, name: 'Pricing', item: PRICING },
  ],
}

/** One-key overrides applied to a deep copy of the good breadcrumb. */
const mutate = (fn: (crumb: any) => void) => {
  const copy = JSON.parse(JSON.stringify(goodCrumb))
  fn(copy)
  return copy
}

const BREADCRUMBS_THAT_MUST_BE_REJECTED: { why: string; node: unknown }[] = [
  { why: 'the wrong @context', node: mutate((c) => (c['@context'] = 'http://schema.org')) },
  { why: 'no @context at all', node: mutate((c) => delete c['@context']) },
  { why: 'no itemListElement', node: mutate((c) => delete c.itemListElement) },
  { why: 'an empty trail', node: mutate((c) => (c.itemListElement = [])) },
  {
    why: 'a trail that is an object rather than an array',
    node: mutate((c) => (c.itemListElement = { '@type': 'ListItem' })),
  },
  {
    why: 'positions that repeat',
    node: mutate((c) => (c.itemListElement[1].position = 1)),
  },
  {
    why: 'positions that start at zero',
    node: mutate((c) => {
      c.itemListElement[0].position = 0
      c.itemListElement[1].position = 1
    }),
  },
  {
    why: 'a position that skips a number',
    node: mutate((c) => (c.itemListElement[1].position = 3)),
  },
  {
    why: 'positions in the wrong order',
    node: mutate((c) => {
      c.itemListElement[0].position = 2
      c.itemListElement[1].position = 1
    }),
  },
  { why: 'a crumb with no name', node: mutate((c) => delete c.itemListElement[1].name) },
  { why: 'a crumb named with whitespace', node: mutate((c) => (c.itemListElement[1].name = '  ')) },
  { why: 'a crumb with no item URL', node: mutate((c) => delete c.itemListElement[1].item) },
  {
    why: 'a relative item URL',
    node: mutate((c) => (c.itemListElement[1].item = '/pricing/')),
  },
  {
    why: 'an item URL on another host',
    node: mutate((c) => (c.itemListElement[1].item = 'https://example.com/pricing/')),
  },
  {
    why: 'an item URL that resolves to no page on this site',
    node: mutate((c) => (c.itemListElement[1].item = `${company.siteUrl}/prcing/`)),
  },
  {
    why: 'a trail that does not start at the site root',
    node: mutate((c) => (c.itemListElement[0].item = PRICING)),
  },
  {
    why: 'a ListItem that is not a ListItem',
    node: mutate((c) => (c.itemListElement[1]['@type'] = 'Thing')),
  },
  {
    why: 'a trail that repeats a crumb name',
    node: mutate((c) => (c.itemListElement[1].name = 'Home')),
  },
  {
    why: 'a trail ending at a different page than the one it is on',
    node: mutate((c) => {
      c.itemListElement[1].name = 'FAQ'
      c.itemListElement[1].item = `${company.siteUrl}/faq/`
    }),
  },
]

describe('the breadcrumb validator catches what it exists for', () => {
  for (const { why, node } of BREADCRUMBS_THAT_MUST_BE_REJECTED) {
    it(`rejects ${why}`, () => {
      const problems = breadcrumbProblems(node, PRICING)
      expect(problems.length, `nothing was reported for: ${JSON.stringify(node)}`).toBeGreaterThan(0)
    })
  }

  it('accepts the trail the site actually publishes', () => {
    /*
     * The other half, and the half that makes the rejections mean something.
     * A validator that reported a problem for every input would pass every
     * test above while being useless — and it is the version somebody writes
     * when tightening a rule to catch one more fixture.
     */
    expect(breadcrumbProblems(goodCrumb, PRICING)).toEqual([])
  })

  it('is the same function that runs over dist/ (not a second copy)', () => {
    // The real /pricing block, parsed out of the build and put through the
    // same validator as the fixtures above. If these ever diverged, the
    // fixtures would be testing a function nothing uses.
    const page = pages.find((p) => p.route === '/pricing/')!
    const crumb = jsonLdBlocks(page.html)
      .map((raw) => JSON.parse(raw))
      .find((node) => node['@type'] === 'BreadcrumbList')
    expect(crumb, '/pricing ships no BreadcrumbList').toBeDefined()
    expect(breadcrumbProblems(crumb, selfUrlOf(page))).toEqual([])
  })
})

const goodFaq = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'How much does it cost?',
      acceptedAnswer: { '@type': 'Answer', text: 'It is itemised.' },
    },
  ],
}

const mutateFaq = (fn: (faq: any) => void) => {
  const copy = JSON.parse(JSON.stringify(goodFaq))
  fn(copy)
  return copy
}

const FAQS_THAT_MUST_BE_REJECTED: { why: string; node: unknown }[] = [
  { why: 'no mainEntity', node: mutateFaq((f) => delete f.mainEntity) },
  { why: 'an empty mainEntity', node: mutateFaq((f) => (f.mainEntity = [])) },
  { why: 'a question with no text', node: mutateFaq((f) => delete f.mainEntity[0].name) },
  {
    why: 'a question with no accepted answer',
    node: mutateFaq((f) => delete f.mainEntity[0].acceptedAnswer),
  },
  {
    why: 'an accepted answer with an empty body',
    node: mutateFaq((f) => (f.mainEntity[0].acceptedAnswer.text = '')),
  },
  {
    why: 'an entity that is not a Question',
    node: mutateFaq((f) => (f.mainEntity[0]['@type'] = 'Thing')),
  },
]

describe('the FAQPage validator catches what it exists for', () => {
  const visible = 'How much does it cost? It is itemised.'

  for (const { why, node } of FAQS_THAT_MUST_BE_REJECTED) {
    it(`rejects ${why}`, () => {
      expect(faqProblems(node, visible).length).toBeGreaterThan(0)
    })
  }

  it('rejects a question no reader can find on the page', () => {
    // Google requires marked-up Q&A to be visible. This is the failure a
    // schema built from a different entry set than the rendered list would
    // produce, and it is invisible to every other check in this repo.
    expect(faqProblems(goodFaq, 'A page about something else entirely.').length).toBeGreaterThan(0)
  })

  it('accepts a well-formed FAQPage whose questions are on the page', () => {
    expect(faqProblems(goodFaq, visible)).toEqual([])
  })
})

describe('the EmploymentAgency validator catches what it exists for', () => {
  const good = {
    '@context': 'https://schema.org',
    '@type': 'EmploymentAgency',
    name: company.name,
    url: company.siteUrl,
    telephone: company.phoneE164,
    address: {
      '@type': 'PostalAddress',
      streetAddress: company.address.street,
      addressLocality: company.address.locality,
      postalCode: company.address.postalCode,
      addressCountry: company.address.country,
    },
  }
  const mutateAgency = (fn: (a: any) => void) => {
    const copy = JSON.parse(JSON.stringify(good))
    fn(copy)
    return copy
  }

  it('accepts the schema the site publishes', () => {
    expect(agencyProblems(good)).toEqual([])
  })

  for (const { why, node } of [
    { why: 'no name', node: mutateAgency((a) => delete a.name) },
    { why: 'a relative url', node: mutateAgency((a) => (a.url = '/')) },
    { why: 'no telephone', node: mutateAgency((a) => delete a.telephone) },
    { why: 'no address', node: mutateAgency((a) => delete a.address) },
    {
      why: 'an address missing its postal code',
      node: mutateAgency((a) => delete a.address.postalCode),
    },
    {
      why: 'an address that is not a PostalAddress',
      node: mutateAgency((a) => (a.address['@type'] = 'Place')),
    },
  ]) {
    it(`rejects ${why}`, () => {
      expect(agencyProblems(node).length).toBeGreaterThan(0)
    })
  }
})

describe('the URL resolver is wired to the real build', () => {
  /*
   * `resolvesToBuiltPage` is what turns "absolute URL" into "URL that leads
   * somewhere", and it is the one part of the breadcrumb validator that
   * reads the filesystem. If it ever returned true for everything, five of
   * the rejections above would still pass — they fail on other grounds — but
   * a trail pointing at a deleted page would sail through.
   */
  it('resolves the pages that exist and refuses the ones that do not', () => {
    expect(resolvesToBuiltPage(`${company.siteUrl}/`)).toBe(true)
    expect(resolvesToBuiltPage(`${company.siteUrl}/pricing/`)).toBe(true)
    expect(resolvesToBuiltPage(`${company.siteUrl}/pricing`)).toBe(true)
    expect(resolvesToBuiltPage(`${company.siteUrl}/services/`)).toBe(false)
    expect(resolvesToBuiltPage(`${company.siteUrl}/prcing/`)).toBe(false)
    expect(resolvesToBuiltPage('https://example.com/pricing/')).toBe(false)
    expect(resolvesToBuiltPage('not a url')).toBe(false)
  })
})
