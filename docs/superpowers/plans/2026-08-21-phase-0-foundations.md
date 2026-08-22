# SuyaBuzz Phase 0 — Foundations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy a running Next.js + Payload CMS application to Hostinger, backed by Neon Postgres, with roles, media uploads, a health endpoint, cron authentication and CI — proving the entire deployment path before any business logic is written.

**Architecture:** A single Next.js 16 App Router application with Payload CMS 3 embedded at `/admin`, sharing one process, one deploy and one Postgres database. Access control lives in pure, unit-tested functions that Payload's `access` hooks call, so authorisation rules are testable without a database. Environment configuration is validated at startup and fails fast.

**Tech Stack:** Next.js 16, TypeScript, Payload CMS 3, PostgreSQL (Neon), Vitest, npm, Node 22 LTS, GitHub Actions, Hostinger Business Node.js hosting.

**Spec:** `docs/superpowers/specs/2026-08-21-suyabuzz-ordering-site-design.md`

## Global Constraints

These apply to every task in this plan and every subsequent plan.

- **Node version:** 22 LTS. Pinned in `.nvmrc` and `package.json` `engines`. Hostinger offers 18/20/22/24; Payload 3 requires >=20.9.0.
- **Package manager:** **npm**, not pnpm or yarn. Hostinger's auto-build runs `npm install`; using a different manager risks a lockfile the host cannot honour. This is a deliberate trade of local ergonomics for deployment reliability.
- **Database:** PostgreSQL only. Hostinger's bundled MySQL cannot be used — Payload has no MySQL adapter.
- **Shop timezone:** `America/Los_Angeles`. Never implicit, never read from the browser for business logic.
- **Timestamps:** stored as UTC `timestamptz`, rendered in shop time.
- **Currency:** USD.
- **Roles:** exactly `owner`, `staff`, `customer`. `staff` must never be able to modify prices, products or settings.
- **Brand colours:** yellow `#FFCD05`, near-black `#0A0500`, accent `#FF5733`, background accent `#F5F5F5`.
- **Accessibility:** `#FFCD05` is a fill colour with near-black text on it. It is never a text colour on a light background (fails WCAG AA at ~1.5:1).
- **Secrets:** never committed. `.env` is git-ignored; `.env.example` documents every key with a dummy value.

---

## File Structure

| Path | Responsibility |
|---|---|
| `src/payload.config.ts` | Payload root config: database adapter, collections, globals, admin settings |
| `src/lib/env.ts` | Zod-validated environment parsing; fails fast with a readable error |
| `src/lib/cron-auth.ts` | Constant-time shared-secret check for scheduled job routes |
| `src/access/roles.ts` | Pure role predicates and Payload `Access` wrappers — the authorisation contract |
| `src/collections/Users.ts` | Auth collection with roles and admin-panel gating |
| `src/collections/Media.ts` | Uploads to persistent disk, WebP derivatives, required alt text |
| `src/app/api/health/route.ts` | Liveness + database reachability probe |
| `src/app/api/cron/[job]/route.ts` | Authenticated entry point for scheduled work |
| `tests/**` | Vitest unit tests mirroring `src/` |
| `.github/workflows/ci.yml` | Lint, typecheck, test, build |
| `docs/DEPLOYMENT.md` | Hostinger setup steps and verification checklist |

---

## Task 1: Scaffold the project and prove the test harness

**Files:**
- Create: entire project skeleton via `create-payload-app`
- Create: `vitest.config.ts`
- Create: `tests/smoke.test.ts`
- Create: `.nvmrc`
- Modify: `package.json`

**Interfaces:**
- Consumes: nothing (first task)
- Produces: a working `npm test` command; the `@/` path alias resolving to `src/`

- [ ] **Step 1: Scaffold the application**

Run in `Dynamic CS 1`:

```bash
npx create-payload-app@latest suyabuzz --template blank --db postgres --no-deps
```

When prompted for a database connection string, enter a placeholder — Task 3 wires the real one.

**`suyabuzz/` is the repository root from this point on.** Every path in this plan is relative to it. Move the existing documentation inside so the spec, plans and code version together:

```bash
mv docs suyabuzz/docs
cd suyabuzz && npm install
```

