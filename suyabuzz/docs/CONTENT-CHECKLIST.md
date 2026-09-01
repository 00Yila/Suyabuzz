# Phase 1 content and launch checklist

**Status: NOT launched.** This document is an honest record of what this session
actually did and verified, and a clear list of what remains — separated by why
it's blocked. Nothing below claims a result that wasn't actually observed.

This session (Task 12) ran inside a sandbox that blocks outbound TCP on port
5432, so the Neon database was completely unreachable for the entire session.
No `npm run dev`, `npm run build`, `psql`, or any other code path that calls
`getPayload()` was run, per that constraint. Everything requiring a database
connection below is marked blocked for that reason, not attempted and silently
assumed to pass.

## Done (this session)

- All Phase 1 code (Tasks 1–11) complete, reviewed, and merged prior to this
  session.
- **Accessibility fix A** — `src/components/layout/MobileNav.tsx:25`: the
  mobile menu toggle button was `h-10 w-10` (40×40px), below the 44×44px
  minimum tap target. Changed to `h-11 w-11` (44×44px). Verified in source
  that it sits as a fixed-size flex sibling between the logo and phone number
  in `src/components/layout/Header.tsx` (`flex items-center justify-between
  gap-4`) — the extra 4px doesn't affect that layout since none of the three
  children stretch to fill remaining space.
- **Accessibility fix B** — `src/components/layout/OrderingNotice.tsx:17-23`:
  the dismiss button had no explicit sizing at all (`className="shrink-0
  text-ink/70"`), so its tappable area was only the `✕` glyph. Changed to
  `className="flex h-11 w-11 shrink-0 items-center justify-center
  text-ink/70"`, giving it a 44×44px tap target while keeping the glyph
  visually centered. Verified in source this doesn't disturb the banner's
  `items-center justify-center gap-3` parent layout — it's a larger invisible
  hit area around the same visual glyph, not a layout restructure.
- `color-scheme: light` added to the existing `html { ... }` rule in
  `src/app/(frontend)/styles.css:36-39` (`@layer base`). This is a
  light-only brand palette by design; no dark variant exists or is planned
  for Phase 1.
- Placeholder-content grep run against source (see exact output below) —
  effectively clean; the only two hits are a deliberate guard-rail comment,
  not placeholder content (details below).
- GA4 wiring added via `@next/third-parties` and is inert: `NEXT_PUBLIC_GA_ID`
  is a new optional env var (`src/lib/env.ts`, `.env.example`), and
  `src/app/(frontend)/layout.tsx` renders `<GoogleAnalytics gaId={gaId} />`
  only when it is set. It is currently unset everywhere, so no analytics
  script renders — confirmed by reading the conditional in source; a live
  render check wasn't possible without a build.
- `npm test`, `npm run typecheck`, `npm run lint` all still pass at the same
  baseline as before this session's changes (see Verification section below).

## Blocked — needs a working database connection

*(This sandbox blocks outbound port 5432 to Neon. This is an environment
limitation of this session, not a code defect.)*

- Loading the 9 real content pages through `/admin`: `home`, `about`,
  `how-to-order`, `pickup`, `contact`, `legal/terms`, `legal/privacy`,
  `legal/refund-cancellation`, `legal/order-pickup-policy`. None of these
  were created or edited this session.
- The database half of the placeholder-content check —
  `psql "$DATABASE_URI" -c "select slug from pages where lower(title) ~
  'lorem|ipsum';"` — was not run. `psql` is explicitly forbidden by this
  session's constraints regardless of content state.
- A real `npm run build` (static generation in `[...slug]/page.tsx` and
  `page.tsx` calls `getPayload()` via `generateStaticParams`, which would hang
  against the unreachable database) and any Lighthouse run against that build.
  **No Lighthouse figures exist from this session — not run, not estimated.**
- Live verification of `/sitemap.xml`, `/robots.txt`, the JSON-LD output, and
  the contact form's real database round-trip. None of these were exercised
  this session.

## Blocked — needs the business owner's input

