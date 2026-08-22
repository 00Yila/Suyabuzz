import { describe, expect, it } from 'vitest'
import { parseEnv } from '@/lib/env'

const valid = {
  DATABASE_URI: 'postgres://user:pass@host.neon.tech/db?sslmode=require',
  PAYLOAD_SECRET: 'x'.repeat(32),
  NEXT_PUBLIC_SERVER_URL: 'https://suyabuzz.com',
  CRON_SECRET: 'y'.repeat(32),
}

describe('parseEnv', () => {
  it('accepts a complete configuration', () => {
    const result = parseEnv(valid)
    expect(result.DATABASE_URI).toBe(valid.DATABASE_URI)
  })

  it('defaults the shop timezone to America/Los_Angeles', () => {
    expect(parseEnv(valid).SHOP_TIMEZONE).toBe('America/Los_Angeles')
  })

  it('rejects a short PAYLOAD_SECRET', () => {
    const raw = { ...valid, PAYLOAD_SECRET: 'too-short' }
    expect(() => parseEnv(raw)).toThrow(/PAYLOAD_SECRET/)
  })

  it('rejects a missing DATABASE_URI', () => {
    const { DATABASE_URI: _omitted, ...raw } = valid
    expect(() => parseEnv(raw)).toThrow(/DATABASE_URI/)
  })

  it('names every invalid key in one error', () => {
    const raw = { NEXT_PUBLIC_SERVER_URL: 'not-a-url' }
    try {
      parseEnv(raw)
      throw new Error('should have thrown')
    } catch (error) {
      const message = (error as Error).message
      expect(message).toContain('DATABASE_URI')
      expect(message).toContain('PAYLOAD_SECRET')
      expect(message).toContain('CRON_SECRET')
    }
  })
})
