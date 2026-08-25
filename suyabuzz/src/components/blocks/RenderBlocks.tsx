import type { ComponentType } from 'react'
import { CtaBlock, type CtaProps } from './CtaBlock'
import { FaqBlock, type FaqProps } from './FaqBlock'
import { HeroBlock, type HeroProps } from './HeroBlock'
import { IconGridBlock, type IconGridProps } from './IconGridBlock'
import { ImageTextBlock, type ImageTextProps } from './ImageTextBlock'
import { RichTextBlock, type RichTextProps } from './RichTextBlock'
import { TestimonialsBlock, type TestimonialsProps } from './TestimonialsBlock'

export type Block =
  | ({ blockType: 'hero' } & HeroProps)
  | ({ blockType: 'richText' } & RichTextProps)
  | ({ blockType: 'imageText' } & ImageTextProps)
  | ({ blockType: 'iconGrid' } & IconGridProps)
  | ({ blockType: 'faq' } & FaqProps)
  | ({ blockType: 'cta' } & CtaProps)
  | ({ blockType: 'testimonials' } & TestimonialsProps)

// Keyed by Task 6's block slugs. Values are intentionally `any`-typed: each
// component has a different, incompatible props shape, and this map renders
// whichever one matches `block.blockType` at runtime — there is no way to
// express that correspondence statically without erasing the per-block prop
// types the components above rely on.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const COMPONENTS: Record<string, ComponentType<any>> = {
  hero: HeroBlock,
  richText: RichTextBlock,
  imageText: ImageTextBlock,
  iconGrid: IconGridBlock,
  faq: FaqBlock,
  cta: CtaBlock,
  testimonials: TestimonialsBlock,
}

export function RenderBlocks({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((block, index) => {
        const Component = COMPONENTS[block.blockType]
        if (!Component) return null
        const key = `${block.blockType}-${index}`
        return <Component key={key} {...block} />
      })}
    </>
  )
}
