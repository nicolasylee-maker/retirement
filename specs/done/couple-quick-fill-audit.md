# Spec: Couple Quick-Fill Audit — Preset Coverage for Spouse

## Status
Pending implementation

## Background

The couple support sprint (P0–P3) added spouse fields across Steps 1–4. All existing
quick-fill preset buttons were written before couple support existed. This spec audits
every preset group and determines whether each should: apply to the spouse as-is, get
a separate spouse equivalent, or requires no change.

---

## Quick-Fill Inventory

### Group 1 — CPP / OAS Presets (Step 2: Gov Benefits)

**Component:** `QuickFillPills` with `GOV_BENEFIT_PRESETS` from `defaults.js`

| Preset | `cppMonthly` | `oasMonthly` |
|--------|-------------|-------------|
| Average | 815 | 713 |
| Maximum | 1365 | 713 |
| Low / partial | 400 | 500 |
| No CPP/OAS | 0 | 0 |

**Current behaviour (isCouple=true):** Sets only primary's CPP/OAS. Spouse
`spouseCppMonthly` and `spouseOasMonthly` must be typed manually.

**Verdict: ADD spouse quick-fill row.** ← Action required

Rationale: the CPP/OAS preset is the most useful quick-fill in the wizard because
most users don't know their exact benefit projections. Spouses are equally unlikely
to know their precise numbers. Leaving the spouse fields as manual-only is
inconsistent and slows data entry for the most common couple use case.

The fix is a second `QuickFillPills` row in the spouse section of `GovBenefitsStep`,
using the same `GOV_BENEFIT_PRESETS` but calling `onChange({ spouseCppMonthly, spouseOasMonthly })`.
No new preset data needed — same 4 buttons, same values, different target fields.

---

### Group 2 — Monthly Expenses Presets (Step 7: Expenses)

**Component:** `QuickFillPills` with `EXPENSE_PRESETS` from `defaults.js`

| Preset | `monthlyExpenses` |
|--------|-----------------|
| Modest | 3000 |
| Comfortable | 5000 |
| Generous | 7500 |
| Premium | 10000 |

**Current behaviour (isCouple=true):** Sets `monthlyExpenses` — a single
household-level field. There is no per-person expense split.

**Verdict: No change needed.** `monthlyExpenses` already represents household
spending for both single and couple scenarios. The presets are household presets
by design. No spouse-specific field exists or is planned.

**Future consideration (out of scope for this spec):** The preset labels and values
are calibrated for a single person. A couple living together typically spends more
than a single person but less than 2× (shared housing, utilities). A future
enhancement could show different preset values when `isCouple=true`
(e.g., "Comfortable" → $7,500 instead of $5,000 for a couple). This should be a
separate spec when there is evidence users are confused about the labelling.

---

### Group 3 — Return Assumptions Presets (Step 7: Expenses)

**Component:** `QuickFillPills` with `RETURN_PRESETS` from `defaults.js`

| Preset | `realReturn` | `inflationRate` |
|--------|-------------|----------------|
| Conservative | 3% | 2.5% |
| Balanced | 4% | 2.5% |
| Aggressive | 6% | 2.5% |

**Current behaviour (isCouple=true):** Sets `realReturn` and `inflationRate` —
portfolio-wide assumptions shared across all accounts (RRSP, TFSA, non-reg, and
now spouse RRSP/TFSA).

**Verdict: No change needed.** Return and inflation assumptions are macro-economic
inputs that apply equally to both persons' portfolios. There are no spouse-specific
return parameters, and none are planned. The presets are already couple-aware.

---

## Summary

| Group | Step | Action | Reason |
|-------|------|--------|--------|
| CPP / OAS presets | 2 | **Add spouse row** | Primary-only; spouse must type manually — inconsistent UX |
| Expense presets | 7 | No change | `monthlyExpenses` is a household field; presets already apply to both |
| Return presets | 7 | No change | `realReturn`/`inflationRate` are portfolio-wide; presets already apply to both |

---

## Implementation: Spouse CPP/OAS Quick-Fill (Step 2)

### New fields targeted
- `spouseCppMonthly`
- `spouseOasMonthly`

No new preset data or constants needed — reuse `GOV_BENEFIT_PRESETS`.

### Handler to add in `GovBenefitsStep.jsx`

```javascript
const handleSpousePresetSelect = (key) => {
  const preset = GOV_BENEFIT_PRESETS[key];
  if (preset) onChange({ spouseCppMonthly: preset.cppMonthly, spouseOasMonthly: preset.oasMonthly });
};

const findActiveSpousePreset = () => {
  return Object.keys(GOV_BENEFIT_PRESETS).find(
    key =>
      GOV_BENEFIT_PRESETS[key].cppMonthly === scenario.spouseCppMonthly &&
      GOV_BENEFIT_PRESETS[key].oasMonthly === scenario.spouseOasMonthly,
  ) ?? null;
};
```

### Placement in `GovBenefitsStep.jsx`

Inside the existing `{scenario.isCouple && (...)}` spouse section (where
`spouseCppMonthly`, `spouseCppStartAge`, `spouseOasMonthly`, `spouseOasStartAge`
inputs live), add the `QuickFillPills` row above the form fields:

```jsx
{scenario.isCouple && (
  <Card className="view-enter">
    <h3 ...>Spouse Government Benefits</h3>
    <QuickFillPills
      presets={GOV_BENEFIT_PRESETS}
      activeKey={findActiveSpousePreset()}
      onSelect={handleSpousePresetSelect}
    />
    {/* existing spouse CPP/OAS fields */}
  </Card>
)}
```

### Acceptance Criteria
- [ ] When `isCouple=false`: no spouse quick-fill row visible
- [ ] When `isCouple=true`: spouse section shows same 4 preset pills
- [ ] Clicking "Average" on spouse row sets `spouseCppMonthly=815`, `spouseOasMonthly=713`
  (does NOT change primary CPP/OAS)
- [ ] Active pill highlights correctly if current spouse values match a preset
- [ ] Primary CPP/OAS quick-fill row is unaffected (still sets primary fields only)

### Edge Cases
- Spouse values already set to a preset value on load → correct pill is pre-highlighted
- Spouse CPP/OAS manually typed to a non-preset value → no pill highlighted (null active key)
- User clicks primary preset then spouse preset → both sections update independently

---

## Files to Modify

| File | Change |
|------|--------|
| `src/views/wizard/GovBenefitsStep.jsx` | Add `handleSpousePresetSelect`, `findActiveSpousePreset`, and `QuickFillPills` row inside spouse card |

No changes to `defaults.js`, `taxEngine`, `projectionEngine`, or any test file required.
The engine already reads `spouseCppMonthly` and `spouseOasMonthly` correctly.
