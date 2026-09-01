import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { RenderBlocks } from '@/components/blocks/RenderBlocks'
import { env } from '@/lib/env'
import { slugFromSegments } from '@/lib/pages'
import { buildMetadata } from '@/lib/seo'
import { findPage } from './[...slug]/page'

export async function generateMetadata(): Promise<Metadata> {
  const page = await findPage(slugFromSegments(undefined))
  if (!page) return { title: 'Page not found' }

  return buildMetadata({
    title: page.meta?.title || page.title,
    description: page.meta?.description || '',
    path: page.slug === 'home' ? '/' : `/${page.slug}`,
    siteUrl: env().NEXT_PUBLIC_SERVER_URL,
    siteName: 'SuyaBuzz',
  })
}

export default async function HomePage() {
  const page = await findPage(slugFromSegments(undefined))
  if (!page) notFound()

  return <RenderBlocks blocks={page.layout as never} />
}
