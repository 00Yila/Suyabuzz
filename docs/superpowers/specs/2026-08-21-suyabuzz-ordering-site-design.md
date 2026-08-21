# SuyaBuzz — Pre-Order & Pickup Site: Design Spec

**Date:** 2026-08-21
**Status:** Approved for implementation planning
**Supersedes:** the WordPress/Elementor build at suyabuzz.com

---

## 1. Context

SuyaBuzz sells Nigerian street food — suya (spiced beef skewers), masa (rice cakes) and kunu (a cold drink) — from Tustin, California, to a primarily diaspora-Nigerian and adventurous-foodie audience aged 25–45. It is **pickup only, Fridays and Saturdays**. Delivery is not offered.

The business runs on a **weekly production cycle**: customers pre-order during the week, ordering closes Wednesday night, the kitchen buys and preps on Thursday, and food is collected Friday and Saturday.

An earlier build exists on WordPress (Blocksy + Elementor + WooCommerce + ~15 plugins). Its homepage design is competent, but the build is unfinished — the footer still carries Astra demo lorem ipsum, product prices are placeholders ($900 "Fit Fuel Pack", $5,000 "Ultimate Event Combo"), and the site shows a +234 Nigerian phone number for a California business. Critically, the pickup-scheduling and order-cutoff behaviour never worked properly, because that weekly-cycle model is not something WooCommerce's plugin ecosystem expresses cleanly.

This spec describes a replacement: a custom application in which the weekly cycle is first-class domain logic rather than plugin configuration.

## 2. Goals

1. Take pre-orders for Friday/Saturday pickup with a Wednesday-night cutoff that is always correct and always clearly communicated.
2. Never oversell food the kitchen cannot produce.
3. Give the owner a single Thursday-morning view of exactly what to buy and grill.
4. Take payment up front so the kitchen's ingredient spend is never at risk from no-shows.
5. Hand the business a site the owner can run alone: menu, prices, stock, schedule, content and orders all editable without a developer.
6. Replace the current unfinished site early, before ordering is complete.

## 3. Non-goals

- **Delivery.** Explicitly out of scope. The data model must not assume pickup-only forever, but no delivery UI, pricing or routing is built.
- **Multi-currency / Nigerian payment rails.** The business banks in the US; pricing is USD and payments are Stripe. The payment layer sits behind an interface so a second rail is a contained change, but none is built.
- **Point-of-sale integration.** Walk-up and phone orders are recorded manually by the owner if needed.
- **Loyalty programme, gift cards, subscriptions.**
- **A drag-and-drop page builder.** Content is edited through structured fields (see §11).

---

## 4. Business rules (normative)

These rules are the contract. Everything in §5 onward implements them.

**BR-1 — Pickup days.** Orders are collected on Friday or Saturday. The customer chooses one day and one time slot within it.

**BR-2 — Cutoff.** Ordering for a given pickup weekend closes at **Wednesday 23:59:59** in the shop's timezone (`America/Los_Angeles`). The cutoff day and time are configurable in settings; the timezone is configurable but must never be implicit.

**BR-3 — Rolling window.** The store never closes. Once a cutoff passes, the site automatically advertises the **next** pickup weekend. Every customer-facing surface states which weekend is being ordered for.

**BR-4 — Weekly stock.** Each product carries a weekly quantity. When that quantity is exhausted for a cycle, the product shows as sold out **for that cycle only** and the rest of the menu stays open. Stock resets automatically each cycle without admin action.

**BR-5 — Slot capacity.** Each pickup slot has a maximum order count. A full slot is not selectable.

**BR-6 — Payment before production.** An order enters the kitchen list only when Stripe confirms payment. Unpaid orders are never counted toward stock or slot capacity beyond a short in-flight window.

**BR-7 — Price immutability.** An order's line items record the product name, options and unit price as they were at purchase. Later price changes never alter historical orders.

**BR-8 — Closures.** The owner can mark a weekend or date range closed. Closed pickup days are not offered; if both days of the next weekend are closed, the cycle rolls forward to the next open weekend.

