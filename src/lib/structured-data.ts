import { company } from '../data/company'

/**
 * schema.org EmploymentAgency structured data for the homepage.
 *
 * Every value here is sourced from `company` — nothing is retyped.
 * `aggregateRating` is deliberately omitted: DirectHired has not supplied
 * a verified Google rating or review count, and fabricating one would be
 * both a §78 violation and a Google structured-data spam penalty.
 */
export function employmentAgencySchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'EmploymentAgency',
    name: company.name,
    description: company.legalDescription,
    telephone: company.phoneE164,
    email: company.email,
    url: company.siteUrl,
    address: {
      '@type': 'PostalAddress',
      streetAddress: company.address.street,
      addressLocality: company.address.locality,
      postalCode: company.address.postalCode,
      addressCountry: company.address.country,
    },
    areaServed: { '@type': 'Country', name: 'Singapore' },
    sameAs: [company.socials.facebook, company.socials.instagram],
    // aggregateRating deliberately omitted until verified.
  }
}

/**
 * One crumb below the site root. `path` is the route AS SERVED — leading
 * and trailing slash — because that is the string BaseLayout's canonical is
 * built from, and a breadcrumb whose URL disagrees with the canonical is
 * telling Google about a different page than the one it is on.
 */
export interface BreadcrumbStep {
  name: string
  path: string
}

/**
 * schema.org BreadcrumbList — core-pages design spec §4 ("per page: ...
 * `BreadcrumbList` ..."), foundation spec §242 ("`BreadcrumbList` on nested
 * pages").
 *
 * WHY A HELPER RATHER THAN AN OBJECT PER PAGE. Six pages need one. Six
 * literals would be six chances to number a position wrong, six chances to
 * write a relative URL, and six places to fix when the site gains a level.
 * This is also the file the never-retyped sweeps in tests/company.test.ts
 * read (see that file's "THE src/lib HOLE"), so a value hardcoded here is a
 * value nobody proofreads — every string below either arrives as an
 * argument or resolves from `company`.
 *
 * HOME IS PREPENDED, NEVER PASSED. Position 1 of every trail on this site is
 * the site root, and a caller that could supply it is a caller that could
 * forget it, misname it, or point it at the wrong host. The argument is the
 * trail BELOW the root, which today is one crumb on every page and will be
 * two when sub-project 3 ships /services/<slug>.
 *
 * ABSOLUTE URLS, AND THE SHAPE IS ENFORCED RATHER THAN ASSUMED. Google
 * resolves `item` without page context, so a root-relative path is not
 * enough. The two throws below fire at BUILD time: a malformed breadcrumb is
 * worse than none — markup that misdescribes a page's position is a
 * structured-data mismatch, and the penalty for one falls on the whole site
 * rather than on the page that carries it. Failing the build is the cheapest
 * possible moment to find out.
 */
export function breadcrumbSchema(trail: readonly BreadcrumbStep[]) {
  if (trail.length === 0) {
    throw new Error('breadcrumbSchema: the trail below the site root cannot be empty')
  }

  const steps: readonly BreadcrumbStep[] = [{ name: 'Home', path: '/' }, ...trail]

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: steps.map((step, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumbName(step),
      item: crumbUrl(step),
    })),
  }
}

function crumbName(step: BreadcrumbStep): string {
  const name = step.name.trim()
  if (!name) {
    throw new Error(`breadcrumbSchema: the crumb for "${step.path}" has no name`)
  }
  return name
}

function crumbUrl(step: BreadcrumbStep): string {
  // As-served form, matching BaseLayout's canonical exactly: leading slash,
  // trailing slash. Astro's default `directory` build format emits
  // <route>/index.html and writes the canonical with the trailing slash, so
  // a crumb without one names a URL that redirects.
  if (!step.path.startsWith('/') || !step.path.endsWith('/')) {
    throw new Error(
      `breadcrumbSchema: "${step.path}" is not a route as served — it needs a leading and a trailing slash`,
    )
  }
  return `${company.siteUrl}${step.path}`
}

export function faqPageSchema(items: readonly { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  }
}

/**
 * Converts a raw FAQ markdown body (Astro content collection `entry.body`)
 * into plain text suitable for `acceptedAnswer.text`. This is a light,
 * targeted cleanup for the specific markdown constructs actually used in
 * src/content/faq/*.md — links, bold emphasis, and `-`/numbered lists — not
 * a general-purpose markdown-to-text converter. It does not touch the
 * visible <Content /> rendering in Faq.astro at all.
 *
 * Paragraphs are joined with a space; if a paragraph/list block doesn't
 * already end in sentence punctuation, a period is appended before joining
 * so consecutive blocks don't run together mid-sentence (e.g. a list
 * introduced by "...covers:" followed by a new paragraph).
 */
export function markdownToPlainText(markdown: string): string {
  return markdown
    .trim()
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // [text](url) -> text
    .replace(/\*\*(.+?)\*\*/g, '$1') // **bold** -> bold
    .split(/\n\s*\n/) // blank-line-separated blocks (paragraphs / lists)
    .map((block) => {
      const joined = block
        .split('\n')
        .map((line) => line.replace(/^\s*(?:[-*]|\d+\.)\s+/, '').trim()) // strip list markers
        .filter(Boolean)
        .join('; ')
      return /[.!?:]$/.test(joined) ? joined : `${joined}.`
    })
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}
