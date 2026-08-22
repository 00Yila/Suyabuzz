import { afterAll, describe, expect, it, vi } from 'vitest'
import { GET } from '@/app/api/cron/[job]/route'

// `npm test` (vitest.config.ts) does not load .env, so env() would otherwise
// throw. Stub a complete, synthetic configuration so the route's internal
// env().CRON_SECRET call resolves deterministically, independent of any
// real .env on disk.
const secret = 'c'.repeat(32)

vi.stubEnv('DATABASE_URI', 'postgres://user:pass@host.example/db')
vi.stubEnv('PAYLOAD_SECRET', 'x'.repeat(32))
vi.stubEnv('NEXT_PUBLIC_SERVER_URL', 'https://example.com')
vi.stubEnv('CRON_SECRET', secret)

afterAll(() => {
  vi.unstubAllEnvs()
})

function request(path: string, headers: Record<string, string> = {}) {
  return new Request(`http://localhost${path}`, { headers })
}

describe('GET /api/cron/[job]', () => {
  it('rejects a request with no Authorization header', async () => {
    const response = await GET(request('/api/cron/ping'), {
      params: Promise.resolve({ job: 'ping' }),
    })

    expect(response.status).toBe(401)
  })

  it('runs a registered job and returns its result', async () => {
    const response = await GET(request('/api/cron/ping', { authorization: `Bearer ${secret}` }), {
      params: Promise.resolve({ job: 'ping' }),
    })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.job).toBe('ping')
    expect(typeof body.ranAt).toBe('string')
  })

  it('returns 404 for an unregistered job name', async () => {
    const response = await GET(request('/api/cron/nope', { authorization: `Bearer ${secret}` }), {
      params: Promise.resolve({ job: 'nope' }),
    })

    expect(response.status).toBe(404)
  })

  // Regression test: CRON_JOBS is a plain object, so a naive `CRON_JOBS[job]`
  // lookup resolves inherited Object.prototype members (toString,
  // constructor, valueOf, hasOwnProperty, ...) instead of `undefined`. Those
  // are truthy and callable, so an unguarded lookup would pass the `!handler`
  // check and return 200 with a fake job body instead of 404.
  it.each(['toString', 'constructor', 'valueOf', 'hasOwnProperty'])(
    'returns 404 for the inherited Object.prototype member "%s" instead of running it',
    async (job) => {
      const response = await GET(request(`/api/cron/${job}`, { authorization: `Bearer ${secret}` }), {
        params: Promise.resolve({ job }),
      })
      const body = await response.json()

      expect(response.status).toBe(404)
      expect(body).toEqual({ error: 'unknown job', job })
    },
  )
})
