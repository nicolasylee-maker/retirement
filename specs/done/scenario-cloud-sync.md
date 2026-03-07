# Spec: Scenario Cloud Sync

## Status
Pending implementation

## Overview
Replace the current JSON-only save/load model with automatic cloud sync to Supabase for signed-in users. JSON export is retained as a secondary option. Free users are capped at 1 saved scenario (enforced at application layer). Anonymous users continue to work with in-memory scenarios only.

## Behaviour by User State

| State | Save behaviour | Load behaviour | Scenario cap |
|---|---|---|---|
| Anonymous | Memory only (lost on refresh) | None | Unlimited in-memory (irrelevant) |
| Free (signed in) | Auto-save to Supabase | Load all cloud scenarios on sign-in | 1 saved scenario |
| Paid (signed in) | Auto-save to Supabase | Load all cloud scenarios on sign-in | Unlimited |

## Auto-Save Behaviour
- Scenarios auto-save to Supabase **on every change** with a 1-second debounce
- No explicit "Save" button needed for signed-in users
- A subtle "Saved" / "Saving..." indicator in the header
- If offline or save fails: show a warning toast; do not block the user

## Scenario CRUD Operations

### Create
- User clicks "New Plan" — creates scenario in local state and immediately inserts to Supabase
- Before insert: check user's scenario count against plan limit
  - Free users at limit: show upgrade prompt instead of creating
  - Paid users: always allow

### Read (load on sign-in)
- On `onAuthStateChange` (user signs in): fetch all scenarios from `public.scenarios` for this `user_id`
- Replace in-memory scenarios with cloud scenarios
- If no cloud scenarios: start fresh (create one default)

### Update
- Any change to scenario data triggers a debounced `upsert` to Supabase
- Uses `scenario.id` as the key (scenarios already have UUID IDs from `defaults.js`)

### Delete
- "Delete scenario" action deletes from Supabase and removes from local state

## Free Tier Enforcement
- On "New Plan" click: query `scenarios` table for count where `user_id = current user`
- If count >= 1 and user is free tier: show `<UpgradePrompt>` instead of creating
- Message: "Free plan includes 1 saved scenario. Upgrade to save unlimited plans."

## JSON Export (Retained)
- "Download as JSON" button stays on Dashboard toolbar
- Exports current scenario as before (same format, same file)
- Available to all users (free + paid + anonymous)

## JSON Import (Retained)
- "Load from file" on WelcomeScreen stays
- Imports JSON, creates a new in-memory scenario
- If user is signed in: immediately syncs the imported scenario to cloud (subject to plan limit)

## New Service: `src/services/scenarioService.js`

```javascript
// Fetch all scenarios for signed-in user
export async function fetchScenarios(userId) { ... }

// Upsert scenario (create or update)
export async function saveScenario(scenario) { ... }

// Delete scenario by ID
export async function deleteScenario(scenarioId) { ... }

// Count user's scenarios
export async function getScenarioCount(userId) { ... }
```

All functions use the `supabase` client singleton. Errors are thrown and handled at the call site.

## App.jsx Changes

### New state
```javascript
const [isSaving, setIsSaving] = useState(false)
const [saveError, setSaveError] = useState(null)
```

### On sign-in
```javascript
// in onAuthStateChange handler
const cloudScenarios = await fetchScenarios(user.id)
setScenarios(cloudScenarios.length > 0 ? cloudScenarios : [createDefaultScenario()])
```

### On scenario change (debounced)
```javascript
useEffect(() => {
  if (!user || !currentScenario) return
  const timeout = setTimeout(async () => {
    setIsSaving(true)
    try {
      await saveScenario(currentScenario)
      setSaveError(null)
    } catch (e) {
      setSaveError(e.message)
    } finally {
      setIsSaving(false)
    }
  }, 1000)
  return () => clearTimeout(timeout)
}, [currentScenario, user])
```

### Save indicator (header)
- `isSaving`: show spinner + "Saving..."
- `saveError`: show warning icon + "Save failed"
- Neither: show "Saved" (briefly, then fade)

## Acceptance Criteria
- [ ] Anonymous user: wizard + dashboard work, scenarios are in-memory only
- [ ] On Google sign-in: user's cloud scenarios load into the app
- [ ] Scenario changes auto-save to Supabase within 1 second (debounced)
- [ ] Header shows "Saving..." / "Saved" / "Save failed" states
- [ ] Free user at 1 scenario: "New Plan" shows upgrade prompt (not a new scenario)
- [ ] Paid user: can create unlimited scenarios
- [ ] "Delete scenario" removes from Supabase and local state
- [ ] JSON download works for all user states (unchanged)
- [ ] JSON import works for all user states; syncs to cloud if signed in
- [ ] Imported scenario respects free tier limit

## Edge Cases
- Network offline during auto-save: show warning, keep scenario in local state, retry on reconnect
- User signs out: in-memory scenarios cleared, app returns to WelcomeScreen
- User signs in on second device: cloud scenarios load (same as first device)
- Scenario ID collision (two devices create scenario simultaneously): last-write-wins (upsert by ID)
- Very large scenario object: JSON blob should be fine for Supabase JSONB (< 1MB easily)
- User imports a JSON with an ID that already exists in cloud: treat as update (upsert)

## Files to Create
- `src/services/scenarioService.js`

## Files to Modify
- `src/App.jsx` — add cloud sync logic, save indicator state
- `src/views/WelcomeScreen.jsx` — show "My Plans" when signed in; "Load from file" triggers import+sync
- Header component (wherever save indicator lives)

## Dependencies
- `@supabase/supabase-js` (added in auth spec)
- No new npm packages required
