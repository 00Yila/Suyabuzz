import { getPayload } from 'payload'
import config from '../../src/payload.config.js'

/**
 * Fixed (not per-run-random) password for the e2e-only seed account. It only
 * needs to be non-guessable, not randomly generated — e2e test code needs a
 * known constant to log in with. Replaces the scaffold's original 4-character
 * 'test', which was safe on its own but became a live-database security
 * exposure once this seed started granting `role: 'owner'` (see the Phase 0
 * final review, finding I1) against this project's only database.
 */
const E2E_SEED_PASSWORD = 'e2e-seed-Kx9mQ2p7-not-a-real-account'

/**
 * SAFETY GUARD (Phase 0 final review, finding I1): this project has exactly
 * one database — the live Neon instance `DATABASE_URI` points at. There is
 * no separate test/staging database. Seeding creates a role-`owner` account
 * with a known password in that live database, and `npm run test:e2e` is
 * not gated by CI (see finding I4), so it can only be triggered by a human
 * running it directly, or by some future CI misconfiguration. Requiring an
 * explicit opt-in means an accidental `npm run test:e2e` fails loudly, at
 * module load, instead of silently mutating the live database. This runs at
 * import time (not inside a function) so it fires before any hook or test
 * body executes.
 */
if (process.env.E2E_ALLOW_LIVE_DB !== '1') {
  throw new Error(
    'Refusing to seed/clean up e2e test data: this project has no database ' +
      'other than the live Neon instance configured by DATABASE_URI. Set ' +
      'E2E_ALLOW_LIVE_DB=1 to explicitly opt in, e.g.\n' +
      '  E2E_ALLOW_LIVE_DB=1 npm run test:e2e',
  )
}

export const testUser = {
  email: 'dev@payloadcms.com',
  password: E2E_SEED_PASSWORD,
  name: 'Test User',
  role: 'owner' as const,
}

/**
 * Seeds a test user for e2e admin tests.
 */
export async function seedTestUser(): Promise<void> {
  const payload = await getPayload({ config })

  // Delete any existing seed user first. This is not just tidiness — if a
  // previous e2e run crashed or was killed (Ctrl-C, CI cancellation) before
  // its `afterAll` fired, the seeded owner account can still be sitting in
  // the live database. Deleting by this seed's specific, fixed email before
  // creating keeps this idempotent: a crashed prior run can never leave two
  // stale accounts around, or block this run's create on a unique-email
  // conflict. `payload.delete` with a `where` clause that matches zero
  // documents is a no-op, not an error, so this is safe on a clean run too.
  await payload.delete({
    collection: 'users',
    where: {
      email: {
        equals: testUser.email,
      },
    },
  })

  // Create fresh test user
  await payload.create({
    collection: 'users',
    data: testUser,
  })
}

/**
 * Cleans up test user after tests. Kept as `afterAll` cleanup for the happy
 * path — the pre-create delete in `seedTestUser` above is defense in depth
 * for the crash/interrupt case, not a replacement for this.
 */
export async function cleanupTestUser(): Promise<void> {
  const payload = await getPayload({ config })

  await payload.delete({
    collection: 'users',
    where: {
      email: {
        equals: testUser.email,
      },
    },
  })
}
