import 'dotenv/config'
import config from '@payload-config'
import { getPayload } from 'payload'

// NOTE (Task 3 bootstrap, 2026-08-22): the live Neon database currently has two
// verification/bootstrap artifacts from the Task 3 rollout of this project:
//   - owner-bootstrap@suyabuzz.local (role: owner)
//   - customer-test@suyabuzz.local  (role: customer)
// These were created to prove the first-user bootstrap and access-control wiring
// end-to-end. They should be repointed to the real owner's email or deleted before
// real handover — do not leave them as the production owner account.

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
