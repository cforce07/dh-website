import { describe, it, expect } from 'vitest'
import { whatsappUrl, defaultWhatsappUrl } from '../src/lib/whatsapp'

describe('whatsappUrl', () => {
  it('strips non-digits from the E.164 number', () => {
    expect(whatsappUrl('+65 9855 6637', 'Hi')).toContain('https://wa.me/6598556637')
  })

  it('url-encodes the message', () => {
    expect(whatsappUrl('+6598556637', 'Hi there & thanks')).toContain(
      'text=Hi%20there%20%26%20thanks',
    )
  })

  it('rejects an empty number', () => {
    expect(() => whatsappUrl('', 'Hi')).toThrow(/phone number/)
  })
})

describe('defaultWhatsappUrl', () => {
  it('uses the official number and pre-filled message', () => {
    const url = defaultWhatsappUrl()
    expect(url).toContain('wa.me/6598556637')
    expect(url).toContain(encodeURIComponent('looking for a domestic helper'))
  })
})