**BR-9 — Catering is out-of-cycle.** Catering is an enquiry, not a purchase. It is not bound by the Wednesday cutoff and is quoted individually.

---

## 5. Architecture

### 5.1 Stack

| Layer | Choice |
|---|---|
| Application | Next.js 15, App Router, TypeScript |
| CMS + admin | Payload CMS 3, embedded in the same Next.js app at `/admin` |
| Database | PostgreSQL on Neon (free tier), via Payload's Drizzle Postgres adapter |
| Payments | Stripe (Checkout + webhooks) |
| Transactional email | Resend |
| Media storage | Local persistent disk on the Hostinger instance, via Payload uploads |
| Hosting | Hostinger Business — Node.js web app, GitHub push to auto-build |
| Scheduled work | Hostinger hPanel cron, calling protected API routes with a shared secret |

**Why Payload embedded rather than a separate CMS.** One codebase, one database, one deploy, one login to hand over. Payload supplies collections, authentication, media handling, role-based access, rich text and a generated admin UI, so the ordering rules can live next to the data they govern rather than being split across two systems.

**Why not Hostinger's MySQL.** Payload officially supports PostgreSQL, SQLite and MongoDB. There is no MySQL adapter. Hostinger provides a built-in Database Connect Wizard for external Postgres (Supabase), so an external managed Postgres is a supported path on this host.

**Why Neon rather than Supabase for Postgres.** Both have adequate free tiers. Neon scales to zero and resumes in about a second, and does not delete data when free limits are reached. Supabase free *pauses a project after seven days with no database queries* — harmless once the site is live and taking traffic, but a trap during a quiet pre-launch period.

**Why not Vercel.** Vercel's Hobby plan is restricted by their Terms of Service to personal, non-commercial use, and explicitly names "any method of requesting or processing payment from visitors of the site" as prohibited commercial usage, with the right to disable the deployment without notice. A checkout is precisely the banned case, so Vercel would require Pro at $20/month/seat. Hostinger Business is already paid for, permits commercial use, runs a persistent Node process, and — unlike both Vercel and Netlify — has a **persistent filesystem**, so Payload's image uploads work without external object storage.

### 5.2 The ordering cycle is a derived value, not stored state

This is the central design decision.

The target pickup weekend is **computed from the current time** by a pure function, rather than maintained by a scheduled job that flips a "current week" record. A cron job that flips state can fail, drift, double-fire, or leave the site advertising a weekend that has already passed. A pure function cannot.

```
cycleFor(
  now: Date,
  config: { timezone, cutoffDay, cutoffTime, pickupDays },
  closures: DateRange[]
) -> {
  cycleKey:     string      // ISO year-week of the pickup weekend, e.g. "2026-W35"
  cutoffAt:     Date        // UTC instant
  pickupDates:  Date[]      // the open pickup days of that weekend
  isOpen:       boolean
}
```

**Algorithm**

1. Express `now` in the shop timezone.
2. Take the cutoff instant of the current ISO week (Wednesday 23:59:59 shop time). Friday and Saturday fall in the same ISO week as their preceding Wednesday, so the week key is unambiguous.
3. If `now` is at or before that cutoff, the candidate weekend is this week's Friday and Saturday. Otherwise advance one week and recompute.
4. Drop any candidate pickup day covered by a closure. If a weekend has no open days left, advance one week and repeat, to a bounded maximum of 8 iterations.
5. If the bound is exceeded, return `isOpen: false` — the site shows "ordering paused" rather than an incorrect date.

**Worked example.** At 10:00 on Thursday 20 August 2026, the cutoff for that ISO week (Wednesday 19 August, 23:59:59 PT) has passed. The function advances one week and returns `cycleKey: "2026-W35"`, `cutoffAt: Wednesday 26 August 23:59:59 PT`, `pickupDates: [Friday 28 August, Saturday 29 August]`.

**Consequences**

