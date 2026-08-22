import config from '@payload-config'
import { getPayload } from 'payload'
import { env } from '@/lib/env'

export const dynamic = 'force-dynamic'

export async function GET() {
  const startedAt = Date.now()

  try {
    const payload = await getPayload({ config })
    // Counting through Payload's own query path proves the adapter, the pool
    // and the credentials all work — not just that a TCP socket opened.
    await payload.count({ collection: 'users' })

    return Response.json({
      status: 'ok',
      database: 'connected',
      timezone: env().SHOP_TIMEZONE,
      latencyMs: Date.now() - startedAt,
    })
  } catch (error) {
    return Response.json(
      {
        status: 'error',
        database: 'unreachable',
        message: error instanceof Error ? error.message : 'unknown error',
      },
      { status: 503 },
    )
  }
}
