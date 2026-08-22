import { env } from '@/lib/env'
import { isAuthorizedCronRequest } from '@/lib/cron-auth'

export const dynamic = 'force-dynamic'

/**
 * Scheduled job handlers. Later plans register real jobs here:
 * 'cutoff-reminder', 'run-sheet', 'pickup-reminder', 'stripe-reconcile'.
 * Phase 0 ships the authenticated entry point and one no-op job so the
 * Hostinger cron wiring can be verified before any job exists.
 */
export const CRON_JOBS: Record<string, () => Promise<void>> = {
  ping: async () => {},
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ job: string }> },
) {
  if (!isAuthorizedCronRequest(request.headers.get('authorization'), env().CRON_SECRET)) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { job } = await params
  // Object.hasOwn guards against inherited Object.prototype members
  // (e.g. /api/cron/toString, /api/cron/constructor) resolving to a
  // truthy, callable "handler" that isn't a real registered job.
  const handler = Object.hasOwn(CRON_JOBS, job) ? CRON_JOBS[job] : undefined

  if (!handler) {
    return Response.json({ error: 'unknown job', job }, { status: 404 })
  }

  await handler()
  return Response.json({ job, ranAt: new Date().toISOString() })
}
