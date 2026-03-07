# Spec: AI Insights Persistence & Staleness Badge

## Description

Currently AI insights (Gemini) are cached only in memory — they're lost on page refresh, tab close, or logout. When inputs change, the insight text is cleared silently. The Gemini label also appears in the header.

This spec covers:
1. Persisting insights per-view (dashboard, debt, compare, estate) in the scenario object, so they survive page refresh and re-login via Supabase cloud sync.
2. Replacing the "clear on input change" behavior with a "Inputs have changed — please regenerate" badge, while keeping the old insight visible.
3. Auto-loading saved insights on mount (no user action required).
4. Removing the "Gemini" badge from the AiInsight card header.

---

## Acceptance Criteria

1. **Auto-restore**: When a user opens Dashboard, Debt, Compare, or Estate, previously generated insights are shown immediately without clicking "Generate Insights".
2. **Staleness badge**: When `aiData` changes (WhatIf overrides, estate slider, compare selection, wizard edits), the insight remains visible but shows an amber "Inputs have changed — click to regenerate" notice, not blank.
3. **Persist across sessions**: After regenerating an insight, it's saved to the scenario object and synced to Supabase. Re-logging-in restores it.
4. **Gemini badge removed**: The `<span>Gemini</span>` badge is removed from the AiInsight card header.
5. **Hash-based staleness**: Staleness is detected by comparing a deterministic hash of the current `aiData` against the stored hash. If they match, show insight as-is; if they differ, show stale badge.

---

## Edge Cases

- **New scenario (no saved insight)**: Shows "Generate Insights" button as before. ✓
- **Insight generated with stale inputs then user reverts**: If user reverts WhatIf sliders to original values, hash matches saved → badge disappears, old insight shows cleanly.
- **Compare view**: Insight is saved under the currently active scenario's `aiInsights.compare`. If selected scenarios change, hash changes → stale badge.
- **Scenario duplication**: The duplicated scenario copies `aiInsights`, which will immediately show as fresh if the aiData matches.
- **Scenario import (JSON)**: Imported scenarios that have `aiInsights` will load them. Old imports without `aiInsights` will show "Generate Insights" button (graceful fallback).
- **Quota exceeded / error**: Stale state persists; error is shown. Old insight remains visible.

---

## Files Affected

| File | Change |
|------|--------|
| `src/constants/defaults.js` | Add `aiInsights: {}` to default scenario shape |
| `src/components/AiInsight.jsx` | Major: add `savedInsight`/`onSave` props, stale badge, remove Gemini badge, remove module-level `resultCache` |
| `src/App.jsx` | Add `handleSaveInsight(type, text, hash)`, thread `aiInsights` + `onSaveInsight` to views |
| `src/views/dashboard/Dashboard.jsx` | Accept + pass `savedInsight` / `onSave` to AiInsight |
| `src/views/debt/DebtView.jsx` | Accept + pass `savedInsight` / `onSave` to AiInsight |
| `src/views/compare/CompareView.jsx` | Accept + pass `savedInsight` / `onSave` to AiInsight |
| `src/views/estate/EstateView.jsx` | Accept + pass `savedInsight` / `onSave` to AiInsight |

---

## Data Shape

Add to scenario object in `defaults.js`:
```js
aiInsights: {
  // e.g. dashboard: { text: '...', hash: 'abc123' }
  // types: dashboard | debt | compare | estate
}
```

Each entry: `{ text: string, hash: string }` where `hash` is a 32-bit polynomial hash of `JSON.stringify(aiData)` converted to base-36.

---

## AiInsight Component Changes

### New props:
- `savedInsight: { text, hash } | null` — the persisted insight for this type
- `onSave: (text, hash) => void` — called after successful fetch to persist

### Removed:
- Module-level `resultCache` Map (replaced by `savedInsight` prop)
- `scenarioKey` prop (was accepted but never used in component logic)
- "Gemini" badge span

### State logic:
```
mount or dataHash changes:
  if savedInsight && savedInsight.hash === dataHash → show insight (fresh)
  if savedInsight && savedInsight.hash !== dataHash → show insight + stale badge
  if !savedInsight → show "Generate Insights" button

after fetch:
  set recommendation + setStale(false)
  call onSave(text, dataHash)
```

### Stale badge UI:
Amber notice inside the card content area:
```
⚠ Inputs have changed — [Regenerate]
```
Old insight text remains visible below. The refresh button in the header also remains clickable.

---

## App.jsx Changes

### New handler:
```js
const handleSaveInsight = useCallback((type, text, hash) => {
  setScenarios(prev => prev.map(s =>
    s.id === currentScenarioId
      ? { ...s, aiInsights: { ...s.aiInsights, [type]: { text, hash } } }
      : s
  ))
}, [currentScenarioId])
```

### Thread to views:
- `Dashboard`: `aiInsights={effectiveScenario.aiInsights}` + `onSaveInsight={handleSaveInsight}`
- `DebtView`: `aiInsights={currentScenario.aiInsights}` + `onSaveInsight={handleSaveInsight}`
- `EstateView`: `aiInsights={currentScenario.aiInsights}` + `onSaveInsight={handleSaveInsight}`
- `CompareView`: `aiInsights={currentScenario?.aiInsights}` + `onSaveInsight={handleSaveInsight}`

Note: Dashboard gets `effectiveScenario.aiInsights` (not `currentScenario`) because WhatIf overrides affect aiData; we want the stale badge to appear when WhatIf changes.

---

## Hash Function

```js
function computeHash(data) {
  const str = JSON.stringify(data)
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0
  }
  return (h >>> 0).toString(36)
}
```

---

## Tests

No engine logic changes → no new unit tests required. Existing 277 tests must still pass.
Manual verification:
- Generate insight → refresh page → insight appears without clicking
- Change WhatIf slider → stale badge appears with old insight
- Revert WhatIf slider → stale badge disappears
- Regenerate after stale → insight updated, badge gone
- "Gemini" badge no longer visible

---

## Out of Scope

- Per-scenario Compare insight storage (compare saves under current scenario — acceptable tradeoff)
- Insight expiry / TTL (insights persist indefinitely; users can manually refresh)
- AI insight versioning or history
