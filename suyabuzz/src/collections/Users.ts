import type { CollectionConfig } from 'payload'
import { isOwner, isOwnerOrStaff, ownerOnly, type MaybeUser } from '@/access/roles'

export const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'name', 'role'],
  },
  access: {
    // Only owner and staff may open the admin panel at all.
    admin: ({ req }) => isOwnerOrStaff(req.user as MaybeUser),
    create: ownerOnly,
    delete: ownerOnly,
    read: ({ req }) => {
      if (isOwnerOrStaff(req.user as MaybeUser)) return true
      if (req.user) return { id: { equals: req.user.id } }
      return false
    },
    update: ({ req }) => {
      if (isOwner(req.user as MaybeUser)) return true
      if (req.user) return { id: { equals: req.user.id } }
      return false
    },
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'customer',
      options: [
        { label: 'Owner', value: 'owner' },
        { label: 'Staff', value: 'staff' },
        { label: 'Customer', value: 'customer' },
      ],
      // Only an owner may change anyone's role, including their own.
      access: { update: ({ req }) => isOwner(req.user as MaybeUser) },
    },
    { name: 'phone', type: 'text' },
    { name: 'marketingConsent', type: 'checkbox', defaultValue: false },
  ],
}
