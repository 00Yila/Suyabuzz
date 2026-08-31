# SuyaBuzz Phase 1 — Content Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a complete, accessible, CMS-editable marketing site — home, about, how to order, pickup, contact and legal pages — that replaces the current unfinished WordPress site, with no ordering functionality.

**Architecture:** A block-based content model. Pages are rows in a Payload `pages` collection composed of typed blocks; a single renderer maps block types to React server components. Presentational logic that can be wrong (contrast, opening hours, SEO metadata, structured data) is extracted into pure functions with unit tests; everything else is verified visually and by the accessibility gate.

**Tech Stack:** Next.js 16 App Router, Payload CMS 3, Tailwind CSS 4, `next/font` (Fraunces + Karla), Vitest, Testing Library, Resend.

**Spec:** `docs/superpowers/specs/2026-08-21-suyabuzz-ordering-site-design.md`

**Depends on:** `docs/superpowers/plans/2026-08-21-phase-0-foundations.md` — all exit criteria met.

## Global Constraints

Inherits every constraint from the Phase 0 plan. Additionally:

- **Brand palette:** yellow `#FFCD05`, ink `#0A0500`, ember `#FF5733`, warm surface `#F7F4F0`, charcoal `#2B2320`, cream `#FFFDF7`.
- **Yellow is a fill colour only.** `#FFCD05` on white is 1.50:1 and fails WCAG AA for text. It carries ink text (13.5:1) and never appears as text on a light surface.
- **Ember carries ink text, not white.** White on `#FF5733` is 3.15:1 — large text and UI borders only, never body copy. Ink on ember is 6.4:1 and passes AA.
- **Typography:** Fraunces (display/headings), Karla (body). Self-hosted via `next/font/google`. Roboto Slab from the Elementor plan is explicitly replaced.
- **No lorem ipsum reaches `main`.** The previous build shipped Astra demo text to production. Any placeholder copy must be visibly marked and listed in Task 12's content checklist.
- **Every image requires alt text** — enforced by the `Media` collection from Phase 0.
- **No ordering UI.** No cart, no prices-as-buttons, no checkout. The site directs to phone and WhatsApp.

## Deviation from the spec, declared

The spec places Resend in Phase 3 with order emails. This plan brings it forward for one purpose only: notifying the owner that a contact-form message arrived. A contact form that silently fills a database nobody checks is worse than no form. Order-related email remains Phase 3.

---

## File Structure

| Path | Responsibility |
|---|---|
| `src/lib/contrast.ts` | WCAG relative luminance and contrast ratio — pure |
| `src/styles/tokens.ts` | Single source of truth for brand colours; consumed by Tailwind and by tests |
| `src/app/(frontend)/globals.css` | Tailwind layer, CSS custom properties, base element styles |
| `src/lib/fonts.ts` | `next/font` declarations exporting CSS variables |
| `src/globals/Settings.ts` | Payload global: address, contact, hours, socials, map |
| `src/lib/hours.ts` | Timezone-aware opening-hours formatting — pure |
| `src/lib/seo.ts` | Metadata and JSON-LD builders — pure |
| `src/collections/Pages.ts` | Page documents composed of blocks |
| `src/collections/ContactMessages.ts` | Persisted contact submissions |
| `src/blocks/*.ts` | Payload block definitions (schema) |
| `src/components/blocks/*.tsx` | React renderers, one per block |
| `src/components/blocks/RenderBlocks.tsx` | Block-type to component map |
| `src/components/layout/Header.tsx`, `Footer.tsx` | Site chrome |
| `src/app/(frontend)/[...slug]/page.tsx` | Catch-all page renderer |
| `src/app/(frontend)/sitemap.ts`, `robots.ts` | Discovery |
| `tests/**` | Mirrors `src/` |

---

## Task 1: Design tokens and the contrast guarantee

The accessibility constraint from the spec becomes an executable test, not a note in a document.

**Files:**
- Create: `src/lib/contrast.ts`, `tests/lib/contrast.test.ts`
- Create: `src/styles/tokens.ts`, `tests/styles/tokens.test.ts`

**Interfaces:**
- Consumes: nothing from Phase 1
- Produces:
  - `relativeLuminance(hex: string): number`
  - `contrastRatio(foreground: string, background: string): number`
  - `tokens.color` — `{ yellow, ink, ember, surface, charcoal, cream, white }` as hex strings
  - `APPROVED_PAIRS: ReadonlyArray<{ fg: keyof Colors; bg: keyof Colors; minRatio: number }>`

- [ ] **Step 1: Write the failing contrast tests**

Create `tests/lib/contrast.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { contrastRatio, relativeLuminance } from '@/lib/contrast'

describe('relativeLuminance', () => {
  it('returns 1 for white and 0 for black', () => {
    expect(relativeLuminance('#FFFFFF')).toBeCloseTo(1, 5)
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 5)
  })

  it('accepts shorthand hex', () => {
    expect(relativeLuminance('#fff')).toBeCloseTo(1, 5)
  })

  it('rejects malformed input', () => {
    expect(() => relativeLuminance('cornflower')).toThrow(/hex/i)
  })
})

describe('contrastRatio', () => {
  it('returns 21 for black on white', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 1)
  })

  it('is order-independent', () => {
    expect(contrastRatio('#0A0500', '#FFCD05')).toBeCloseTo(
      contrastRatio('#FFCD05', '#0A0500'),
      5,
    )
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- tests/lib/contrast.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/contrast"`

- [ ] **Step 3: Implement the contrast utilities**

Create `src/lib/contrast.ts`:

```ts
type Rgb = { r: number; g: number; b: number }

function hexToRgb(hex: string): Rgb {
  const normalised = hex.trim().replace(/^#/, '')

  const expanded =
    normalised.length === 3
      ? normalised
          .split('')
          .map((c) => c + c)
          .join('')
      : normalised

  if (!/^[0-9a-fA-F]{6}$/.test(expanded)) {
    throw new Error(`Not a valid hex colour: ${hex}`)
  }

  return {
    r: parseInt(expanded.slice(0, 2), 16),
    g: parseInt(expanded.slice(2, 4), 16),
    b: parseInt(expanded.slice(4, 6), 16),
  }
}

/** WCAG 2.1 relative luminance. */
export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex)

  const channel = (value: number): number => {
    const s = value / 255
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }

  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

/** WCAG 2.1 contrast ratio, always >= 1. */
export function contrastRatio(foreground: string, background: string): number {
  const a = relativeLuminance(foreground)
  const b = relativeLuminance(background)
  const [lighter, darker] = a > b ? [a, b] : [b, a]
  return (lighter + 0.05) / (darker + 0.05)
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- tests/lib/contrast.test.ts`
Expected: PASS — 5 tests passed

- [ ] **Step 5: Write the failing token tests**

These encode the spec's accessibility constraint. They are the reason a designer cannot accidentally ship yellow body text.