- [ ] **Step 2: Pin the Node version**

Create `.nvmrc`:

```
22
```

Add to `package.json`:

```json
"engines": {
  "node": ">=22.0.0 <23.0.0"
}
```

- [ ] **Step 3: Install the test toolchain**

```bash
npm install -D vitest @vitest/coverage-v8 vite-tsconfig-paths
```

- [ ] **Step 4: Configure Vitest**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: { provider: 'v8', reporter: ['text', 'lcov'] },
  },
})
```

Add to `package.json` scripts:

```json
"test": "vitest run",
"test:watch": "vitest",
"typecheck": "tsc --noEmit"
```

- [ ] **Step 5: Write a failing smoke test**

Create `tests/smoke.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { projectName } from '@/lib/project'

describe('test harness', () => {
  it('resolves the @/ path alias', () => {
    expect(projectName).toBe('suyabuzz')
  })
})
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "@/lib/project"`

- [ ] **Step 7: Write the minimal implementation**

Create `src/lib/project.ts`:

```ts
export const projectName = 'suyabuzz'
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `npm test`
Expected: PASS — 1 test passed

- [ ] **Step 9: Initialise git and commit**

```bash
git init
git add .
git commit -m "chore: scaffold Next.js + Payload app with Vitest harness"
```

---

## Task 2: Fail-fast environment validation

**Files:**
- Create: `src/lib/env.ts`
- Create: `tests/lib/env.test.ts`
- Create: `.env.example`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: `@/` alias from Task 1
- Produces:
  - `parseEnv(raw: Record<string, string | undefined>): Env` — throws `Error` listing every invalid key
  - `env(): Env` — memoised accessor used by application code
  - `type Env = { DATABASE_URI: string; PAYLOAD_SECRET: string; NEXT_PUBLIC_SERVER_URL: string; CRON_SECRET: string; SHOP_TIMEZONE: string }`

- [ ] **Step 1: Write the failing tests**

Create `tests/lib/env.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { parseEnv } from '@/lib/env'

const valid = {
  DATABASE_URI: 'postgres://user:pass@host.neon.tech/db?sslmode=require',
  PAYLOAD_SECRET: 'x'.repeat(32),
  NEXT_PUBLIC_SERVER_URL: 'https://suyabuzz.com',
  CRON_SECRET: 'y'.repeat(32),
}

describe('parseEnv', () => {
  it('accepts a complete configuration', () => {
    const result = parseEnv(valid)
    expect(result.DATABASE_URI).toBe(valid.DATABASE_URI)
  })

  it('defaults the shop timezone to America/Los_Angeles', () => {
    expect(parseEnv(valid).SHOP_TIMEZONE).toBe('America/Los_Angeles')
  })

  it('rejects a short PAYLOAD_SECRET', () => {
    const raw = { ...valid, PAYLOAD_SECRET: 'too-short' }
    expect(() => parseEnv(raw)).toThrow(/PAYLOAD_SECRET/)
  })

  it('rejects a missing DATABASE_URI', () => {
    const { DATABASE_URI: _omitted, ...raw } = valid
    expect(() => parseEnv(raw)).toThrow(/DATABASE_URI/)
  })

  it('names every invalid key in one error', () => {
    const raw = { NEXT_PUBLIC_SERVER_URL: 'not-a-url' }
    try {
      parseEnv(raw)
      throw new Error('should have thrown')
    } catch (error) {
      const message = (error as Error).message
      expect(message).toContain('DATABASE_URI')
      expect(message).toContain('PAYLOAD_SECRET')
      expect(message).toContain('CRON_SECRET')
    }
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- tests/lib/env.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/env"`

- [ ] **Step 3: Write the implementation**

Create `src/lib/env.ts`:

