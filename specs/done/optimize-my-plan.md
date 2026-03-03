# Spec: Optimize My Plan — Recommendations Tab

**Status:** pending
**Phase:** 1 (spec approved, awaiting Phase 2)

---

## Overview

A new "Recommendations" tab that runs the current scenario through an optimization engine, tests ~54 systematic variations, and produces a ranked list of personalized, actionable recommendations with exact dollar impacts.

**Primary goal:** Free → premium conversion. The tab is always accessible (not gated at tab level). Free users see the #1 recommendation in full detail, then blurred cards below with an upgrade CTA. Premium users see all recommendations with "Apply this" buttons.

---

## Interview Decisions

| Question | Decision |
|---|---|
| Paywall source | Use existing `SubscriptionContext` (`isPaid`) — no new boolean |
| Couple mode | Included in this build (spouse CPP/OAS timing as extra dimensions) |
| Apply behavior | Update in-memory scenario state only; show "unsaved changes" badge via existing `saveStatus` flow |
| Run trigger | Automatic via `useMemo` keyed on scenario identity |
| Tab gating | Tab is always accessible; paywall is in-tab (card 1 visible, rest blurred) |
| Existing feature gating | Already handled in App.jsx — Compare/Estate in GATED_TABS, WhatIfPanel behind isPaid |

---

## Acceptance Criteria

1. **Engine**: `runOptimization(scenario)` is a pure function with zero React imports, returns a ranked list of recommendations.
2. **Performance**: Full optimization (all dimensions) completes in < 500ms for both single and couple scenarios.
3. **Recommendations tab**: Appears in nav between "Debt" and "Compare". Always navigable.
4. **Free users**: See card #1 in full detail. Cards #2+ rendered but blurred (`filter: blur(8px)`, `pointer-events: none`). Upgrade CTA between card 1 and blurred cards.
5. **Premium users**: All cards visible with "Apply This" button.
6. **Apply behavior**: Clicking Apply updates the current scenario via `handleScenarioChange`. Optimizer re-runs automatically. Existing save-status badge in header communicates unsaved state.
7. **Couple mode**: When `isCouple === true`, optimizer also tests `spouseCppStartAge` and `spouseOasStartAge` variations.
8. **Already-optimal**: When a dimension's current setting is already the best, it appears in an "Already optimal ✓" section at the bottom (not as a recommendation card).
9. **All existing tests pass** after changes to App.jsx.
10. **New optimizer tests pass** (14 test cases, see Tests section).

---

## Architecture

### New Files

```
src/engines/optimizerEngine.js           (~280 lines)
src/views/recommendations/RecommendationsTab.jsx  (~250 lines)
src/views/recommendations/RecommendationCard.jsx  (~120 lines)
tests/optimizerEngine.test.js            (~160 lines)
```

### Modified Files

```
src/App.jsx   — add 'recommendations' to NAV_TABS; add view render case
docs/architecture.md   — update structure tree + user flows
```

**No changes to `src/constants/defaults.js`** — scenario shape already supports all required fields.

---

## Optimization Engine Design

### `runOptimization(scenario)` → `OptimizationResult`

Pure function. Imports `projectScenario` from `projectionEngine.js`. No React, no side effects.

```javascript
// Return shape
{
  recommendations: Recommendation[],  // ranked by impact, only improvements
  alreadyOptimal: AlreadyOptimalNote[],
  runCount: number,                   // total projection runs
  baselineDepletion: number | null,   // age at which portfolio depletes, or null if never
  bestPossibleDepletion: number | null,
}
```

### Scoring

Primary metric: **portfolio depletion age** (later = better).
Tiebreaker: **lifetime after-tax income** (sum of `afterTaxIncome` over all projected years).
When portfolio never depletes in either baseline or variant: rank by lifetime income only.

Helper functions needed:
- `findDepletionAge(projectionRows)` — returns age of first year where `totalPortfolio <= 0`, or `null`
- `sumAfterTaxIncome(projectionRows)` — sum of `afterTaxIncome` field

