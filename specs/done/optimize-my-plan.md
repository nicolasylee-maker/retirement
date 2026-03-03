# Spec: Optimize My Plan — Recommendations Tab

**Status:** pending
**Phase:** 1 (spec approved, awaiting Phase 2)

---

## Overview

A new "Recommendations" tab that runs the current scenario through an optimization engine, tests systematic variations, and produces a ranked list of personalized, actionable recommendations with exact dollar impacts.

**Primary goal:** Free → premium conversion. The tab is always accessible (not gated at tab level). Free users see the #1 recommendation in full detail, then blurred cards below with an upgrade CTA. Premium users see all recommendations with "Apply this" buttons.

---

## Interview Decisions

| Question | Decision |
|---|---|
| Paywall source | Use existing `SubscriptionContext` (`isPaid`) — no new boolean |
| Couple mode | Included in this build |
| Apply behavior | Inline 2-click confirmation on card; update in-memory state; auto-save fires automatically |
| Save badge | Not needed — auto-save debounces 1s after `handleScenarioChange` and header already shows "Saving..." → "Saved" |
| Run trigger | Automatic via `useMemo` keyed on scenario identity |
| Tab gating | Tab always accessible; paywall is in-tab (card 1 visible, rest blurred) |
| Existing feature gating | Already handled in App.jsx — no changes needed |
| CPP amount normalization | Optimizer back-calculates at-65 equivalent before testing start-age variations |
| Spouse TFSA bug | Fix in this build: add spouse TFSA to the withdrawal loop in `projectionEngine.js` |
| Couple CPP timing | Joint testing of primary × spouse CPP (11 × 11 = 121 combinations). OAS stays independent. |

---

## Pre-Work: Engine Bug Fix — Spouse TFSA Never Drawn

**Root cause:** `projectionEngine.js` includes `spouseTfsa` in `totalPortfolio` but never draws from it in the withdrawal loop. The `'tfsa'` case only draws from the primary TFSA. As a result, couple scenarios appear to never deplete (spouseTfsa keeps growing), making the depletion-age optimizer metric unreliable for couples.

**Fix (in `projectionEngine.js`):** During the `'tfsa'` case in the withdrawal loop, after exhausting primary TFSA, also draw from `spouseTfsa` when `s.isCouple`. Mirror the existing `'rrsp'` case which already draws from spouse RRSP after primary.

**Regression impact:** All couple golden file snapshots will change. After the fix, run `npm run generate:golden` to regenerate `tests/golden/` snapshots. All non-couple golden files unchanged.

---

## Acceptance Criteria

1. **Engine fix:** Spouse TFSA is drawn in the withdrawal loop for couple scenarios. Golden files regenerated.
2. **Optimizer engine:** `runOptimization(scenario)` is a pure function with zero React imports, returns a ranked recommendation list.
3. **CPP/OAS normalization:** Optimizer internally normalizes `cppMonthly`/`oasMonthly` to their at-65 reference amounts before testing start-age variations.
4. **Performance:** Full optimization completes in < 500ms for both single and couple scenarios.
5. **Recommendations tab:** Appears in nav between "Debt" and "Compare". Always navigable (not in `GATED_TABS`).
6. **Free users:** Card #1 fully visible. Cards #2+ blurred (`filter: blur(8px)`, `pointer-events: none`). Upgrade CTA between card 1 and blurred cards.
7. **Premium users:** All cards visible with "Apply This" button.
8. **Apply flow:** 2-click inline — button says "Apply This" → becomes "Confirm?" → click confirms. Updates scenario via `handleScenarioChange`. Auto-save fires automatically. Card shows "✓ Applied" state.
9. **Couple CPP:** When `isCouple`, test all 121 primary-CPP × spouse-CPP combinations jointly. OAS tested independently (6 primary + 6 spouse = 12 variations).
10. **Already-optimal:** Dimensions where current setting is best appear in "Already optimal ✓" section at bottom.
11. **All existing tests pass** after projectionEngine.js change. Golden files regenerated.
12. **New optimizer tests pass** (16 test cases, see Tests section).

---

## Architecture

### New Files

```
src/engines/optimizerEngine.js                     (~280 lines)
src/views/recommendations/RecommendationsTab.jsx   (~250 lines)
src/views/recommendations/RecommendationCard.jsx   (~120 lines)
tests/optimizerEngine.test.js                      (~180 lines)
```

### Modified Files

```
src/engines/projectionEngine.js   — spouse TFSA withdrawal fix (~15 lines)
src/App.jsx                       — add 'recommendations' tab to NAV_TABS + view render
docs/architecture.md              — update structure tree + user flows
tests/golden/*.json               — regenerated after engine fix (npm run generate:golden)
```

