# Spec: Admin Maintenance Tab

## Description

Add a **Maintenance** tab to the admin sidebar. It covers:

1. **Tax Data Manager** — view and edit the full tax JSON for each province (+ federal) using a JSON editor. Data migrates from static files in `data/` to a `tax_data` Supabase table. All users' tax calculations read from the DB at app startup.
2. **Legislation Monitor** — display CanLII staleness per act. A "Run Check" button triggers an edge function that fetches all 18 CanLII pages and records changes.
3. **Seed Action** — one-time (and repeatable) "Seed from bundled JSON" button that posts the currently-bundled JSON files to the DB as the canonical baseline.

---

## Decisions Captured During Interview

| Question | Answer |
|----------|--------|
| Goal | Full editing — status + trigger actions + JSON editor per province |
| Persistence | Full DB migration — `tax_data(province, tax_year, data JSONB)`; JSON files retired |
| CanLII | Edge function triggered from browser; results stored in `legislation_checks` table |
| Edit scope | JSON editor (textarea) per province/year; no normalization |
| DB dependency | App fetches all tax data from Supabase on startup (like session); cached in `TaxDataContext` |
| Validation | After editing, run a sample $100K income calculation in-browser; block save if engine throws |

---

## Acceptance Criteria

- Admin sidebar shows **Maintenance** nav item between AI Config and Subscriptions
- Province picker (+ federal) loads the full JSON for that key in an editable `<textarea>`
- "Save" is disabled if JSON fails `JSON.parse`; shows inline parse error
- After successful parse, runs `taxEngine.calcFederalTax(100000, taxData.federal)` + `calcProvincialTax(100000, taxData.province)` and shows the result beneath the editor; blocks save if engine throws
- Save calls `maintenance` edge function → upserts `tax_data` row → shows success toast
- "Seed from bundled JSON" button (admin only, one-time) posts all 10 JSON blobs (9 provinces + federal) to the edge function; idempotent (upsert)
- Legislation panel shows a table with columns: Province | Type | Act | URL | Last Amendment | Status
- "Run Legislation Check" button calls edge function, shows spinner, then refreshes results from `legislation_checks` table
- Status badge: green=unchanged, amber=changed-since-last-known, red=error fetching
- Last run timestamp shown above table
- All other tabs (Overview, Users, AI Config, Subscriptions) continue to work after tax data moves to DB
- AI Insights continue to work (no dependency on tax data)
- All 277 tests still pass (engines receive data via context/param, not static import)

---

## Edge Cases

- If `tax_data` table is empty (first load, before seeding), fall back to bundled JSON files — no blank/crash
- If DB fetch fails on startup, fall back to bundled JSON with a console warning
- Editing federal JSON affects all provinces' OAS/CPP/RRIF calculations — note this clearly in the UI
- Very large JSON (federal has ~100 fields) — textarea handles it; no Monaco required
- `lastAmendment` from CanLII is a year string, not a date — comparison is string equality
- CanLII fetch from edge function may encounter rate limiting or changed HTML structure — surface the error per-act, don't fail the whole batch

---

## Files to Create

```
supabase/migrations/004_tax_data.sql
supabase/functions/maintenance/index.ts
src/contexts/TaxDataContext.jsx
src/views/admin/sections/MaintenanceSection.jsx
src/views/admin/components/TaxDataEditor.jsx
src/views/admin/components/LegislationPanel.jsx
```

## Files to Modify

```
src/App.jsx                         ← wrap with TaxDataProvider; engines receive taxData from context
src/constants/taxTables.js          ← accept external data when provided (context override pattern)
src/views/admin/AdminView.jsx       ← add 'maintenance' nav item
docs/architecture.md
docs/learned-rules.md               ← post-build pitfalls
```

## Files to Delete

_(none)_

---

## DB Schema — `004_tax_data.sql`

