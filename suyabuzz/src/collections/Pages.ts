import type { CollectionConfig } from 'payload'
import { anyone, ownerOrStaff, ownerOnly } from '@/access/roles'
import { Cta } from '@/blocks/Cta'
import { Faq } from '@/blocks/Faq'
import { Hero } from '@/blocks/Hero'
import { IconGrid } from '@/blocks/IconGrid'
import { ImageText } from '@/blocks/ImageText'
import { RichText } from '@/blocks/RichText'
import { Testimonials } from '@/blocks/Testimonials'

export const Pages: CollectionConfig = {
  slug: 'pages',
  access: { read: anyone, create: ownerOrStaff, update: ownerOrStaff, delete: ownerOnly },
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'slug', 'updatedAt'] },
  fields: [
    { name: 'title', type: 'text', required: true },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { description: 'URL path without slashes. Use "home" for the front page.' },
    },
    {
      name: 'layout',
      type: 'blocks',
      required: true,
      blocks: [Hero, RichText, ImageText, IconGrid, Faq, Cta, Testimonials],
    },
    {
      name: 'meta',
      type: 'group',
      fields: [
        { name: 'title', type: 'text' },
        { name: 'description', type: 'textarea' },
        { name: 'image', type: 'upload', relationTo: 'media' },
      ],
    },
  ],
}
