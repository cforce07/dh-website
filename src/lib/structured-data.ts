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
