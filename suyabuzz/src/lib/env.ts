import { z } from 'zod'

const schema = z.object({
  DATABASE_URI: z.string().min(1, 'is required'),
  PAYLOAD_SECRET: z.string().min(32, 'must be at least 32 characters'),
  NEXT_PUBLIC_SERVER_URL: z.url('must be a valid URL'),
  CRON_SECRET: z.string().min(32, 'must be at least 32 characters'),
  SHOP_TIMEZONE: z.string().default('America/Los_Angeles'),
  // Optional: the contact form persists to the database and works without
  // these. When unset, sendOwnerNotification() skips the email and warns
  // instead of throwing — see src/lib/email.ts.
  RESEND_API_KEY: z.string().optional(),
  OWNER_NOTIFICATION_EMAIL: z.string().email('must be a valid email address').optional(),
})

export type Env = z.infer<typeof schema>

export function parseEnv(raw: Record<string, string | undefined> = process.env): Env {
  const result = schema.safeParse(raw)
  if (result.success) return result.data

  const issues = result.error.issues
    .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
    .join('\n')
  throw new Error(`Invalid environment configuration:\n${issues}`)
}

let cached: Env | null = null

export function env(): Env {
  if (cached === null) cached = parseEnv()
  return cached
}
