import type { Block } from 'payload'

export const Testimonials: Block = {
  slug: 'testimonials',
  fields: [
    { name: 'heading', type: 'text' },
    {
      name: 'items',
      type: 'array',
      required: true,
      minRows: 1,
      fields: [
        { name: 'quote', type: 'textarea', required: true },
        { name: 'attribution', type: 'text', required: true },
      ],
    },
  ],
}