- Every surface — countdown, menu header, cart, checkout, receipt, confirmation email — reads from this one function, so they cannot disagree.
- The site is correct after a restart, an outage or a failed deploy, because there is no state to become stale.
- Cron is responsible only for *sending email*, which is a far safer job to have fail.
- The function is exhaustively unit-testable from a table of timestamps.

### 5.3 Timezone

All timestamps are stored as UTC `timestamptz` and rendered in the shop timezone (`America/Los_Angeles`). The timezone is never implicit and never taken from the browser for business logic — only for display hints.

This matters concretely: part of the team operates on a Nigerian phone number, and "Wednesday night" in Lagos is mid-Wednesday-afternoon in Tustin. Timezone confusion is the single most likely source of a customer-facing error in this system.

### 5.4 Stock is enforced at payment, not at add-to-cart

Two customers may both hold the last ten skewers in their carts. Only the one whose payment confirms receives them.

Stock therefore decrements **inside a database transaction triggered by the Stripe webhook**, guarded by a row-level check that the remaining quantity is sufficient. It is never decremented when a cart changes.

If the decrement fails because the item sold out in the interval between checkout starting and payment confirming, the system **automatically refunds the payment in full and sends an apology email**. At the expected volume that interval is seconds to minutes and the failure is rare, but it must be handled rather than assumed away.

*Future upgrade, not built now:* if volume grows enough to make this common, add a short (≈15 minute) stock reservation created when a Checkout Session opens and released on expiry.

---

## 6. Data model

Payload collections. Field lists are indicative, not exhaustive.

### Ordering

**`products`** — `name`, `slug`, `category` (rel), `description` (rich text), `images[]`, `basePrice`, `options[]`, `weeklyStockTemplate`, `taxCategory`, `isActive`, `sortOrder`, SEO fields.

`options[]` is a repeating group of option sets, each with a label and choices carrying a `priceDelta`. This single structure covers both Suya's spice level (Mild / Medium / Hot, all `+$0.00`) and size or quantity variants (`+$N`), so no separate variant system is needed.

**`categories`** — `name`, `slug`, `sortOrder`. Initially: Suya, Masa, Drinks, Combos.

**`cycles`** — `cycleKey` (unique), `cutoffAt`, `pickupDates`, `status` (`open` | `locked` | `completed`), `ownerNotes`. Created lazily when a cycle's first order is placed. Holds the run-sheet and any per-week notes.

**`cycleStock`** — `cycleKey`, `product` (rel), `quantity` (copied from the template at cycle creation), `sold`. Unique on (`cycleKey`, `product`).

This is the counter that actually decrements. `products.weeklyStockTemplate` is only a template: each new cycle starts from it. The owner sets "200 skewers per week" once and every week resets automatically with no admin action.

**`pickupSlots`** — `dayOfWeek`, `startTime`, `endTime`, `maxOrders`, `isActive`. Templates, materialised per cycle.

**`orders`** — `orderNumber` (human-readable, e.g. `SB-2635-014`), `customer` (rel, nullable), `guest` (`name`, `email`, `phone`), `cycleKey`, `pickupDate`, `pickupSlot`, `lineItems[]`, `subtotal`, `tax`, `total`, `stripePaymentIntentId` (unique), `status`, `customerNotes`, `createdAt`.

`status` transitions: `pending` → `paid` → `preparing` → `ready` → `collected`, with `cancelled`, `refunded` and `no_show` as terminal branches.

`lineItems[]` **snapshots** product name, selected options and unit price at time of purchase (BR-7). Orders are financial records, not live joins to the menu.

**`closures`** — `startDate`, `endDate`, `reason`. Consumed by `cycleFor()` (BR-8).

**`cateringEnquiries`** — `name`, `email`, `phone`, `eventDate`, `headcount`, `message`, `status`, `internalNotes`.

### People

**`users`** with a `role` field:

| Role | Access |
|---|---|
| `owner` | Everything |
| `staff` | Orders and order status only. **Cannot** change prices, products or settings. |
| `customer` | No admin access; own orders only via the account area |

