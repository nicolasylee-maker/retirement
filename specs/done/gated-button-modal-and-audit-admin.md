# Spec: GatedButton upgrade modal + Calculation Audit admin gate

## Status: pending

## Description

Two related changes to the three-dots action menu in the dashboard header:

1. **GatedButton → open UpgradePrompt modal on click** — currently `GatedButton`
   renders a disabled button with a hover tooltip ("Upgrade to unlock X"). Clicking
   does nothing. It should open the `UpgradePrompt` modal (same blurred-backdrop
   portal as the AI Insights upgrade flow) when clicked by a non-subscribed user.
   Admins (`isAdmin === true`) bypass the gate entirely — always get the action.

2. **Calculation Audit — admin-only visibility** — the "Calculation Audit" menu item
   should be completely hidden from non-admin users. Only `isAdmin` (currently
   `authUser.email === VITE_ADMIN_EMAIL === 'nicolasylee@gmail.com'`) sees it.
   Admin bypasses the subscription gate for this item too.

## Acceptance Criteria

- [ ] Non-subscribed, non-admin user clicks "PDF Report" → UpgradePrompt modal opens
      (portal on document.body, backdrop blur, Monthly/Annual plan picker)
- [ ] Non-subscribed, non-admin user clicks "PDF Report" modal → "Start free trial"
      initiates Stripe checkout
- [ ] Admin user (`isAdmin`) clicks "PDF Report" → generates PDF immediately,
      no modal, regardless of subscription status
- [ ] "Calculation Audit" menu item is **not rendered** for non-admin users
- [ ] Admin user sees "Calculation Audit" and it works immediately (no gate)
- [ ] Existing behavior for subscribed non-admin users is unchanged (both items work)

## Edge Cases

- Anonymous user (`!authUser`): both items already hidden by existing anonymous gating
  in App.jsx — no change needed there
- Admin who IS subscribed: items work as before (no regression)
- GatedButton used elsewhere (WhatIfPanel, other locations): same modal behaviour
  applies everywhere GatedButton is used

## Files to Modify

- `src/components/GatedButton.jsx` — add `onUpgrade` callback prop + portal modal;
  accept `bypass` prop so admin callers can skip the gate
- `src/App.jsx` — pass `bypass={isAdmin}` to PDF Report GatedButton; wrap
  Calculation Audit in `{isAdmin && ...}` instead of the current GatedButton

## Files NOT Modified

- `UpgradePrompt.jsx` — already has `modal` prop; reused as-is
- Auth / subscription contexts — no changes

## Implementation Notes

- `GatedButton` should use `createPortal(document.body)` for its modal (same pattern
  as `AiInsight`) to avoid stacking context bleed-through from charts
- `bypass` prop: when `true`, render the live button regardless of `isPaid`
- Keep `GatedButton` self-contained — it imports `UpgradePrompt` and manages its own
  `upgradeOpen` state internally
- `featureName` prop is already passed from call sites; use it as the modal title

## Dependencies

- `UpgradePrompt` with `modal` prop (already merged to main ✓)
- `createPortal` from react-dom (already used in AiInsight ✓)

## Out of Scope

- Adding admin bypass to any other gated feature
- Changing which features are paid vs free
