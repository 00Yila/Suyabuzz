import { describe, expect, it } from 'vitest'
import { buildMetadata, buildRestaurantJsonLd } from '@/lib/seo'

const site = { siteUrl: 'https://suyabuzz.com', siteName: 'SuyaBuzz' }

describe('buildMetadata', () => {
  it('builds an absolute canonical URL', () => {
    const meta = buildMetadata({ ...site, title: 'About', description: 'Our story', path: '/about' })
    expect(meta.alternates?.canonical).toBe('https://suyabuzz.com/about')
  })

  it('does not double the slash on the home path', () => {
    const meta = buildMetadata({ ...site, title: 'Home', description: 'x', path: '/' })
    expect(meta.alternates?.canonical).toBe('https://suyabuzz.com')
  })

  it('sets Open Graph title, description and url', () => {
    const meta = buildMetadata({ ...site, title: 'About', description: 'Our story', path: '/about' })
    expect(meta.openGraph?.title).toBe('About')
    expect(meta.openGraph?.description).toBe('Our story')
  })

  it('omits the image entirely when none is supplied', () => {
    const meta = buildMetadata({ ...site, title: 'A', description: 'B', path: '/a' })
    expect(meta.openGraph?.images).toBeUndefined()
  })
})

describe('buildRestaurantJsonLd', () => {
  const input = {
    name: 'SuyaBuzz',
    description: 'Nigerian street food in Tustin',
    url: 'https://suyabuzz.com',
    telephone: '+17145550123',
    address: { street: '123 Example St', city: 'Tustin', state: 'CA', postalCode: '92780' },
    openingHours: [{ day: 'friday', opens: '16:00', closes: '20:00' }],
    servesCuisine: 'Nigerian',
  }

  it('declares the Restaurant type', () => {
    const ld = buildRestaurantJsonLd(input)
    expect(ld['@context']).toBe('https://schema.org')
    expect(ld['@type']).toBe('Restaurant')
  })

  it('nests a PostalAddress with the country', () => {
    const ld = buildRestaurantJsonLd(input) as any
    expect(ld.address['@type']).toBe('PostalAddress')
    expect(ld.address.addressLocality).toBe('Tustin')
    expect(ld.address.addressCountry).toBe('US')
  })

  it('converts opening hours to schema.org format', () => {
    const ld = buildRestaurantJsonLd(input) as any
    expect(ld.openingHours).toEqual(['Fr 16:00-20:00'])
  })

  it('advertises takeaway and not delivery', () => {
    const ld = buildRestaurantJsonLd(input) as any
    expect(ld.hasDeliveryMethod).toContain('http://purl.org/goodrelations/v1#PickUp')
    expect(ld.hasDeliveryMethod).not.toContain('http://purl.org/goodrelations/v1#DeliveryModeOwnFleet')
  })
})
