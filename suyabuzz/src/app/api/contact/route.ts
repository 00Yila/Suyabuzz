import config from '@payload-config'
import { getPayload } from 'payload'
import { contactSchema } from '@/lib/contact-schema'
import { sendOwnerNotification } from '@/lib/email'

export async function POST(request: Request) {
  const parsed = contactSchema.safeParse(await request.json())

  if (!parsed.success) {
    return Response.json({ ok: false, errors: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  // `_website` is extracted only to exclude it from `message` before persisting.
  const { website: _website, ...message } = parsed.data

  const payload = await getPayload({ config })
  await payload.create({ collection: 'contact-messages', data: message, overrideAccess: true })

  try {
    await sendOwnerNotification(parsed.data)
  } catch (error) {
    // The message is already persisted and visible in the admin. A failed
    // notification must not tell the customer their enquiry was lost.
    console.error('Contact notification failed:', error)
  }

  return Response.json({ ok: true })
}
