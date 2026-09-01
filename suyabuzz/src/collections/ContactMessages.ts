import type { CollectionConfig } from 'payload'
import { ownerOnly, ownerOrStaff } from '@/access/roles'

export const ContactMessages: CollectionConfig = {
  slug: 'contact-messages',
  labels: { singular: 'Contact Message', plural: 'Contact Messages' },
  access: {
    // Created only by the API route, which uses overrideAccess.
    create: () => false,
    read: ownerOrStaff,
    update: ownerOrStaff,
    delete: ownerOnly,
  },
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'email', 'status', 'createdAt'] },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'email', type: 'email', required: true },
    { name: 'phone', type: 'text' },
    { name: 'message', type: 'textarea', required: true },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'new',
      options: [
        { label: 'New', value: 'new' },
        { label: 'Replied', value: 'replied' },
        { label: 'Closed', value: 'closed' },
      ],
    },
  ],
}