**No changes to:** `src/constants/defaults.js`, `SubscriptionContext`, existing non-golden test files.

---

## Pre-Work Detail: Spouse TFSA Withdrawal Fix

In `projectionEngine.js`, find the `case 'tfsa'` block in the withdrawal loop. Currently:

```javascript
case 'tfsa': {
  const draw = Math.min(remaining, tfsaAvail);
  tfsaWithdrawal += draw;
  tfsaAvail -= draw;
  remaining -= draw;
  break;
}
```

Change to also draw from spouse TFSA when couple and primary TFSA exhausted:

```javascript
case 'tfsa': {
  const draw = Math.min(remaining, tfsaAvail);
  tfsaWithdrawal += draw;
  tfsaAvail -= draw;
  remaining -= draw;
  if (s.isCouple && remaining > 0) {
    const spouseDraw = Math.min(remaining, spouseTfsaAvail);
    spouseTfsaWithdrawal += spouseDraw;
    spouseTfsaAvail -= spouseDraw;
    remaining -= spouseDraw;
  }
  break;
}
```

This requires:
- Adding `let spouseTfsa = s.isCouple ? (s.spouseTfsaBalance || 0) : 0;` tracking variable at top ✓ (already exists)
- Adding `let spouseTfsaAvail = spouseTfsa;` and `let spouseTfsaWithdrawal = 0;` per-year loop variables
- Decrementing `spouseTfsa` after convergence: `spouseTfsa = Math.max(0, spouseTfsa - spouseTfsaWithdrawal);`
- Adding `spouseTfsaBalance` and `spouseTfsaWithdrawal` to the year result push
- Updating `totalPortfolio` to include the now-decremented `spouseTfsa` (already included, no change needed)

---

## Optimization Engine Design

### `runOptimization(scenario)` → `OptimizationResult`

Pure function. Imports `projectScenario` from `projectionEngine.js`. No React, no side effects.

```javascript
// Return shape
{
  recommendations: Recommendation[],    // ranked, only improvements vs baseline
  alreadyOptimal: AlreadyOptimalNote[], // dimensions where current setting is best
  runCount: number,                     // total projection runs performed
  baselineDepletion: number | null,     // age at portfolio depletion, or null if never
  bestPossibleDepletion: number | null, // depletion age of top recommendation
}
```

### CPP / OAS Normalization

Before testing any start-age variations, normalize the entered monthly amount to the at-65 reference:

```javascript
// Both cppMonthly and oasMonthly in the scenario may have been entered
// as the user's expected amount at their planned start age, not at 65.
// Normalize before testing so calcCppBenefit / calcOasBenefit apply
// the adjustment correctly.

function normalizeToAt65Cpp(monthly, startAge) {
  const monthsDiff = (startAge - 65) * 12; // negative if before 65
  const adj = startAge < 65
    ? 1 + monthsDiff * 0.006  // earlyReduction
    : 1 + monthsDiff * 0.007; // lateIncrease
  return monthly / Math.max(0.01, adj);
}

function normalizeToAt65Oas(monthly, startAge) {
  const monthsDeferred = Math.max(0, startAge - 65) * 12;
  return monthly / Math.max(0.01, 1 + monthsDeferred * 0.006);
}
```

All optimizer tests for CPP/OAS use `{ cppMonthly: normalizeToAt65Cpp(s.cppMonthly, s.cppStartAge), cppStartAge: testAge }` in the scenario override.

### Scoring

- **Primary metric:** portfolio depletion age (later = better)
- **Tiebreaker:** lifetime after-tax income (sum of `afterTaxIncome` over all years)
- **When portfolio never depletes in baseline and variant:** rank by lifetime income only

```javascript
function findDepletionAge(rows) {
  const hit = rows.find(r => r.totalPortfolio <= 0);
  return hit ? hit.age : null;
}

function sumAfterTaxIncome(rows) {
  return rows.reduce((sum, r) => sum + (r.afterTaxIncome || 0), 0);
}
```

### Dimensions

All dimensions (except joint CPP) test independently against baseline. Best result from each becomes one candidate. Only improvements are included.

---

#### Dimension 1: CPP Start Age — Joint (Primary × Spouse in couple mode)

**Single mode:** Test primary CPP ages 60–70 (11 variations). Keep other fields at baseline.

**Couple mode:** Test all 11 × 11 = 121 combinations of primary CPP age × spouse CPP age. Each combination runs `projectScenario` with both start ages overridden and both `cppMonthly` values normalized. Pick the pair that scores best. Produces one recommendation with changes for both people if that's optimal.

