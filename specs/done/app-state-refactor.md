# Spec: App State Refactor — Flatten users[] → scenarios[]

## Status
Pending implementation

## Why This Exists

The app was built with a `users[]` model (multiple named "people", each with their own `scenarios[]`). The decision for launch is: one account = one person. The `users` nesting layer adds complexity with no user-facing benefit and directly blocks the cloud sync spec — the Supabase `scenarios` table expects a flat `user_id → scenarios[]` structure, not a nested users → scenarios model.

This refactor collapses the nesting. The result is simpler state, simpler code, and a clean match to the DB schema.

---

## Current State Shape

```javascript
// Top-level state in App.jsx
users: [
  {
    id: 'uuid',
    name: 'Nick',
    scenarios: [ scenarioObject, scenarioObject ]
  },
  {
    id: 'uuid',
    name: 'Mom',
    scenarios: [ scenarioObject ]
  }
]
currentUserId: 'uuid'
currentScenarioId: 'uuid'
view: string
wizardStep: number
whatIfOverrides: {}

// Derived
currentUser     = users.find(currentUserId)
scenarios       = currentUser.scenarios
currentScenario = scenarios.find(currentScenarioId)
```

## Target State Shape

```javascript
// Top-level state in App.jsx
scenarios: [ scenarioObject, scenarioObject, scenarioObject ]
currentScenarioId: 'uuid'
view: string
wizardStep: number
whatIfOverrides: {}

// Derived (simpler)
currentScenario = scenarios.find(currentScenarioId)
```

No `users`, no `currentUserId`, no `currentUser`. Scenarios are first-class citizens.

---

## What Gets Deleted

| Item | Where | Reason |
|---|---|---|
| `users` state | `App.jsx` | Replaced by top-level `scenarios` |
| `currentUserId` state | `App.jsx` | No user layer |
| `currentUser` derived value | `App.jsx` | No user layer |
| `updateScenarios` helper | `App.jsx` | Was needed to thread through user; now direct |
| `handleAddUser` | `App.jsx` | No "add person" feature |
| `handleNewPersonStart` | `App.jsx` | No "add person" feature |
| `handleNewPersonLoad` | `App.jsx` | Merged into `handleLoadScenario` |
| `handleSwitchUser` | `App.jsx` | No user switching |
| `handleRenameUser` | `App.jsx` | No user concept |
| `handleDeleteUser` | `App.jsx` | No user concept |
| `createDefaultUser` export | `defaults.js` | No user concept |
| User selector `<select>` | `App.jsx` header | Removed from UI |
| `"+ Add Person"` option | `App.jsx` header | Removed |
| `"Delete Person"` menu item | `App.jsx` header | Removed |
| `NewPersonScreen` view | `App.jsx` + file | Entire view deleted |
| `view === 'new-person'` branch | `App.jsx` | Removed |
| `view === 'welcome'` branch | `App.jsx` | Replaced by wizard-first (onboarding-ux spec) |
| `WelcomeScreen` import | `App.jsx` | Removed (onboarding-ux spec handles this) |

---

## What Gets Simplified

### `loadSaved()` — localStorage migration

The current format is `{ users: [...], currentUserId, currentScenarioId, view }`.
The new format is `{ scenarios: [...], currentScenarioId, view }`.

Must handle both during migration:

```javascript
function loadSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);

    // New format (v3+): flat scenarios array
    if (Array.isArray(data?.scenarios) && data.scenarios.length > 0) {
      data.scenarios.forEach(migrateScenario);
      return { scenarios: data.scenarios, currentScenarioId: data.currentScenarioId, view: data.view };
    }

    // Old format (v2): users[] wrapper — flatten all users' scenarios into one pool
    if (Array.isArray(data?.users) && data.users.length > 0) {
      const allScenarios = data.users
        .flatMap(u => (u.scenarios || []).map(migrateScenario));
      if (allScenarios.length === 0) return null;
      return { scenarios: allScenarios, currentScenarioId: data.currentScenarioId, view: data.view };
    }
  } catch { /* ignore corrupt data */ }
  return null;
}
```

Note: if a user had multiple people (e.g., "Nick" and "Mom"), all their scenarios are merged into one flat list. Each scenario already has a `name` ("Nick's Plan", "Mom's Plan"), so nothing is lost. Users who had "Individual 1" with generic names may see "Individual 1's Plan" — acceptable.

### `useState` initializers (App.jsx)

```javascript
// Before
const [users, setUsers] = useState(() => { ... })
const [currentUserId, setCurrentUserId] = useState(() => { ... })
const [currentScenarioId, setCurrentScenarioId] = useState(() => { ... })

// After
const [scenarios, setScenarios] = useState(() => {
  const saved = loadSaved();
  if (saved?.scenarios?.length > 0) return saved.scenarios;
  return [];  // empty → onboarding-ux spec starts wizard immediately
});

const [currentScenarioId, setCurrentScenarioId] = useState(() => {
  const saved = loadSaved();
  return saved?.currentScenarioId || saved?.scenarios?.[0]?.id || null;
});
```

