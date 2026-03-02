# Spec: Admin Invite System

## Status
Pending implementation

## Overview
A simple admin-only page that lets you invite users by email and optionally grant them a `subscription_override` (beta or lifetime access). Invited users receive a magic link email — clicking it signs them in and their override is already active. No Stripe involved.

The admin is identified by a hardcoded email in an environment variable. No role tables, no complex RBAC — just one person managing a small invite list.

## How It Works (end-to-end)

1. Admin navigates to `/admin` (or triggers it from AccountMenu)
2. Enters an email + selects override tier (None / Beta / Lifetime)
3. Clicks "Send Invite"
4. App calls the `send-invite` Edge Function (authenticated)
5. Edge Function verifies caller is the admin email
6. Edge Function calls `supabase.auth.admin.inviteUserByEmail(email, { data: { subscription_override: tier } })`
7. Supabase creates the user in `auth.users` with the metadata attached
8. `handle_new_user` trigger fires → creates `public.users` row with `subscription_override` set
9. Supabase sends the invite email (magic link) to the invited user
10. Invited user clicks the link → signed in → full access immediately

If the user already exists (email already in auth): Supabase re-sends a magic link. The Edge Function then updates their `subscription_override` directly via service role.

## Admin Page: `src/views/admin/AdminView.jsx`

### Access control
- Only visible if `user.email === import.meta.env.VITE_ADMIN_EMAIL`
- In `App.jsx` view routing: `case 'admin': return isAdmin ? <AdminView /> : <NotFound />`
- In `AccountMenu.jsx`: show "Admin" link only when `user.email === adminEmail`
- Edge Function independently verifies the JWT email — client-side check is just UX

### UI layout

```
Invite a User
─────────────────────────────────────────────
Email address:   [ someone@example.com      ]
Access tier:     ( ) No override (free tier)
                 (●) Beta access
                 ( ) Lifetime access

[ Send Invite ]

─────────────────────────────────────────────
Invited Users

Email                     Tier       Invited
someone@example.com       Lifetime   2026-03-02
beta@user.com             Beta       2026-02-15
regular@user.com          —          2026-01-10

[ Revoke ] buttons next to override rows
```

### Invite list
- Fetched from `public.users` where `created_by_invite = true` OR where `subscription_override IS NOT NULL`
- Simpler: just show all users ordered by `created_at` desc, with their override tier
- Columns: email, subscription_override (or "—"), created_at, revoke button

### Revoke
- "Revoke" sets `subscription_override = null` on the user's row
- Calls a `revoke-override` Edge Function (or reuses `send-invite` with `tier = null`)
- UI updates the list immediately (optimistic update)

---

## Edge Function: `supabase/functions/send-invite/index.ts`

### Request
```
POST /functions/v1/send-invite
Authorization: Bearer <supabase-user-jwt>
Content-Type: application/json

{ "email": "someone@example.com", "override": "lifetime" }
```
`override` values: `"beta"` | `"lifetime"` | `null` (null = invite with no override)

### Logic
1. Verify JWT — extract caller email
2. If caller email ≠ `ADMIN_EMAIL` env var: return 403
3. Call `supabase.auth.admin.inviteUserByEmail(email, { data: { subscription_override: override } })`
   - This creates the user in `auth.users` (if new) and sends the invite email
   - The `handle_new_user` trigger fires and sets `subscription_override` on `public.users`
4. **If user already exists** (Supabase returns an error or existing user):
   - Re-send magic link: `supabase.auth.admin.generateLink({ type: 'magiclink', email })`
   - Update override directly: `supabase.from('users').update({ subscription_override: override }).eq('email', email)`
5. Return `{ success: true }` or error

### Environment variables
```
ADMIN_EMAIL=your@email.com
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_URL=...
```

---

## Edge Function: `supabase/functions/revoke-override/index.ts`

### Request
```
POST /functions/v1/revoke-override
Authorization: Bearer <supabase-user-jwt>
Content-Type: application/json

{ "userId": "uuid-of-user-to-revoke" }
```

### Logic
1. Verify JWT — check caller email = `ADMIN_EMAIL`
2. Set `subscription_override = null` for the given `userId`
3. Return `{ success: true }`

---

## Acceptance Criteria
- [ ] `/admin` view only renders for the configured admin email
- [ ] Non-admin signed-in users navigating to `/admin` see a 404/not-found state
- [ ] Invite form sends email + override to Edge Function
- [ ] Edge Function rejects requests from non-admin callers (403)
- [ ] Invited user receives a magic link email
- [ ] Clicking the magic link signs the user in with `subscription_override` already set
- [ ] Inviting an existing user re-sends a magic link and updates their override
- [ ] Invited users list shows all users with an override (or all users if simpler)
- [ ] "Revoke" sets `subscription_override = null` immediately
- [ ] Revoked user loses paid access on next page load / SubscriptionContext refresh
- [ ] Invite with `override = null` sends a magic link but grants no special access (useful for testing the plain invite flow)
- [ ] AccountMenu shows "Admin" link only when signed in as admin email

## Edge Cases
- Admin invites same email twice: second invite re-sends the link; override is updated to the latest selection
- Invited user already has a Stripe subscription: override takes priority (`isPaid` is still true either way — no conflict)
- Admin email changes: update `VITE_ADMIN_EMAIL` + `ADMIN_EMAIL` env var in both places (frontend + Edge Function)
- Revoke during an active session: user's `SubscriptionContext` won't update until next page load or window focus refresh
- Override user tries to start a Stripe trial: they can't reach the checkout (UpgradePrompt never shows for them) — no issue

## Files to Create
- `src/views/admin/AdminView.jsx`
- `supabase/functions/send-invite/index.ts`
- `supabase/functions/revoke-override/index.ts`

## Files to Modify
- `src/App.jsx` — add `'admin'` to view routing, add `isAdmin` derived value
- `src/components/AccountMenu.jsx` — add "Admin" nav link when `isAdmin`
- `.env` — add `VITE_ADMIN_EMAIL=your@email.com`
- `.env.example` — add `VITE_ADMIN_EMAIL=`
- Supabase Edge Function secrets: add `ADMIN_EMAIL`

## Environment Variables
```
# Frontend
VITE_ADMIN_EMAIL=your@email.com

# Edge Functions (set via supabase secrets set)
ADMIN_EMAIL=your@email.com
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_URL=...
```
