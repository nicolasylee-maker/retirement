# Spec: Sign-out returns to landing page

## Status
`pending`

## Description

When a logged-in user clicks **Sign out** (via the `AccountMenu` dropdown), the app should:
1. Sign out of Supabase auth (already works)
2. Clear all in-memory scenario state and reset to empty
3. Clear persisted localStorage scenario data
4. Navigate to the landing page (`view = 'landing'`)

Currently, `AuthContext.signOut` only calls `supabase.auth.signOut()`. The `onAuthStateChange` listener in `AuthContext` sets `user → null`, but `App.jsx` does not react to that transition — so the user stays on whatever view they were on, potentially with their personal scenario data still visible.

## Acceptance Criteria

- [ ] Clicking "Sign out" from the `AccountMenu` dropdown navigates the user to `view = 'landing'`
- [ ] All scenario state is cleared: `scenarios = []`, `currentScenarioId = null`, `wizardStep = 0`, `whatIfOverrides = {}`
- [ ] `localStorage` entries `STORAGE_KEY` and `WIZARD_CHECKPOINT_KEY` are removed so no personal data persists on next page load
- [ ] Landing page shows the public demo panel with no personal data
- [ ] Sign-out from any view (dashboard, wizard, estate, compare, debt, admin) always lands on the landing page
- [ ] Initial load (authUser starts as null) does NOT trigger the reset — only a null transition from a previously authenticated state triggers it

## Edge Cases

- Sign-out while on wizard: same result — landing page
- Sign-out fails (Supabase error): current `signOut` in `AuthContext` does not throw; if it did, app state should not be cleared (leave user in place)
- Multiple rapid sign-out clicks: idempotent — state is already cleared after the first transition
- User is never signed in (authUser always null): the useEffect must not fire on initial mount

## Implementation Plan

**Only one file changes: `src/App.jsx`**

Add a `useRef` to track the previous `authUser` value, and a `useEffect` that fires when `authUser` transitions from non-null → null:

```js
const prevAuthUserRef = useRef(authUser);

useEffect(() => {
  const wasLoggedIn = prevAuthUserRef.current !== null;
  prevAuthUserRef.current = authUser;

  if (wasLoggedIn && authUser === null) {
    setScenarios([]);
    setCurrentScenarioId(null);
    setWizardStep(0);
    setWhatIfOverrides({});
    setView('landing');
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(WIZARD_CHECKPOINT_KEY);
  }
}, [authUser]);
```

Place this `useEffect` directly after the existing sign-in `useEffect` (line ~107 in `App.jsx`).

## Files to Modify

- `src/App.jsx` — add sign-out detection `useEffect` (~12 lines)

## Files NOT Changed

- `src/contexts/AuthContext.jsx` — `signOut` stays as-is (single responsibility: Supabase call only)
- `src/components/AccountMenu.jsx` — no changes needed

## Dependencies

None. No new imports required.

## Tests

This is a UI/auth-flow interaction — no engine logic is involved. No new unit tests required. Manual verification:
1. Sign in via Google or magic link
2. Navigate to dashboard
3. Click account avatar → "Sign out"
4. Confirm: landing page shown, no personal data visible
5. Reload page: confirm landing page loads (not dashboard with stale data)
