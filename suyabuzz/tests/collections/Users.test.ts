import { describe, expect, it } from 'vitest'
import type { AccessArgs, FieldAccessArgs, SelectField } from 'payload'
import { Users } from '@/collections/Users'

// These tests call the actual access-control closures wired into
// `Users.access` and the `role` field's own `access.update`, the way Payload
// itself invokes them — as `({ req }) => ...` where `req.user` carries the
// logged-in user (or is `null` for an anonymous/logged-out request). This is
// deliberately separate from tests/access/roles.test.ts, which only proves
// the underlying predicates are correct in isolation: a typo in Users.ts
// that wires the wrong predicate to the wrong gate would pass those tests
// undetected. These tests close that gap.

type FakeUser = { id: number; role: 'owner' | 'staff' | 'customer' } | null

const owner: FakeUser = { id: 1, role: 'owner' }
const staff: FakeUser = { id: 2, role: 'staff' }
const customer: FakeUser = { id: 3, role: 'customer' }

const collectionArgs = (user: FakeUser) => ({ req: { user } }) as unknown as AccessArgs
const fieldArgs = (user: FakeUser) => ({ req: { user } }) as unknown as FieldAccessArgs

const roleField = Users.fields.find(
  (field): field is SelectField => 'name' in field && field.name === 'role',
)

describe('Users.access.admin', () => {
  it('admits owner and staff', () => {
    expect(Users.access?.admin?.(collectionArgs(owner))).toBe(true)
    expect(Users.access?.admin?.(collectionArgs(staff))).toBe(true)
  })

  it('refuses a customer and an anonymous request', () => {
    expect(Users.access?.admin?.(collectionArgs(customer))).toBe(false)
    expect(Users.access?.admin?.(collectionArgs(null))).toBe(false)
  })
})

describe('Users.access.create', () => {
  it('is owner-only', () => {
    expect(Users.access?.create?.(collectionArgs(owner))).toBe(true)
    expect(Users.access?.create?.(collectionArgs(staff))).toBe(false)
    expect(Users.access?.create?.(collectionArgs(customer))).toBe(false)
    expect(Users.access?.create?.(collectionArgs(null))).toBe(false)
  })
})

describe('Users.access.delete', () => {
  it('is owner-only', () => {
    expect(Users.access?.delete?.(collectionArgs(owner))).toBe(true)
    expect(Users.access?.delete?.(collectionArgs(staff))).toBe(false)
    expect(Users.access?.delete?.(collectionArgs(customer))).toBe(false)
    expect(Users.access?.delete?.(collectionArgs(null))).toBe(false)
  })
})

describe('Users.access.read', () => {
  it('grants owner and staff unrestricted read', () => {
    expect(Users.access?.read?.(collectionArgs(owner))).toBe(true)
    expect(Users.access?.read?.(collectionArgs(staff))).toBe(true)
  })

  it('scopes a customer to their own record instead of true/false', () => {
    expect(Users.access?.read?.(collectionArgs(customer))).toEqual({
      id: { equals: customer!.id },
    })
  })

  it('refuses an anonymous request', () => {
    expect(Users.access?.read?.(collectionArgs(null))).toBe(false)
  })
})

describe('Users.access.update', () => {
  it('grants owner unrestricted update', () => {
    expect(Users.access?.update?.(collectionArgs(owner))).toBe(true)
  })

  it('scopes staff and customer to their own record instead of true/false', () => {
    expect(Users.access?.update?.(collectionArgs(staff))).toEqual({
      id: { equals: staff!.id },
    })
    expect(Users.access?.update?.(collectionArgs(customer))).toEqual({
      id: { equals: customer!.id },
    })
  })

  it('refuses an anonymous request', () => {
    expect(Users.access?.update?.(collectionArgs(null))).toBe(false)
  })
})

describe("the role field's own access.update", () => {
  it('is defined on the role field', () => {
    expect(roleField).toBeDefined()
    expect(roleField?.access?.update).toBeTypeOf('function')
  })

  it('only an owner may change role — staff cannot self-promote', () => {
    expect(roleField?.access?.update?.(fieldArgs(owner))).toBe(true)
    expect(roleField?.access?.update?.(fieldArgs(staff))).toBe(false)
    expect(roleField?.access?.update?.(fieldArgs(customer))).toBe(false)
    expect(roleField?.access?.update?.(fieldArgs(null))).toBe(false)
  })
})