```ts
import { z } from 'zod'

const schema = z.object({
  DATABASE_URI: z.string().min(1, 'is required'),
  PAYLOAD_SECRET: z.string().min(32, 'must be at least 32 characters'),
  NEXT_PUBLIC_SERVER_URL: z.string().url('must be a valid URL'),
  CRON_SECRET: z.string().min(32, 'must be at least 32 characters'),
  SHOP_TIMEZONE: z.string().default('America/Los_Angeles'),
})

export type Env = z.infer<typeof schema>

export function parseEnv(raw: Record<string, string | undefined> = process.env): Env {
  const result = schema.safeParse(raw)
  if (result.success) return result.data

  const issues = result.error.issues
    .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
    .join('\n')
  throw new Error(`Invalid environment configuration:\n${issues}`)
}

let cached: Env | null = null

export function env(): Env {
  if (cached === null) cached = parseEnv()
  return cached
}
```

Note the memoised accessor rather than a module-level constant: a top-level `parseEnv()` call would crash the test suite on import, before any test could exercise the failure paths.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- tests/lib/env.test.ts`
Expected: PASS — 5 tests passed

- [ ] **Step 5: Document the environment**

Create `.env.example`:

```
# Neon Postgres — Connection Details > Connection string, pooled
DATABASE_URI=postgres://user:password@ep-example.us-west-2.aws.neon.tech/suyabuzz?sslmode=require

# Payload encryption key. Generate: openssl rand -base64 32
PAYLOAD_SECRET=replace-me-with-32-plus-random-characters

# Public origin, no trailing slash
NEXT_PUBLIC_SERVER_URL=http://localhost:3000

# Shared secret for scheduled job routes. Generate: openssl rand -base64 32
CRON_SECRET=replace-me-with-32-plus-random-characters

# IANA timezone for all business rules
SHOP_TIMEZONE=America/Los_Angeles

# Absolute path to persistent upload storage (Hostinger only; omit locally)
# MEDIA_DIR=/home/username/domains/suyabuzz.com/media
```

Confirm `.gitignore` contains `.env` (the scaffold adds it; verify).

- [ ] **Step 6: Commit**

```bash
git add src/lib/env.ts tests/lib/env.test.ts .env.example .gitignore
git commit -m "feat: add fail-fast environment validation"
```

---

## Task 3: Connect Neon Postgres and run the first migration

**Files:**
- Modify: `src/payload.config.ts`
- Create: `.env` (local only, not committed)

**Interfaces:**
- Consumes: `parseEnv` from Task 2
- Produces: a reachable database; `payload migrate` and `payload migrate:create` working; the first `owner` user

- [ ] **Step 1: Create the Neon project**

In the Neon console: create a project named `suyabuzz`, region **US West (Oregon)** — closest to Tustin and to the intended Hostinger region. Copy the **pooled** connection string.

- [ ] **Step 2: Create the local `.env`**

```bash
cp .env.example .env
```

Set `DATABASE_URI` to the Neon string. Generate both secrets:

```bash
openssl rand -base64 32
```

- [ ] **Step 3: Wire the adapter through validated env**

In `src/payload.config.ts`, replace the raw `process.env` reads:

```ts
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import path from 'path'
import { fileURLToPath } from 'url'
import { env } from '@/lib/env'

const dirname = path.dirname(fileURLToPath(import.meta.url))

export default buildConfig({
  admin: {
    user: 'users',
    meta: { titleSuffix: ' — SuyaBuzz' },
  },
  collections: [],
  editor: lexicalEditor(),
  secret: env().PAYLOAD_SECRET,
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  db: postgresAdapter({
    pool: { connectionString: env().DATABASE_URI },
  }),
  sharp,
})
```

- [ ] **Step 4: Verify the connection**

Run: `npm run dev`
Expected: the server starts with no database error, and `http://localhost:3000/admin` shows the "create first user" screen.

- [ ] **Step 5: Create the first user and confirm persistence**

Create an owner account through the admin screen. Stop the dev server, start it again, and log in.
Expected: login succeeds — proving the row persisted to Neon rather than to memory.

- [ ] **Step 6: Commit**

```bash
git add src/payload.config.ts
git commit -m "feat: connect Payload to Neon Postgres via validated env"
```

---

## Task 4: Roles and access control

**Files:**
- Create: `src/access/roles.ts`
- Create: `tests/access/roles.test.ts`
- Create: `src/collections/Users.ts`
- Modify: `src/payload.config.ts`

