import { RichText } from '@payloadcms/richtext-lexical/react'
import type { SerializedEditorState } from 'lexical'

// Task 6's `faq.items[].answer` field is `type: 'richText'` — a Lexical
// serialized editor state, not a plain string. We hand it directly to
// Payload's own `RichText` React renderer (`@payloadcms/richtext-lexical/react`)
// rather than writing a bespoke Lexical-to-HTML converter here. That
// component already tolerates `null`/`undefined`/malformed data by
// rendering nothing, so a missing or not-yet-populated answer never throws.
export type FaqItem = {
  question: string
  answer?: SerializedEditorState | null
}

export type FaqProps = {
  heading?: string
  items: FaqItem[]
}

export function FaqBlock({ heading, items }: FaqProps) {
  return (
    <section className="bg-white px-6 py-16 text-ink">
      <div className="mx-auto max-w-2xl">
        {heading ? <h2 className="font-display text-3xl md:text-4xl">{heading}</h2> : null}
        <div className="mt-8 divide-y divide-ink/10">
          {items.map((item) => (
            <details key={item.question} className="group py-4">
              <summary className="cursor-pointer list-none font-body font-bold marker:content-none">
                {item.question}
              </summary>
              <div className="prose mt-3 text-ink/90">
                {item.answer ? <RichText data={item.answer} /> : null}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
