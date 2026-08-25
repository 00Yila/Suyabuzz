// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { RenderBlocks } from '@/components/blocks/RenderBlocks'

describe('RenderBlocks', () => {
  it('renders a hero heading as a level-1 heading', () => {
    render(<RenderBlocks blocks={[{ blockType: 'hero', heading: 'Taste the Real Flavor of Naija' }]} />)
    expect(
      screen.getByRole('heading', { level: 1, name: 'Taste the Real Flavor of Naija' }),
    ).toBeInTheDocument()
  })

  it('renders a call to action as a link', () => {
    render(
      <RenderBlocks
        blocks={[{ blockType: 'cta', heading: 'Ready?', label: 'Call us', href: '/contact' }]}
      />,
    )
    expect(screen.getByRole('link', { name: 'Call us' })).toHaveAttribute('href', '/contact')
  })

  it('skips an unknown block type instead of throwing', () => {
    expect(() =>
      render(<RenderBlocks blocks={[{ blockType: 'notARealBlock' } as never]} />),
    ).not.toThrow()
  })

  it('renders nothing for an empty layout', () => {
    const { container } = render(<RenderBlocks blocks={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders rich text content as a level-2-less prose block without throwing', () => {
    expect(() =>
      render(
        <RenderBlocks
          blocks={[
            {
              blockType: 'richText',
              content: {
                root: {
                  type: 'root',
                  children: [],
                  direction: null,
                  format: '',
                  indent: 0,
                  version: 1,
                },
              },
            },
          ]}
        />,
      ),
    ).not.toThrow()
  })

  it('renders image + text with an image alt text and a level-2 heading', () => {
    render(
      <RenderBlocks
        blocks={[
          {
            blockType: 'imageText',
            heading: 'Grilled Fresh Daily',
            content: {
              root: {
                type: 'root',
                children: [],
                direction: null,
                format: '',
                indent: 0,
                version: 1,
              },
            },
            image: { url: '/media/suya.jpg', alt: 'Skewers of suya on a grill' },
          },
        ]}
      />,
    )
    expect(screen.getByRole('heading', { level: 2, name: 'Grilled Fresh Daily' })).toBeInTheDocument()
    expect(screen.getByAltText('Skewers of suya on a grill')).toBeInTheDocument()
  })

  it('renders icon grid items with their titles', () => {
    render(
      <RenderBlocks
        blocks={[
          {
            blockType: 'iconGrid',
            items: [
              { icon: 'clock', title: 'Fast pickup', body: 'Ready in 20 minutes' },
              { icon: 'pin', title: 'Find us', body: 'Two locations in town' },
            ],
          },
        ]}
      />,
    )
    expect(screen.getByText('Fast pickup')).toBeInTheDocument()
    expect(screen.getByText('Find us')).toBeInTheDocument()
  })

  it('renders FAQ items as disclosure widgets', () => {
    render(
      <RenderBlocks
        blocks={[{ blockType: 'faq', items: [{ question: 'When do orders close?', answer: null }] }]}
      />,
    )
    expect(screen.getByText('When do orders close?')).toBeInTheDocument()
    expect(screen.getByText('When do orders close?').closest('details')).toBeInTheDocument()
  })

  it('renders testimonials as blockquotes with a cite for attribution', () => {
    render(
      <RenderBlocks
        blocks={[
          {
            blockType: 'testimonials',
            items: [{ quote: 'Best suya in town.', attribution: 'Amaka O.' }],
          },
        ]}
      />,
    )
    expect(screen.getByText('Amaka O.').closest('blockquote')).toBeInTheDocument()
    expect(screen.getByText('Amaka O.').tagName).toBe('CITE')
  })
})