**Interfaces:**
- Consumes: Payload config from Task 3
- Produces:
  - `type Role = 'owner' | 'staff' | 'customer'`
  - `isOwner(user)`, `isStaff(user)`, `isOwnerOrStaff(user)` — pure predicates over `{ role } | null | undefined`
  - `ownerOnly`, `ownerOrStaff`, `anyone` — Payload `Access` functions
  - `Users` collection, slug `users`, used as `admin.user`

- [ ] **Step 1: Write the failing tests**

Create `tests/access/roles.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { isOwner, isOwnerOrStaff, isStaff } from '@/access/roles'

const owner = { role: 'owner' as const }
const staff = { role: 'staff' as const }
const customer = { role: 'customer' as const }

describe('role predicates', () => {
  it('identifies an owner', () => {
    expect(isOwner(owner)).toBe(true)
    expect(isOwner(staff)).toBe(false)
    expect(isOwner(customer)).toBe(false)
  })

  it('identifies staff', () => {
    expect(isStaff(staff)).toBe(true)
    expect(isStaff(owner)).toBe(false)
  })

  it('treats owner and staff together', () => {
    expect(isOwnerOrStaff(owner)).toBe(true)
    expect(isOwnerOrStaff(staff)).toBe(true)
    expect(isOwnerOrStaff(customer)).toBe(false)
  })

  it('denies anonymous users', () => {
    expect(isOwner(null)).toBe(false)
    expect(isOwner(undefined)).toBe(false)
    expect(isOwnerOrStaff(null)).toBe(false)
  })

  it('denies a customer admin access (spec BR: staff cannot change prices, customers see no admin)', () => {
    expect(isOwnerOrStaff(customer)).toBe(false)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- tests/access/roles.test.ts`
Expected: FAIL — `Failed to resolve import "@/access/roles"`

- [ ] **Step 3: Write the predicates**

Create `src/access/roles.ts`:

```ts
import type { Access } from 'payload'

export type Role = 'owner' | 'staff' | 'customer'

export type MaybeUser = { role?: Role | null } | null | undefined

export const isOwner = (user: MaybeUser): boolean => user?.role === 'owner'

export const isStaff = (user: MaybeUser): boolean => user?.role === 'staff'

export const isOwnerOrStaff = (user: MaybeUser): boolean => isOwner(user) || isStaff(user)

export const ownerOnly: Access = ({ req }) => isOwner(req.user as MaybeUser)

export const ownerOrStaff: Access = ({ req }) => isOwnerOrStaff(req.user as MaybeUser)

export const anyone: Access = () => true
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- tests/access/roles.test.ts`
Expected: PASS — 5 tests passed

- [ ] **Step 5: Create the Users collection**

Create `src/collections/Users.ts`:

```ts
import type { CollectionConfig } from 'payload'
import { isOwner, isOwnerOrStaff, ownerOnly, type MaybeUser } from '@/access/roles'

export const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'name', 'role'],
  },
  access: {
    // Only owner and staff may open the admin panel at all.
    admin: ({ req }) => isOwnerOrStaff(req.user as MaybeUser),
    create: ownerOnly,
    delete: ownerOnly,
    read: ({ req }) => {
      if (isOwnerOrStaff(req.user as MaybeUser)) return true
      if (req.user) return { id: { equals: req.user.id } }
      return false
    },
    update: ({ req }) => {
      if (isOwner(req.user as MaybeUser)) return true
      if (req.user) return { id: { equals: req.user.id } }
      return false
    },
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'customer',
      options: [
        { label: 'Owner', value: 'owner' },
        { label: 'Staff', value: 'staff' },
        { label: 'Customer', value: 'customer' },
      ],
      // Only an owner may change anyone's role, including their own.
      access: { update: ({ req }) => isOwner(req.user as MaybeUser) },
    },
    { name: 'phone', type: 'text' },
    { name: 'marketingConsent', type: 'checkbox', defaultValue: false },
  ],
}
```

- [ ] **Step 6: Register the collection**

In `src/payload.config.ts`:

```ts
import { Users } from '@/collections/Users'
// ...
collections: [Users],
```

- [ ] **Step 7: Promote the existing user to owner — do this before restarting**