Scenario override template:
```javascript
{
  cppMonthly: normalizeToAt65Cpp(s.cppMonthly, s.cppStartAge),
  cppStartAge: testPrimaryAge,
  spouseCppMonthly: normalizeToAt65Cpp(s.spouseCppMonthly || 0, s.spouseCppStartAge || 65),
  spouseCppStartAge: testSpouseAge,
}
```

If single: `spouseCpp*` fields not included.

---

#### Dimension 2: OAS Start Age (Primary)
Test ages 65–70 (6 variations). Normalize `oasMonthly` to at-65 equivalent.

---

#### Dimension 3: OAS Start Age (Spouse — couple mode only)
Test spouse OAS ages 65–70 (6 variations). Normalize `spouseOasMonthly` to at-65 equivalent.

---

#### Dimension 4: Withdrawal Order
Test all 6 permutations of `['rrsp', 'tfsa', 'nonReg']`. Append `'other'` to each. (6 variations)

Skip if: `rrspBalance === 0 && spouseRrspBalance === 0` (no registered savings to order).

---

#### Dimension 5: RRSP Meltdown Strategy
If `rrspMeltdownEnabled === false`:
- Test amounts: $10K, $15K, $20K, $25K, $30K/yr (5)
- For each amount, test end ages: 71, 75, 80 (3)
- Start age: `scenario.rrspMeltdownStartAge || scenario.retirementAge`
- **15 variations**

If `rrspMeltdownEnabled === true`:
- Test amounts: current ±$5K, ±$10K (4 amounts)
- Test end ages: 71, 75, 80, 85 (4)
- Test disabling (1)
- **~17 variations** (amounts × end ages combinations + disable)

Skip entirely if: `rrspBalance === 0` and `spouseRrspBalance === 0`.

---

#### Dimension 6: Debt Payoff Timing
Only if `consumerDebt > 0`. Test `consumerDebtPayoffAge`: `currentAge+2, +3, +4, +5, +7, +10` (6 variations).

---

#### Dimension 7: Expense Reduction
**Only include if** baseline portfolio depletes before `lifeExpectancy`.
Test adding +5%, +10%, +15%, +20%, +25% to `expenseReductionAtRetirement`, capped at total 50%. (5 variations)

---

### Performance Budget

| Dimension | Max Variations |
|---|---|
| CPP joint (couple) | 121 |
| CPP primary only (single) | 11 |
| OAS primary | 6 |
| OAS spouse (couple only) | 6 |
| Withdrawal order | 6 |
| Meltdown | 17 |
| Debt | 6 (or 0) |
| Expenses | 5 (or 0) |
| **Total couple mode** | **~167 max** |
| **Total single mode** | **~51 max** |

At ~2ms per `projectScenario()`: **couple ~334ms, single ~102ms**. Both under 500ms budget. No web worker needed.

---

### Recommendation Data Shape

```javascript
{
  id: string,        // e.g. 'cpp-joint-primary70-spouse65'
  dimension: string, // 'cppJoint' | 'oasPrimary' | 'oasSpouse' | 'withdrawalOrder' | 'meltdown' | 'debt' | 'expenses'
  title: string,
  description: string,
  reasoning: string,
  badge: 'Biggest Impact' | 'Tax Saver' | 'Quick Win' | 'Extends Plan',
  badgeColor: 'green' | 'amber' | 'blue',
  impact: {
    depletionYearsGained: number,   // 0 when portfolio never depletes
    lifetimeIncomeGained: number,
    lifetimeTaxSaved: number,
    oasClawbackAvoided: number,
  },
  before: { label: string, depletionAge: number | null, lifetimeIncome: number },
  after:  { label: string, depletionAge: number | null, lifetimeIncome: number },
  changes: object, // partial scenario update to apply — e.g. { cppStartAge: 70 }
                   // for joint CPP: { cppMonthly: at65Ref, cppStartAge: 70, spouseCppMonthly: at65Ref, spouseCppStartAge: 65 }
}
```

---

### Copy Templates

**CPP (single):** "Start CPP at {age} instead of {currentAge}"
**CPP (joint — both change):** "Start your CPP at {age} and {spouse}'s at {spouseAge}"
**CPP (joint — only one changes):** "Start CPP at {age} instead of {currentAge}" (spouse stays same)
**OAS primary:** "Defer OAS to {age} instead of {currentAge}"
**OAS spouse:** "Have {spouse} defer OAS to {age} instead of {currentAge}"
**Withdrawal order:** "Switch to {order} withdrawal order"
**Meltdown enable:** "Enable RRSP meltdown: ${amount}/yr until age {end}"
**Meltdown adjust:** "Increase/decrease meltdown to ${amount}/yr"
**Debt:** "Pay off debt by age {age} instead of {currentAge}"
**Expenses:** "Reducing spending by ${amount}/mo extends your plan to age {newDepletion}"
**Already-optimal suffix:** "Your {X} timing is already optimal ✓"