Note: `defaultData.json` (bundled "mother's data") is no longer loaded for first-time users. The onboarding-ux spec replaces the welcome screen with wizard step 1. `defaultData.json` can be kept for tests but removed from App.jsx imports.

### `handleStartNew`

```javascript
// Before — used currentUser.name
const handleStartNew = useCallback(() => {
  const newScenario = createDefaultScenario(`${currentUser.name}'s Plan`);
  updateScenarios(prev => [...prev, newScenario]);
  setCurrentScenarioId(newScenario.id);
  setWizardStep(0);
  setWhatIfOverrides({});
  setView('wizard');
}, [currentUser.name, updateScenarios]);

// After — no user context needed
const handleStartNew = useCallback(() => {
  const newScenario = createDefaultScenario('My Plan');
  setScenarios(prev => [...prev, newScenario]);
  setCurrentScenarioId(newScenario.id);
  setWizardStep(0);
  setWhatIfOverrides({});
  setView('wizard');
}, []);
```

### `handleScenarioChange`

```javascript
// Before
const handleScenarioChange = useCallback((updates) => {
  updateScenarios(prev =>
    prev.map(s => s.id === currentScenarioId ? { ...s, ...updates } : s)
  );
}, [currentScenarioId, updateScenarios]);

// After — updateScenarios helper is gone, call setScenarios directly
const handleScenarioChange = useCallback((updates) => {
  setScenarios(prev =>
    prev.map(s => s.id === currentScenarioId ? { ...s, ...updates } : s)
  );
}, [currentScenarioId]);
```

Apply the same pattern to `handleRenameScenario`, `handleDuplicateScenario`, `handleDeleteScenario` — all now call `setScenarios(prev => ...)` directly, no `updateScenarios` indirection.

### `handleExport`

```javascript
// Before
const payload = { version: 2, users, exportedAt: new Date().toISOString() };

// After
const payload = { version: 3, scenarios, exportedAt: new Date().toISOString() };
```

### `handleLoadScenario` (and `handleImport`)

Merge `handleNewPersonLoad` into `handleLoadScenario`. Support all historical formats:

```javascript
const handleLoadScenario = useCallback((jsonData) => {
  let loaded = [];

  if (jsonData?.version === 3 && Array.isArray(jsonData.scenarios)) {
    // New flat format
    loaded = jsonData.scenarios;
  } else if (jsonData?.version === 2 && Array.isArray(jsonData.users)) {
    // Old multi-user format — flatten
    loaded = jsonData.users.flatMap(u => u.scenarios || []);
  } else {
    // Legacy: plain array of scenarios or single scenario object
    loaded = Array.isArray(jsonData) ? jsonData : [jsonData];
  }

  const valid = loaded
    .filter(s => s?.currentAge != null && s?.retirementAge != null)
    .map(s => ({ ...createDefaultScenario(), ...migrateScenario(s), id: s.id || uid() }));

  if (valid.length === 0) { alert('No valid scenarios found in this file.'); return; }

  setScenarios(prev => {
    const existingIds = new Set(prev.map(s => s.id));
    return [...prev, ...valid.map(s => existingIds.has(s.id) ? { ...s, id: uid() } : s)];
  });
  setCurrentScenarioId(valid[0].id);
  setWhatIfOverrides({});
  setView('dashboard');
}, []);
```

### `handleDeleteScenario`

```javascript
// Before — guarded by users.length > 1 for "Delete Person" button
// After — only guard: can't delete last scenario
const handleDeleteScenario = useCallback((id) => {
  setScenarios(prev => {
    if (prev.length <= 1) return prev;  // always keep at least one
    const next = prev.filter(s => s.id !== id);
    if (id === currentScenarioId) {
      setCurrentScenarioId(next[0].id);
      setWhatIfOverrides({});
    }
    return next;
  });
}, [currentScenarioId]);
```

### localStorage auto-save

```javascript
// Before
const data = { users, currentUserId, currentScenarioId, view: (view === 'wizard' || view === 'new-person') ? 'dashboard' : view };

// After
const data = { scenarios, currentScenarioId, view: view === 'wizard' ? 'dashboard' : view };
```

### `openPrintReport` — `currentUser.name` removal

Currently called as:
```javascript
openPrintReport(effectiveScenario, projectionData, currentUser.name)
```

After refactor, there is no `currentUser`. Pass the scenario name instead, or pass an empty string and update `openPrintReport`/`generateReport` to omit the person name section. Check what `currentUser.name` is used for inside `openPrintReport` — likely just a display label in the report header.

```javascript
// After
openPrintReport(effectiveScenario, projectionData, currentScenario.name)
```

Same for `downloadAudit` if it receives the user name.

### `WizardShell` — `userName` prop

WizardShell currently receives `userName={currentUser.name}` and `onUserNameChange={handleRenameUser}`.
After refactor:
- `userName` → pass `currentScenario.name` or omit entirely
- `onUserNameChange` → remove (no user rename; scenario rename still works via `handleRenameScenario`)
- Check what WizardShell does with `userName` — likely displays it as a header label. Replace with scenario name or app name.

### Header — user selector removed

The header currently has a `<select>` with the purple styling for switching users, and `"+ Add Person"` option. Remove entirely. The scenario `<select>` remains.

The actions menu loses:
- "Delete Person" option
- The `users.length > 1` guard on delete options

---

## Derived State (simplified)

```javascript
// Before
const currentUser = useMemo(() => users.find(u => u.id === currentUserId) || users[0], [users, currentUserId]);
const scenarios = currentUser.scenarios;
const currentScenario = useMemo(() => scenarios.find(s => s.id === currentScenarioId) || scenarios[0], [...]);

