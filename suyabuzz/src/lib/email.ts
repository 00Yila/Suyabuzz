import { Resend } from 'resend'
import { env } from '@/lib/env'
import type { ContactInput } from '@/lib/contact-schema'

export async function sendOwnerNotification(input: ContactInput): Promise<void> {
  const apiKey = env().RESEND_API_KEY
  const to = env().OWNER_NOTIFICATION_EMAIL

  if (!apiKey || !to) {
    console.warn(
      'Resend not configured (RESEND_API_KEY/OWNER_NOTIFICATION_EMAIL unset) — skipping owner notification email.',
    )
    return
  }

  const resend = new Resend(apiKey)

  await resend.emails.send({
    from: 'SuyaBuzz Website <website@suyabuzz.com>',
    to,
    replyTo: input.email,
    subject: `New enquiry from ${input.name}`,
    text: [
      `Name: ${input.name}`,
      `Email: ${input.email}`,
      `Phone: ${input.phone ?? 'not given'}`,
      '',
      input.message,
    ].join('\n'),
  })
}
