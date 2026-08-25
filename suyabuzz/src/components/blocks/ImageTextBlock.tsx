import { RichText } from '@payloadcms/richtext-lexical/react'
import type { SerializedEditorState } from 'lexical'
import Image from 'next/image'

export type ImageTextImage = {
  url: string
  alt: string
  width?: number | null
  height?: number | null
}

export type ImageTextProps = {
  heading: string
  content: SerializedEditorState
  image: ImageTextImage
  imagePosition?: 'left' | 'right'
}

export function ImageTextBlock({ heading, content, image, imagePosition = 'right' }: ImageTextProps) {
  const media = (
    <div className="relative aspect-[4/3] w-full flex-1 overflow-hidden rounded-2xl">
      <Image
        src={image.url}
        alt={image.alt}
        fill
        sizes="(min-width: 768px) 50vw, 100vw"
        className="object-cover"
      />
    </div>
  )

  const copy = (
    <div className="flex-1">
      <h2 className="font-display text-3xl md:text-4xl">{heading}</h2>
      <div className="prose mt-4">
        <RichText data={content} />
      </div>
    </div>
  )

  return (
    <section className="bg-surface px-6 py-16 text-ink">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 md:flex-row md:items-center">
        {imagePosition === 'left' ? (
          <>
            {media}
            {copy}
          </>
        ) : (
          <>
            {copy}
            {media}
          </>
        )}
      </div>
    </section>
  )
}
