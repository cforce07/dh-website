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
// for the country name ("We work with helpers from X and match them to
// your family..."). Repeated boilerplate with one word swapped is the
// clearest generated-content tell on the page, and the section lede
// already says that sentence once. DirectHired has been asked for one
// distinguishing fact per source (implementation plan D-5); until those
// arrive, the block carries three names and no filler. Inventing a
// distinguishing fact — prior experience, languages, paperwork timelines —
// is a master brief §78 violation, not a copy exercise.
const helpers = defineCollection({
  type: 'content',
  schema: z.object({
    country: z.string(),
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
