import type { GlobalConfig } from 'payload'
import { anyone, ownerOnly } from '@/access/roles'

export const Settings: GlobalConfig = {
  slug: 'settings',
  access: { read: anyone, update: ownerOnly },
  admin: { description: 'Business details used across the whole site.' },
  fields: [
    { name: 'businessName', type: 'text', required: true, defaultValue: 'SuyaBuzz' },
    { name: 'tagline', type: 'text', defaultValue: 'Local Flavour, Global Buzz' },
    {
      name: 'address',
      type: 'group',
      fields: [
        { name: 'street', type: 'text', required: true },
        { name: 'city', type: 'text', required: true, defaultValue: 'Tustin' },
        { name: 'state', type: 'text', required: true, defaultValue: 'CA' },
        { name: 'postalCode', type: 'text', required: true },
      ],
    },
    {
      name: 'phone',
      type: 'text',
      required: true,
      admin: {
        description:
          'US number in E.164 format, e.g. +17145550123. The +234 number on the old site must not be reused.',
      },
    },
    { name: 'email', type: 'email', required: true },
    {
      name: 'whatsappNumber',
      type: 'text',
      admin: { description: 'Digits only, country code first, e.g. 17145550123' },
    },
    {
      name: 'openingHours',
      type: 'array',
      admin: { description: 'Pickup windows shown on the site.' },
      fields: [
        {
          name: 'day',
          type: 'select',
          required: true,
          options: ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'],
        },
        { name: 'opens', type: 'text', required: true, admin: { description: '24h, e.g. 16:00' } },
        { name: 'closes', type: 'text', required: true, admin: { description: '24h, e.g. 20:00' } },
      ],
    },
    {
      name: 'social',
      type: 'group',
      fields: [
        { name: 'instagram', type: 'text' },
        { name: 'facebook', type: 'text' },
        { name: 'tiktok', type: 'text' },
      ],
    },
    { name: 'mapEmbedUrl', type: 'text' },
    {
      name: 'orderingNotice',
      type: 'text',
      defaultValue: 'Online ordering is coming soon — call or WhatsApp us to pre-order.',
      admin: {
        description:
          'Shown site-wide until Phase 3 ships checkout. Clear this when online ordering goes live.',
      },
    },
  ],
}
