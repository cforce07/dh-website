import { describe, it, expect } from 'vitest'
import { company } from '../src/data/company'

describe('company data', () => {
  it('carries the verified contact details', () => {
    expect(company.phoneE164).toBe('+6598556637')
    expect(company.phoneDisplay).toBe('+65 9855 6637')
    expect(company.email).toBe('hello@directhired.com')
    expect(company.address.postalCode).toBe('730119')
    expect(company.openingHours).toBe('24 hours')
  })

  it('carries the confirmed company facts', () => {
    expect(company.foundedYear).toBe(2022)
    expect(company.placementCount).toBe('1,000+')
  })

  it('exposes exactly one requirement-form URL', () => {
    expect(company.requirementFormUrl).toMatch(/^https?:\/\//)
  })

  it('links the official social profiles', () => {
    expect(company.socials.facebook).toBe('https://www.facebook.com/directhired')
    expect(company.socials.instagram).toBe('https://www.instagram.com/directhired_sg')
  })
})
