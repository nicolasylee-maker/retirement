# Spec: Admin-Granted Time-Limited Trial Override

## Description
Add a `trial` subscription override that admins can grant to any user with a custom
number of days (default 7). Unlike `beta` and `lifetime` (permanent), `trial` expires
automatically after the configured duration. Admins can renew expired or active trials.

## Acceptance Criteria
- `beta` and `lifetime` overrides are unchanged — still permanent, no expiry
- New `trial` override is time-limited; expiry stored as `override_expires_at` on `users`
- When a trial expires, the user is automatically treated as free tier (no manual cleanup)
- InviteModal shows a days input (default 7) when "trial" is selected
- OverrideSelect in the Users table supports `trial`; on selection shows days input + confirm
- A "Renew" button appears on trial users (active or expired) with a days input (default 7)
- User sees "Trial — N days left" badge in the app
- Email copy uses the actual day count (e.g. "7-day trial")
- Setting override to `beta`, `lifetime`, or `null` clears `override_expires_at`

## Edge Cases
- Expired trial: user is free tier; admin can still renew via "Renew" button
- Trial with 0 days remaining = expired
- `overrideExpiresAt` null + override set = permanent (beta/lifetime behaviour)
- New user invite with trial: invite email says "X-day trial"
- Existing user updated to trial: notification email says "X-day trial"

## Files Affected
- `supabase/migrations/006_trial_override.sql` — add `override_expires_at TIMESTAMPTZ`
- `supabase/functions/send-invite/index.ts` — accept + write `overrideExpiresAt`
- `src/utils/trialOverride.js` — pure helpers: `computeOverrideDaysRemaining`, `isOverrideExpired`
- `src/contexts/SubscriptionContext.jsx` — use helpers; expose `overrideDaysRemaining`
- `src/services/adminService.js` — `setOverride()` accepts `overrideExpiresAt`
- `src/views/admin/components/InviteModal.jsx` — add trial radio + days input
- `src/views/admin/sections/UsersSection.jsx` — OverrideSelect trial flow + Renew button
- `src/components/SubscriptionBadge.jsx` — "Trial — N days left" badge
- `src/components/AccountMenu.jsx` — show override trial expiry

## Tests
- `tests/trialOverride.test.js` — pure helper unit tests
