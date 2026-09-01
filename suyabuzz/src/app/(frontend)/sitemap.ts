import config from '@payload-config'
import type { MetadataRoute } from 'next'
import { getPayload } from 'payload'
import { env } from '@/lib/env'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({ collection: 'pages', limit: 1000 })
  const base = env().NEXT_PUBLIC_SERVER_URL

  return docs.map((page) => ({
    url: page.slug === 'home' ? base : `${base}/${page.slug}`,
    lastModified: new Date(page.updatedAt),
    changeFrequency: 'weekly',
    priority: page.slug === 'home' ? 1 : 0.7,
  }))
}