```sql
-- Tax data: one row per province/year
CREATE TABLE IF NOT EXISTS public.tax_data (
  province    text        NOT NULL,
  tax_year    int         NOT NULL,
  data        jsonb       NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (province, tax_year)
);
ALTER TABLE public.tax_data ENABLE ROW LEVEL SECURITY;
-- Allow all authenticated users to read (needed for app startup)
CREATE POLICY "tax_data_read" ON public.tax_data
  FOR SELECT USING (auth.role() = 'authenticated');
-- No insert/update policy — writes only via service role (edge function)

-- Legislation check history
CREATE TABLE IF NOT EXISTS public.legislation_checks (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  checked_at  timestamptz NOT NULL DEFAULT now(),
  results     jsonb       NOT NULL, -- array of {province, type, act, url, status, lastAmendment, changed, error}
  summary     text
);
ALTER TABLE public.legislation_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "legislation_read" ON public.legislation_checks
  FOR SELECT USING (auth.role() = 'authenticated');
```

---

## Edge Function: `maintenance/index.ts`

Same auth pattern (JWT → admin email check → service role client).

### Actions

**`{ action: 'upsert-tax', province, taxYear, data }`**
- Validates `province` is one of `['federal','ON','BC','AB','SK','MB','NB','NS','NL','PE']`
- Upserts `{ province, tax_year: taxYear, data, updated_at: now() }` with `onConflict: 'province,tax_year'`
- Returns `{ success: true }`

**`{ action: 'seed-all', payload: { federal, ON, BC, ... } }`**
- Upserts all 10 blobs in one call (Promise.all of 10 upserts)
- Returns `{ success: true, seeded: [...province keys] }`

**`{ action: 'check-legislation' }`**
- Reads the acts list from `data/canlii-state.json` (edge function receives it as a hardcoded array — JSON file not accessible from Deno at runtime)
- Fetches each CanLII URL concurrently (Promise.allSettled)
- Parses HTML for the "Amended" date string (regex on response text)
- Compares to known `lastAmendment` value
- Writes one row to `legislation_checks` with full results array + summary string
- Returns the row

