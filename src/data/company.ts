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

  // The registered entity the licence above is held in, and the company's
  // UEN. Both belong to /about, which master brief §45 requires to be about
  // the COMPANY rather than a personal-founder brand: together they name the
  // legal person a family is actually dealing with, and they appear nowhere
  // else on the site.
  //
  // MASTER BRIEF §70'S RULE FOR THE LICENCE NUMBER APPLIES TO BOTH OF THESE
  // WITH IT: never invent, modify, guess or substitute either value.
  //
  // BOTH ARE CLIENT-SUPPLIED FACTS. NEITHER IS INDEPENDENTLY VERIFIED, and
  // that distinction is the whole point of this paragraph. DirectHired
  // confirmed on 2026-08-16 (core-pages spec §2.6.8 and §2.6.9) that the
  // registered name is exactly `DIRECT HIRED PTE. LTD.` — full stops and
  // capitalisation as written — and that the UEN is `202240964Z`. They carry
  // the same authority as every other fact in spec §2: DirectHired's word,
  // no more and no less.
  //
  // VERIFICATION WAS ATTEMPTED AND IT FAILED, on 2026-08-16 and again on
  // 2026-08-15 for the name. A web search for the entity and for the UEN
  // returned nothing usable, and MOM's employment-agency directory is a
  // JavaScript application that cannot be fetched from this environment. An
  // earlier public search returned the UNPUNCTUATED form "Direct Hired Pte
  // Ltd" against licence 23C1443, which corroborates the words and says
  // nothing about the punctuation. Nobody in this repository has read either
  // value off a register.
  //
  // The UEN's FORMAT is consistent with the rest of this file — YYYY plus
  // five digits plus a check letter is the shape a local company
  // incorporated in 2022 gets, and foundedYear above is 2022. A format that
  // parses is not a registry entry that was read, and this note is not a
  // verification.
  registeredName: 'DIRECT HIRED PTE. LTD.',
  uen: '202240964Z',

  // The form is built but not yet wired to the production domain.
  // This is the ONLY definition of the destination. Repoint here at launch.
  requirementFormUrl: 'https://www.directhired.com/employer-requirement',

  whatsappMessage: "Hi DirectHired, I'm looking for a domestic helper and would like to know more.",

  socials: {
    facebook: 'https://www.facebook.com/directhired',
    instagram: 'https://www.instagram.com/directhired_sg',
  },
} as const