### Dimensions

All dimensions are tested **independently** against the baseline. The best result from each dimension becomes one candidate recommendation. Only candidates that improve on baseline are included.

#### Dimension 1: CPP Start Age (Primary person)
Test ages 60–70 (11 variations).
Adjust `cppStartAge` in the scenario copy. `cppMonthly` stays unchanged — `calcCppBenefit()` in `incomeHelpers.js` already applies the CRA early/late adjustment factors.
Use `projectScenario({ ...scenario, cppStartAge: testAge })`.

#### Dimension 2: OAS Start Age (Primary person)
Test ages 65–70 (6 variations).
Adjust `oasStartAge`. `calcOasBenefit()` handles the 0.6%/month deferral bonus.

#### Dimension 3: Withdrawal Order
Test all 6 permutations of `['rrsp', 'tfsa', 'nonReg']`. Keep `'other'` appended at the end of each tested order. (6 variations)

#### Dimension 4: RRSP Meltdown Strategy
If `rrspMeltdownEnabled === false`:
- Test enabling it with amounts: $10K, $15K, $20K, $25K, $30K/yr (5 amounts)
- For each amount, test end ages: 71, 75, 80 (3 end ages) → 15 variations
- Start age: `scenario.retirementAge`

If `rrspMeltdownEnabled === true`:
- Test current ±$5K, ±$10K amounts (4 amounts + current skip = 4 variations)
- Test different target ages: 71, 75, 80, 85 (4 variations)
- Also test disabling entirely (1 variation)
- ~9 variations

**Total meltdown variations: 15 or 9 depending on current state.**

#### Dimension 5: Debt Payoff Timing
Only tested if `consumerDebt > 0`.
Test `consumerDebtPayoffAge`: `currentAge+2, +3, +4, +5, +7, +10` (6 variations).

#### Dimension 6: Expense Reduction
**Only included in output if baseline portfolio depletes before `lifeExpectancy`.**
Test `expenseReductionAtRetirement` additions: +5%, +10%, +15%, +20%, +25% over current value (5 variations).
Frame in the copy as monthly dollar reduction, not percentage.

#### Couple Dimensions (only when `isCouple === true`)
Dimension 7: Spouse CPP Start Age — test ages 60–70 (11 variations, `spouseCppStartAge`).
Dimension 8: Spouse OAS Start Age — test ages 65–70 (6 variations, `spouseOasStartAge`).

### Performance Budget

| Dimension | Max Variations |
|---|---|
| CPP | 11 |
| OAS | 6 |
| Withdrawal order | 6 |
| Meltdown | 15 |
| Debt | 6 (or 0) |
| Expenses | 5 |
| Spouse CPP | 11 (or 0) |
| Spouse OAS | 6 (or 0) |
| **Total** | **~66 max** |

At ~2ms per `projectScenario()` call: ~132ms worst case. Acceptable synchronously; no web worker needed.

### Recommendation Data Shape

```javascript
{
  id: string,                  // e.g. 'cpp-start-70'
  dimension: string,           // 'cpp' | 'oas' | 'withdrawalOrder' | 'meltdown' | 'debt' | 'expenses' | 'spouseCpp' | 'spouseOas'
  title: string,
  description: string,
  reasoning: string,
  badge: string,               // 'Biggest Impact' | 'Tax Saver' | 'Quick Win' | 'Extends Plan'
  badgeColor: 'green' | 'amber' | 'blue',
  impact: {
    depletionYearsGained: number,    // 0 when portfolio never depletes
    lifetimeIncomeGained: number,
    lifetimeTaxSaved: number,
    oasClawbackAvoided: number,
  },
  before: { label: string, depletionAge: number | null, lifetimeIncome: number, [keyLabel]: value },
  after:  { label: string, depletionAge: number | null, lifetimeIncome: number, [keyLabel]: value },
  changes: object,             // partial scenario update to apply — e.g. { cppStartAge: 70 }
}
```

