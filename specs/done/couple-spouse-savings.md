# Spec: Couple — Spouse Registered Savings (P3)

## Status
Pending implementation (UI/engine done in couple-sprint)

## Problem
Spouse registered savings (RRSP/TFSA) could not be entered. Household net worth and
RRIF projections were wrong for couples with a younger spouse.

## New Fields
- `spouseRrspBalance: 0` — Spouse RRSP balance today
- `spouseRrifBalance: 0` — Spouse RRIF balance today (if already converted)
- `spouseTfsaBalance: 0` — Spouse TFSA balance today
- `spouseTfsaContributionRoom: 0` — Spouse TFSA contribution room

## Wizard UI
- Step 4 (SavingsStep): after primary savings section, show spouse savings fields
- Hidden when `isCouple = false`

## Engine Behaviour
- `spouseRrsp = spouseRrspBalance + spouseRrifBalance + spouseDcPensionBalance`
- `spouseRrifConverted = spouseAge >= 72` at plan start; converts at 72 during projection
- Mandatory RRIF minimum computed at **spouse's age**, not primary's age
- Spouse RRSP elective withdrawals: drawn only after primary RRSP is exhausted
  (when withdrawal order reaches 'rrsp' and primary pool is depleted)
- `spouseTfsa` grows each year at `tfsaReturn`; included in `totalPortfolio`
- RRSP meltdown for spouse is NOT in scope for this sprint

## Acceptance Criteria
- [ ] Spouse RRSP/TFSA balances included in `totalPortfolio` and `netWorth`
- [ ] Spouse RRIF minimum kicks in at **spouse's** age 72 (e.g. if primary is 75 but spouse is 68, no spouse RRIF yet)
- [ ] Spouse RRIF withdrawal routed to spouse's tax return
- [ ] `spouseRrspBalance` and `spouseTfsaBalance` appear in projection output each year

## Edge Cases
- Spouse already 72+ at plan start: `spouseRrifConverted = true` immediately
- `spouseRrspBalance = 0` and `spouseRrifBalance = 0`: no spouse RRSP pool
- `isCouple = false`: all spouse savings fields ignored
- Spouse RRSP exhausted before primary: only primary RRSP draws
