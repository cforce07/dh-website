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
    url: 'https://www.directhired.com',
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
