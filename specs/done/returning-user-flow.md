# Returning User Flow

## Description

Returning authenticated users with saved scenarios currently land on the wizard step 1, which is disorienting — they already did this work. This spec replaces that with a choice screen, a scenario picker, and removes the redundant "View Results" sidebar button from the wizard.

## Acceptance Criteria

1. **First-time sign-in** (no saved scenarios): behaviour unchanged — create default scenario, go to wizard.
2. **Returning sign-in** (≥1 saved scenario): land on `ReturningHomeView` (choice screen) instead of wizard.
3. Choice screen shows three cards:
   - **View My Results** (primary, orange border) — if 1 scenario → dashboard; if >1 → `ScenarioPickerView` with action=`results`
   - **Edit a Plan** — if 1 scenario → wizard step 0; if >1 → `ScenarioPickerView` with action=`edit`
   - **Create New Plan** — calls existing `handleStartNew`, goes to wizard
4. `ScenarioPickerView` shows all scenarios. Each row: name, province, retire age, plan-to age, couple/single, safe-spend amount, recency label. Most-recently opened scenario highlighted.
5. Clicking a scenario row in picker:
   - action=`results` → `setCurrentScenarioId(id)` → `setView('dashboard')`
   - action=`edit` → `setCurrentScenarioId(id)` → `setWizardStep(0)` → `setView('wizard')`
6. Picker has "Create a new plan instead" escape hatch at bottom.
7. **Wizard sidebar**: remove the `View Results` orange button from the sidebar footer of `WizardShell.jsx`. The "View Results" link in `WizardSidePanel` (right panel) remains.

## Edge Cases

- User with exactly 1 scenario: skip picker entirely, go directly to results or wizard.
- User with 0 scenarios after sign-in (data cleared): create default scenario, go to wizard (unchanged).
- `ReturningHomeView` shown without `authUser`: should not be reachable, but defensively redirect to `'landing'`.
- Scenario with no `province` or `safeSpend`: render gracefully with fallbacks (`'—'`).
- Safe spend calculation: read from projection, not stored on scenario — pass `projectionData` or compute inline.

## Architecture Note

`ReturningHomeView` and `ScenarioPickerView` are **standalone views**, rendered at the `App` level the same way `MyPlansView` is — not inside `WizardShell`. They get the main app header (RetirePlanner.ca + nav tabs) and no wizard sidebar. The wizard sidebar only appears once the user has chosen to edit/create and entered the wizard.

## Files Affected

| File | Change |
|---|---|
| `src/App.jsx` | Change sign-in `useEffect` to route returning users to `'returning-home'`; add render cases for `'returning-home'` and `'scenario-picker'`; pass `projectionData` where needed |
| `src/views/ReturningHomeView.jsx` | **New** — 3-card choice screen |
| `src/views/ScenarioPickerView.jsx` | **New** — scenario list with action param |
| `src/views/wizard/WizardShell.jsx` | Remove sidebar footer `View Results` button |
| `src/views/MyPlansView.jsx` | No change (still used for the multi-scenario fallback elsewhere) |

## Out of Scope

- Scenario recency tracking (use `createdAt` as proxy for now — updatedAt not yet stored)
- Deleting scenarios from the picker
- Renaming from the picker
