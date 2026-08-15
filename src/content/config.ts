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

const helpers = defineCollection({
  type: 'content',
  schema: z.object({
    country: z.string(),
    flag: z.string(),
    summary: z.string().max(200),
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

// Task 14 adds more collections here (e.g. helper profiles). Each collection
// is defined the same way — `defineCollection` + a Zod schema — so adding one
// is an additive edit: declare it above, then add it to the exported map below.
export const collections = { services, helpers, faq }
