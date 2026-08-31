'use client'

import Link from 'next/link'
import { useId, useState } from 'react'

export type NavLink = { label: string; href: string }

// A single <nav aria-label="Main"> serves both breakpoints: on mobile it is
// toggled open/closed by the button below (via the `hidden`/`flex` classes),
// while `md:flex` forces it visible at the desktop breakpoint regardless of
// toggle state. This keeps exactly one nav landmark in the document instead
// of duplicating the link list for each viewport.
export function MobileNav({ links }: { links: NavLink[] }) {
  const [open, setOpen] = useState(false)
  const navId = useId()

  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={navId}
        aria-label={open ? 'Close menu' : 'Open menu'}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-md text-ink md:hidden"
      >
        <span aria-hidden="true" className="text-2xl leading-none">
          {open ? '✕' : '☰'}
        </span>
      </button>

      <nav
        id={navId}
        aria-label="Main"
        className={`${open ? 'flex' : 'hidden'} absolute inset-x-0 top-full z-30 flex-col gap-1 border-t border-ink/10 bg-cream px-6 py-4 shadow-md md:static md:z-auto md:flex md:w-auto md:flex-row md:items-center md:gap-6 md:border-none md:bg-transparent md:p-0 md:shadow-none`}
      >
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            onClick={() => setOpen(false)}
            className="font-body font-bold text-ink"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </>
  )
}
