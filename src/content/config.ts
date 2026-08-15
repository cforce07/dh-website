import { defineCollection, z } from 'astro:content'

// NOTE on `slug`: Astro's legacy `type: 'content'` collections treat the
// frontmatter key `slug` as reserved. It is stripped from `data` before Zod
// validation and used to set the entry's `.slug` directly instead
// (declaring `slug` inside a `type: 'content'` schema throws
// ContentSchemaContainsSlugError). Every services/helpers markdown file still
// sets `slug:` in its frontmatter — Astro reads it as the custom slug
// override — but the schemas below intentionally omit it. Consumers should
// read `entry.slug`, not `entry.data.slug`.

const services = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    summary: z.string().max(160),
    order: z.number(),
  }),
})

// `flag` and `summary` were both removed on 2026-08-16; both removals are
// deliberate and neither should be restored without the reason below being
// answered first.
//
// `flag` held a regional-indicator emoji pair (🇮🇩 / 🇲🇲 / 🇮🇳). Chrome and
// Edge on Windows ship no emoji-flag glyphs, so on the most common desktop
// OS the three cards rendered as the bare letters "ID", "MM" and "IN" at
// 32px in Fraunces — a block whose entire visual vocabulary was three
// glyphs, showing three grey letter-pairs, and invisible to anyone
// reviewing on a Mac. "IN" was worse than broken: Mizoram is a state of
// India, and both the master brief (§13) and tests/content.test.ts forbid
// this site labelling it as India. Replacing the emoji with SVG national
// flags was considered and rejected (implementation plan R-6) — a
// "Mizoram" card carrying India's flag in crisp vector is the same error
// at higher fidelity.
//
// `summary` held one sentence per source, identical across all three but
// for the source name ("We work with helpers from X and match them to
// your family..."). Repeated boilerplate with one word swapped is the
// clearest generated-content tell on the page, and the section lede
// already says that sentence once.
//
// The field is gone for good, and this is now a settled question rather
// than an open one. DirectHired was asked for one distinguishing fact per
// source (implementation plan D-5) and answered on 2026-08-16: there is no
// real difference. Same service, same package, same matching process; the
// source is the only variable. So there is no fact to wait for, and the
// three summaries could never have been written truthfully.
//
// HelperSources.astro states that equivalence once, above the three names,
// instead — which is the whole of what is true. Do not reintroduce this
// field. Writing three different sentences means asserting something about
// each source that nobody here knows, which is a master brief §78
// violation, and asserting it about a nationality is a §42 one.
//
// The display field is `source`, NOT `country`. Two of the three sources
// are countries and the third, Mizoram, is a state of India — the exact
// error the deleted `flag` field made in emoji, restated in a field name
// and then in every sentence built from it. `source` is true of all three
// and stays true of a fourth, and it is the word the block, its CSS and
// the FAQ all use. tests/content.test.ts asserts the rendered copy never
// calls the set "countries".
const helpers = defineCollection({
  type: 'content',
  schema: z.object({
    source: z.string(),
    order: z.number(),
  }),
})

const faq = defineCollection({
  type: 'content',
  schema: z.object({
    question: z.string(),
    surfaces: z.array(z.enum(['home', 'faq', 'pricing'])),
    order: z.number(),
  }),
})

// Task 14: two gated collections backing the conditional homepage blocks
// (MeetHelpers, Reviews). Master brief §78 forbids inventing helper
// profiles or reviews, so both start empty (see the .gitkeep files under
// src/content/helper-profiles and src/content/reviews) and stay empty
// until DirectHired supplies verified data. The blocks that consume them
// guard on `.length > 0` and render nothing at all when empty — see
// src/sections/MeetHelpers.astro and Reviews.astro.
const helperProfiles = defineCollection({
  type: 'content',
  schema: z.object({
    name: z.string(),
    nationality: z.string(),
    placementType: z.enum(['new', 'transfer']),
    skills: z.array(z.string()),
    experienceYears: z.number(),
  }),
})

const reviews = defineCollection({
  type: 'content',
  schema: z.object({
    author: z.string(),
    // .int(): Reviews.astro renders stars via '★'.repeat(rating) /
    // '☆'.repeat(5 - rating). String.prototype.repeat coerces its argument
    // with ToIntegerOrInfinity, so a non-integer (e.g. 4.5) would silently
    // render a star count that disagrees with the aria-label built from the
    // same value — a sighted/screen-reader mismatch. Real Google ratings
    // are integers; enforcing it here catches a malformed entry at content
    // build time instead of at render time.
    rating: z.number().min(1).max(5).int(),
    source: z.literal('google'),
    // .date(): plain z.string() accepted anything, and Reviews.astro sorts
    // entries with `new Date(data.date).getTime()`, which is NaN on a
    // malformed string and produces unstable ordering rather than a build
    // error. Requiring ISO 8601 (YYYY-MM-DD) here means a bad date fails
    // fast at content parsing, before it ever reaches the sort.
    date: z.string().date(),
  }),
})

// Keys must match the content directory names exactly — Astro resolves
// getCollection('helper-profiles') against the key below, not the
// variable name `helperProfiles`.
export const collections = {
  services,
  helpers,
  faq,
  'helper-profiles': helperProfiles,
  reviews,
}
