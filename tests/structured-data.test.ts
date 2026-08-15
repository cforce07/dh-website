import { describe, it, expect } from 'vitest'
import { employmentAgencySchema, faqPageSchema } from '../src/lib/structured-data'

describe('employmentAgencySchema', () => {
  const schema: any = employmentAgencySchema()

  it('declares the precise schema.org type', () => {
    expect(schema['@type']).toBe('EmploymentAgency')
  })

  it('carries the verified Singapore address', () => {
    expect(schema.address.postalCode).toBe('730119')
    expect(schema.address.addressCountry).toBe('SG')
  })

  it('carries the official phone number', () => {
    expect(schema.telephone).toBe('+6598556637')
  })

  it('omits aggregateRating, which is unverified', () => {
    expect(schema.aggregateRating).toBeUndefined()
  })
})

describe('faqPageSchema', () => {
  it('maps questions to Question entities', () => {
    const schema: any = faqPageSchema([{ question: 'How much?', answer: 'It depends.' }])
    expect(schema['@type']).toBe('FAQPage')
    expect(schema.mainEntity[0]['@type']).toBe('Question')
    expect(schema.mainEntity[0].acceptedAnswer.text).toBe('It depends.')
  })
})