Guest orders are linked to a customer record when that customer later claims the account via a verified email address.

### Content

**`pages`**, **`posts`**, **`faqs`**, **`testimonials`**, and a **`settings`** global holding: business address, public phone, WhatsApp number, social links, opening hours, cutoff day and time, timezone, map embed, and tax configuration.

---

## 7. Site map

Sixteen route patterns — three of them CMS-driven templates — replace the twenty hand-built pages in the original Elementor plan, while supporting unlimited products, posts and legal pages. The original plan listed `Product – Suya`, `Product – Masa` and `Product – Kunu` as three separate pages and three blog posts as three more; these become two templates the owner populates herself.

```
/                      Home
/menu                  Menu and ordering
/menu/[slug]           Product detail (template)
/cart
/checkout
/order/[orderNumber]   Confirmation and status
/how-to-order          The cycle explained, plus FAQ
/pickup                Location, map, slots, collection instructions
/about
/contact
/catering              Enquiry form
/account               Order history, one-tap reorder, details
/blog, /blog/[slug]    Blog index and post (template)
/legal/[slug]          Terms, Privacy, Refund & Cancellation, Order & Pickup Policy
/admin                 Payload admin
```

**Removed from the original plan:** a standalone Testimonials page (becomes a homepage section plus per-product reviews) and a standalone Gallery page (folded into Home and About). Both existed to fill a sitemap rather than to serve a visitor.

**Home** carries: hero, "how it works" with the live cycle countdown, signature dishes, this week's menu, story teaser, testimonials, newsletter signup.

**`/menu`** is the primary conversion page. It states the active cycle prominently — for example, "Ordering for pickup Fri 28 / Sat 29 Aug — closes in 2d 4h" — with per-item stock state and option selection.

---

## 8. Ordering flow

1. **Browse.** `/menu` renders products for the active cycle from `cycleFor()`. Sold-out items are shown, visibly disabled, with the reason ("sold out this week"), not hidden.
2. **Configure.** Customer selects options; price updates from `basePrice` plus option deltas.
3. **Cart.** Server-side cart keyed to a session. The active `cycleKey` is recorded on the cart at creation.
4. **Slot.** Customer chooses a pickup day from `pickupDates` and an available slot. Full slots are disabled.
5. **Details.** Guest checkout by default: name, email, phone. No password wall in front of payment (see §9).
6. **Cycle re-validation.** Before creating a Stripe Checkout Session, `cycleFor()` is called again. If the cutoff has passed since the cart was created, the order is **not** silently moved. The customer is shown an explicit confirmation: "The cutoff just passed. Your order moves to Fri 4 Sep — confirm?"
7. **Pay.** Stripe Checkout: card, Apple Pay, Google Pay, Link.
8. **Confirm.** The webhook, idempotently keyed on `stripePaymentIntentId`, opens a transaction that decrements `cycleStock` and slot capacity, sets the order to `paid`, and enqueues the confirmation email. Failure to decrement triggers automatic refund and apology (§5.4).
9. **Account creation.** On successful payment, a customer record is created silently and a magic link emailed: track this order, reorder in one tap. The customer is never asked to invent a password.

---

## 9. Accounts and authentication

**Guest checkout with automatic account creation after payment.** Requiring an account before checkout costs a measurable share of first-time buyers; requiring nothing costs the customer database the business needs for retention marketing. This gets both.

Authentication is passwordless by magic link. Guest orders placed with an email address are merged into the account when that address is verified.

---

## 10. Payments

**Provider:** Stripe. **Currency:** USD. **Timing:** payment in full at checkout (BR-6).

**Methods:** card, Apple Pay, Google Pay, Link. Apple Pay and Google Pay will carry the majority of mobile checkouts and materially reduce friction.

