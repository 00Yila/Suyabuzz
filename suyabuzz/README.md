# SuyaBuzz

SuyaBuzz is a pickup-only pre-order website for a Nigerian street-food business
in Tustin, CA. Customers browse the menu, place an order online, and pick it
up in person — there is no delivery.

## Stack

- [Next.js 16](https://nextjs.org) (App Router)
- [Payload CMS 3](https://payloadcms.com)
- PostgreSQL, hosted on [Neon](https://neon.tech)
- Node 22 LTS
- npm (the only supported package manager — Hostinger's auto-build runs `npm install`)

## Setup

1. `cp .env.example .env` and fill in the values (see comments in that file
   for what each key is for).
2. `npm install`
3. `npm run dev`
4. Open `http://localhost:3000`. Follow the on-screen instructions to create
   your first admin user at `/admin`.
5. Run `npx tsx scripts/promote-owner.ts <your-email>`. The `Users`
   collection requires `role: owner` or `role: staff` to access `/admin`,
   but Payload's first-user bootstrap always creates that account with the
   schema default `role: 'customer'` — so without this step you'll be
   immediately locked out of the admin panel you just registered through.
   `promote-owner.ts` exists specifically to get you back in.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run `tsc --noEmit` |
| `npm test` | Run unit tests (Vitest, `vitest.config.ts`) |
| `npm run test:int` | Run integration tests (Vitest, `vitest.config.mts`) |
| `npm run test:e2e` | Run end-to-end tests (Playwright) |