---

## UI Design

### Tab Placement

Add to `NAV_TABS` in `App.jsx` between "Debt" and "Compare":

```javascript
{ key: 'recommendations', label: 'Recommendations', icon: <SparklesIcon /> }
```

**NOT** added to `GATED_TABS`. No upgrade modal on click.

### Top Summary Section

```
We tested {runCount} variations of your plan.

Current plan: money lasts to age {baseline}    Best possible: money lasts to age {best}
[═══════════════════════░░░░░]  +{diff} years

```

If never depletes: "Your money outlasts you in all scenarios. These recommendations focus on maximizing your after-tax income."

### Recommendation Cards

**Card 1** — fully rendered for all users.
**Cards 2+** — `isPaid`: fully rendered. `!isPaid`: `className="filter blur-sm pointer-events-none select-none"`.

**Upgrade CTA** — shown between card 1 and blurred cards when `!isPaid && recommendations.length > 1`:
```
🔒 {N} more recommendations found
Unlock all recommendations, scenario comparison, estate planning, and detailed reporting.
[Upgrade to Premium — $5/mo]     [See all features]
7-day free trial · Cancel anytime
```

**"Already Optimal" section** — at bottom, if `alreadyOptimal.length > 0`:
```
✓ Things you're already doing right
✓ Your OAS timing is optimal
✓ Your meltdown strategy is well-configured
```

### Card Layout

```
┌─────────────────────────────────────────────┐
│  [GREEN BADGE: BIGGEST IMPACT]              │
│                                             │
│  Start CPP at 70 instead of 68             │
│                                             │
│  [+2.3 yrs] [+$34,200 lifetime]            │
│                                             │
│  Your monthly CPP increases from $1,001 to │
│  $1,136. The larger payments compensate     │
│  for the 2-year gap.                        │
│                                             │
│  ┌── Before ──┐  ┌── After ───┐            │
│  │ CPP: $1,001│  │ CPP: $1,136│            │
│  │ Depletes:78│  │ Depletes:80│            │
│  └────────────┘  └────────────┘            │
│                                             │
│  [Apply This to My Plan]                    │
│   → after click: [Confirm?] [Cancel]        │
│   → after confirm: [✓ Applied]              │
│                                             │
│  Why: Your portfolio can cover the 2-year  │
│  gap. Once CPP starts at the higher rate,  │
│  you save $1,620/yr for the rest of life.  │
└─────────────────────────────────────────────┘
```

### Apply Flow (inline 2-click)

1. User clicks **"Apply This to My Plan"** → button text changes to **"Confirm?"** with a secondary **"Cancel"** link beside it
2. User clicks **"Confirm?"** → call `onScenarioChange(recommendation.changes)` → button becomes **"✓ Applied"** (green, disabled)
3. Auto-save fires ~1s later (existing `useCloudSync` debounce) → header shows "Saving..." → "Saved"
4. `useMemo` re-runs optimizer with updated scenario → remaining cards re-rank

The applied card remains showing "✓ Applied" until the tab is left and re-entered (state is ephemeral in the tab component).

### Card Styling

- Card: `bg-white border border-gray-200 rounded-xl shadow-sm p-5`
- Impact badges: `rounded-full text-xs font-semibold px-2.5 py-1`, green = depletion years, amber = income/tax
- Before/after: `bg-gray-50` / `bg-green-50` mini-cards side by side
- Apply button: primary sage/sunset style (match existing Button.jsx primary variant)
- Confirm? button: same style, Cancel as `text-gray-400 hover:text-gray-600 text-sm ml-2`
- Applied state: `text-green-600 font-medium flex items-center gap-1` with checkmark icon
- Blurred cards: `filter blur-sm pointer-events-none select-none opacity-60`

---

## Edge Cases

| Case | Behavior |
|---|---|
| Portfolio never depletes | Rank by lifetime income. Badge says "Income Boost" not "Extends Plan". Expense reduction dimension skipped. |
| Portfolio already depleted at currentAge | Expense reduction is primary recommendation. Others note how much they would have helped. |
| No RRSP/TFSA (gov benefits only) | Skip withdrawal order and meltdown. Focus on CPP/OAS and expenses. |
| All dimensions already optimal | Show: "We tested {N} variations — your current settings are the best combination." `recommendations` array is empty. |
| No consumer debt | Skip debt dimension. |
| `cppMonthly === 0` | Skip CPP dimension. Same for OAS. |
| `isCouple === false` | Skip joint CPP, spouse OAS dimensions. |
| Tie on depletion age | Rank by lifetime income. |
| `spouseCppMonthly === 0` | Skip spouse component of joint CPP (optimize primary only as 11 variations). |
| Joint CPP optimal == current | Report as "already optimal" note. |