**ACH is deliberately restricted to catering.** "Bank transfer" in the US context means ACH debit, which settles over three to five days and can fail *after* settlement appears to succeed. Against a Wednesday cutoff and a Friday pickup, that means food already bought and grilled against a payment that later bounces. ACH is therefore offered only on catering invoices, where the lead time makes it safe.

**Catering** (BR-9) is quoted manually and paid via a Stripe payment link, typically with a deposit. It does not pass through the weekly checkout.

**Sales tax.** California generally taxes prepared hot food sold to go, and generally does not tax cold food to go. Suya and kunu may therefore be treated differently, so tax cannot be a single site-wide rate. The model carries a `taxCategory` per product and integrates Stripe Tax for calculation.

*The classification of each product is a business and accounting decision, not a technical one, and must be confirmed by the owner's accountant before launch.* Getting it wrong creates a liability for the business.

**Stripe account ownership — a hard constraint.** The Stripe account must be opened **by the owner, in the business's legal name, using the business's EIN and bank account**, before any real payment is taken. Processing payments for another business through a developer's own Stripe account violates Stripe's terms and constitutes money transmission; accounts are frozen for this, typically with the balance inside. The developer is added as a team member with developer access. Hosting, domain, database and email accounts may be held by the developer and re-invoiced; this one may not.

---

## 11. Admin and CMS

The owner opens `/admin` and lands on **This Week**, a dashboard oriented around production rather than around a list of orders:

- Countdown to the current cutoff; order count and revenue for the cycle.
- **Prep list** — quantities aggregated by product *and option*: "Suya — Mild 47, Medium 23, Hot 12; 82 skewers to grill, 118 of 200 weekly stock still available."
- **Slot load** — orders per slot, with full slots flagged.
- Printable run-sheets: one grouped by prep item for the kitchen, one sorted by pickup slot for the counter.

This aggregate view is the principal justification for building rather than configuring. A stock e-commerce admin shows forty-two orders to scroll; the kitchen needs "grill 82 skewers, 47 of them mild."

Remaining admin areas: **Orders** (filter by cycle, day, slot and status; mark ready and collected; refund), **Menu** (products, options, prices, weekly stock, sold-out toggle, photos), **Schedule** (slots, closures, pause ordering), **Content** (homepage blocks, pages, FAQ, blog, testimonials), **Settings**.

**Editing model.** Content is edited through structured fields, not a drag-and-drop page builder. Everything that changes week to week belongs to the owner; the layout, spacing, responsive behaviour and colour system stay in code, where they cannot be broken by accident. This is a deliberate trade of layout freedom for a site that still looks and works correctly a year after handover.

---

## 12. Design direction

The brand equity is retained: **yellow `#FFCD05`** and **near-black `#0A0500`**, with **`#FF5733`** available as an accent and `#F5F5F5` for backgrounds.

The design is drawn from the logo's actual character — hand-drawn charcoal linework, a warm plate, the script "Local Flavour, Global Buzz" — rather than from the stock Elementor treatment currently live. Direction: ember and charcoal warmth, large editorial food photography, real texture. Roboto Slab is treated as a default to be replaced, not a decision: headings get a face with more character, body gets a clean workhorse.

**Accessibility constraint carried into the design system:** `#FFCD05` on white fails WCAG AA for text at roughly 1.5:1. Yellow is a fill colour with near-black text on it (approximately 14:1), never a text colour on light backgrounds.

---

## 13. Error handling and edge cases

| Case | Handling |
|---|---|
| Cart held across the cutoff | Re-validate at Checkout Session creation *and* at webhook. Never move the order silently; require explicit confirmation of the new weekend. |
| Item sells out between cart and payment | Atomic decrement in a transaction; on failure, automatic full refund plus apology email. |
| Stripe webhook never arrives | Reconciliation job queries Stripe for PaymentIntents with no matching order. A paid order that never appeared is the worst failure in the system. |
| Webhook arrives twice | Unique constraint on `stripePaymentIntentId`; handler is idempotent. |
| Payment succeeds, database write fails | Handler returns non-2xx so Stripe retries into the idempotent path. |
| Daylight saving transition | Cutoff and slots computed in shop time; tested across both the March and November boundaries. |
| Holiday or travel | `closures` cause `cycleFor()` to roll to the next open weekend (BR-8). |
| Customer does not collect | `no_show` status; the owner's stated policy is published on the Refund & Cancellation page. |
| Guest later creates an account | Prior guest orders merge on email verification. |
| Ordering paused | If no open weekend is found within the bound, the site states that ordering is paused rather than showing a wrong date. |

