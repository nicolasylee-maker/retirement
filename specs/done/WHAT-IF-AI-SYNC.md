# What If → AI Insights Sync + Save Flow Audit + Edit Navigation

## Description

When users adjust What If sliders on the dashboard, charts/KPIs update in real-time but AI insights
have a bug: clicking "Regenerate" persists the What If-generated insight to `scenario.aiInsights`,
overwriting the saved plan's insight with a hash tied to ephemeral What If values. There's also no
visual indicator that AI insights reflect temporary What If adjustments, and no way to navigate
directly to the wizard to make those changes permanent.

## Acceptance Criteria

1. When What If overrides are active and user regenerates AI insights, the result is displayed
   locally but NOT persisted to `scenario.aiInsights` (no `onSave` call)
2. An amber banner appears after ephemeral generation: "Based on What If adjustments — not your
   saved plan" with an "Edit & Save →" button
3. "Edit & Save →" navigates to the wizard at the appropriate step (step 6 for expenses/return/inflation,
   step 0 if only lifeExpectancy changed)
4. When What If sliders are reset, `whatIfActive` becomes false → ephemeral state clears →
   saved insight restores automatically via existing hash mechanism
5. WhatIfPanel shows "Make changes permanent →" link when sliders have been moved
6. WhatIfPanel reset button reads "Reset to saved values" instead of "Reset to Defaults"
7. No regressions — `npm test && npm run build` pass

## Edge Cases

- User has no saved insight + What If active → ephemeral generation shows banner, no save
- User resets What If after ephemeral generation → banner disappears, empty/saved insight shows
- Multiple regenerations while What If active → each replaces local state, none persist
- whatIfActive transitions false→true→false rapidly → useEffect cleanup handles correctly

## Files Affected

- `src/components/AiInsight.jsx`
- `src/views/dashboard/Dashboard.jsx`
- `src/App.jsx`
- `src/views/WhatIfPanel.jsx`
