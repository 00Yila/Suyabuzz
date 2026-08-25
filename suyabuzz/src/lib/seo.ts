import type { Metadata } from 'next'
import { toSchemaOrgHours, type OpeningHour } from '@/lib/hours'

export type MetadataInput = {
  title: string
  description: string
  path: string
  image?: string
  siteUrl: string
  siteName: string
}

export function buildMetadata({
  title, description, path, image, siteUrl, siteName,
}: MetadataInput): Metadata {
  const canonical = path === '/' ? siteUrl : `${siteUrl}${path}`

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName,
      type: 'website',
      ...(image ? { images: [{ url: image }] } : {}),
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      description,
    },
  }
}

export type RestaurantInput = {
  name: string
  description: string
  url: string
  telephone: string
  address: { street: string; city: string; state: string; postalCode: string }
  openingHours: OpeningHour[]
  servesCuisine: string
  image?: string
}

export function buildRestaurantJsonLd(input: RestaurantInput): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: input.name,
    description: input.description,
    url: input.url,
    telephone: input.telephone,
    servesCuisine: input.servesCuisine,
    ...(input.image ? { image: input.image } : {}),
    address: {
      '@type': 'PostalAddress',
      streetAddress: input.address.street,
      addressLocality: input.address.city,
      addressRegion: input.address.state,
      postalCode: input.address.postalCode,
      addressCountry: 'US',
    },
    openingHours: toSchemaOrgHours(input.openingHours),
    // Pickup only. Delivery is explicitly out of scope (spec section 3).
    hasDeliveryMethod: ['http://purl.org/goodrelations/v1#PickUp'],
  }
}