**Lockout warning.** The account created in Task 3 predates the `role` field, so its role is null or the `customer` default. The `admin` access gate added in Step 5 will therefore refuse it entry to `/admin`, and `create` is `ownerOnly` — so there is no way back in through the UI. Promote the account first.

Install the script runner if the template did not include it:

```bash
npm install -D tsx
```

Create `scripts/promote-owner.ts`:

```ts
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
```

`overrideAccess: true` is required on both calls — the field-level access rule on `role` says only an owner may set it, and at this moment no owner exists.

Run it with the email used in Task 3:

```bash
npx tsx scripts/promote-owner.ts you@example.com
```

Expected: `Promoted you@example.com to owner`

- [ ] **Step 8: Verify the gate in the running app**

Run: `npm run dev`

1. Log in as the promoted account — `/admin` opens, and the `role` field shows `Owner`.
2. Create a second user with role `customer`.
3. Log out, log in as that customer, and open `/admin`.

Expected: the owner gets in; the customer is refused.

If step 1 fails, you are locked out — re-run the promote script; do not delete the database.

- [ ] **Step 9: Commit**

```bash
git add src/access/roles.ts tests/access/roles.test.ts src/collections/Users.ts src/payload.config.ts scripts/promote-owner.ts package.json
git commit -m "feat: add roles, access control and Users collection"
```

---

## Task 5: Media uploads on persistent disk

**Files:**
- Create: `src/collections/Media.ts`
- Modify: `src/payload.config.ts`

**Interfaces:**
- Consumes: `ownerOnly`, `ownerOrStaff`, `anyone` from Task 4
- Produces: `Media` collection, slug `media`, with sizes `thumbnail` (400×300), `card` (800×600), `hero` (1920×1080), all WebP

- [ ] **Step 1: Create the collection**

Create `src/collections/Media.ts`:

```ts
import type { CollectionConfig } from 'payload'
import path from 'path'
import { fileURLToPath } from 'url'
import { anyone, ownerOnly, ownerOrStaff } from '@/access/roles'

const dirname = path.dirname(fileURLToPath(import.meta.url))

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    read: anyone,
    create: ownerOrStaff,
    update: ownerOrStaff,
    delete: ownerOnly,
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
      admin: {
        description:
          'Describe the image for screen readers and for when it fails to load. Required.',
      },
    },
  ],
  upload: {
    staticDir: process.env.MEDIA_DIR ?? path.resolve(dirname, '../../public/media'),
    mimeTypes: ['image/*'],
    formatOptions: { format: 'webp', options: { quality: 82 } },
    imageSizes: [
      { name: 'thumbnail', width: 400, height: 300, position: 'centre' },
      { name: 'card', width: 800, height: 600, position: 'centre' },
      { name: 'hero', width: 1920, height: 1080, position: 'centre' },
    ],
  },
}
```

`alt` is `required: true` deliberately. It makes missing alt text impossible rather than merely discouraged, which is what the Phase 1 accessibility gate will check for.

- [ ] **Step 2: Register the collection**

In `src/payload.config.ts`:

```ts
import { Media } from '@/collections/Media'
// ...
collections: [Users, Media],
```

- [ ] **Step 3: Verify uploads and derivatives**

Run: `npm run dev`

Upload a large JPEG through `/admin` → Media. Then inspect the output directory:

```bash
ls -la public/media
```

Expected: the original plus three derivatives, all `.webp`. Saving without `alt` is rejected.

- [ ] **Step 4: Ignore uploaded media in git**

Append to `.gitignore`:

```
/public/media
```

- [ ] **Step 5: Commit**

```bash
git add src/collections/Media.ts src/payload.config.ts .gitignore
git commit -m "feat: add Media collection with WebP derivatives and required alt text"
```

---

## Task 6: Health check endpoint

**Files:**
- Create: `src/app/api/health/route.ts`

**Interfaces:**
- Consumes: Payload config from Task 3, `env()` from Task 2
- Produces: `GET /api/health` → `200 {status:'ok', database:'connected', timezone, latencyMs}` or `503 {status:'error', database:'unreachable', message}`

- [ ] **Step 1: Write the route**

Create `src/app/api/health/route.ts`:

```ts
import config from '@payload-config'
import { getPayload } from 'payload'
import { env } from '@/lib/env'

export const dynamic = 'force-dynamic'

export async function GET() {
  const startedAt = Date.now()

  try {
    const payload = await getPayload({ config })
    // Counting through Payload's own query path proves the adapter, the pool
    // and the credentials all work — not just that a TCP socket opened.
    await payload.count({ collection: 'users' })

    return Response.json({
      status: 'ok',
      database: 'connected',
      timezone: env().SHOP_TIMEZONE,
      latencyMs: Date.now() - startedAt,
    })
  } catch (error) {
    return Response.json(
      {
        status: 'error',
        database: 'unreachable',
        message: error instanceof Error ? error.message : 'unknown error',
      },
      { status: 503 },
    )
  }
}
```

- [ ] **Step 2: Verify the healthy path**

Run: `npm run dev`, then:

```bash
curl -s http://localhost:3000/api/health
```

Expected: `{"status":"ok","database":"connected","timezone":"America/Los_Angeles","latencyMs":<number>}`

- [ ] **Step 3: Verify the failure path**

Temporarily set `DATABASE_URI` in `.env` to a valid-looking but unreachable host, restart, and curl again.
Expected: HTTP 503 with `"database":"unreachable"`. Restore the correct value afterwards.

This step matters: an endpoint that only ever returns `ok` is not a health check.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/health/route.ts
git commit -m "feat: add health endpoint reporting database reachability"
```

---

## Task 7: Authenticated cron entry point

**Files:**
- Create: `src/lib/cron-auth.ts`
- Create: `tests/lib/cron-auth.test.ts`
- Create: `src/app/api/cron/[job]/route.ts`

**Interfaces:**
- Consumes: `env()` from Task 2
- Produces:
  - `isAuthorizedCronRequest(authorizationHeader: string | null, secret: string): boolean`
  - `GET /api/cron/[job]` → `401` unauthorised, `404` unknown job, `200 {job, ranAt}` on success
  - `CRON_JOBS: Record<string, () => Promise<void>>` — later plans register handlers here

- [ ] **Step 1: Write the failing tests**

Create `tests/lib/cron-auth.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { isAuthorizedCronRequest } from '@/lib/cron-auth'

const secret = 'a'.repeat(32)

