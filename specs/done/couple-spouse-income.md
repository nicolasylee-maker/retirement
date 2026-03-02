# Spec: Couple — Spouse Employment Income (P1)

## Status
Pending implementation (UI/engine done in couple-sprint)

## Problem
Dual-income households could not enter spouse employment income.
Pre-retirement household income was understated for couples where the spouse is also working.

## New Fields
- `spouseEmploymentIncome: 0` — Annual gross salary/wages (inflation-adjusted each year)
- `spouseStillWorking: true` — Toggle; when false, spouse employment income is zero regardless of age

## Wizard UI
- Step 1 (PersonalInfoStep): inside the spouse card, below age/retirement fields
- Toggle: "Spouse Still Working?" + income field (conditional on toggle)
- Hidden when `isCouple = false`

## Engine Behaviour
- Applied each projection year where `spouseAgeThisYear < spouseRetirementAge` AND `spouseStillWorking`
- Inflation-adjusted: `spouseEmploymentIncome * inflationFactor`
- Routed to spouse's separate tax return (not pooled with primary)
- Reduces household shortfall before drawing down savings

## Acceptance Criteria
- [ ] Spouse income visible in projection output as `spouseEmploymentIncome`
- [ ] Drops to zero when `spouseAgeThisYear >= spouseRetirementAge`
- [ ] Drops to zero when `spouseStillWorking = false`
- [ ] Inflation-adjusted correctly

## Edge Cases
- Spouse already retired when plan starts (`spouseAge >= spouseRetirementAge`): income = 0 from year 1
- `spouseEmploymentIncome = 0`: no effect
- `isCouple = false`: field ignored entirely
