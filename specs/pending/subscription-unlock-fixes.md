# Subscription Unlock Fixes

## Description
Fix 6 bugs in the subscription checkout flow — 2 critical (checkout broken for all users), 2 medium UX, 2 low.

## Acceptance Criteria

1. `VITE_STRIPE_PRICE_MONTHLY` and `VITE_STRIPE_PRICE_YEARLY` env vars exposed to browser correctly — checkout no longer fails with "Missing priceId".
2. Unauthenticated users clicking any checkout CTA see the AuthPanel instead of an error.
3. After successful Stripe checkout redirect (`?checkout=success`), user sees a green "Your trial is active!" banner that auto-dismisses in 5 s; URL param is cleared immediately.
4. Past-due users see exactly ONE red banner (App.jsx's inline one); the fixed-overlay duplicate from SubscriptionBadge is gone.
5. Signed-in users see a "Manage Subscription" item in the AccountMenu dropdown; it opens the billing portal.
6. `openBillingPortal` errors are caught and surfaced to the user rather than silently swallowed.

## Edge Cases
- Compact variant of UpgradePrompt must open AuthPanel (not error) when user is signed out.
- `?checkout=success` param should only fire once and be removed from URL immediately via `history.replaceState`.
- "Manage Subscription" shown for all signed-in users; if no Stripe customer ID exists, catch error and show alert rather than crashing.

## Files Affected
- `.env.example`
- `supabase/functions/stripe-checkout/index.ts`
- `src/components/UpgradePrompt.jsx`
- `src/components/SubscriptionBadge.jsx`
- `src/App.jsx`
- `src/components/AccountMenu.jsx`
