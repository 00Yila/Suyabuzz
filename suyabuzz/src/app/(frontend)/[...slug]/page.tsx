import config from '@payload-config'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import { RenderBlocks } from '@/components/blocks/RenderBlocks'
import { env } from '@/lib/env'
import { slugFromSegments } from '@/lib/pages'
import { buildMetadata } from '@/lib/seo'

type Params = { params: Promise<{ slug?: string[] }> }

// Exported so `src/app/(frontend)/page.tsx` (the `/` route) can reuse the
// same Payload lookup for the `home` slug instead of duplicating the query.
export async function findPage(slug: string) {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'pages',
    where: { slug: { equals: slug } },
    limit: 1,
  })
  return docs[0] ?? null
}

export async function generateStaticParams() {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({ collection: 'pages', limit: 100 })
  return docs
    .filter((page) => page.slug !== 'home')
    .map((page) => ({ slug: page.slug.split('/') }))
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params
  const page = await findPage(slugFromSegments(slug))
  if (!page) return { title: 'Page not found' }

  return buildMetadata({
    title: page.meta?.title || page.title,
    description: page.meta?.description || '',
    path: page.slug === 'home' ? '/' : `/${page.slug}`,
    siteUrl: env().NEXT_PUBLIC_SERVER_URL,
    siteName: 'SuyaBuzz',
  })
}

export default async function Page({ params }: Params) {
  const { slug } = await params
  const page = await findPage(slugFromSegments(slug))
  if (!page) notFound()

  return <RenderBlocks blocks={page.layout as never} />
}
