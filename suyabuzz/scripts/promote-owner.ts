import config from '@payload-config'
import { getPayload } from 'payload'

const email = process.argv[2]

if (!email) {
  console.error('Usage: npx tsx scripts/promote-owner.ts <email>')
  process.exit(1)
}

const payload = await getPayload({ config })

const { docs } = await payload.find({
  collection: 'users',
  where: { email: { equals: email } },
  limit: 1,
  overrideAccess: true,
})

if (!docs[0]) {
  console.error(`No user found with email ${email}`)
  process.exit(1)
}

await payload.update({
  collection: 'users',
  id: docs[0].id,
  data: { role: 'owner' },
  overrideAccess: true,
})

console.log(`Promoted ${email} to owner`)
process.exit(0)
