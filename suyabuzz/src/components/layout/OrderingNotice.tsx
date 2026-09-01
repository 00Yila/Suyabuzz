'use client'

import { useState } from 'react'

// Renders `settings.orderingNotice` as a dismissible banner. The message
// itself always comes from the caller (Header, sourced from Settings) — this
// component only owns the show/hide interaction, never the copy.
export function OrderingNotice({ message }: { message: string }) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  return (
    <div role="status" className="bg-yellow px-4 py-2 text-sm font-bold text-ink">
      <div className="mx-auto flex max-w-6xl items-center justify-center gap-3">
        <p>{message}</p>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss notice"
          className="flex h-11 w-11 shrink-0 items-center justify-center text-ink/70"
        >
          <span aria-hidden="true">✕</span>
        </button>
      </div>
    </div>
  )
}
