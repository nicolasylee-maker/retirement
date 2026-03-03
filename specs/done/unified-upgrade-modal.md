# Unified Upgrade Modal + Gated Tab Interception

## Description

Replace per-feature "Unlock X" modals with a single unified "Unlock RetirePlanner Pro" modal. Intercept gated tab clicks (Compare, Estate) so they show a portal modal overlay instead of navigating away from the current view.

## Acceptance Criteria

- Clicking Compare or Estate tab while not paid → modal appears over current view; current view stays visible behind backdrop
- Modal title reads "Unlock RetirePlanner Pro" (not feature-specific)
- Modal lists all 4 features (same as today)
- Close modal (X or backdrop click) → user remains on the view they were on
- As a paid user, Compare/Estate tabs navigate normally
- PDF Export GatedButton modal: title also reads "Unlock RetirePlanner Pro"
- AI Insights GatedButton modal: title also reads "Unlock RetirePlanner Pro"
- compact variant in dashboard keeps contextual label ("Upgrade to unlock What-If Analysis")

## Edge Cases

- User on Compare/Estate view (restored from localStorage) while not paid → in-page fallback still shows (safety net); title says "Unlock RetirePlanner Pro"
- Pressing Escape does not need to close the modal (not currently supported elsewhere, out of scope)

## Files Modified

- `src/components/UpgradePrompt.jsx`
- `src/App.jsx`

## No New Files