---

## 14. Testing

| Layer | Scope |
|---|---|
| Unit — `cycleFor()` | Table-driven across every hour of Wednesday, both DST transitions, year-end ISO week rollover, single-day and full-weekend closures, and the paused bound. Written test-first. |
| Unit — pricing | Base price plus option deltas; tax category selection. |
| Integration — stock | Concurrent webhook delivery against the last unit of stock, asserting that overselling is impossible and that the loser is refunded. |
| Integration — webhooks | Duplicate delivery, out-of-order delivery, and the reconciliation job. |
| E2E (Playwright) | Browse, select options, cart, choose slot, pay with a Stripe test card, receive webhook, land on confirmation, email enqueued, order visible in admin. |
| Accessibility | `/web-design-guidelines` run as a review gate at the end of Phase 1 and Phase 3: full keyboard path through the order flow, contrast audit, focus states, tap-target sizing, screen-reader pass on checkout. |
| Manual | Handover walkthrough performed with the owner. |

`cycleFor()` decides what every page says. It carries disproportionate test weight by design.

---

## 15. Infrastructure and accounts

| Service | Purpose | Cost | Held by |
|---|---|---|---|
| Hostinger Business | Node app, media disk, cron | Already paid | Developer, transferable |
| Neon | PostgreSQL | Free tier | Developer, transferable |
| Resend | Transactional email | Free tier (3,000/mo) | Developer, transferable |
| Stripe | Payments | Per-transaction | **Owner — mandatory (§10)** |
| suyabuzz.com | Domain (at Hostinger) | Already paid | Developer, transferable |

**Two items to verify on Hostinger before Phase 0 completes:**

1. That the existing Business plan exposes the **Web Apps / Node.js** section in hPanel. Not all older plans were migrated to it.
2. That the **server region is US-West**. Customers are in Tustin; a European region imposes a latency penalty on every request.

**Scheduled jobs** (Hostinger cron calling protected API routes with a shared secret):

| Job | Schedule (shop time) |
|---|---|
| "Cutoff is tonight" reminder to customers with abandoned carts | Wednesday, late morning |
| Weekly run-sheet email to the owner | Thursday, shortly after midnight |
| "Your pickup is tomorrow" reminder | Thursday evening |
| Stripe reconciliation sweep | Hourly |

Cron failures degrade gracefully: no scheduled job is responsible for the correctness of the site's state (§5.2).

**Notifications.** Automated email via Resend for order confirmation, cutoff reminder, pickup reminder and "order ready", plus a click-to-chat WhatsApp button for human contact — the channel this audience actually uses to reach a small vendor. SMS is deliberately deferred: US business SMS requires A2P 10DLC brand and campaign registration with the carriers, with associated fees and per-message cost. Revisit only if measured no-show rates justify it.

---

## 16. Handover

The owner receives:

- A `RUNBOOK.md` covering the weekly routine, closing a week early, pausing ordering, issuing refunds, and what to do when Stripe or email misbehaves.
- A short screen recording of the same.
- A credentials inventory naming every service, what it does, who owns it, and what it costs.
- A live training session in which the owner performs a full weekly cycle unaided while the developer observes.

---

## 17. Phasing

