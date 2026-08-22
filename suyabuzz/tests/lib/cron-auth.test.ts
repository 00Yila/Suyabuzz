import { describe, expect, it } from 'vitest'
import { isAuthorizedCronRequest } from '@/lib/cron-auth'

const secret = 'a'.repeat(32)

describe('isAuthorizedCronRequest', () => {
  it('accepts the correct bearer token', () => {
    expect(isAuthorizedCronRequest(`Bearer ${secret}`, secret)).toBe(true)
  })

  it('rejects a missing header', () => {
    expect(isAuthorizedCronRequest(null, secret)).toBe(false)
  })

  it('rejects an empty header', () => {
    expect(isAuthorizedCronRequest('', secret)).toBe(false)
  })

  it('rejects the right secret with the wrong scheme', () => {
    expect(isAuthorizedCronRequest(secret, secret)).toBe(false)
  })

  it('rejects a wrong secret of equal length', () => {
    expect(isAuthorizedCronRequest(`Bearer ${'b'.repeat(32)}`, secret)).toBe(false)
  })

  it('rejects a wrong secret of different length without throwing', () => {
    expect(isAuthorizedCronRequest('Bearer short', secret)).toBe(false)
  })
})
