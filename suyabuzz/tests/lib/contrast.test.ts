import { describe, expect, it } from 'vitest'
import { contrastRatio, relativeLuminance } from '@/lib/contrast'

describe('relativeLuminance', () => {
  it('returns 1 for white and 0 for black', () => {
    expect(relativeLuminance('#FFFFFF')).toBeCloseTo(1, 5)
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 5)
  })

  it('accepts shorthand hex', () => {
    expect(relativeLuminance('#fff')).toBeCloseTo(1, 5)
  })

  it('rejects malformed input', () => {
    expect(() => relativeLuminance('cornflower')).toThrow(/hex/i)
  })
})

describe('contrastRatio', () => {
  it('returns 21 for black on white', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 1)
  })

  it('is order-independent', () => {
    expect(contrastRatio('#0A0500', '#FFCD05')).toBeCloseTo(
      contrastRatio('#FFCD05', '#0A0500'),
      5,
    )
  })
})
