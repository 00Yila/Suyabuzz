import { describe, expect, it } from 'vitest'
import { formatHours, formatTime, toSchemaOrgHours } from '@/lib/hours'

describe('formatTime', () => {
  it('formats whole hours without minutes', () => {
    expect(formatTime('16:00')).toBe('4pm')
    expect(formatTime('09:00')).toBe('9am')
  })

  it('formats half hours with minutes', () => {
    expect(formatTime('16:30')).toBe('4:30pm')
  })

  it('handles noon and midnight correctly', () => {
    expect(formatTime('12:00')).toBe('12pm')
    expect(formatTime('00:00')).toBe('12am')
  })

  it('rejects malformed input', () => {
    expect(() => formatTime('25:00')).toThrow(/time/i)
    expect(() => formatTime('4pm')).toThrow(/time/i)
  })
})

describe('formatHours', () => {
  it('renders a readable line per day', () => {
    expect(
      formatHours([
        { day: 'friday', opens: '16:00', closes: '20:00' },
        { day: 'saturday', opens: '12:00', closes: '20:00' },
      ]),
    ).toEqual(['Friday 4pm – 8pm', 'Saturday 12pm – 8pm'])
  })

  it('returns an empty list for no hours', () => {
    expect(formatHours([])).toEqual([])
  })
})

describe('toSchemaOrgHours', () => {
  it('emits schema.org day abbreviations', () => {
    expect(
      toSchemaOrgHours([{ day: 'friday', opens: '16:00', closes: '20:00' }]),
    ).toEqual(['Fr 16:00-20:00'])
  })
})
