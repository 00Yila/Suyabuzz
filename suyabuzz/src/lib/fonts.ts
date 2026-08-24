import { Fraunces, Karla } from 'next/font/google'

/**
 * Fraunces for display: an old-style variable serif with optical sizing and
 * genuine warmth — it carries the logo's hand-drawn character in a way that
 * Roboto Slab (the Elementor default) does not.
 */
export const display = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  axes: ['SOFT', 'WONK'],
})

/** Karla for body: a grotesque with quirk, highly legible at small sizes. */
export const body = Karla({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
})
