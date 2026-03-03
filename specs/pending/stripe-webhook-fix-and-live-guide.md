# Spec: Stripe Webhook Fix + Test/Live Environment Guide

**Status**: Implemented
**Date**: 2026-03-02

---

## Problem

After a successful Stripe checkout (raggydiaper@gmail.com, trial subscription), the app
continued showing the upgrade prompt. `isPaid` reads from the `subscriptions` DB table,
which was never written to.

**Root cause**: `stripe-webhook` was deployed without `--no-verify-jwt`. Stripe's server
sends requests with only a `Stripe-Signature` header — no Supabase Bearer JWT. The
Supabase gateway rejected every inbound call with **401** before the function body ran.
All 3 events appeared in Stripe's retry queue as "401 ERR":

- `checkout.session.completed` (evt_1T6iic2OPDYfWurlH2o5rfGV)
- `customer.subscription.created` (evt_1T6iid2OPDYfWurlqng2CdLz)
- `invoice.payment_succeeded` (evt_1T6iid2OPDYfWurl0A7BcUgf)

`stripe-portal` was also never deployed.

---

## Fix Applied

Redeployed both functions with the correct flags:

```bash
supabase functions deploy stripe-webhook --use-api --no-verify-jwt
supabase functions deploy stripe-portal --use-api --no-verify-jwt
```

No code changes to `stripe-webhook/index.ts` or `stripe-portal/index.ts` were needed —
the function logic was correct. The signature verification inside the function
(`stripe.webhooks.constructEventAsync`) handles authentication; the Supabase gateway
must not attempt its own JWT check.

---

## Verification Steps

1. Stripe Dashboard → Developers → Webhooks → endpoint → Recent Deliveries
   → click **Resend** on each of the 3 failed events (in order)
2. Confirm all 3 return **200** in Stripe's delivery log
3. Supabase → Table Editor → `subscriptions` → confirm row with:
   - `user_id`: raggydiaper's UUID
   - `status`: `trialing`
   - `trial_end`: ~7 days from 2026-03-02
4. Sign in as raggydiaper → confirm What-If, Compare, Estate, AI Insights are accessible
5. AccountMenu shows "Manage Subscription" (not "Upgrade")

---

## Secondary Deliverable: Going Live Guide

Created `docs/going-live-stripe.md` — full 10-step checklist for switching from test
mode to live mode when ready to accept real payments. Covers:

- Creating live Stripe products and prices
- Creating live webhook endpoint with correct events
- Updating Supabase prod secrets
- Updating Vercel env vars
- Redeploying edge functions
- Triggering Vercel redeploy
- End-to-end verification with a real card
- Rollback procedure
- Local dev strategy (`.env.local` stays on test mode permanently)

---

## Environment Architecture

### Current (test mode everywhere)

| Location | Var | Value |
|----------|-----|-------|
| `.env.local` | `VITE_STRIPE_PRICE_MONTHLY` | test price ID |
| `.env.local` | `VITE_STRIPE_PRICE_YEARLY` | test price ID |
| Supabase prod secrets | `STRIPE_SECRET_KEY` | `sk_test_...` |
| Supabase prod secrets | `STRIPE_WEBHOOK_SECRET` | test whsec |

### Target (when going live)

| Location | Var | Value |
|----------|-----|-------|
| Vercel env vars | `VITE_STRIPE_PRICE_MONTHLY` | live price ID |
| Vercel env vars | `VITE_STRIPE_PRICE_YEARLY` | live price ID |
| Supabase prod secrets | `STRIPE_SECRET_KEY` | `sk_live_...` |
| Supabase prod secrets | `STRIPE_WEBHOOK_SECRET` | live whsec |
| `.env.local` (unchanged) | both price vars | test price IDs |

---

## Files Created/Modified

| File | Action |
|------|--------|
| `docs/going-live-stripe.md` | Created |
| `docs/learned-rules.md` | Updated (Stripe webhook --no-verify-jwt rule) |
| `specs/pending/stripe-webhook-fix-and-live-guide.md` | This file |