### Copy Templates

Each dimension has a plain-English template filled with numbers by the engine:

**CPP:** "Start CPP at {age} instead of {currentAge}" / "Your CPP timing is already optimal ✓"
**OAS:** "Defer OAS to {age} instead of {currentAge}" / "Your OAS timing is already optimal ✓"
**Withdrawal order:** "Switch to {order} withdrawal order" / "Your withdrawal order is already optimal ✓"
**Meltdown:** "Enable RRSP meltdown: ${amount}/yr until age {end}" / "Increase/decrease meltdown to ${amount}/yr"
**Debt:** "Pay off debt by age {age} instead of {currentAge}"
**Expenses:** "Reducing spending by ${amount}/mo extends your plan to age {newDepletion}"
**Spouse CPP/OAS:** mirrors primary person templates, prefixed with "Have {spouseLabel}…"

---

## UI Design

### Tab Placement

Add "Recommendations" tab to `NAV_TABS` between "Debt" and "Compare":

```javascript
{ key: 'recommendations', label: 'Recommendations', icon: <SparklesIcon /> }
```

Tab is NOT added to `GATED_TABS`. No upgrade modal on click.

### Top Summary Section

```
We tested {runCount} variations of your plan.
Current plan: money lasts to age {baseline}
Best possible: money lasts to age {best}  (+{diff} years)
[progress bar: current → best]
```

If portfolio never depletes: "Your money outlasts you in all scenarios. Recommendations focus on maximizing after-tax income and estate value."

### Recommendation Cards

**Card 1** — fully rendered for all users.
**Cards 2+** — fully rendered for `isPaid === true`. For `isPaid === false`: `filter: blur(8px)`, `pointer-events: none`.

**Upgrade CTA** — rendered between card 1 and blurred cards when `!isPaid && recommendations.length > 1`:

```
🔒 {N} more recommendations found
Unlock all recommendations, scenario comparison, estate planning, and detailed reporting.
[Upgrade to Premium — $5/mo]   [See all features]
7-day free trial · Cancel anytime
```

Upgrade button calls `setUpgradeModalOpen(true)` passed from App.jsx.

**"Already Optimal" section** — rendered at bottom if `alreadyOptimal.length > 0`:

```
✓ Things you're already doing right
✓ Your OAS timing is optimal
✓ Your meltdown strategy is well-configured
```

### Card Layout

```
[BADGE]  Title

+{X} years   +${Y} lifetime
impact pills

Description text (2-3 sentences)

┌─── Before ───┐   ┌─── After ────┐
│ ...          │   │ ...          │
└──────────────┘   └──────────────┘

[Apply This to My Plan]

Why: reasoning text
```

### "Apply This" Behavior

1. Show a confirmation dialog: "This will change {dimension label} from {before.label} to {after.label}."
2. On confirm: call `onScenarioChange(recommendation.changes)` — same pattern as wizard changes.
3. The optimizer's `useMemo` re-runs automatically.
4. Show the card in "✓ Applied" state (green check, button disabled).
5. Existing header save-status badge ("Saving..." / "Saved") communicates the unsaved state via `useCloudSync`.

No toast needed — the save badge is sufficient feedback.

### Card Styling

- Card background: `bg-white` with `border border-gray-200 rounded-xl shadow-sm`
- Impact badges: pill-shaped (`rounded-full text-xs font-semibold px-2.5 py-1`), green for depletion years, amber for income/tax
- Before/after: two `bg-gray-50` / `bg-green-50` mini-cards side by side
- Apply button: primary (sage/sunset style matching existing buttons)
- Blurred cards: `filter blur-sm pointer-events-none select-none opacity-60`
- Already-optimal checks: `text-green-600`

---

## Edge Cases

