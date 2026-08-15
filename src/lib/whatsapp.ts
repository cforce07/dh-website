import { company } from '../data/company'

export function whatsappUrl(phoneE164: string, message: string): string {
  const digits = phoneE164.replace(/\D/g, '')
  if (digits.length === 0) {
    throw new Error('whatsappUrl requires a phone number')
  }
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}

export function defaultWhatsappUrl(): string {
  return whatsappUrl(company.phoneE164, company.whatsappMessage)
}