**Why hardcode acts in the edge function:** The `/DATA` filesystem is not available inside the Supabase edge runtime; the `canlii-state.json` file cannot be read at runtime. The 18-act list is stable (legislation acts don't appear/disappear), so hardcoding them in the edge function is acceptable. A future enhancement could store them in `admin_config`.

---

## TaxDataContext — Startup Fetch

```jsx
// src/contexts/TaxDataContext.jsx
export function TaxDataProvider({ children }) {
  const [taxData, setTaxData] = useState(null) // null = loading
  useEffect(() => {
    supabase.from('tax_data').select('province, data')
      .then(({ data, error }) => {
        if (error || !data?.length) {
          // fallback: use bundled JSON (imported statically)
          setTaxData(buildFromBundled())
          return
        }
        setTaxData(buildFromRows(data))
      })
  }, [])
  return <TaxDataContext.Provider value={taxData}>{children}</TaxDataContext.Provider>
}
```

`buildFromRows(rows)` constructs the same shape as the current static imports:
- `{ federal: {...}, provinces: { ON: {...}, ... } }`
- Applies `normalizeBrackets` (null → Infinity) same as taxTables.js

`buildFromBundled()` returns the same shape but sourced from the static JSON imports — identical to the current behavior.

---

## taxTables.js — Minimal Change Strategy

The engines import named constants (`FEDERAL_BRACKETS`, `PROVINCE_DATA`, etc.) from `taxTables.js` at build time. Changing all engine signatures would break 277 tests.

**Strategy**: Keep all named exports exactly as-is for backward compat (tests use them). Add a `setTaxData(data)` function that components can call to override the module-level values **at runtime**. The context calls this on successful DB load.

```js
// new at bottom of taxTables.js:
let _override = null
export function setTaxData(data) { _override = data }
export function getLiveTaxData() { return _override }
```

Components that call engines (projectionEngine, taxEngine, estateEngine) should prefer `getLiveTaxData()` if non-null. Since engines are pure functions accepting data as parameters where province-level data is needed, the caller passes `getLiveTaxData()?.provinces[province] ?? PROVINCE_DATA[province]`.

This approach: zero test breakage, zero engine refactoring, runtime override works for all logged-in users.

---

## MaintenanceSection Layout

```
┌─────────────────────────────────────────────────────┐
│ Tax Data                                            │
│ [Federal ▼]  Tax Year: [2025]    [Seed from JSON]  │
│ ┌─────────────────────────────────────────────────┐ │
│ │ { ... JSON editor (textarea, monospace) ... }   │ │
│ │                                                 │ │
│ └─────────────────────────────────────────────────┘ │
│ ✓ Parse OK — Federal tax on $100K: $15,438          │
│                              [Save Province Data]   │
├─────────────────────────────────────────────────────┤
│ Legislation Monitor                [Run Check]      │
│ Last checked: 2026-03-01 14:22                     │
│ ┌────────┬──────────┬───────────────────┬────────┐  │
│ │ Prov   │ Type     │ Act               │ Status │  │
│ │ ON     │ probate  │ Estate Admin...   │ ✓ OK   │  │
│ │ BC     │ intestacy│ Wills, Estates... │ ⚠ Chgd │  │
│ └────────┴──────────┴───────────────────┴────────┘  │
└─────────────────────────────────────────────────────┘
```

---

## TaxDataEditor Component

- Province select: `['federal','ON','BC','AB','SK','MB','NB','NS','NL','PE']`
- Tax year: number input, default current year (2025), range 2020–2030
- `useEffect` on `[province, taxYear]`: loads from context (DB data), falls back to bundled JSON
- `textarea` with `font-mono text-xs h-96`; controlled with local `rawJson` string
- Validation on change: `JSON.parse(rawJson)` — show red border + parse error if invalid
- On save click: parse → normalize → run test calc → if passes, call `adminApi.upsertTaxData(province, taxYear, parsed)` → success toast

---

## LegislationPanel Component

- Load: `supabase.from('legislation_checks').select('*').order('checked_at', {ascending: false}).limit(1).maybeSingle()`
- Shows last run timestamp or "Never run"
- Table of results from `row.results` array
- "Run Check" → POST `{ action: 'check-legislation' }` to maintenance edge fn → refresh display

---

## adminService.js Additions

```js
upsertTaxData: (province, taxYear, data) =>
  callAdminFunction('maintenance', { action: 'upsert-tax', province, taxYear, data }),
seedAllTaxData: (payload) =>
  callAdminFunction('maintenance', { action: 'seed-all', payload }),
checkLegislation: () =>
  callAdminFunction('maintenance', { action: 'check-legislation' }),
```

---

## Deployment Sequence

1. Apply migration `004_tax_data.sql` in Supabase SQL editor
2. Deploy `maintenance` edge function: `supabase functions deploy maintenance --use-api --no-verify-jwt`
3. Admin logs in → Maintenance tab → "Seed from JSON" → confirm 10 rows written
4. Ship `TaxDataContext` + `taxTables.js` minimal change + `App.jsx` wrap
5. Ship `MaintenanceSection`, `TaxDataEditor`, `LegislationPanel`
6. Update `AdminView.jsx` to show Maintenance nav item
7. Smoke-test: edit a bracket value, save, run a projection → see updated calculation

---

## Verification Checklist

- [ ] `npm test && npm run build` pass with zero changes to engine test assertions
- [ ] Seeding writes 10 rows (federal + 9 provinces) to `tax_data`
- [ ] Editing ON brackets, saving, then running a projection reflects the changed value
- [ ] Invalid JSON shows red border + parse error, Save button disabled
- [ ] Valid JSON but engine-breaking values (e.g. `brackets: null`) shows engine error and blocks save
- [ ] "Run Legislation Check" edge function returns 18 results, one row written to `legislation_checks`
- [ ] Status badges show correct colour per changed/unchanged/error
- [ ] Fallback: if DB is empty, app still renders with bundled JSON (no blank screen)
- [ ] Fallback: if DB fetch errors, console.warn logged, bundled JSON used
- [ ] Non-admin user sees no Maintenance tab
