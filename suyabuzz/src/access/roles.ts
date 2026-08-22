import type { Access } from 'payload'

export type Role = 'owner' | 'staff' | 'customer'

export type MaybeUser = { role?: Role | null } | null | undefined

export const isOwner = (user: MaybeUser): boolean => user?.role === 'owner'

export const isStaff = (user: MaybeUser): boolean => user?.role === 'staff'

export const isOwnerOrStaff = (user: MaybeUser): boolean => isOwner(user) || isStaff(user)

export const ownerOnly: Access = ({ req }) => isOwner(req.user as MaybeUser)

export const ownerOrStaff: Access = ({ req }) => isOwnerOrStaff(req.user as MaybeUser)

export const anyone: Access = () => true