Create `tests/styles/tokens.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { contrastRatio } from '@/lib/contrast'
import { APPROVED_PAIRS, tokens } from '@/styles/tokens'

describe('brand palette', () => {
  it('exposes every brand colour as a 6-digit hex', () => {
    for (const [name, value] of Object.entries(tokens.color)) {
      expect(value, `${name} must be 6-digit hex`).toMatch(/^#[0-9A-Fa-f]{6}$/)
    }
  })
})

describe('approved colour pairs', () => {
  it.each(APPROVED_PAIRS)('$fg on $bg meets $minRatio:1', ({ fg, bg, minRatio }) => {
    expect(contrastRatio(tokens.color[fg], tokens.color[bg])).toBeGreaterThanOrEqual(minRatio)
  })
})

describe('forbidden combinations (spec: yellow is a fill, never text)', () => {
  it('yellow on white fails AA and must never be used for text', () => {
    expect(contrastRatio(tokens.color.yellow, tokens.color.white)).toBeLessThan(4.5)
  })

  it('white on ember fails AA for body copy', () => {
    expect(contrastRatio(tokens.color.white, tokens.color.ember)).toBeLessThan(4.5)
  })

  it('ink on ember passes AA, so ember buttons carry ink text', () => {
    expect(contrastRatio(tokens.color.ink, tokens.color.ember)).toBeGreaterThanOrEqual(4.5)
  })
})
```

- [ ] **Step 6: Run the tests to verify they fail**

Run: `npm test -- tests/styles/tokens.test.ts`
Expected: FAIL — `Failed to resolve import "@/styles/tokens"`

- [ ] **Step 7: Define the tokens**

Create `src/styles/tokens.ts`:

```ts
export const tokens = {
  color: {
    yellow: '#FFCD05',
    ink: '#0A0500',
    ember: '#FF5733',
    surface: '#F7F4F0',
    charcoal: '#2B2320',
    cream: '#FFFDF7',
    white: '#FFFFFF',
  },
} as const

export type ColorName = keyof typeof tokens.color

/**
 * Every foreground/background combination the design system permits, with the
 * WCAG level it must clear. 4.5 = AA body text. 3 = AA large text and UI.
 * Adding a pair here without meeting its ratio fails the build.
 */
export const APPROVED_PAIRS: ReadonlyArray<{
  fg: ColorName
  bg: ColorName
  minRatio: number
}> = [
  { fg: 'ink', bg: 'white', minRatio: 4.5 },
  { fg: 'ink', bg: 'cream', minRatio: 4.5 },
  { fg: 'ink', bg: 'surface', minRatio: 4.5 },
  { fg: 'ink', bg: 'yellow', minRatio: 4.5 },
  { fg: 'ink', bg: 'ember', minRatio: 4.5 },
  { fg: 'white', bg: 'charcoal', minRatio: 4.5 },
  { fg: 'white', bg: 'ink', minRatio: 4.5 },
  { fg: 'yellow', bg: 'charcoal', minRatio: 3 },
  { fg: 'yellow', bg: 'ink', minRatio: 3 },
]
```

- [ ] **Step 8: Run the tests to verify they pass**

Run: `npm test -- tests/styles/tokens.test.ts`
Expected: PASS — all pairs clear their thresholds

If any approved pair fails, the palette is wrong, not the test. Adjust the colour, not the threshold.

- [ ] **Step 9: Commit**

```bash
git add src/lib/contrast.ts tests/lib/contrast.test.ts src/styles/tokens.ts tests/styles/tokens.test.ts
git commit -m "feat: add brand tokens with enforced WCAG contrast guarantees"
```

---

## Task 2: Typography and Tailwind wiring

**Files:**
- Create: `src/lib/fonts.ts`
- Modify: `src/app/(frontend)/globals.css`
- Modify: `src/app/(frontend)/layout.tsx`

**Interfaces:**
- Consumes: `tokens` from Task 1
- Produces: CSS custom properties `--color-yellow`, `--color-ink`, `--color-ember`, `--color-surface`, `--color-charcoal`, `--color-cream`; font variables `--font-display`, `--font-body`; Tailwind utilities `text-ink`, `bg-yellow`, `font-display`, `font-body`

- [ ] **Step 1: Install Tailwind**

```bash
npm install -D tailwindcss @tailwindcss/postcss postcss
```

- [ ] **Step 2: Declare the fonts**

Create `src/lib/fonts.ts`:

```ts
import { Fraunces, Karla } from 'next/font/google'

/**
 * Fraunces for display: an old-style variable serif with optical sizing and
 * genuine warmth — it carries the logo's hand-drawn character in a way that
 * Roboto Slab (the Elementor default) does not.
 */
export const display = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  axes: ['SOFT', 'WONK'],
})

/** Karla for body: a grotesque with quirk, highly legible at small sizes. */
export const body = Karla({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
})
```

- [ ] **Step 3: Write the stylesheet**

Replace `src/app/(frontend)/globals.css`:

```css
@import 'tailwindcss';

@theme {
  --color-yellow: #ffcd05;
  --color-ink: #0a0500;
  --color-ember: #ff5733;
  --color-surface: #f7f4f0;
  --color-charcoal: #2b2320;
  --color-cream: #fffdf7;

  --font-display: var(--font-display-family), Georgia, serif;
  --font-body: var(--font-body-family), system-ui, sans-serif;
}

@layer base {
  html {
    -webkit-text-size-adjust: 100%;
  }

  body {
    background-color: var(--color-cream);
    color: var(--color-ink);
    font-family: var(--font-body);
    text-wrap: pretty;
  }

  h1, h2, h3, h4 {
    font-family: var(--font-display);
    text-wrap: balance;
  }

  /* Visible focus for every interactive element — required by the Task 12 gate. */
  :focus-visible {
    outline: 3px solid var(--color-ember);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
}
```

- [ ] **Step 4: Apply the fonts in the layout**

In `src/app/(frontend)/layout.tsx`, put both font variables on `<html>`:

```tsx
import { body, display } from '@/lib/fonts'
import './globals.css'

export default function FrontendLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  )
}
```

Map the generated variables in `@theme`: `--font-display-family: var(--font-display)`. Verify the computed `font-family` in devtools rather than assuming.

- [ ] **Step 5: Verify visually**

Run: `npm run dev` and open `/`.
Expected: cream background, ink text, serif headings, sans body. Tab through any link and confirm a visible ember focus ring.

- [ ] **Step 6: Commit**

```bash
git add src/lib/fonts.ts src/app/\(frontend\)/globals.css src/app/\(frontend\)/layout.tsx package.json
git commit -m "feat: add Fraunces/Karla typography and Tailwind theme"
```

---

## Task 3: Settings global

**Files:**
- Create: `src/globals/Settings.ts`
- Modify: `src/payload.config.ts`

**Interfaces:**
- Consumes: `ownerOnly`, `anyone` from Phase 0 Task 4
- Produces: global slug `settings`, fetched by `payload.findGlobal({ slug: 'settings' })`, with fields `businessName`, `tagline`, `address{street,city,state,postalCode}`, `phone`, `email`, `whatsappNumber`, `openingHours[]`, `social{instagram,facebook,tiktok}`, `mapEmbedUrl`, `orderingNotice`

- [ ] **Step 1: Define the global**

Create `src/globals/Settings.ts`:

```ts
import type { GlobalConfig } from 'payload'
import { anyone, ownerOnly } from '@/access/roles'

export const Settings: GlobalConfig = {
  slug: 'settings',
  access: { read: anyone, update: ownerOnly },
  admin: { description: 'Business details used across the whole site.' },
  fields: [
    { name: 'businessName', type: 'text', required: true, defaultValue: 'SuyaBuzz' },
    { name: 'tagline', type: 'text', defaultValue: 'Local Flavour, Global Buzz' },
    {
      name: 'address',
      type: 'group',
      fields: [
        { name: 'street', type: 'text', required: true },
        { name: 'city', type: 'text', required: true, defaultValue: 'Tustin' },
        { name: 'state', type: 'text', required: true, defaultValue: 'CA' },
        { name: 'postalCode', type: 'text', required: true },
      ],
    },
    {
      name: 'phone',
      type: 'text',
      required: true,
      admin: {
        description:
          'US number in E.164 format, e.g. +17145550123. The +234 number on the old site must not be reused.',
      },
    },
    { name: 'email', type: 'email', required: true },
    {
      name: 'whatsappNumber',
      type: 'text',
      admin: { description: 'Digits only, country code first, e.g. 17145550123' },
    },
    {
      name: 'openingHours',
      type: 'array',
      admin: { description: 'Pickup windows shown on the site.' },
      fields: [
        {
          name: 'day',
          type: 'select',
          required: true,
          options: ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'],
        },
        { name: 'opens', type: 'text', required: true, admin: { description: '24h, e.g. 16:00' } },
        { name: 'closes', type: 'text', required: true, admin: { description: '24h, e.g. 20:00' } },
      ],
    },
    {
      name: 'social',
      type: 'group',
      fields: [
        { name: 'instagram', type: 'text' },
        { name: 'facebook', type: 'text' },
        { name: 'tiktok', type: 'text' },
      ],
    },
    { name: 'mapEmbedUrl', type: 'text' },
    {
      name: 'orderingNotice',
      type: 'text',
      defaultValue: 'Online ordering is coming soon — call or WhatsApp us to pre-order.',
      admin: {
        description:
          'Shown site-wide until Phase 3 ships checkout. Clear this when online ordering goes live.',
      },
    },
  ],
}
```

- [ ] **Step 2: Register the global**

In `src/payload.config.ts`:

```ts
import { Settings } from '@/globals/Settings'
// ...
globals: [Settings],
```

- [ ] **Step 3: Populate and verify**

Run `npm run dev`, open `/admin` → Settings, and fill in every required field with the **real** Tustin address, a **real US phone number**, and the actual pickup hours.

Expected: saves without validation errors.

If the real values are not yet available, enter obvious markers such as `TO CONFIRM — street` and add them to the Task 12 content checklist. Do not invent an address.

- [ ] **Step 4: Commit**

```bash
git add src/globals/Settings.ts src/payload.config.ts
git commit -m "feat: add Settings global for business details"
```

---

## Task 4: Timezone-aware opening hours

Formatting hours is the first place shop-timezone discipline shows up in the UI, and it is easy to get silently wrong.

**Files:**
- Create: `src/lib/hours.ts`, `tests/lib/hours.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `type OpeningHour = { day: string; opens: string; closes: string }`
  - `formatTime(hhmm: string): string` — `'16:00'` to `'4pm'`, `'16:30'` to `'4:30pm'`
  - `formatHours(hours: OpeningHour[]): string[]` — `['Friday 4pm – 8pm', 'Saturday 12pm – 8pm']`
  - `toSchemaOrgHours(hours: OpeningHour[]): string[]` — `['Fr 16:00-20:00']` for JSON-LD

- [ ] **Step 1: Write the failing tests**

Create `tests/lib/hours.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { formatHours, formatTime, toSchemaOrgHours } from '@/lib/hours'

describe('formatTime', () => {
  it('formats whole hours without minutes', () => {
    expect(formatTime('16:00')).toBe('4pm')
    expect(formatTime('09:00')).toBe('9am')
  })

  it('formats half hours with minutes', () => {
    expect(formatTime('16:30')).toBe('4:30pm')
  })

  it('handles noon and midnight correctly', () => {
    expect(formatTime('12:00')).toBe('12pm')
    expect(formatTime('00:00')).toBe('12am')
  })

  it('rejects malformed input', () => {
    expect(() => formatTime('25:00')).toThrow(/time/i)
    expect(() => formatTime('4pm')).toThrow(/time/i)
  })
})

describe('formatHours', () => {
  it('renders a readable line per day', () => {
    expect(
      formatHours([
        { day: 'friday', opens: '16:00', closes: '20:00' },
        { day: 'saturday', opens: '12:00', closes: '20:00' },
      ]),
    ).toEqual(['Friday 4pm – 8pm', 'Saturday 12pm – 8pm'])
  })

  it('returns an empty list for no hours', () => {
    expect(formatHours([])).toEqual([])
  })
})