---

## Tests (`tests/optimizerEngine.test.js`) — 16 tests

1. CPP (single) recommends later start age when portfolio can bridge the gap
2. CPP (single) recommends earlier start age when portfolio is thin
3. CPP normalization: `normalizeToAt65Cpp(512, 60)` → 800; `normalizeToAt65Cpp(1136, 70)` → 800
4. OAS normalization: `normalizeToAt65Oas(969, 70)` → ~713 (within rounding)
5. OAS deferral recommended when income would trigger clawback
6. Withdrawal order recommends TFSA-last for long horizons
7. Meltdown enabled+configured when gap between retirement and RRIF (age 72)
8. Meltdown amount optimized to stay below OAS clawback threshold
9. Debt payoff timing finds correct interest vs portfolio tradeoff
10. Expense reduction only appears when portfolio depletes before life expectancy
11. Already-optimal scenario: `recommendations` array is empty, `alreadyOptimal` is non-empty
12. Ranking: depletion years gained takes priority over lifetime income tiebreaker
13. Joint CPP (couple): optimal primary+spouse combination returned as single recommendation
14. Joint CPP (couple): when spouse CPP is 0, falls back to primary-only 11 variations
15. `changes` object produces correct scenario modification (apply produces improved projection)
16. Performance: `runOptimization()` completes < 500ms on `test-couple-rajesh.json`

---

## Files to Create / Modify

| File | Action | Notes |
|---|---|---|
| `src/engines/projectionEngine.js` | Modify | Spouse TFSA withdrawal fix (~20 lines) |
| `src/engines/optimizerEngine.js` | Create | Pure optimizer, ~280 lines |
| `src/views/recommendations/RecommendationsTab.jsx` | Create | Main tab view, ~250 lines |
| `src/views/recommendations/RecommendationCard.jsx` | Create | Single card, ~120 lines |
| `tests/optimizerEngine.test.js` | Create | 16 tests |
| `tests/golden/*.json` | Regenerate | `npm run generate:golden` after engine fix |
| `src/App.jsx` | Modify | Add tab + view case |
| `docs/architecture.md` | Modify | Update structure + user flows |

---

## Implementation Order

1. Fix spouse TFSA withdrawal in `src/engines/projectionEngine.js`
2. Run `npm test` — existing tests should still pass (or fail → fix → pass)
3. Run `npm run generate:golden` — regenerate couple golden snapshots
4. Run `npm test` again — confirm all 320+ tests green
5. Write `tests/optimizerEngine.test.js` (Phase 2 — failing tests first)
6. Implement `src/engines/optimizerEngine.js` (Phase 3)
7. Run `npx vitest run tests/optimizerEngine.test.js` — all 16 pass
8. Build `src/views/recommendations/RecommendationCard.jsx`
9. Build `src/views/recommendations/RecommendationsTab.jsx`
10. Wire into `src/App.jsx`
11. Verify with `test-scenario.json` — 4-6 recommendations, CPP or withdrawal order #1
12. Verify with `test-couple-rajesh.json` — includes joint CPP recommendation
13. Verify free vs premium gating (blur + upgrade CTA)
14. Update `docs/architecture.md`

---

## Verification Checklist

- [ ] `npm test` — all existing tests pass after projectionEngine.js fix
- [ ] Golden files regenerated and committed
- [ ] `npm test` — all 16 new optimizer tests pass
- [ ] `npm run build` — zero warnings/errors
- [ ] Single scenario: 4-6 recommendations appear
- [ ] Couple scenario: joint CPP recommendation present
- [ ] CPP normalization: optimizer correctly tests at-65-adjusted amounts
- [ ] Free user: card 1 visible, cards 2+ blurred, upgrade CTA shown
- [ ] Premium user: all cards visible with Apply buttons
- [ ] Apply → Confirm? → "✓ Applied" → scenario updates → header shows "Saving..."
- [ ] Auto-save completes → header shows "Saved"
- [ ] Optimizer re-runs after apply, remaining cards re-rank
- [ ] Performance: < 500ms on couple scenario (measure in browser console)
- [ ] Already-optimal section appears when applicable
- [ ] All-optimal case shows congratulations message
