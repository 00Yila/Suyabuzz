import { describe, expect, it } from 'vitest'
import { slugFromSegments } from '@/lib/pages'

describe('slugFromSegments', () => {
  it('maps the site root to the home slug', () => {
    expect(slugFromSegments(undefined)).toBe('home')
    expect(slugFromSegments([])).toBe('home')
  })

  it('returns a single segment unchanged', () => {
    expect(slugFromSegments(['about'])).toBe('about')
  })

  it('joins nested segments with a slash', () => {
    expect(slugFromSegments(['legal', 'privacy'])).toBe('legal/privacy')
  })
})
