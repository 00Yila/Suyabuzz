'use client' // Error boundaries must be Client Components — required by Next.js 16 for global-error.tsx.

import { useEffect } from 'react'

// This is the ONLY boundary that can catch a failure thrown by the root
// layout itself (src/app/(frontend)/layout.tsx fetches Settings on every
// request; a database outage would otherwise take down every page with
// Next's generic, unstyled crash screen). A route-level error.tsx cannot
// catch this, because error.tsx does not wrap the layout above it in the
// same segment — see node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md.
//
// Per that same doc (Next.js 16.3.0, the version pinned in package.json):
// the stable recovery callback is now `retry` (`unstable_retry` before
// 16.2, stable in 16.3), not the older `reset`. `reset()` still exists but
// the docs say to prefer `retry()` unless you specifically want to skip
// re-fetching. This project's AGENTS.md flags exactly this kind of
// version drift, so `retry` — not `reset` — is used below.
//
// This file replaces the entire root layout when it activates, so it must
// render its own complete <html>/<body> and cannot import styles.css, the
// brand fonts, or Settings (fetching Settings again here could fail the
// same way). Colors are inlined from src/styles/tokens.ts's literal hex
// values since Tailwind's generated utility classes aren't guaranteed to
// reach this standalone document either.
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  useEffect(() => {
    // Only surviving diagnostic once the root layout itself has crashed.
    console.error(error)
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          display: 'flex',
          minHeight: '100vh',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          padding: '2rem',
          textAlign: 'center',
          backgroundColor: '#FFFDF7',
          color: '#0A0500',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Something went wrong</h1>
        <p style={{ margin: 0, maxWidth: '32rem' }}>
          Please try again in a moment. If this keeps happening, please check back shortly.
        </p>
        <button
          type="button"
          onClick={() => retry()}
          style={{
            marginTop: '0.5rem',
            borderRadius: '9999px',
            border: 'none',
            backgroundColor: '#FFCD05',
            color: '#0A0500',
            fontWeight: 700,
            padding: '0.75rem 1.5rem',
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </body>
    </html>
  )
}
