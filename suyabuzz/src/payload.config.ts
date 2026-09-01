import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Pages } from './collections/Pages'
import { ContactMessages } from './collections/ContactMessages'
import { Settings } from './globals/Settings'
import { env } from '@/lib/env'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Media, Pages, ContactMessages],
  globals: [Settings],
  editor: lexicalEditor(),
  secret: env().PAYLOAD_SECRET,
  // Payload's public origin — used to build absolute URLs (e.g. Media file
  // URLs, and email links if/when email sending is added). Verified against
  // `serverURL?: string` in node_modules/payload/dist/config/types.d.ts:1268.
  serverURL: env().NEXT_PUBLIC_SERVER_URL,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: env().DATABASE_URI,
    },
  }),
  sharp,
  plugins: [],
})
