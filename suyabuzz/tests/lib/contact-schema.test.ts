import { describe, expect, it } from 'vitest'
import { contactSchema } from '@/lib/contact-schema'

const valid = { name: 'Ada', email: 'ada@example.com', message: 'Do you cater weddings?', website: '' }

describe('contactSchema', () => {
  it('accepts a valid submission', () => {
    expect(contactSchema.safeParse(valid).success).toBe(true)
  })

  it('rejects a malformed email', () => {
    expect(contactSchema.safeParse({ ...valid, email: 'nope' }).success).toBe(false)
  })

  it('rejects an empty name', () => {
    expect(contactSchema.safeParse({ ...valid, name: '' }).success).toBe(false)
  })

  it('rejects a message under 10 characters', () => {
    expect(contactSchema.safeParse({ ...valid, message: 'hi' }).success).toBe(false)
  })

  it('rejects a filled honeypot as spam', () => {
    expect(contactSchema.safeParse({ ...valid, website: 'http://spam.example' }).success).toBe(false)
  })

  it('treats phone as optional', () => {
    const { phone, ...withoutPhone } = { ...valid, phone: undefined }
    expect(contactSchema.safeParse(withoutPhone).success).toBe(true)
  })
})
