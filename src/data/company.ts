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

  // TWO FIELDS, ONE FACT. `openingHours` is the DISPLAY string — what the
  // footer and /contact print, and DirectHired's own wording (master brief,
  // Opening Hours, line 345). `openingHoursMachine` is the same fact in the
  // form schema.org's `openingHours` property is defined to take, which is
  // the only form a search engine parses.
  //
  // "Mo-Su 00:00-23:59" IS THE DOCUMENTED WAY TO SAY 24/7, not an inference
  // and not a rounding. schema.org's openingHours grammar is a day range
  // plus a time range in 24-hour clock; a business that never closes is
  // written as every day, first minute to last. Nothing here is derived
  // from anything DirectHired did not say: they said the business is open
  // 24 hours, and this says the same thing in the other notation.
  //
  // THE DISPLAY STRING MUST NEVER BE EMITTED INTO THE SCHEMA. "24 hours"
  // parses as nothing at all — at best it is ignored, at worst it makes the
  // whole EmploymentAgency node suspect. tests/structured-data.test.ts
  // asserts the emitted value against the grammar AND asserts that it is not
  // this display string, which is the assertion `aggregateRating` has had
  // from the start and this had none of.
  openingHours: '24 hours',
  openingHoursMachine: 'Mo-Su 00:00-23:59',
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

  // THE STANDING OF THE PUBLISHED CREDENTIALS — one story, two pages.
  //
  // /about and /why-directhired both publish a block of the company's
  // particulars, and until 2026-08-17 they framed the same three values in
  // opposite directions. /about called them "DirectHired's particulars, as
  // the company gives them" — accurate, and slightly under-claiming for the
  // licence. /why-directhired headed its block "What you can check" and led
  // with "Everything above is a description of how we work. These three are
  // not." — a claim that all three are matters of record — and then
  // contradicted itself three rows later, where the licence note called
  // itself "the one fact on this page that does not rest on our word".
  //
  // THE TRUE STORY, and it is the same on both pages:
  //
  //   THE MOM LICENCE is the one published value a family can check without
  //   asking DirectHired. It is on the Ministry of Manpower's public
  //   register, and a public search returned it against the (unpunctuated)
  //   company name — see registeredName's note above.
  //
  //   EVERYTHING ELSE is DirectHired's word. The registered entity name and
  //   the UEN are client-supplied and verification of both was ATTEMPTED AND
  //   FAILED (spec §2.6.8, §2.6.9 — the note above records how). The founded
  //   year is theirs. The placement count is theirs and is registered
  //   nowhere at all.
  //
  // Both sentences are single-sourced HERE rather than written twice, because
  // written twice is exactly how the two pages came to disagree. Note what
  // `suppliedStanding` does NOT say: it does not say no register holds these
  // values. ACRA holds an entity name and a UEN; what this repository lacks
  // is a reading of them, which is a different claim and the only one we are
  // entitled to make.
  licenceStanding:
    'The Employment Agency licence DirectHired operates under, issued by the Ministry of Manpower and listed in its public register. It is the one value here you can check without asking us.',
  suppliedStanding: 'Every other value here is DirectHired’s own, published on the company’s word.',

  // THE FOUNDING STORY — master brief §35, VERBATIM.
  //
  // Core-pages design spec §3.4 requires this sentence verbatim and records
  // it as a DECISION TAKEN BY DEFAULT: DirectHired has not given us their own
  // account, so the brief's line ships meanwhile. Spec §9 lists "Founding
  // story in DirectHired's words" as an open input. It is going to be
  // replaced, by people who are not us, and that is the whole reason it lives
  // here rather than in three page templates.
  //
  // IT WAS HAND-TYPED TWICE AND PARAPHRASED ONCE. Until 2026-08-17 /about
  // (about.astro:151) and /why-directhired (why-directhired.astro:130) each
  // carried it as a separate hardcoded literal — correct in both, and correct
  // by coincidence — while src/sections/Difference.astro published
  // "…agencies focused on filling a vacancy, not finding the right PERSON"
  // against the mandated "…instead of finding the right FIT". Three copies of
  // a sentence a spec requires verbatim, one of them already wrong, and the
  // client's own words due to replace all three.
  //
  // MASTER BRIEF §70'S RULE APPLIES: never invent, modify, guess or
  // substitute it. tests/content.test.ts asserts that no template retypes it
  // — every surface must read this constant.
  foundingStory:
    'DirectHired was created after seeing families struggle with agencies that focused on filling vacancies instead of finding the right fit.',

  // THE REQUIREMENT FORM. This is the ONLY definition of the destination;
  // tests/links.test.ts forbids every other file in the codebase from writing
  // it as a literal, so all 46 calls to action follow this one line.
  //
  // SUPPLIED BY DIRECTHIRED 2026-08-17, replacing
  // 'https://www.directhired.com/employer-requirement', which 404'd. Every
  // CTA on the site pointed at that address from the day the site went live
  // until this line changed — the site was published and could not convert.
  //
  // WHAT WAS VERIFIED ABOUT THIS VALUE, before it was written here:
  //   - 200, with and without a trailing slash; `/app` is 200 too.
  //   - served `Server: AmazonS3` through the SAME CloudFront distribution as
  //     this marketing site.
  //   - it is a SEPARATE APPLICATION, not a page of this build: the served
  //     HTML is `<div id="root">` plus `<script defer src="/app/main_bundle
  //     .js">`, titled `Direct Hired`. This build produces no route under
  //     /app, which tests/links.test.ts asserts.
  //   - NO <form>, <input> or <select> in the served HTML — the form renders
  //     client-side from that bundle. Nothing here may assert form markup at
  //     that URL; it would fail against a page that works.
  //
  // SAME ORIGIN, WHICH IS A CHANGE OF FACT. Core-pages spec §2.6.5 recorded
  // DirectHired as saying the form "stays on their existing separate site",
  // and docs/OPEN-DECISIONS.md concluded from that that the primary
  // conversion path "leaves this domain" and could never be measured from
  // here. It is a separate APPLICATION but not a separate SITE: same host,
  // same distribution. Both documents are corrected.
  //
  // A LEGITIMATE FUTURE MOVE IS NOT OBSTRUCTED. tests/company.test.ts
  // deliberately asserts no host for this value — see the reasoning there.
  requirementFormUrl: 'https://www.directhired.com/app/requirements',

  whatsappMessage: "Hi DirectHired, I'm looking for a domestic helper and would like to know more.",

  socials: {
    facebook: 'https://www.facebook.com/directhired',
    instagram: 'https://www.instagram.com/directhired_sg',
  },
} as const
