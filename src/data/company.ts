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
  // Revised from "1,000+" to "500+" by DirectHired on 2026-08-15, after MOM's
  // public directory showed 128 FDW work passes approved in the 12 months to
  // 09 Aug 2026 and 3 years of agency experience.
  //
  // NOT YET EVIDENCED. MOM's figure counts only new FDW work passes in a
  // rolling 12-month window, so it excludes transfers, replacements and
  // direct-hire processing — a higher cumulative total is plausible. But a
  // naive 3-year extrapolation of MOM's number is ~384, and master brief §68
  // forbids fabricated company statistics. Confirm what this figure counts
  // and over what period before publication, or remove it.
  placementCount: '500+',

  // MOM Employment Agency licence, supplied by DirectHired on 2026-08-15.
  // Master brief §70: never invent, modify, guess or substitute this value,
  // and verify it against the official MOM source before publication.
  momLicence: '23C1443',

  // The form is built but not yet wired to the production domain.
  // This is the ONLY definition of the destination. Repoint here at launch.
  requirementFormUrl: 'https://www.directhired.com/employer-requirement',

  whatsappMessage: "Hi DirectHired, I'm looking for a domestic helper and would like to know more.",

  socials: {
    facebook: 'https://www.facebook.com/directhired',
    instagram: 'https://www.instagram.com/directhired_sg',
  },
} as const
