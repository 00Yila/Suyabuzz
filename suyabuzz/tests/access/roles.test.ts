import { describe, expect, it } from 'vitest'
import { isOwner, isOwnerOrStaff, isStaff } from '@/access/roles'

const owner = { role: 'owner' as const }
const staff = { role: 'staff' as const }
const customer = { role: 'customer' as const }

describe('role predicates', () => {
  it('identifies an owner', () => {
    expect(isOwner(owner)).toBe(true)
    expect(isOwner(staff)).toBe(false)
    expect(isOwner(customer)).toBe(false)
  })

  it('identifies staff', () => {
    expect(isStaff(staff)).toBe(true)
    expect(isStaff(owner)).toBe(false)
  })

  it('treats owner and staff together', () => {
    expect(isOwnerOrStaff(owner)).toBe(true)
    expect(isOwnerOrStaff(staff)).toBe(true)
    expect(isOwnerOrStaff(customer)).toBe(false)
  })

  it('denies anonymous users', () => {
    expect(isOwner(null)).toBe(false)
    expect(isOwner(undefined)).toBe(false)
    expect(isOwnerOrStaff(null)).toBe(false)
  })

  it('denies a customer admin access (spec BR: staff cannot change prices, customers see no admin)', () => {
    expect(isOwnerOrStaff(customer)).toBe(false)
  })
})
