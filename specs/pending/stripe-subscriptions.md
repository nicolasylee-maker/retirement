# Spec: Stripe Subscriptions

## Status
Pending implementation

## Overview
Integrate Stripe Billing for paid subscriptions. Two prices (monthly + annual), 7-day free trial, hosted Customer Portal for self-service billing. Subscription state is synced to Supabase via a webhook Edge Function and read client-side to gate features.

## Products & Pricing

### Stripe Product: "Ontario Retirement Planner — Premium"

| Price | Amount | Stripe billing interval |
|---|---|---|
| Monthly | $5/month CAD | `recurring.interval = month` |
| Annual | $44/year CAD (~$3.67/mo) | `recurring.interval = year` |

Both prices have a **7-day free trial** (`trial_period_days = 7`).

Create these in the Stripe Dashboard (or via Stripe CLI). Save the price IDs to environment variables:
```
STRIPE_MONTHLY_PRICE_ID=price_xxx
STRIPE_ANNUAL_PRICE_ID=price_xxx
```

## User Flows

### Upgrade Flow
1. Free user hits a gated feature → sees `<UpgradePrompt>` (defined in feature-gating spec)
2. Clicks "Start free trial" → hits `/api/create-checkout-session` Edge Function
3. Edge Function creates a Stripe Checkout session (with trial) and returns the URL
4. App redirects to Stripe Checkout (hosted page)
5. User enters card → trial starts
6. Stripe fires `customer.subscription.created` webhook
7. Edge Function writes subscription row to `public.subscriptions`
8. User is redirected back to app → subscription context refreshes → paid features unlocked

### Manage Billing Flow
1. Signed-in user clicks "Billing & Plan" from Account menu
2. App hits `/api/create-portal-session` Edge Function
3. Edge Function creates Stripe Customer Portal session and returns URL
4. User redirected to Stripe Customer Portal (cancel, upgrade/downgrade, update card)
5. On return: subscription context refreshes

### Cancellation
1. User cancels in Customer Portal
2. Stripe fires `customer.subscription.updated` with `cancel_at_period_end = true`
3. Webhook handler updates `subscriptions` table
4. Paid features remain active until `current_period_end`
5. On `customer.subscription.deleted`: status set to `canceled`, features revoked

## Supabase Edge Functions

### `supabase/functions/stripe-webhook/index.ts`
Handles all Stripe webhook events. Uses Stripe signature verification.

**Events handled:**
| Event | Action |
|---|---|
| `customer.subscription.created` | Upsert subscription row, set status |
| `customer.subscription.updated` | Update status, `cancel_at_period_end`, period dates |
| `customer.subscription.deleted` | Set status = `canceled` |
| `invoice.payment_failed` | Set status = `past_due` |
| `invoice.payment_succeeded` | Set status = `active` (in case recovering from past_due) |

Environment variables required:
```
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
SUPABASE_URL=xxx
```

### `supabase/functions/create-checkout-session/index.ts`
Creates a Stripe Checkout session for the upgrade flow.

- Requires authenticated Supabase user (JWT verified)
- Creates or retrieves Stripe customer for this user
- Stores `stripe_customer_id` on `public.users` (add column)
- Creates checkout session with:
  - `mode: 'subscription'`
  - `trial_period_days: 7`
  - `success_url`: back to app (paid feature they were trying to access)
  - `cancel_url`: back to app
- Returns `{ url }` to client

### `supabase/functions/create-portal-session/index.ts`
Creates a Stripe Customer Portal session.

- Requires authenticated user
- Looks up `stripe_customer_id` from `public.users`
- Creates portal session
- Returns `{ url }` to client

## Client-Side: `src/contexts/SubscriptionContext.jsx`

```javascript
// Exposes:
// - isPaid: boolean
// - isTrialing: boolean
// - isOverride: boolean  (true if access comes from subscription_override, not Stripe)
// - overrideTier: 'beta' | 'lifetime' | null
// - trialEnd: Date | null
// - status: 'free' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'lifetime' | 'beta'
// - openBillingPortal(): void
// - startCheckout(priceId): void
```

On mount (when user is signed in):
1. Fetch `public.users` row for this user → read `subscription_override`
2. **If `subscription_override` is non-null: `isPaid = true`, skip Stripe lookup entirely**
3. Otherwise: query `public.subscriptions` for this user → derive `isPaid` from Stripe status

```javascript
// Priority order — override beats Stripe:
const override = userRow?.subscription_override   // 'lifetime' | 'beta' | null
const stripeStatus = subscription?.status          // 'active' | 'trialing' | etc.

const isPaid = override != null
  || stripeStatus === 'active'
  || stripeStatus === 'trialing'
```

- Refreshes on window focus (in case user just completed checkout in another tab)
- Wrapped around the app, below `<AuthProvider>`
- Override users never see Stripe billing UI (no "Manage billing" — it's irrelevant to them)
- Override users see their tier in AccountMenu: "Lifetime" or "Beta" badge instead of "Premium"

## Database Note

`stripe_customer_id` and `subscription_override` columns are defined in the `database-schema` spec (on `public.users`). No separate migration needed here — both columns are part of `001_initial_schema.sql`.

## Environment Variables

**Frontend (`.env`):**
```
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

**Supabase Edge Function secrets (set via Supabase CLI):**
```
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_MONTHLY_PRICE_ID
STRIPE_ANNUAL_PRICE_ID
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_URL
```

## Acceptance Criteria
- [ ] Stripe products and prices exist (monthly + annual, both with 7-day trial)
- [ ] `stripe-webhook` Edge Function handles all 5 events and writes to `subscriptions` table
- [ ] `create-checkout-session` Edge Function creates a valid Stripe Checkout URL
- [ ] `create-portal-session` Edge Function creates a valid Customer Portal URL
- [ ] `SubscriptionContext` correctly derives `isPaid` from subscription status
- [ ] Starting trial → Stripe Checkout → webhook fires → `subscriptions` row written → paid features unlock
- [ ] Cancellation → webhook fires → `cancel_at_period_end = true` → access until period end
- [ ] Subscription deleted → `status = canceled` → paid features revoked
- [ ] `past_due` status → paid features remain accessible with a "payment failed" warning
- [ ] `create-checkout-session` reuses existing Stripe customer (no duplicate customers)

## Edge Cases
- User tries to start trial with an existing (cancelled) subscription: Stripe handles idempotency
- Webhook fires out of order (deleted before updated): use `updated_at` timestamp to ignore stale events
- User has multiple subscriptions (shouldn't happen, but guard): use most recent `active` or `trialing`
- Checkout session expires without completion: no subscription created, no DB changes

## Files to Create
- `supabase/functions/stripe-webhook/index.ts`
- `supabase/functions/create-checkout-session/index.ts`
- `supabase/functions/create-portal-session/index.ts`
- `src/contexts/SubscriptionContext.jsx`
- `src/services/stripeService.js` (client-side helper to call Edge Functions)

## Files to Modify
- `src/App.jsx` — wrap with `<SubscriptionProvider>`
- `src/components/AccountMenu.jsx` — add "Billing & Plan" link (hidden for override users)

## Dependencies to Add
```
npm install @stripe/stripe-js   # for redirectToCheckout (if needed)
```
(Note: Stripe Checkout redirect can also be done via `window.location.href = url` — evaluate during implementation.)
