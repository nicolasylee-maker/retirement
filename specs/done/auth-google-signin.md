# Spec: Auth Layer — Google Sign-In + Magic Link

## Status
Pending implementation

## Overview
Two sign-in methods via Supabase Auth: Google OAuth (popup) and magic link (passwordless email). The app remains fully usable without an account (anonymous mode). Signing in unlocks cloud scenario saving. Subscription status gates paid features (handled in separate specs).

Both methods produce the same result: a Supabase session, a `public.users` record, and cloud scenario access.

## User Flows

### Anonymous (no account)
- User lands on WelcomeScreen, sees "Try it free" (no sign-in required)
- Full wizard + basic dashboard works
- Scenarios exist only in memory (lost on refresh)
- Hitting a cloud-save action prompts sign-in

### Sign-In: Google OAuth
1. User clicks "Continue with Google"
2. Supabase Auth opens Google OAuth popup
3. On success: user record created/updated in `users` table (via trigger)
4. App transitions to signed-in state — scenarios load from cloud
5. Header shows user avatar / name + "Account" dropdown

### Sign-In: Magic Link
1. User types their email and clicks "Send login link"
2. Supabase sends a one-time login link to that email (via `signInWithOtp`)
3. UI shows: "Check your email — we sent a login link to [email]"
4. User clicks the link in their email → browser opens to the app with a token in the URL
5. Supabase JS client detects the token on load and establishes the session automatically
6. Same outcome as Google OAuth: signed in, scenarios load

### Invited users (magic link variant)
- Invited users receive a magic link email from the admin-invites system
- Clicking it signs them in (same flow as step 4–6 above)
- Their `subscription_override` is already set from the invite — they get full access immediately

### Sign-Out
- User clicks "Sign out" from Account dropdown
- Supabase session cleared, app returns to anonymous state
- In-memory scenarios cleared

## Components to Create

### `src/contexts/AuthContext.jsx`
- Wraps app in `<AuthContext.Provider>`
- Exposes: `user`, `session`, `isLoading`, `signInWithGoogle()`, `signInWithMagicLink(email)`, `signOut()`
- Listens to `supabase.auth.onAuthStateChange`
- Handles magic link token on page load (Supabase does this automatically via the client)
- Persists session via Supabase built-in (localStorage)

### `src/services/supabaseClient.js`
- Initializes Supabase JS client with project URL + anon key
- Exported as `supabase` singleton
- Reads config from environment variables:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

### `src/components/AuthPanel.jsx`
Replaces the old `SignInButton`. Full sign-in UI with both methods.

Layout:
```
[ Continue with Google ]          ← Google OAuth button (Google branding)

  ── or sign in with email ──

[ your@email.com          ]       ← email input
[ Send login link         ]       ← calls signInWithMagicLink(email)

  ── success state ──
"Check your email — we sent a link to your@email.com"
```

States:
- Default: both options shown
- Magic link sending: button shows "Sending..." (disabled)
- Magic link sent: success message, no further action needed
- Error: inline error message under the relevant method
- Google error: inline error under the Google button

### `src/components/AccountMenu.jsx`
- Triggered from header when signed in
- Shows: user avatar (Google) or initial avatar (magic link), display name, email
- Links: "Billing & Plan", "Admin" (only if admin email), "Sign out"
- Shows current plan tier (Free / Beta / Lifetime / Premium)

## Files to Modify

### `src/App.jsx`
- Wrap with `<AuthProvider>`
- Add `SubscriptionProvider` (stub — implemented in stripe spec)
- Header: show `<AccountMenu>` when signed in, `<AuthPanel>` trigger when not

### `src/views/WelcomeScreen.jsx`
- Show `<AuthPanel>` for sign-in (both Google + magic link)
- Add "Continue without account" link below the auth panel
- If already signed in: show "Welcome back, [name]" + "Start New Plan" / "My Plans"

## Supabase Configuration

### Google OAuth setup
- Enable Google provider in Supabase Auth dashboard
- Add OAuth credentials from Google Cloud Console
- Authorized redirect URIs: `https://yourdomain.com` + `http://localhost:5173`

### Magic link setup
- Enabled by default in Supabase Auth (OTP / email provider)
- Customize the email template in Supabase Dashboard → Auth → Email Templates
- Set redirect URL in Supabase Dashboard → Auth → URL Configuration:
  - Site URL: `https://yourdomain.com`
  - Additional redirect URLs: `http://localhost:5173`

### Environment variables (`.env`)
```
VITE_SUPABASE_URL=https://[project].supabase.co
VITE_SUPABASE_ANON_KEY=[anon-key]
VITE_ADMIN_EMAIL=your@email.com
```

### Magic link token handling
- No separate callback route needed
- Supabase JS client automatically detects the token in the URL hash on page load
- `onAuthStateChange` fires with `SIGNED_IN` event — app picks this up and loads scenarios

## Acceptance Criteria
- [ ] Anonymous user can complete wizard and see dashboard without signing in
- [ ] "Continue with Google" opens Google OAuth popup from WelcomeScreen
- [ ] "Send login link" sends a magic link email and shows success state
- [ ] Clicking magic link in email signs user in and loads their scenarios
- [ ] Both methods create/update a `public.users` record via trigger
- [ ] Auth state persists across page refreshes
- [ ] Header shows `AccountMenu` when signed in (avatar, name, email, plan)
- [ ] Magic link users without a display name show their email initial as avatar
- [ ] Sign-out clears session and returns to anonymous state
- [ ] Google popup closed without completing: no error shown
- [ ] Magic link email send failure: show "Couldn't send email, please try again"
- [ ] `AuthContext` exports `user`, `session`, `isLoading`, `signInWithGoogle`, `signInWithMagicLink`, `signOut`

## Edge Cases
- User signs in with magic link then later tries Google with same email: Supabase links them to the same account (same email = same identity)
- Magic link clicked twice: second click shows "Link expired" (Supabase handles)
- Magic link sent to invited user's email: same as regular magic link — signs them in, override already set
- User is signed in on two tabs: both reflect same auth state (Supabase localStorage)
- First-time sign-in (either method): user record created, no scenarios yet → WelcomeScreen
- Returning user: user record exists, load their scenarios from cloud

## Files to Create
- `src/contexts/AuthContext.jsx`
- `src/services/supabaseClient.js`
- `src/components/AuthPanel.jsx`
- `src/components/AccountMenu.jsx`

## Files to Modify
- `src/App.jsx`
- `src/views/WelcomeScreen.jsx`
- `.env` (add Supabase + admin vars — do NOT commit)
- `.env.example` (add placeholder vars — commit this)

## Dependencies to Add
```
npm install @supabase/supabase-js
```

## Notes
- Supabase anon key is safe to expose client-side — controlled by RLS
- Do NOT expose service role key in frontend code
- Magic link OTP is single-use and expires after 1 hour (Supabase default)
- Google sign-in users get an avatar URL; magic link users do not (use email initial)
