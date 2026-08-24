export const tokens = {
  color: {
    yellow: '#FFCD05',
    ink: '#0A0500',
    ember: '#FF5733',
    surface: '#F7F4F0',
    charcoal: '#2B2320',
    cream: '#FFFDF7',
    white: '#FFFFFF',
  },
} as const

export type ColorName = keyof typeof tokens.color

/**
 * Every foreground/background combination the design system permits, with the
 * WCAG level it must clear. 4.5 = AA body text. 3 = AA large text and UI.
 * Adding a pair here without meeting its ratio fails the build.
 */
export const APPROVED_PAIRS: ReadonlyArray<{
  fg: ColorName
  bg: ColorName
  minRatio: number
}> = [
  { fg: 'ink', bg: 'white', minRatio: 4.5 },
  { fg: 'ink', bg: 'cream', minRatio: 4.5 },
  { fg: 'ink', bg: 'surface', minRatio: 4.5 },
  { fg: 'ink', bg: 'yellow', minRatio: 4.5 },
  { fg: 'ink', bg: 'ember', minRatio: 4.5 },
  { fg: 'white', bg: 'charcoal', minRatio: 4.5 },
  { fg: 'white', bg: 'ink', minRatio: 4.5 },
  { fg: 'yellow', bg: 'charcoal', minRatio: 3 },
  { fg: 'yellow', bg: 'ink', minRatio: 3 },
]