describe('toSchemaOrgHours', () => {
  it('emits schema.org day abbreviations', () => {
    expect(
      toSchemaOrgHours([{ day: 'friday', opens: '16:00', closes: '20:00' }]),
    ).toEqual(['Fr 16:00-20:00'])
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- tests/lib/hours.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/hours"`

- [ ] **Step 3: Implement**

Create `src/lib/hours.ts`:

```ts
export type OpeningHour = { day: string; opens: string; closes: string }

const DAY_LABEL: Record<string, string> = {
  monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday',
  thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday',
}

const DAY_SCHEMA: Record<string, string> = {
  monday: 'Mo', tuesday: 'Tu', wednesday: 'We',
  thursday: 'Th', friday: 'Fr', saturday: 'Sa', sunday: 'Su',
}

function parse(hhmm: string): { hour: number; minute: number } {
  const match = /^(\d{2}):(\d{2})$/.exec(hhmm)
  if (!match) throw new Error(`Not a valid 24-hour time: ${hhmm}`)

  const hour = Number(match[1])
  const minute = Number(match[2])
  if (hour > 23 || minute > 59) throw new Error(`Not a valid 24-hour time: ${hhmm}`)

  return { hour, minute }
}

export function formatTime(hhmm: string): string {
  const { hour, minute } = parse(hhmm)
  const suffix = hour < 12 ? 'am' : 'pm'
  const twelve = hour % 12 === 0 ? 12 : hour % 12
  return minute === 0 ? `${twelve}${suffix}` : `${twelve}:${String(minute).padStart(2, '0')}${suffix}`
}

export function formatHours(hours: OpeningHour[]): string[] {
  return hours.map(
    ({ day, opens, closes }) =>
      `${DAY_LABEL[day] ?? day} ${formatTime(opens)} – ${formatTime(closes)}`,
  )
}

export function toSchemaOrgHours(hours: OpeningHour[]): string[] {
  return hours.map(({ day, opens, closes }) => `${DAY_SCHEMA[day] ?? day} ${opens}-${closes}`)
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- tests/lib/hours.test.ts`
Expected: PASS — 7 tests passed

- [ ] **Step 5: Commit**

```bash
git add src/lib/hours.ts tests/lib/hours.test.ts
git commit -m "feat: add opening-hours formatting"
```

---

## Task 5: SEO metadata and structured data

Local search is an explicit business goal ("rank locally for Nigerian food in Tustin"). Structured data is how that goal is served.

**Files:**
- Create: `src/lib/seo.ts`, `tests/lib/seo.test.ts`

**Interfaces:**
- Consumes: `toSchemaOrgHours` from Task 4
- Produces:
  - `buildMetadata(input: { title: string; description: string; path: string; image?: string; siteUrl: string; siteName: string }): Metadata`
  - `buildRestaurantJsonLd(input: RestaurantInput): Record<string, unknown>`

- [ ] **Step 1: Write the failing tests**

Create `tests/lib/seo.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { buildMetadata, buildRestaurantJsonLd } from '@/lib/seo'

const site = { siteUrl: 'https://suyabuzz.com', siteName: 'SuyaBuzz' }

describe('buildMetadata', () => {
  it('builds an absolute canonical URL', () => {
    const meta = buildMetadata({ ...site, title: 'About', description: 'Our story', path: '/about' })
    expect(meta.alternates?.canonical).toBe('https://suyabuzz.com/about')
  })

  it('does not double the slash on the home path', () => {
    const meta = buildMetadata({ ...site, title: 'Home', description: 'x', path: '/' })
    expect(meta.alternates?.canonical).toBe('https://suyabuzz.com')
  })

  it('sets Open Graph title, description and url', () => {
    const meta = buildMetadata({ ...site, title: 'About', description: 'Our story', path: '/about' })
    expect(meta.openGraph?.title).toBe('About')
    expect(meta.openGraph?.description).toBe('Our story')
  })

  it('omits the image entirely when none is supplied', () => {
    const meta = buildMetadata({ ...site, title: 'A', description: 'B', path: '/a' })
    expect(meta.openGraph?.images).toBeUndefined()
  })
})

describe('buildRestaurantJsonLd', () => {
  const input = {
    name: 'SuyaBuzz',
    description: 'Nigerian street food in Tustin',
    url: 'https://suyabuzz.com',
    telephone: '+17145550123',
    address: { street: '123 Example St', city: 'Tustin', state: 'CA', postalCode: '92780' },
    openingHours: [{ day: 'friday', opens: '16:00', closes: '20:00' }],
    servesCuisine: 'Nigerian',
  }

  it('declares the Restaurant type', () => {
    const ld = buildRestaurantJsonLd(input)
    expect(ld['@context']).toBe('https://schema.org')
    expect(ld['@type']).toBe('Restaurant')
  })

  it('nests a PostalAddress with the country', () => {
    const ld = buildRestaurantJsonLd(input) as any
    expect(ld.address['@type']).toBe('PostalAddress')
    expect(ld.address.addressLocality).toBe('Tustin')
    expect(ld.address.addressCountry).toBe('US')
  })

  it('converts opening hours to schema.org format', () => {
    const ld = buildRestaurantJsonLd(input) as any
    expect(ld.openingHours).toEqual(['Fr 16:00-20:00'])
  })

  it('advertises takeaway and not delivery', () => {
    const ld = buildRestaurantJsonLd(input) as any
    expect(ld.hasDeliveryMethod).toContain('http://purl.org/goodrelations/v1#PickUp')
    expect(ld.hasDeliveryMethod).not.toContain('http://purl.org/goodrelations/v1#DeliveryModeOwnFleet')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- tests/lib/seo.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/seo"`

- [ ] **Step 3: Implement**

Create `src/lib/seo.ts`:

```ts
import type { Metadata } from 'next'
import { toSchemaOrgHours, type OpeningHour } from '@/lib/hours'

export type MetadataInput = {
  title: string
  description: string
  path: string
  image?: string
  siteUrl: string
  siteName: string
}

export function buildMetadata({
  title, description, path, image, siteUrl, siteName,
}: MetadataInput): Metadata {
  const canonical = path === '/' ? siteUrl : `${siteUrl}${path}`

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName,
      type: 'website',
      ...(image ? { images: [{ url: image }] } : {}),
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      description,
    },
  }
}

export type RestaurantInput = {
  name: string
  description: string
  url: string
  telephone: string
  address: { street: string; city: string; state: string; postalCode: string }
  openingHours: OpeningHour[]
  servesCuisine: string
  image?: string
}

export function buildRestaurantJsonLd(input: RestaurantInput): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: input.name,
    description: input.description,
    url: input.url,
    telephone: input.telephone,
    servesCuisine: input.servesCuisine,
    ...(input.image ? { image: input.image } : {}),
    address: {
      '@type': 'PostalAddress',
      streetAddress: input.address.street,
      addressLocality: input.address.city,
      addressRegion: input.address.state,
      postalCode: input.address.postalCode,
      addressCountry: 'US',
    },
    openingHours: toSchemaOrgHours(input.openingHours),
    // Pickup only. Delivery is explicitly out of scope (spec section 3).
    hasDeliveryMethod: ['http://purl.org/goodrelations/v1#PickUp'],
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- tests/lib/seo.test.ts`
Expected: PASS — 8 tests passed

- [ ] **Step 5: Commit**

```bash
git add src/lib/seo.ts tests/lib/seo.test.ts
git commit -m "feat: add SEO metadata and Restaurant structured data builders"
```

---

## Task 6: Pages collection and block schema

**Files:**
- Create: `src/blocks/Hero.ts`, `RichText.ts`, `ImageText.ts`, `IconGrid.ts`, `Faq.ts`, `Cta.ts`, `Testimonials.ts`
- Create: `src/collections/Pages.ts`
- Modify: `src/payload.config.ts`

**Interfaces:**
- Consumes: access helpers from Phase 0
- Produces: `pages` collection with fields `title`, `slug` (unique), `layout` (blocks), `meta{title,description,image}`; block `slug` values exactly `hero`, `richText`, `imageText`, `iconGrid`, `faq`, `cta`, `testimonials`

- [ ] **Step 1: Define the blocks**

Create `src/blocks/Hero.ts`:

```ts
import type { Block } from 'payload'

export const Hero: Block = {
  slug: 'hero',
  labels: { singular: 'Hero', plural: 'Heroes' },
  fields: [
    { name: 'eyebrow', type: 'text' },
    { name: 'heading', type: 'text', required: true },
    { name: 'body', type: 'textarea' },
    { name: 'image', type: 'upload', relationTo: 'media' },
    {
      name: 'actions',
      type: 'array',
      maxRows: 2,
      fields: [
        { name: 'label', type: 'text', required: true },
        { name: 'href', type: 'text', required: true },
        {
          name: 'style',
          type: 'select',
          defaultValue: 'primary',
          options: [
            { label: 'Primary (yellow)', value: 'primary' },
            { label: 'Secondary (outline)', value: 'secondary' },
          ],
        },
      ],
    },
  ],
}
```

Create `src/blocks/RichText.ts`:

```ts
import type { Block } from 'payload'

export const RichText: Block = {
  slug: 'richText',
  fields: [{ name: 'content', type: 'richText', required: true }],
}
```

Create `src/blocks/ImageText.ts`:

```ts
import type { Block } from 'payload'

export const ImageText: Block = {
  slug: 'imageText',
  labels: { singular: 'Image + Text', plural: 'Image + Text' },
  fields: [
    { name: 'heading', type: 'text', required: true },
    { name: 'content', type: 'richText', required: true },
    { name: 'image', type: 'upload', relationTo: 'media', required: true },
    {
      name: 'imagePosition',
      type: 'select',
      defaultValue: 'right',
      options: [
        { label: 'Left', value: 'left' },
        { label: 'Right', value: 'right' },
      ],
    },
  ],
}
```

Create `src/blocks/IconGrid.ts`:

```ts
import type { Block } from 'payload'

export const IconGrid: Block = {
  slug: 'iconGrid',
  labels: { singular: 'Icon Grid', plural: 'Icon Grids' },
  fields: [
    { name: 'heading', type: 'text' },
    {
      name: 'items',
      type: 'array',
      minRows: 2,
      maxRows: 4,
      required: true,
      fields: [
        {
          name: 'icon',
          type: 'select',
          required: true,
          options: [
            { label: 'Clock', value: 'clock' },
            { label: 'Map pin', value: 'pin' },
            { label: 'Flame', value: 'flame' },
            { label: 'Bag', value: 'bag' },
          ],
        },
        { name: 'title', type: 'text', required: true },
        { name: 'body', type: 'textarea', required: true },
      ],
    },
  ],
}
```

Create `src/blocks/Faq.ts`:

```ts
import type { Block } from 'payload'

export const Faq: Block = {
  slug: 'faq',
  labels: { singular: 'FAQ', plural: 'FAQs' },
  fields: [
    { name: 'heading', type: 'text' },
    {
      name: 'items',
      type: 'array',
      required: true,
      minRows: 1,
      fields: [
        { name: 'question', type: 'text', required: true },
        { name: 'answer', type: 'richText', required: true },
      ],
    },
  ],
}
```

Create `src/blocks/Cta.ts`:

```ts
import type { Block } from 'payload'

export const Cta: Block = {
  slug: 'cta',
  labels: { singular: 'Call to Action', plural: 'Calls to Action' },
  fields: [
    { name: 'heading', type: 'text', required: true },
    { name: 'body', type: 'textarea' },
    { name: 'label', type: 'text', required: true },
    { name: 'href', type: 'text', required: true },
  ],
}
```

Create `src/blocks/Testimonials.ts`:

```ts
import type { Block } from 'payload'

export const Testimonials: Block = {
  slug: 'testimonials',
  fields: [
    { name: 'heading', type: 'text' },
    {
      name: 'items',
      type: 'array',
      required: true,
      minRows: 1,
      fields: [
        { name: 'quote', type: 'textarea', required: true },
        { name: 'attribution', type: 'text', required: true },
      ],
    },
  ],
}
```

- [ ] **Step 2: Create the Pages collection**

Create `src/collections/Pages.ts`:

```ts
import type { CollectionConfig } from 'payload'
import { anyone, ownerOrStaff, ownerOnly } from '@/access/roles'
import { Cta } from '@/blocks/Cta'
import { Faq } from '@/blocks/Faq'
import { Hero } from '@/blocks/Hero'
import { IconGrid } from '@/blocks/IconGrid'
import { ImageText } from '@/blocks/ImageText'
import { RichText } from '@/blocks/RichText'
import { Testimonials } from '@/blocks/Testimonials'

export const Pages: CollectionConfig = {
  slug: 'pages',
  access: { read: anyone, create: ownerOrStaff, update: ownerOrStaff, delete: ownerOnly },
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'slug', 'updatedAt'] },
  fields: [
    { name: 'title', type: 'text', required: true },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { description: 'URL path without slashes. Use "home" for the front page.' },
    },
    {
      name: 'layout',
      type: 'blocks',
      required: true,
      blocks: [Hero, RichText, ImageText, IconGrid, Faq, Cta, Testimonials],
    },
    {
      name: 'meta',
      type: 'group',
      fields: [
        { name: 'title', type: 'text' },
        { name: 'description', type: 'textarea' },
        { name: 'image', type: 'upload', relationTo: 'media' },
      ],
    },
  ],
}
```

- [ ] **Step 3: Register and verify**

Add `Pages` to `collections` in `src/payload.config.ts`, run `npm run dev`, and create a page with slug `home` containing one of each block type.

Expected: every block appears in the "Add Block" menu and saves.

- [ ] **Step 4: Commit**

```bash
git add src/blocks src/collections/Pages.ts src/payload.config.ts
git commit -m "feat: add Pages collection with seven content blocks"
```

---

## Task 7: Block renderer

**Files:**
- Create: `src/components/blocks/RenderBlocks.tsx` and one component per block
- Create: `tests/components/RenderBlocks.test.tsx`
- Modify: `vitest.config.ts`, `package.json`

**Interfaces:**
- Consumes: block slugs from Task 6
- Produces: `<RenderBlocks blocks={layout} />` rendering every known block and skipping unknown ones without throwing

- [ ] **Step 1: Install the component test toolchain**

```bash
npm install -D @testing-library/react @testing-library/jest-dom jsdom
```

(`jsdom` and `@testing-library/react` may already be present via the scaffold's integration-test setup — check `package.json` before installing, to avoid a needless version bump.)

**Do not change `vitest.config.ts`'s `environment: 'node'`.** That file is deliberately Node-only — changing it globally would slow down every other unit test (none of which touch a DOM) and defeats the reason `vitest.config.mts` exists as a separate jsdom-based config for integration tests. Instead, add `// @vitest-environment jsdom` as the literal first line of `tests/components/RenderBlocks.test.tsx` (Step 2, below) — Vitest's documented mechanism for overriding the environment on a single file. `setupFiles: ['tests/setup.ts']` is still fine to add to `vitest.config.ts`'s shared config; it only extends `expect()` with additional matchers that non-DOM tests simply never call.

Create `tests/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 2: Write the failing test**

Create `tests/components/RenderBlocks.test.tsx`:

```tsx
// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { RenderBlocks } from '@/components/blocks/RenderBlocks'

describe('RenderBlocks', () => {
  it('renders a hero heading as a level-1 heading', () => {
    render(<RenderBlocks blocks={[{ blockType: 'hero', heading: 'Taste the Real Flavor of Naija' }]} />)
    expect(
      screen.getByRole('heading', { level: 1, name: 'Taste the Real Flavor of Naija' }),
    ).toBeInTheDocument()
  })

  it('renders a call to action as a link', () => {
    render(
      <RenderBlocks
        blocks={[{ blockType: 'cta', heading: 'Ready?', label: 'Call us', href: '/contact' }]}
      />,
    )
    expect(screen.getByRole('link', { name: 'Call us' })).toHaveAttribute('href', '/contact')
  })

  it('skips an unknown block type instead of throwing', () => {
    expect(() =>
      render(<RenderBlocks blocks={[{ blockType: 'notARealBlock' } as never]} />),
    ).not.toThrow()
  })

  it('renders nothing for an empty layout', () => {
    const { container } = render(<RenderBlocks blocks={[]} />)
    expect(container).toBeEmptyDOMElement()
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test -- tests/components/RenderBlocks.test.tsx`
Expected: FAIL — `Failed to resolve import "@/components/blocks/RenderBlocks"`

- [ ] **Step 4: Implement the renderer and the Hero and Cta components**

Create `src/components/blocks/HeroBlock.tsx`:

```tsx
type Action = { label: string; href: string; style?: 'primary' | 'secondary' }

export type HeroProps = {
  eyebrow?: string
  heading: string
  body?: string
  actions?: Action[]
}

export function HeroBlock({ eyebrow, heading, body, actions }: HeroProps) {
  return (
    <section className="bg-charcoal px-6 py-20 text-white">
      <div className="mx-auto max-w-3xl">
        {eyebrow ? (
          <p className="mb-3 font-body text-sm tracking-widest text-yellow uppercase">{eyebrow}</p>
        ) : null}
        <h1 className="font-display text-4xl leading-tight md:text-6xl">{heading}</h1>
        {body ? <p className="mt-5 max-w-prose text-lg text-white/90">{body}</p> : null}
        {actions?.length ? (
          <div className="mt-8 flex flex-wrap gap-4">
            {actions.map((action) => (
              <a
                key={`${action.label}-${action.href}`}
                href={action.href}
                className={
                  action.style === 'secondary'
                    ? 'rounded-full border-2 border-yellow px-6 py-3 font-body font-bold text-yellow'
                    : 'rounded-full bg-yellow px-6 py-3 font-body font-bold text-ink'
                }
              >
                {action.label}
              </a>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  )
}
```

Yellow appears here as a background carrying ink text, and as text only on charcoal — both are approved pairs from Task 1.

Create `src/components/blocks/CtaBlock.tsx`:

```tsx
export type CtaProps = { heading: string; body?: string; label: string; href: string }

export function CtaBlock({ heading, body, label, href }: CtaProps) {
  return (
    <section className="bg-yellow px-6 py-16 text-ink">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-display text-3xl md:text-4xl">{heading}</h2>
        {body ? <p className="mt-4 text-lg">{body}</p> : null}
        <a
          href={href}
          className="mt-8 inline-block rounded-full bg-ink px-8 py-4 font-body font-bold text-white"
        >
          {label}
        </a>
      </div>
    </section>
  )
}
```

Create `src/components/blocks/RenderBlocks.tsx`:

```tsx
import { CtaBlock } from './CtaBlock'
import { HeroBlock } from './HeroBlock'

type Block = { blockType: string } & Record<string, unknown>

const COMPONENTS: Record<string, React.ComponentType<never>> = {
  hero: HeroBlock as React.ComponentType<never>,
  cta: CtaBlock as React.ComponentType<never>,
}

export function RenderBlocks({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((block, index) => {
        const Component = COMPONENTS[block.blockType]
        if (!Component) return null
        const key = `${block.blockType}-${index}`
        return <Component key={key} {...(block as never)} />
      })}
    </>
  )
}
```

Unknown block types render nothing rather than crashing the page. A content editor removing a block type from the schema must not take the site down.

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- tests/components/RenderBlocks.test.tsx`
Expected: PASS — 4 tests passed

- [ ] **Step 6: Implement the remaining five block components**

Create `RichTextBlock.tsx`, `ImageTextBlock.tsx`, `IconGridBlock.tsx`, `FaqBlock.tsx` and `TestimonialsBlock.tsx` following the same pattern, and register each in `COMPONENTS`.

Requirements binding on all five:
- Section headings are `<h2>`; the hero owns the only `<h1>`.
- `FaqBlock` uses native `<details>`/`<summary>` — keyboard accessible with no JavaScript.
- `ImageTextBlock` renders `next/image` with `alt` taken from the media document, and `sizes` set.
- `TestimonialsBlock` uses `<blockquote>` with `<cite>` for attribution.
- No colour pair outside `APPROVED_PAIRS` from Task 1.

- [ ] **Step 7: Extend the renderer test to cover all seven types**

Add a case per new block asserting its distinguishing role, for example:

```tsx
it('renders FAQ items as disclosure widgets', () => {
  render(
    <RenderBlocks
      blocks={[{ blockType: 'faq', items: [{ question: 'When do orders close?', answer: null }] }]}
    />,
  )
  expect(screen.getByText('When do orders close?')).toBeInTheDocument()
})
```

Run: `npm test -- tests/components/RenderBlocks.test.tsx`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/components/blocks tests/components tests/setup.ts vitest.config.ts package.json
git commit -m "feat: add block renderer and seven block components"
```

---

## Task 8: Site chrome — header and footer

The footer is called out specifically: the previous build shipped Astra demo lorem ipsum to production. Every link and value here comes from `Settings`.

**Files:**
- Create: `src/components/layout/Header.tsx`, `Footer.tsx`, `SkipLink.tsx`, `WhatsAppButton.tsx`
- Modify: `src/app/(frontend)/layout.tsx`

**Interfaces:**
- Consumes: `Settings` global from Task 3, `formatHours` from Task 4
- Produces: `<Header settings />`, `<Footer settings />`, both server components

- [ ] **Step 1: Build the skip link**

Create `src/components/layout/SkipLink.tsx`:

```tsx
export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-ink focus:px-4 focus:py-2 focus:text-white"
    >
      Skip to content
    </a>
  )
}
```

- [ ] **Step 2: Build the header**

Create `src/components/layout/Header.tsx` with:
- The SuyaBuzz logo as an `<img>` with `alt="SuyaBuzz"`, linking to `/`
- `<nav aria-label="Main">` containing Home, Menu, How to Order, Pickup, About, Contact
- The phone number as a `tel:` link, always visible on mobile
- A mobile menu toggle using `<details>` or a client component with `aria-expanded` and `aria-controls`
- `settings.orderingNotice` rendered as a dismissible banner when non-empty

No cart icon. There is no cart in Phase 1.

- [ ] **Step 3: Build the WhatsApp button**

Create `src/components/layout/WhatsAppButton.tsx`:

```tsx
export function WhatsAppButton({ number, message }: { number: string; message: string }) {
  if (!number) return null

  const href = `https://wa.me/${number}?text=${encodeURIComponent(message)}`

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with SuyaBuzz on WhatsApp"
      className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-ink text-white shadow-lg"
    >
      {/* inline SVG icon, aria-hidden="true" */}
    </a>
  )
}
```

The icon is decorative and marked `aria-hidden`; the accessible name comes from `aria-label`.

- [ ] **Step 4: Build the footer**

Create `src/components/layout/Footer.tsx` rendering, entirely from `Settings`:
- Business name and tagline
- Full address, `tel:` phone link, `mailto:` email link
- `formatHours(settings.openingHours)` as a list
- Social links, each with an accessible name
- Legal links: Terms, Privacy, Refund & Cancellation, Order & Pickup Policy
- Copyright with the current year

**Zero hard-coded contact values.** If `Settings` is empty, the footer renders empty regions — not placeholder text that could reach production.

- [ ] **Step 5: Wire into the layout**

In `src/app/(frontend)/layout.tsx`, fetch settings once and wrap children:

```tsx
import config from '@payload-config'
import { getPayload } from 'payload'
import { SkipLink } from '@/components/layout/SkipLink'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { WhatsAppButton } from '@/components/layout/WhatsAppButton'

export default async function FrontendLayout({ children }: { children: React.ReactNode }) {
  const payload = await getPayload({ config })
  const settings = await payload.findGlobal({ slug: 'settings' })

  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        <SkipLink />
        <Header settings={settings} />
        <main id="main">{children}</main>
        <Footer settings={settings} />
        <WhatsAppButton
          number={settings.whatsappNumber ?? ''}
          message="Hi SuyaBuzz! I'd like to pre-order."
        />
      </body>
    </html>
  )
}
```

- [ ] **Step 6: Verify keyboard access**

Run `npm run dev`. Load any page and press Tab from the very top.
Expected: "Skip to content" appears first and moves focus to `<main>`; every nav item and the WhatsApp button receive a visible ember focus ring; the mobile toggle reports `aria-expanded`.

- [ ] **Step 7: Commit**

```bash
git add src/components/layout src/app/\(frontend\)/layout.tsx
git commit -m "feat: add header, footer, skip link and WhatsApp button"
```

---

## Task 9: Page routing and the catch-all renderer

**Files:**
- Create: `src/app/(frontend)/[...slug]/page.tsx`
- Create: `src/lib/pages.ts`, `tests/lib/pages.test.ts`

**Interfaces:**
- Consumes: `Pages` from Task 6, `RenderBlocks` from Task 7, `buildMetadata` from Task 5
- Produces:
  - `slugFromSegments(segments: string[] | undefined): string` — `undefined` and `[]` both yield `'home'`
  - `generateStaticParams`, `generateMetadata`, default page export

- [ ] **Step 1: Write the failing slug tests**

Create `tests/lib/pages.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { slugFromSegments } from '@/lib/pages'

describe('slugFromSegments', () => {
  it('maps the site root to the home slug', () => {
    expect(slugFromSegments(undefined)).toBe('home')
    expect(slugFromSegments([])).toBe('home')
  })

  it('returns a single segment unchanged', () => {
    expect(slugFromSegments(['about'])).toBe('about')
  })

  it('joins nested segments with a slash', () => {
    expect(slugFromSegments(['legal', 'privacy'])).toBe('legal/privacy')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- tests/lib/pages.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/pages"`

- [ ] **Step 3: Implement**

Create `src/lib/pages.ts`:

```ts
export function slugFromSegments(segments: string[] | undefined): string {
  if (!segments || segments.length === 0) return 'home'
  return segments.join('/')
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- tests/lib/pages.test.ts`
Expected: PASS — 3 tests passed

- [ ] **Step 5: Build the route**

Create `src/app/(frontend)/[...slug]/page.tsx`:

```tsx
import config from '@payload-config'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import { RenderBlocks } from '@/components/blocks/RenderBlocks'
import { env } from '@/lib/env'
import { slugFromSegments } from '@/lib/pages'
import { buildMetadata } from '@/lib/seo'

type Params = { params: Promise<{ slug?: string[] }> }

async function findPage(slug: string) {
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
```

- [ ] **Step 6: Add the home route**

`src/app/(frontend)/page.tsx` already exists — it's Payload's scaffold demo homepage (a "Welcome to your new project" heading, an admin-panel link, a docs link, a `vscode://` file link to itself). Replace its entire contents; none of that scaffold content belongs on a real homepage. The replacement renders the same component the catch-all route uses, with no segments, so `/` resolves to the `home` slug.

- [ ] **Step 7: Verify**

Run `npm run dev`. Visit `/` and the page created in Task 6.
Expected: blocks render in order; an unknown path returns 404; `curl -s localhost:3000/about | grep canonical` shows an absolute canonical URL.

- [ ] **Step 8: Commit**

```bash
git add src/lib/pages.ts tests/lib/pages.test.ts src/app/\(frontend\)
git commit -m "feat: render CMS pages through a catch-all route"
```

---

## Task 10: Contact page with a working form

**Files:**
- Create: `src/collections/ContactMessages.ts`
- Create: `src/lib/contact-schema.ts`, `tests/lib/contact-schema.test.ts`
- Create: `src/app/(frontend)/contact/page.tsx`, `src/components/ContactForm.tsx`
- Create: `src/app/api/contact/route.ts`
- Create: `src/lib/email.ts`
- Modify: `src/payload.config.ts`, `.env.example`

**Interfaces:**
- Consumes: `Settings` from Task 3
- Produces:
  - `contactSchema` (zod) with `name`, `email`, `message`, optional `phone`, and a honeypot `website` that must be empty
  - `sendOwnerNotification(input): Promise<void>`
  - `POST /api/contact` → `200 {ok:true}` / `400 {errors}` / `500`

- [ ] **Step 1: Write the failing validation tests**

Create `tests/lib/contact-schema.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { contactSchema } from '@/lib/contact-schema'

const valid = { name: 'Ada', email: 'ada@example.com', message: 'Do you cater weddings?', website: '' }

describe('contactSchema', () => {
  it('accepts a valid submission', () => {
    expect(contactSchema.safeParse(valid).success).toBe(true)
  })

  it('rejects a malformed email', () => {
    expect(contactSchema.safeParse({ ...valid, email: 'nope' }).success).toBe(false)
  })

  it('rejects an empty name', () => {
    expect(contactSchema.safeParse({ ...valid, name: '' }).success).toBe(false)
  })

  it('rejects a message under 10 characters', () => {
    expect(contactSchema.safeParse({ ...valid, message: 'hi' }).success).toBe(false)
  })

  it('rejects a filled honeypot as spam', () => {
    expect(contactSchema.safeParse({ ...valid, website: 'http://spam.example' }).success).toBe(false)
  })

  it('treats phone as optional', () => {
    const { phone, ...withoutPhone } = { ...valid, phone: undefined }
    expect(contactSchema.safeParse(withoutPhone).success).toBe(true)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- tests/lib/contact-schema.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/contact-schema"`

- [ ] **Step 3: Implement the schema**

Create `src/lib/contact-schema.ts`:

```ts
import { z } from 'zod'

export const contactSchema = z.object({
  name: z.string().trim().min(1, 'Please tell us your name'),
  email: z.string().trim().email('Please enter a valid email address'),
  phone: z.string().trim().optional(),
  message: z.string().trim().min(10, 'Please give us a little more detail'),
  // Honeypot: hidden from humans, irresistible to bots. Must stay empty.
  website: z.string().max(0, 'Rejected').optional().default(''),
})

export type ContactInput = z.infer<typeof contactSchema>
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- tests/lib/contact-schema.test.ts`
Expected: PASS — 6 tests passed

- [ ] **Step 5: Add the ContactMessages collection**

Create `src/collections/ContactMessages.ts`:

```ts
import type { CollectionConfig } from 'payload'
import { ownerOnly, ownerOrStaff } from '@/access/roles'

export const ContactMessages: CollectionConfig = {
  slug: 'contact-messages',
  labels: { singular: 'Contact Message', plural: 'Contact Messages' },
  access: {
    // Created only by the API route, which uses overrideAccess.
    create: () => false,
    read: ownerOrStaff,
    update: ownerOrStaff,
    delete: ownerOnly,
  },
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'email', 'status', 'createdAt'] },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'email', type: 'email', required: true },
    { name: 'phone', type: 'text' },
    { name: 'message', type: 'textarea', required: true },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'new',
      options: [
        { label: 'New', value: 'new' },
        { label: 'Replied', value: 'replied' },
        { label: 'Closed', value: 'closed' },
      ],
    },
  ],
}
```

- [ ] **Step 6: Add email sending**

```bash
npm install resend
```

Add `RESEND_API_KEY` and `OWNER_NOTIFICATION_EMAIL` to `src/lib/env.ts` schema and to `.env.example`.

Create `src/lib/email.ts`:

```ts
import { Resend } from 'resend'
import { env } from '@/lib/env'
import type { ContactInput } from '@/lib/contact-schema'

export async function sendOwnerNotification(input: ContactInput): Promise<void> {
  const resend = new Resend(env().RESEND_API_KEY)

  await resend.emails.send({
    from: 'SuyaBuzz Website <website@suyabuzz.com>',
    to: env().OWNER_NOTIFICATION_EMAIL,
    replyTo: input.email,
    subject: `New enquiry from ${input.name}`,
    text: [
      `Name: ${input.name}`,
      `Email: ${input.email}`,
      `Phone: ${input.phone ?? 'not given'}`,
      '',
      input.message,
    ].join('\n'),
  })
}
```

`replyTo` matters: the owner hits reply and reaches the customer, not the website.

- [ ] **Step 7: Build the API route**

Create `src/app/api/contact/route.ts`:

```ts
import config from '@payload-config'
import { getPayload } from 'payload'
import { contactSchema } from '@/lib/contact-schema'
import { sendOwnerNotification } from '@/lib/email'

export async function POST(request: Request) {
  const parsed = contactSchema.safeParse(await request.json())

  if (!parsed.success) {
    return Response.json({ ok: false, errors: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const { website, ...message } = parsed.data

  const payload = await getPayload({ config })
  await payload.create({ collection: 'contact-messages', data: message, overrideAccess: true })

  try {
    await sendOwnerNotification(parsed.data)
  } catch (error) {
    // The message is already persisted and visible in the admin. A failed
    // notification must not tell the customer their enquiry was lost.
    console.error('Contact notification failed:', error)
  }

  return Response.json({ ok: true })
}
```

- [ ] **Step 8: Build the form**

Create `src/components/ContactForm.tsx` as a client component. Requirements:
- Every input has a `<label>` with `htmlFor`, not a placeholder standing in for one
- Errors are announced via `aria-live="polite"` and linked with `aria-describedby`
- Invalid fields carry `aria-invalid="true"`
- The honeypot `website` input is hidden with CSS, `tabIndex={-1}` and `autoComplete="off"` — never `type="hidden"`, which bots skip
- The submit button is disabled while in flight and shows a status message
- Success replaces the form with a confirmation that includes the phone and WhatsApp fallbacks

- [ ] **Step 9: Verify all three paths**

With `npm run dev`:
1. Submit valid input → success message; the record appears in `/admin` → Contact Messages; a notification email arrives.
2. Submit an invalid email → inline error, focus moves to the first invalid field, nothing is persisted.
3. Fill the honeypot via devtools and submit → 400, nothing persisted.

- [ ] **Step 10: Commit**

```bash
git add src/collections/ContactMessages.ts src/lib/contact-schema.ts src/lib/email.ts tests/lib/contact-schema.test.ts src/app/api/contact src/components/ContactForm.tsx src/app/\(frontend\)/contact src/payload.config.ts .env.example package.json
git commit -m "feat: add contact form with persistence and owner notification"
```

---

## Task 11: Discovery — sitemap, robots and structured data

**Files:**
- Create: `src/app/(frontend)/sitemap.ts`, `src/app/(frontend)/robots.ts`
- Create: `src/components/JsonLd.tsx`
- Modify: `src/app/(frontend)/layout.tsx`

**Interfaces:**
- Consumes: `buildRestaurantJsonLd` from Task 5, `Settings` from Task 3
- Produces: `/sitemap.xml`, `/robots.txt`, and a `Restaurant` JSON-LD script on every page

- [ ] **Step 1: Build the sitemap**

Create `src/app/(frontend)/sitemap.ts`:

```ts
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
```

- [ ] **Step 2: Build robots.txt**

Create `src/app/(frontend)/robots.ts`:

```ts
import type { MetadataRoute } from 'next'
import { env } from '@/lib/env'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/api/'] },
    sitemap: `${env().NEXT_PUBLIC_SERVER_URL}/sitemap.xml`,
  }
}
```

- [ ] **Step 3: Emit the structured data**

Create `src/components/JsonLd.tsx`:

```tsx
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
```

Render it in the layout using `buildRestaurantJsonLd` fed from `Settings`.

- [ ] **Step 4: Verify**

```bash
curl -s localhost:3000/sitemap.xml | head -20
curl -s localhost:3000/robots.txt
curl -s localhost:3000/ | grep -o 'application/ld+json'
```

Expected: every page listed; `/admin` disallowed; one JSON-LD block. Paste the JSON-LD into Google's Rich Results Test and confirm zero errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(frontend\)/sitemap.ts src/app/\(frontend\)/robots.ts src/components/JsonLd.tsx src/app/\(frontend\)/layout.tsx
git commit -m "feat: add sitemap, robots and Restaurant structured data"
```

---

## Task 12: Accessibility gate, content load and launch

Nothing here is optional. This task is the difference between shipping and shipping the previous build's mistakes again.

**Files:**
- Create: `docs/CONTENT-CHECKLIST.md`
- Modify: content in the CMS

**Interfaces:**
- Consumes: everything above
- Produces: a launched site at the production domain

- [ ] **Step 1: Load real content**

Through `/admin`, create and populate: `home`, `about`, `how-to-order`, `pickup`, `contact`, `legal/terms`, `legal/privacy`, `legal/refund-cancellation`, `legal/order-pickup-policy`.

`how-to-order` must state the cycle in plain prose — order any time, orders close **Wednesday 11:59pm Pacific**, pickup **Friday or Saturday** — and say that online checkout is coming, with phone and WhatsApp as the current route.

Do not write live countdown copy. `cycleFor()` arrives in Phase 2.

- [ ] **Step 2: Purge placeholder content**

```bash
grep -rniE "lorem|ipsum|dolor sit|your-?website|street name, ny|578-393-4937|\+234|payload blank template|blank template using payload" \
  --include=*.tsx --include=*.ts --include=*.css src
```

The specs and plans under `docs/superpowers/` are deliberately excluded: they *describe* the old site's lorem-ipsum footer and its `+234` number, so scanning them would never return zero. Only shipping source is checked.

Then query the database for the same patterns across page content:

```bash
psql "$DATABASE_URI" -c "select slug from pages where lower(title) ~ 'lorem|ipsum';"
```

Expected: **zero matches** from both. The `+234` pattern specifically catches the old Nigerian phone number; the others catch the Astra demo footer.

- [ ] **Step 3: Run the accessibility gate**

Invoke the `web-design-guidelines` skill against the frontend source. Then verify manually on `/`, `/how-to-order` and `/contact`:

- [ ] Tab from the top: skip link first, logical order, visible focus everywhere, no keyboard trap
- [ ] One `<h1>` per page; heading levels never skip
- [ ] Every image has meaningful `alt`; decorative images `alt=""`
- [ ] Form labels programmatically associated; errors announced
- [ ] Colour pairs limited to `APPROVED_PAIRS` — spot-check with devtools
- [ ] Tap targets at least 44×44px on mobile
- [ ] Zoom to 200% without horizontal scrolling
- [ ] `prefers-reduced-motion` respected

Fix everything found. Re-run.

- [ ] **Step 4: Run Lighthouse**

Against the production build (`npm run build && npm start`), mobile preset.
Target: Accessibility 100, SEO ≥ 95, Performance ≥ 90.

Record the figures in `docs/CONTENT-CHECKLIST.md`. Accessibility below 100 blocks launch; the other two are recorded and triaged.

- [ ] **Step 5: Add analytics**

Add GA4 via `@next/third-parties`:

```bash
npm install @next/third-parties
```

Render `<GoogleAnalytics gaId={...} />` in the layout, reading the ID from env. Reuse the existing property (`G-WBHE5BFBY1`) only if the owner still controls it; otherwise create a new one.

- [ ] **Step 6: Verify the full check suite**

```bash
npm run lint && npm run typecheck && npm test && npm run build
```

Expected: all green. CI must also be green.

- [ ] **Step 7: Deploy and verify in production**

Push to `main`, let Hostinger build, then confirm on the live domain:

- [ ] `/api/health` returns `status: ok`
- [ ] Every page in Step 1 loads
- [ ] Footer shows the real address, real US phone and real hours
- [ ] Contact form submits and the owner receives the email
- [ ] WhatsApp button opens a chat with the real number
- [ ] `/sitemap.xml` and `/robots.txt` resolve
- [ ] An uploaded image survives a redeploy

- [ ] **Step 8: Record the outcome and commit**

Write `docs/CONTENT-CHECKLIST.md` listing every page shipped, every asset still outstanding, the Lighthouse figures, and any copy still marked `TO CONFIRM`.

```bash
git add docs/CONTENT-CHECKLIST.md
git commit -m "docs: record Phase 1 content and accessibility verification"
git push
```

---

## Phase 1 exit criteria

- [ ] `npm run lint && npm run typecheck && npm test && npm run build` green locally and in CI
- [ ] All nine pages live and editable through `/admin` by a non-technical user
- [ ] Zero matches for the placeholder grep in Step 2, including `+234`
- [ ] Lighthouse Accessibility 100 on mobile
- [ ] Contact form persists **and** notifies
- [ ] Structured data passes Google's Rich Results Test
- [ ] The old WordPress site is no longer the site served at `suyabuzz.com`

---

## Deferred to later plans

| Item | Plan |
|---|---|
| `cycleFor()`, live countdown, cutoff messaging | Phase 2 |
| Products, categories, menu page, stock display | Phase 2 |
| Cart, checkout, Stripe, order emails | Phase 3 |
| Blog collection and posts | Phase 5 |
| Catering enquiry form (reuses Task 10's pattern) | Phase 3 |
| Per-product reviews | Phase 5 |