// After
const currentScenario = useMemo(
  () => scenarios.find(s => s.id === currentScenarioId) || scenarios[0] || null,
  [scenarios, currentScenarioId]
);
```

`projectionData` and `effectiveScenario` are unchanged.

---

## Initial View Logic

```javascript
// Before
return user?.scenarios.length > 0 ? 'dashboard' : 'welcome';

// After (per onboarding-ux spec: wizard is the entry point)
return scenarios.length > 0 ? 'dashboard' : 'wizard';
```

---

## Files to Delete
- `src/views/NewPersonScreen.jsx`
- `src/views/WelcomeScreen.jsx` (handled by onboarding-ux spec; delete here)

## Files to Modify

| File | Change |
|---|---|
| `src/App.jsx` | Full state refactor per above |
| `src/constants/defaults.js` | Remove `createDefaultUser` export |
| `src/utils/openPrintReport.js` | Replace `userName` param with scenario name (check signature) |
| `src/utils/downloadAudit.js` | Same — check if it uses user name |
| `src/views/wizard/WizardShell.jsx` | Remove `userName`/`onUserNameChange` props or replace with scenario name |
| `docs/architecture.md` | Remove NewPersonScreen, WelcomeScreen, user management from structure tree and state management section |

## Files Unaffected
- All engines (`projectionEngine`, `taxEngine`, `estateEngine`, `withdrawalCalc`, `incomeHelpers`) — engines are pure functions, no user concept
- All tests — tests operate directly on engines, not on App.jsx state
- All view components (`Dashboard`, `CompareView`, `EstateView`, `DebtView`, `WhatIfPanel`) — receive scenarios/scenario as props, no user dependency
- `src/constants/taxTables.js`, `src/constants/designTokens.js` — unchanged

---

## Backward Compatibility

### JSON export files users may have saved
Old format: `{ version: 2, users: [{name, id, scenarios: [...]}] }`
The updated `handleLoadScenario` handles version 2 by flattening — no data loss.

### localStorage data from before this refactor
`loadSaved()` detects the old `users[]` format and migrates automatically on first load. Write the new format on next auto-save. Old `currentUserId` is discarded (no longer needed).

---

## Acceptance Criteria
- [ ] `users` state is gone; `scenarios` is the top-level array
- [ ] `currentUserId` state is gone
- [ ] `currentUser` derived value is gone
- [ ] `createDefaultUser` removed from `defaults.js`
- [ ] `NewPersonScreen.jsx` deleted
- [ ] User selector `<select>` removed from header
- [ ] "Add Person" and "Delete Person" removed from actions menu
- [ ] `view === 'new-person'` branch removed from App.jsx
- [ ] `loadSaved()` correctly migrates old `users[]` localStorage format
- [ ] `handleLoadScenario` handles v3 (flat), v2 (users wrapper), and legacy (plain array/object)
- [ ] `handleExport` produces `{ version: 3, scenarios: [...] }`
- [ ] Initial view: `'wizard'` when no scenarios, `'dashboard'` when scenarios exist
- [ ] `openPrintReport` and `downloadAudit` no longer receive `currentUser.name`
- [ ] All 131 existing tests pass (engines are unaffected)
- [ ] `npm run build` succeeds with zero errors

## Edge Cases
- User has old localStorage with 2 people (e.g., "Nick" + "Mom"): migration flattens all scenarios into one list. Nick's Plan and Mom's Plan both appear in the scenario selector.
- User has a saved JSON export from before this refactor (version 2): import still works via backward-compat branch
- `scenarios` is empty after migration (all scenarios were somehow invalid): fall through to `view = 'wizard'`, start fresh
- `currentScenarioId` from old localStorage points to a scenario that no longer exists (edge case during migration): fall back to `scenarios[0].id`

## Implementation Order
1. Update `loadSaved()` — migration logic first, before touching state
2. Update state initializers (`useState`)
3. Delete user management handlers
4. Simplify scenario handlers (remove `updateScenarios`, direct `setScenarios`)
5. Update derived state
6. Update header JSX (remove user selector)
7. Update actions menu (remove user actions)
8. Update `openPrintReport` / `downloadAudit` call sites
9. Update `WizardShell` props
10. Delete `NewPersonScreen.jsx`, `WelcomeScreen.jsx`
11. Remove imports
12. Run `npm test` — all 131 tests must pass
13. Run `npm run build` — zero errors
14. Update `docs/architecture.md`
