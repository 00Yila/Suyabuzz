import config from '@payload-config'
import type { Metadata } from 'next'
import { getPayload } from 'payload'
import { ContactForm } from '@/components/ContactForm'
import { env } from '@/lib/env'
import { buildMetadata } from '@/lib/seo'

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: 'Contact Us',
    description:
      'Questions about pickup orders, catering, or anything else? Get in touch with SuyaBuzz.',
    path: '/contact',
    siteUrl: env().NEXT_PUBLIC_SERVER_URL,
    siteName: 'SuyaBuzz',
  })
}

export default async function ContactPage() {
  const payload = await getPayload({ config })
  const settings = await payload.findGlobal({ slug: 'settings' })

  return (
    <section className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="font-display text-4xl md:text-5xl">Get in touch</h1>
      <p className="mt-4 text-lg text-charcoal">
        Questions about pickup orders, catering, or anything else? Send us a message and we will
        get back to you.
      </p>
      <div className="mt-10">
        <ContactForm phone={settings.phone} whatsappNumber={settings.whatsappNumber ?? undefined} />
      </div>
    </section>
  )
}
