export const company = {
  name: 'DirectHired',
  legalDescription: 'Singapore-based domestic helper agency',

  // The single source of truth for the production domain. astro.config.mjs,
  // src/lib/structured-data.ts, and public/robots.txt (verified by a test,
  // since a static .txt file cannot import this) all derive from this value
  // rather than repeating the literal.
  siteUrl: 'https://www.directhired.com',

  phoneE164: '+6598556637',
  phoneDisplay: '+65 9855 6637',
  email: 'hello@directhired.com',

  address: {
    street: '119 Marsiling Rise #04-130',
    locality: 'Singapore',
    postalCode: '730119',
    country: 'SG',
  },

  openingHours: '24 hours',
  foundedYear: 2022,
  // BASIS, confirmed by DirectHired on 2026-08-15:
  //   "500+ placements across all services since 2022."
  //
  // Revised down from "1,000+" after MOM's public directory (licence 23C1443)
  // showed 128 FDW work passes approved in the 12 months to 09 Aug 2026,
  // against 3 years of agency experience. Those figures are not in conflict:
  // MOM counts only NEW FDW work passes in a rolling 12-month window, so it
  // excludes transfers, replacements and direct-hire processing, which this
  // cumulative all-services figure includes.
  //
  // Anyone revising this must revise the basis with it — a number without a
  // stated period and scope is exactly what master brief §68 forbids.
  placementCount: '500+',

  // MOM Employment Agency licence, supplied by DirectHired on 2026-08-15.
  // Master brief §70: never invent, modify, guess or substitute this value,
  // and verify it against the official MOM source before publication.
  momLicence: '23C1443',

  // The registered entity the licence above is held in — supplied with that
  // licence for /about, which master brief §45 requires to be about the
  // COMPANY rather than a personal-founder brand. It is the one credential
  // on that page that names the legal person a family is actually dealing
  // with, and it appears nowhere else on the site.
  //
  // MASTER BRIEF §70'S RULE FOR THE LICENCE NUMBER APPLIES TO THIS WITH IT:
  // never invent, modify, guess or substitute it, and verify it against the
  // official MOM source before publication. Half-verified today — a public
  // search returns "Direct Hired Pte Ltd" against licence 23C1443, which
  // corroborates the NAME, but MOM's own directory entry was not reachable
  // from this environment, so the exact registered FORM (capitalisation, and
  // the two full stops) rests on the value as supplied. DirectHired is asked
  // to confirm it in docs/OPEN-DECISIONS.md.
  //
  // No UEN. Nobody has supplied one, and a company registration number is
  // not a thing to derive from a licence number.
  registeredName: 'DIRECT HIRED PTE. LTD.',

  // The form is built but not yet wired to the production domain.
  // This is the ONLY definition of the destination. Repoint here at launch.
  requirementFormUrl: 'https://www.directhired.com/employer-requirement',

  whatsappMessage: "Hi DirectHired, I'm looking for a domestic helper and would like to know more.",

  socials: {
    facebook: 'https://www.facebook.com/directhired',
    instagram: 'https://www.instagram.com/directhired_sg',
  },
} as const