| Phase | Contents | Independently shippable |
|---|---|---|
| **0 — Prove the pipe** | Repository, Next.js + Payload skeleton, Neon connection, deploy to Hostinger, CI | No |
| **1 — Content site** | Design system from the logo, Home / About / Contact / How to Order / Pickup / legal pages, CMS blocks, SEO, analytics | **Yes — replaces the current site** |
| **2 — Menu and cycle** | Products, categories, `cycleFor()`, countdown, stock display. No checkout. | Yes — menu live, orders by phone |
| **3 — Ordering** | Cart, slots, guest checkout, Stripe, webhooks, emails, confirmation | **Yes — launch** |
| **4 — Admin and handover** | This Week dashboard, run-sheets, roles, runbook, training | Yes |
| **5 — Later** | Reviews, blog content, waitlist, delivery groundwork | Yes |

**Phase 0 runs first, deliberately.** A hello-world Next.js + Payload app is deployed to Hostinger with a live Neon connection before any business logic is written. Hostinger's Node offering on shared plans is less battle-tested than their PHP stack; if that environment cannot run a persistent Node process against an external Postgres, that must surface in week one, not week five.

**Phase 1 ships on its own,** so the current half-finished WordPress site is retired early rather than remaining live throughout the build.

No calendar estimate is given here: it depends on developer availability, which is not yet established. For calibration, this is materially larger than the three-to-four weeks in the original brief, which was scoped for assembling WordPress plugins rather than building an ordering engine.

---

## 18. External dependencies

These are owner-supplied and sit on the critical path. The previous build did not fail technically — it failed on content, and a custom build has no theme defaults to hide gaps.

| Item | Needed by | Owner |
|---|---|---|
| Real photography: suya on the grill, masa, kunu, the pickup point, the owner | Phase 1 | Business |
| Final copy: story, mission, FAQ answers | Phase 1 | Business |
| Correct Tustin address, opening hours, and a **US phone number** (the current +234 number must be replaced) | Phase 1 | Business |
| Refund, cancellation and no-show policy text | Phase 1 | Business |
| Real prices for every product and option | Phase 2 | Business |
| Weekly production capacity per item | Phase 2 | Business |
| Pickup slot definitions and capacity | Phase 2 | Business |
| Product tax classification, confirmed by an accountant | Phase 3 | Business + accountant |
| Stripe account in the business's legal name, with EIN and bank details | Phase 3 | Business |
| Hostinger plan and region verification (§15) | Phase 0 | Developer |

---

## 19. Decision log

| Decision | Chosen | Rejected, and why |
|---|---|---|
| Platform | Custom Next.js application | Finish WordPress (the weekly cycle fights the plugin stack); headless WordPress (custom-build cost plus plugin constraints); SaaS ordering (cannot express the Wednesday cutoff) |
| Ordering window | Rolling — auto-advances at cutoff | Hard close Thursday–Saturday (loses post-pickup demand); manual open/close (correct only if someone remembers) |
| Capacity | Timed slots plus per-item weekly stock | Day-only (no congestion or sell-out control); slots without stock (can sell food that cannot be made) |
| Payment rail | Stripe, USD | Paystack/Flutterwave (money banks in the US); dual-rail (doubles integration and reconciliation for no current benefit) |
| Payment timing | Prepaid in full, catering excepted | Pay at pickup (kitchen buys ingredients against orders that can evaporate); deposit split (two payment events per order, cash at the counter) |
| Accounts | Guest checkout, account created after payment | Account required (measurable first-time drop-off); passwordless-only login (round-trip on every login) |
| CMS scope | Structured fields, owner controls everything that changes | Page builder (non-technical editors reliably break mobile, contrast and speed) |
| Hosting | Existing Hostinger Business | Vercel Hobby (**ToS prohibits payment processing**); Netlify Free (ephemeral filesystem, serverless cold starts) |
| Database | Neon Postgres | Hostinger MySQL (no Payload adapter); Supabase (free tier pauses after 7 days idle) |
| Notifications | Email plus WhatsApp click-to-chat | SMS (A2P 10DLC registration overhead); WhatsApp Business API (heaviest integration to hand over) |
| Catering | Enquiry form and manual quote | Add-to-cart product (nobody card-charges five figures without a conversation) |
