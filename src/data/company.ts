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
  placementCount: '1,000+',

  // The form is built but not yet wired to the production domain.
  // This is the ONLY definition of the destination. Repoint here at launch.
  requirementFormUrl: 'https://www.directhired.com/employer-requirement',

  whatsappMessage: "Hi DirectHired, I'm looking for a domestic helper and would like to know more.",

  socials: {
    facebook: 'https://www.facebook.com/directhired',
    instagram: 'https://www.instagram.com/directhired_sg',
  },
} as const
