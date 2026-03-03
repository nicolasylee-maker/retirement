# Spec: Header Dropdown Reposition + Import Save-Failed Fix

## Status
Pending

## Issues

### 1. Plan dropdown mispositioned on desktop web

**Current:** The scenario `<select>` is wrapped in a `flex-1 max-w-xs` block, causing it to float in the center of the header row between the logo and the right-side actions.

**Expected:** The dropdown (and its save-status label) should sit immediately to the left of the 3-dots menu button — grouped with the right-side actions, not in the middle.

**Scope:** Desktop only (`md:` breakpoint and up). Mobile row-2 layout is correct and unchanged.

### 2. "Save failed" appears after importing a JSON plan

**Current:** After importing another user's (or any externally-sourced) JSON plan:
1. `handleLoadScenario` keeps the imported scenario's original UUID.
2. `useCloudSync` triggers auto-save → calls `saveScenario(userId, scenario)`.
3. Supabase `upsert` with `onConflict: 'id'` finds the UUID already owned by a **different** `user_id` and returns an RLS error.
4. `saveStatus` becomes `'error'` → "Save failed" banner appears.

**Expected:** Import always succeeds silently. No "Save failed" after import.

**Root cause:** Imported scenarios must not reuse external UUIDs — they need fresh IDs so Supabase creates new rows owned by the current user.

---

## Acceptance Criteria

### Issue 1
- [ ] On `md+` screens, the scenario dropdown and its save-status text sit directly to the left of the 3-dots `⋮` button inside the right-side `flex` group.
- [ ] No empty/flex-1 space between the logo and the right-side group on desktop.
- [ ] Mobile (row 2 below the header bar) is visually unchanged.
- [ ] Dropdown still shows the correct plan name and switches scenarios correctly.
- [ ] Save-status labels (Saving… / Saved / Save failed) still appear adjacent to the dropdown.

### Issue 2
- [ ] After importing any JSON plan, no "Save failed" message appears.
- [ ] The imported scenario loads and saves correctly to the current user's cloud account.
- [ ] Re-importing the same file creates a new duplicate scenario (expected — import ≠ update).
- [ ] Existing scenario IDs created within the app are unaffected.

---

## Files Affected

| File | Change |
|------|--------|
| `src/App.jsx` | 1. Relocate desktop scenario-picker block into the right-side actions `div`. 2. In `handleLoadScenario`, always assign `uid()` to imported scenarios. |

---

## Edge Cases

- Importing a file exported by the same user: creates a duplicate (acceptable — import is always additive).
- Importing a file with multiple scenarios: all get fresh IDs; first scenario becomes active.
- Importing while not authenticated: no cloud save attempted; no error shown. Already works, no change needed.
- Dropdown when only one scenario exists: still shows correctly beside the 3-dots.
- Very long plan name in dropdown: truncated by `overflow-hidden` / `text-ellipsis` on the `select` or its wrapper.

---

## Implementation Notes

**Issue 1 — layout change in `App.jsx`:**

Move this block (currently in row 1 as a flex-1 sibling):
```jsx
{authUser && scenarios.length > 0 && (
  <div className="hidden md:flex items-center gap-2 flex-1 min-w-0 max-w-xs">
    ...
  </div>
)}
```

Into the right-side actions `div` (before the `<div className="relative" ref={menuRef}>`), dropping `flex-1` and `max-w-xs`, adding a capped width like `w-40` or `max-w-[180px]` so it doesn't expand the header:
```jsx
<div className="hidden md:flex items-center gap-2 max-w-[180px]">
  ...
</div>
```

**Issue 2 — always re-ID on import in `handleLoadScenario`:**

Change the `.map()` that builds `valid` to always call `uid()`:
```js
// before
.map(s => ({ ...createDefaultScenario(), ...migrateScenario(s), id: s.id || uid() }))

// after
.map(s => ({ ...createDefaultScenario(), ...migrateScenario(s), id: uid() }))
```

And simplify the de-dup step in `setScenarios` since IDs are always fresh (no collision possible):
```js
setScenarios((prev) => [...prev, ...valid])
```

---

## Tests Required

- No engine logic changed → existing 277 tests unchanged.
- Manual/browser verification:
  - Desktop: confirm dropdown is right-aligned next to ⋮ button.
  - Import a JSON (from another account or a fresh export): confirm no "Save failed" banner.
  - Import while logged out: confirm no error.
