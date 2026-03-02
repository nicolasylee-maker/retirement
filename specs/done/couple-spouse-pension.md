# Spec: Couple — Spouse Pension (P2)

## Status
Pending implementation (UI/engine done in couple-sprint)

## Problem
Spouse employer pension could not be entered. If the spouse has a DB or DC pension,
it was silently ignored.

## New Fields
- `spousePensionType: 'none'` — 'none' | 'db' | 'dc'
- `spouseDbPensionAnnual: 0` — Annual DB pension payment
- `spouseDbPensionStartAge: 65` — Age spouse starts collecting DB
- `spouseDbPensionIndexed: false` — If true, DB payment inflates each year
- `spouseDcPensionBalance: 0` — DC balance folds into spouse RRSP pool at plan start

## Wizard UI
- Step 3 (PensionsStep): after primary pension section, show spouse pension type selector
- DB/DC detail cards shown conditionally (same pattern as primary)
- Hidden when `isCouple = false`

## Engine Behaviour
- DB: `spousePensionIncome = spouseDbPensionAnnual` starting at `spouseDbPensionStartAge`
  - If indexed: multiplied by `inflationFactor`
- DC: balance added to `spouseRrsp` pool at initialization (treated like RRSP)
- Both routed to spouse's separate tax return

## Acceptance Criteria
- [ ] DB pension income appears in projection output as `spousePensionIncome` starting at correct age
- [ ] Indexed DB inflates year-over-year
- [ ] DC balance grows in spouse RRSP pool
- [ ] `pensionCredit` applied correctly to spouse's tax (via `spouseHasPension` flag)

## Edge Cases
- `spousePensionType = 'none'`: `spousePensionIncome = 0`
- `spouseDbPensionStartAge > spouseAgeThisYear`: pension not yet started
- `isCouple = false`: spouse pension fields ignored