describe('isAuthorizedCronRequest', () => {
  it('accepts the correct bearer token', () => {
    expect(isAuthorizedCronRequest(`Bearer ${secret}`, secret)).toBe(true)
  })

  it('rejects a missing header', () => {
    expect(isAuthorizedCronRequest(null, secret)).toBe(false)
  })

  it('rejects an empty header', () => {
    expect(isAuthorizedCronRequest('', secret)).toBe(false)
  })

  it('rejects the right secret with the wrong scheme', () => {
    expect(isAuthorizedCronRequest(secret, secret)).toBe(false)
  })

  it('rejects a wrong secret of equal length', () => {
    expect(isAuthorizedCronRequest(`Bearer ${'b'.repeat(32)}`, secret)).toBe(false)
  })

  it('rejects a wrong secret of different length without throwing', () => {
    expect(isAuthorizedCronRequest('Bearer short', secret)).toBe(false)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- tests/lib/cron-auth.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/cron-auth"`

- [ ] **Step 3: Write the implementation**

Create `src/lib/cron-auth.ts`:

```ts
import { timingSafeEqual } from 'node:crypto'

export function isAuthorizedCronRequest(
  authorizationHeader: string | null,
  secret: string,
): boolean {
  if (!authorizationHeader) return false

  const received = Buffer.from(authorizationHeader)
  const expected = Buffer.from(`Bearer ${secret}`)

  // timingSafeEqual throws on length mismatch, so compare lengths first.
  // Length is not secret; the token contents are.
  if (received.length !== expected.length) return false

  return timingSafeEqual(received, expected)
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- tests/lib/cron-auth.test.ts`
Expected: PASS — 6 tests passed

- [ ] **Step 5: Write the route**

Create `src/app/api/cron/[job]/route.ts`:

```ts
import { env } from '@/lib/env'
import { isAuthorizedCronRequest } from '@/lib/cron-auth'

export const dynamic = 'force-dynamic'

/**
 * Scheduled job handlers. Later plans register real jobs here:
 * 'cutoff-reminder', 'run-sheet', 'pickup-reminder', 'stripe-reconcile'.
 * Phase 0 ships the authenticated entry point and one no-op job so the
 * Hostinger cron wiring can be verified before any job exists.
 */
export const CRON_JOBS: Record<string, () => Promise<void>> = {
  ping: async () => {},
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ job: string }> },
) {
  if (!isAuthorizedCronRequest(request.headers.get('authorization'), env().CRON_SECRET)) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { job } = await params
  const handler = CRON_JOBS[job]

  if (!handler) {
    return Response.json({ error: 'unknown job', job }, { status: 404 })
  }

  await handler()
  return Response.json({ job, ranAt: new Date().toISOString() })
}
```

- [ ] **Step 6: Verify all three responses**

With `npm run dev` running:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/cron/ping
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $(grep '^CRON_SECRET=' .env | cut -d= -f2-)" http://localhost:3000/api/cron/nope
curl -s -H "Authorization: Bearer $(grep '^CRON_SECRET=' .env | cut -d= -f2-)" http://localhost:3000/api/cron/ping
```

Expected: `401`, then `404`, then `{"job":"ping","ranAt":"..."}`.

- [ ] **Step 7: Commit**

```bash
git add src/lib/cron-auth.ts tests/lib/cron-auth.test.ts src/app/api/cron
git commit -m "feat: add authenticated cron entry point"
```

---

## Task 8: Continuous integration

**Files:**
- Create: `.github/workflows/ci.yml`
- Modify: `package.json`

**Interfaces:**
- Consumes: `test`, `typecheck`, `lint`, `build` scripts
- Produces: a CI run that must pass before merge

- [ ] **Step 1: Confirm the script set**

`package.json` scripts must include, at minimum:

```json
"dev": "next dev",
"build": "next build",
"start": "next start",
"lint": "next lint",
"typecheck": "tsc --noEmit",
"test": "vitest run"
```

- [ ] **Step 2: Write the workflow**

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: npm

      - run: npm ci

      - run: npm run lint
      - run: npm run typecheck
      - run: npm test

      - name: Build
        run: npm run build
        env:
          # Build-time values only. The real database is never reachable from
          # CI; Payload needs a syntactically valid URI to generate types.
          DATABASE_URI: postgres://user:pass@localhost:5432/ci
          PAYLOAD_SECRET: ci-placeholder-secret-at-least-32-characters
          CRON_SECRET: ci-placeholder-cron-at-least-32-characters
          NEXT_PUBLIC_SERVER_URL: http://localhost:3000
```

- [ ] **Step 3: Verify locally before pushing**

```bash
npm run lint && npm run typecheck && npm test && npm run build
```

Expected: all four succeed. Fix anything that fails now — a red first CI run teaches nothing.

- [ ] **Step 4: Push and confirm CI is green**

```bash
git add .github/workflows/ci.yml package.json
git commit -m "ci: add lint, typecheck, test and build pipeline"
git push -u origin main
```

Expected: the Actions run completes green.

---

## Task 9: Deploy to Hostinger and verify the pipe

This is the task Phase 0 exists for. It is deliberately last, and deliberately manual — the point is to discover any hosting incompatibility now rather than in Phase 3.

**Files:**
- Create: `docs/DEPLOYMENT.md`

**Interfaces:**
- Consumes: everything above
- Produces: a live URL serving `/admin` and `/api/health`, and a verified cron path

- [ ] **Step 1: Verify the two hosting prerequisites**

In hPanel, confirm before proceeding:

1. The plan exposes a **Web Apps / Node.js** section. Not all older Business plans were migrated to it. If it is absent, **stop and report** — the whole hosting decision needs revisiting, and that is far cheaper to learn now.
2. The **server region is US-West**. Customers are in Tustin; a European region taxes every request.

- [ ] **Step 2: Create the Node.js application**

In hPanel → Web Apps → create a Node.js app:

- Node version: **22.x**
- Repository: the GitHub repo, branch `main`
- Build command: `npm ci && npm run build`
- Start command: `npm start`
- Domain: `suyabuzz.com` (or a staging subdomain for this phase)

- [ ] **Step 3: Set environment variables**

Add every key from `.env.example` with production values. Two differ from local:

- `NEXT_PUBLIC_SERVER_URL` — the real origin, `https://…`, no trailing slash
- `MEDIA_DIR` — an absolute path **outside** the deploy directory, so uploads survive redeploys, e.g. `/home/<username>/domains/suyabuzz.com/media`

Create that directory over SSH or File Manager and confirm it is writable.

- [ ] **Step 4: Deploy and verify the health endpoint**

Trigger the build, then:

```bash
curl -s https://suyabuzz.com/api/health
```

Expected: `{"status":"ok","database":"connected","timezone":"America/Los_Angeles",…}`

A `503` here means the app runs but cannot reach Neon — check that Neon allows the connection and that `sslmode=require` is present.

- [ ] **Step 5: Verify the admin panel and media persistence**

Open `https://suyabuzz.com/admin`, log in, upload an image. Then **redeploy** and confirm the image still loads.

This is the single most important check in Phase 0. If the image disappears, `MEDIA_DIR` is inside the deploy directory and every release will destroy the owner's photo library.

- [ ] **Step 6: Verify the process is persistent**

Leave the app untouched for 30 minutes, then request `/api/health` again and note `latencyMs`.

Expected: a response comparable to before, without a multi-second cold start. A long first response means the process is being suspended, which later plans must account for.

- [ ] **Step 7: Wire and verify cron**

In hPanel → Cron Jobs, add an hourly job:

```bash
curl -fsS -H "Authorization: Bearer <CRON_SECRET>" https://suyabuzz.com/api/cron/ping
```

Wait for one execution and confirm it succeeded. `-f` makes curl exit non-zero on an HTTP error, so a failure is visible in the cron mail rather than silent.

- [ ] **Step 8: Write the deployment runbook**

Create `docs/DEPLOYMENT.md` recording: the hPanel app settings used, every environment variable and where its value comes from, the `MEDIA_DIR` path, the cron entries, the health-check URL, and the results of Steps 5 and 6 including the observed latency. This document is the seed of the handover runbook in Phase 4.

- [ ] **Step 9: Commit**

```bash
git add docs/DEPLOYMENT.md
git commit -m "docs: record Hostinger deployment configuration and verification"
git push
```

---

## Phase 0 exit criteria

Phase 1 does not begin until all of these hold:

- [ ] `npm run lint && npm run typecheck && npm test && npm run build` passes locally and in CI
- [ ] `https://<domain>/api/health` returns `status: ok` with `database: connected`
- [ ] `/admin` is reachable, and a `customer`-role user is refused entry
- [ ] An uploaded image survives a redeploy
- [ ] The cron job executed successfully at least once, and an unauthenticated call returns 401
- [ ] `docs/DEPLOYMENT.md` records the observed idle-latency figure
- [ ] Hostinger region confirmed US-West

---

## Deferred to later plans

Listed so nothing here reads as an omission:

| Item | Plan |
|---|---|
| `cycleFor()` and the weekly cycle engine | Phase 2 |
| Products, categories, cycle stock, pickup slots | Phase 2 |
| Design system, page templates, CMS blocks | Phase 1 |
| Settings global (address, hours, cutoff configuration) | Phase 1 |
| Cart, checkout, Stripe, webhooks, order emails | Phase 3 |
| Real cron jobs replacing the `ping` no-op | Phase 3 |
| This Week dashboard, run-sheets | Phase 4 |

## Open configuration decisions

Carried from the spec review; none blocks Phase 0, all must be settled before Phase 2.

1. **Cutoff time** — the spec fixes Wednesday 23:59:59 PT. If the owner means an earlier hour so she can order supplies that evening, it is a settings value, not a code change.
2. **Slot capacity unit** — modelled as maximum *orders* per slot. If her real constraint is queue length at the window, the shape is identical; if it is something else, Phase 2 must know.
3. **Phone orders during Phase 1–2** — Phase 1 ships the content site before checkout exists, so orders are taken by phone for a period. Confirm the owner accepts this, since it is what allows the current WordPress site to be retired early.