| Case | Behavior |
|---|---|
| Portfolio never depletes | Rank by lifetime income. "Extends Plan" badge becomes "Income Boost". Expense reduction dimension skipped. |
| Portfolio already depleted (current age ≥ depletion age) | Expense reduction is primary recommendation. Others show what would have helped. |
| No RRSP/TFSA/investments | Skip withdrawal order and meltdown dimensions. Focus on CPP/OAS and expenses. |
| All dimensions already optimal | Show congratulations: "We tested {N} variations — your current settings are the best combination." |
| No consumer debt | Skip debt dimension. |
| `cppMonthly === 0` | Skip CPP dimension (no CPP to optimize). Same for OAS. |
| `isCouple === false` | Skip spouse CPP/OAS dimensions. |
| Tie in depletion age | Rank by lifetime income. |

---

## Tests (`tests/optimizerEngine.test.js`)

1. CPP optimization recommends later start age when portfolio can bridge the gap
2. CPP optimization recommends earlier start age when portfolio is thin
3. OAS deferral recommended when income triggers clawback threshold
4. Withdrawal order recommends TFSA-last for long horizons
5. Meltdown enabled+configured when gap between retirement and RRIF (age 72)
6. Meltdown amount stays below OAS clawback threshold in optimal configuration
7. Debt payoff timing finds correct interest vs portfolio tradeoff
8. Expense reduction only appears when portfolio depletes before life expectancy
9. Already-optimal scenario returns empty `recommendations` array
10. Ranking: depletion years gained takes priority over lifetime income
11. Couple mode: spouse CPP/OAS tested as independent dimensions
12. Zero-RRSP scenario: meltdown and withdrawal order dimensions skipped
13. `changes` object produces correct scenario update (apply produces expected projection improvement)
14. Performance: `runOptimization()` completes in < 500ms on `test-couple-rajesh.json` scenario

---

## Files to Create / Modify

| File | Action | Notes |
|---|---|---|
| `src/engines/optimizerEngine.js` | Create | Pure engine, ~280 lines |
| `src/views/recommendations/RecommendationsTab.jsx` | Create | Main tab view, ~250 lines |
| `src/views/recommendations/RecommendationCard.jsx` | Create | Single card, ~120 lines |
| `tests/optimizerEngine.test.js` | Create | 14 tests |
| `src/App.jsx` | Modify | Add tab + view case |
| `docs/architecture.md` | Modify | Update structure + user flows |

**No changes to:** `src/constants/defaults.js`, `src/engines/projectionEngine.js`, `SubscriptionContext`, existing test files.

---

## Implementation Order

1. `src/engines/optimizerEngine.js` — core engine
2. `tests/optimizerEngine.test.js` — write failing tests first (Phase 2), then implement (Phase 3)
3. `src/views/recommendations/RecommendationCard.jsx` — single card component
4. `src/views/recommendations/RecommendationsTab.jsx` — tab with paywall
5. `src/App.jsx` — wire tab + view
6. Verify with `test-scenario.json` (Margaret / single) — check 4-6 recommendations appear
7. Verify with `test-couple-rajesh.json` — check spouse dimensions appear
8. Verify free vs premium gating (blur + upgrade CTA)
9. `docs/architecture.md` — update

---

## Verification Checklist

- [ ] `npm test` — all existing + new tests pass
- [ ] `npm run build` — zero warnings/errors
- [ ] Meagan / Margaret scenario: 4-6 recommendations, CPP or withdrawal order ranked #1
- [ ] Rajesh couple scenario: includes spouse CPP/OAS recommendations
- [ ] Free user: card 1 visible, cards 2+ blurred, upgrade CTA shown
- [ ] Premium user: all cards visible with Apply buttons
- [ ] Apply: updates scenario, optimizer re-runs, card shows "✓ Applied"
- [ ] Apply: header save-status badge shows "Saving..." → "Saved"
- [ ] Performance: < 500ms on couple scenario
- [ ] Already-optimal section shows when applicable
