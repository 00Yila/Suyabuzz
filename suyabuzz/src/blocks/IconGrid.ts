import type { Block } from 'payload'

export const IconGrid: Block = {
  slug: 'iconGrid',
  labels: { singular: 'Icon Grid', plural: 'Icon Grids' },
  fields: [
    { name: 'heading', type: 'text' },
    {
      name: 'items',
      type: 'array',
      minRows: 2,
      maxRows: 4,
      required: true,
      fields: [
        {
          name: 'icon',
          type: 'select',
          required: true,
          options: [
            { label: 'Clock', value: 'clock' },
            { label: 'Map pin', value: 'pin' },
            { label: 'Flame', value: 'flame' },
            { label: 'Bag', value: 'bag' },
          ],
        },
        { name: 'title', type: 'text', required: true },
        { name: 'body', type: 'textarea', required: true },
      ],
    },
  ],
}
