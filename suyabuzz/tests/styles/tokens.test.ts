import { describe, expect, it } from 'vitest'
import { contrastRatio } from '@/lib/contrast'
import { APPROVED_PAIRS, tokens } from '@/styles/tokens'

describe('brand palette', () => {
  it('exposes every brand colour as a 6-digit hex', () => {
    for (const [name, value] of Object.entries(tokens.color)) {
      expect(value, `${name} must be 6-digit hex`).toMatch(/^#[0-9A-Fa-f]{6}$/)
    }
  })
})

describe('approved colour pairs', () => {
  it.each(APPROVED_PAIRS)('$fg on $bg meets $minRatio:1', ({ fg, bg, minRatio }) => {
    expect(contrastRatio(tokens.color[fg], tokens.color[bg])).toBeGreaterThanOrEqual(minRatio)
  })
})

describe('forbidden combinations (spec: yellow is a fill, never text)', () => {
  it('yellow on white fails AA and must never be used for text', () => {
    expect(contrastRatio(tokens.color.yellow, tokens.color.white)).toBeLessThan(4.5)
  })

  it('white on ember fails AA for body copy', () => {
    expect(contrastRatio(tokens.color.white, tokens.color.ember)).toBeLessThan(4.5)
  })

  it('ink on ember passes AA, so ember buttons carry ink text', () => {
    expect(contrastRatio(tokens.color.ink, tokens.color.ember)).toBeGreaterThanOrEqual(4.5)
  })
})
