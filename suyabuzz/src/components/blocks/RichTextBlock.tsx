import { RichText } from '@payloadcms/richtext-lexical/react'
import type { SerializedEditorState } from 'lexical'

export type RichTextProps = {
  content: SerializedEditorState
}

export function RichTextBlock({ content }: RichTextProps) {
  return (
    <section className="bg-cream px-6 py-16 text-ink">
      <div className="prose mx-auto max-w-2xl">
        <RichText data={content} />
      </div>
    </section>
  )
}