- Real business content for all 9 pages. Per Task 3's report
  (`.superpowers/sdd/2026-08-21-phase-1-content-site/task-3-report.md`), the
  `Settings` global was populated with clearly-marked placeholders to prove
  the schema round-trips, and the following are still `TO CONFIRM`:
  - `address.street` — placeholder `TO CONFIRM — street address`
  - `address.postalCode` — placeholder `00000`
  - `phone` — placeholder `+17145550100` (fake but valid E.164 US number)
  - `email` — placeholder `hello@suyabuzz.example` (`.example` TLD, never
    resolves)
  - `whatsappNumber` — placeholder `17145550100`
  - `openingHours` — placeholder Fri 16:00–20:00 / Sat 12:00–20:00 / Sun
    12:00–18:00 (plausible shape, not verified real hours)
  - `social.instagram`, `social.facebook`, `social.tiktok` — all `TO CONFIRM`
  - `mapEmbedUrl` — `TO CONFIRM — Google Maps embed URL`

  (`businessName`, `tagline`, `address.city`, `address.state`, and
  `orderingNotice` are already real values per Task 3 and need no follow-up.)
- The GA4 property decision: reuse the existing property (`G-WBHE5BFBY1`
  per the Task 12 plan) if the owner still controls it, or have them create a
  new one. This is explicitly not a decision this session made. Once decided,
  set `NEXT_PUBLIC_GA_ID` in the real `.env` (see the comment added there) —
  no code change is needed beyond that.
- A Resend account for the contact form's owner-notification email. Currently
  gracefully disabled per Task 10: the form still saves to the database and
  works without `RESEND_API_KEY`/`OWNER_NOTIFICATION_EMAIL` set; it just skips
  the email and logs a warning.

## Blocked — needs Phase 0's Hostinger deployment

*(A separate, still-incomplete Phase 0 task, not part of Phase 1.)*

- Production deployment itself.
- The live-domain verification checklist: `/api/health` returns `status: ok`,
  every one of the 9 pages loads, the footer shows real address/phone/hours,
  the contact form submits and the owner receives the email, the WhatsApp
  button opens a chat with the real number, `/sitemap.xml` and `/robots.txt`
  resolve, and an uploaded image survives a redeploy.
- Confirming the old WordPress site is no longer served at `suyabuzz.com`.

## Explicitly deferred to later phases

*(Already documented in the plan; restated here for completeness.)*

| Item | Plan |
|---|---|
| `cycleFor()`, live countdown, cutoff messaging | Phase 2 |
| Products, categories, menu page, stock display | Phase 2 |
| Cart, checkout, Stripe, order emails | Phase 3 |
| Blog collection and posts | Phase 5 |
| Catering enquiry form | Phase 3 |
| Per-product reviews | Phase 5 |

## Placeholder-content grep (source code only — run from inside `suyabuzz/`)

```
grep -rniE "lorem|ipsum|dolor sit|your-?website|street name, ny|578-393-4937|\+234|payload blank template|blank template using payload" \
  --include=*.tsx --include=*.ts --include=*.css src
```

Output:

```
src/globals/Settings.ts:27:          'US number in E.164 format, e.g. +17145550123. The +234 number on the old site must not be reused.',
src/payload-types.ts:693:   * US number in E.164 format, e.g. +17145550123. The +234 number on the old site must not be reused.
```

Both hits are the same string: a Payload admin field description on
`Settings.phone` (and its auto-generated type-comment mirror in
`payload-types.ts`) that explicitly warns editors *against* reusing the old
site's `+234` number — it is a guard-rail comment, not the placeholder itself
being used anywhere. This file (`src/globals/Settings.ts`) was out of scope
for this task and was not modified. Reported here per instructions rather
than silently treated as a clean zero-match result.

## Verification (run from inside `suyabuzz/`)

### `npm test`

```
 Test Files  14 passed (14)
      Tests  90 passed (90)
```

### `npm run typecheck`

```
> suyabuzz@1.0.0 typecheck
> tsc --noEmit
```

Exit code 0, no output.

### `npm run lint`

```
✖ 7 problems (0 errors, 7 warnings)
```

Same 7 pre-existing warnings as the baseline (unused vars/args in test files,
`any` in `tests/lib/seo.test.ts`) — none introduced by this session's changes.

`npm run build` was intentionally **not run** — see the blocked section above.
