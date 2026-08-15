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

  it('sources its URL from the single canonical siteUrl', () => {
    expect(schema.url).toBe(company.siteUrl)
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
