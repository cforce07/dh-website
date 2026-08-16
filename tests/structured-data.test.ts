import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  employmentAgencySchema,
  faqPageSchema,
  markdownToPlainText,
} from '../src/lib/structured-data'
import { company } from '../src/data/company'

describe('employmentAgencySchema', () => {
  const schema: any = employmentAgencySchema()

  it('declares the precise schema.org type', () => {
    expect(schema['@type']).toBe('EmploymentAgency')
  })

  it('carries the verified Singapore address, correctly typed', () => {
    expect(schema.address['@type']).toBe('PostalAddress')
    expect(schema.address.postalCode).toBe('730119')
    expect(schema.address.addressCountry).toBe('SG')
  })

  it('carries the official phone number', () => {
    expect(schema.telephone).toBe('+6598556637')
  })

  it('omits aggregateRating, which is unverified', () => {
    expect(schema.aggregateRating).toBeUndefined()
  })

  it('omits image, which the site does not have an honest one of', () => {
    // The counterpart of the aggregateRating assertion, and it exists for
    // the same reason: this is a deliberate omission with a written
    // justification (see the function's docblock), so it must fail loudly if
    // someone quietly wires up the share-card illustration instead of
    // waiting for a photograph. Delete this test in the commit that adds a
    // real image, not before.
    expect(schema.image).toBeUndefined()
    expect(schema.logo).toBeUndefined()
  })

  it('sources its URL from the single canonical siteUrl', () => {
    expect(schema.url).toBe(company.siteUrl)
  })

  it('states the area served from the address, not from a literal', () => {
    expect(schema.areaServed).toEqual({ '@type': 'Country', name: company.address.locality })
  })

  describe('openingHours', () => {
    /*
     * schema.org's grammar: one or more day tokens or day ranges, then a
     * time range on the 24-hour clock. Asserted rather than eyeballed
     * because nothing else in this repo would notice an unparseable value —
     * a malformed openingHours is not a build error, it is a field a crawler
     * silently discards, and the page goes on looking correct.
     *
     * This is the assertion the reviewer found missing: aggregateRating has
     * had an "is undefined" guard from the start and this had none at all,
     * so the invalid display string "24 hours" could have been emitted here
     * by a one-word edit with the whole suite green.
     */
    const DAY = '(?:Mo|Tu|We|Th|Fr|Sa|Su)'
    const MACHINE_FORM = new RegExp(
      `^${DAY}(?:-${DAY})?(?:,${DAY}(?:-${DAY})?)* \\d{2}:\\d{2}-\\d{2}:\\d{2}$`,
    )

    it('is published, not omitted', () => {
      // It was omitted, out of caution that turned out to be misplaced. If
      // it goes missing again this says so rather than passing on nothing.
      expect(schema.openingHours).toBeTypeOf('string')
    })

    it('parses as the machine form schema.org defines', () => {
      expect(schema.openingHours).toMatch(MACHINE_FORM)
    })

    it('is never the human display string', () => {
      // "24 hours" is what the footer and /contact print and it parses as
      // nothing. The two fields are different on purpose; this is what stops
      // them being collapsed back into one.
      expect(schema.openingHours).not.toBe(company.openingHours)
      expect(company.openingHours).not.toMatch(MACHINE_FORM)
    })

    it('says the same thing the display string says — open at every hour', () => {
      // The two fields are one fact in two notations, and nothing else
      // checks that they agree. A machine form of "Mo-Fr 09:00-18:00" beside
      // a display string of "24 hours" would publish two different opening
      // hours to two different readers, and only one of them can complain.
      expect(company.openingHours).toBe('24 hours')
      expect(schema.openingHours).toBe('Mo-Su 00:00-23:59')
    })
  })
})

describe('faqPageSchema', () => {
  it('maps questions to Question entities', () => {
    const schema: any = faqPageSchema([{ question: 'How much?', answer: 'It depends.' }])
    expect(schema['@type']).toBe('FAQPage')
    expect(schema.mainEntity[0]['@type']).toBe('Question')
    expect(schema.mainEntity[0].name).toBe('How much?')
    expect(schema.mainEntity[0].acceptedAnswer.text).toBe('It depends.')
  })
})

describe('markdownToPlainText', () => {
  it('strips bold emphasis', () => {
    expect(markdownToPlainText('The cost is **$1,640.10** total.')).toBe(
      'The cost is $1,640.10 total.',
    )
  })

  it('unwraps markdown links to their label text', () => {
    expect(markdownToPlainText('See our [Pricing](/pricing) page.')).toBe(
      'See our Pricing page.',
    )
  })

  it('flattens a bullet list into a semicolon-joined sentence', () => {
    const md = 'Covers:\n\n- Agent fees — $888\n- MOM — $70\n\nDone.'
    expect(markdownToPlainText(md)).toBe('Covers: Agent fees — $888; MOM — $70. Done.')
  })

  it('flattens a numbered list', () => {
    const md = 'Steps:\n\n1. First step\n2. Second step'
    expect(markdownToPlainText(md)).toBe('Steps: First step; Second step.')
  })
})

describe('robots.txt', () => {
  it('points the Sitemap directive at the canonical site URL', () => {
    const robots = readFileSync(join(process.cwd(), 'public', 'robots.txt'), 'utf8')
    const sitemapLine = robots.split('\n').find((line) => line.startsWith('Sitemap:'))
    expect(sitemapLine).toBeDefined()
    expect(sitemapLine!.replace('Sitemap:', '').trim().startsWith(company.siteUrl)).toBe(true)
  })
})
