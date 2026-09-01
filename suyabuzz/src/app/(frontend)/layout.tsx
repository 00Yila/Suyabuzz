import React from 'react'
import config from '@payload-config'
import { getPayload } from 'payload'
import { body, display } from '@/lib/fonts'
import { SkipLink } from '@/components/layout/SkipLink'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { WhatsAppButton } from '@/components/layout/WhatsAppButton'
import { JsonLd } from '@/components/JsonLd'
import { env } from '@/lib/env'
import { buildRestaurantJsonLd } from '@/lib/seo'
import './styles.css'

export const metadata = {
  description: 'Nigerian street food, pre-order for weekend pickup in Tustin, CA.',
  title: 'SuyaBuzz',
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props

  const payload = await getPayload({ config })
  const settings = await payload.findGlobal({ slug: 'settings' })

  // Settings has no standalone business "description" — `tagline` is a
  // marketing slogan ("Local Flavour, Global Buzz"), not a factual summary
  // suited to a Restaurant's JSON-LD `description`. Reuse the same static
  // description already used for the site's <meta name="description">
  // above, so the two stay consistent.
  const restaurantJsonLd = buildRestaurantJsonLd({
    name: settings.businessName,
    description: metadata.description,
    url: env().NEXT_PUBLIC_SERVER_URL,
    telephone: settings.phone,
    address: settings.address,
    openingHours: settings.openingHours ?? [],
    servesCuisine: 'Nigerian',
  })

  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        <JsonLd data={restaurantJsonLd} />
        <SkipLink />
        <Header settings={settings} />
        {/*
          tabIndex={-1}: <main> isn't natively focusable, and this browser's
          fragment-navigation focus algorithm falls back to <body> for
          non-focusable targets (confirmed by hand: after activating
          SkipLink, document.activeElement was <body>, not #main, with only
          `id="main"` present). tabIndex={-1} makes it a valid, non-tabbable
          focus target so the skip link's href="#main" actually moves focus
          here, not just the scroll position.
        */}
        <main id="main" tabIndex={-1}>
          {children}
        </main>
        <Footer settings={settings} />
        <WhatsAppButton
          number={settings.whatsappNumber ?? ''}
          message="Hi SuyaBuzz! I'd like to pre-order."
        />
      </body>
    </html>
  )
}
