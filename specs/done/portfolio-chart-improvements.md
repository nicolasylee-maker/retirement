# Spec: Portfolio Chart Improvements

**Branch:** `feat/portfolio-chart-improvements`
**Status:** Pending

---

## Problem

Three issues on the Total Portfolio Over Time chart:

1. **Milestone labels overlap** — Recharts renders all `ReferenceLine` labels at a flat `position:'top'`, so nearby milestones (e.g. Retire at 63, RRSP meltdown at 63, RRIF convert at 65) stack and render as illegible overprinted text.

2. **Phase annotations are vague** — The pre-retirement card says things like "Your salary covers 55% of expenses + debt + tax. Portfolio funds $51,298/yr of your $113,628/yr total need." This hides the story. Users need a flow: what does salary net? What does "total need" actually mean? Where does the gap come from?

3. **No contextual debt comparison** — The chart shows a scary portfolio decline but gives no intuition for how much debt is responsible vs. normal retirement spending. A "what if no debt" reference line would make the debt cost visually obvious.

---

## Acceptance Criteria

### 1. Label stagger
- Milestones within 3 age-years of each other are assigned alternating vertical offsets (level 0 = -12px from chart top, level 1 = -26px, level 2 = -40px)
- Level is computed greedily: each milestone gets the lowest level that doesn't conflict with a neighbor within 3 years
- Labels are rendered via custom SVG `<text>` in the Recharts `label` prop (not the default string label) so `dy` offset can be applied
- No two labels overlap at normal chart widths

### 2. Richer pre-retirement annotation (4 lines)
The pre-retirement annotation card is rewritten to tell a concrete cause-and-effect story:

```
Ages 63–64
Your $60K salary nets ~$50K after-tax.
Total need: $84.5K (expenses $48K + debt $36K).
The $34K gap is drawn from your RRSP.
[Only if consumerDebt > 0]: Without the consumer debt, your portfolio would barely drop.
```

All values are computed dynamically from projection averages. Line 4 is omitted when there is no consumer debt.

The card layout is expanded to naturally fit 4 short lines (no truncation, no fixed height).

The early-retirement card (post-retirement phase) is also rewritten to the same story format using the relevant income sources.

### 3. "What if no debt" reference line
- Checkbox below the chart title: "Show without consumer debt?" (hidden when `consumerDebt === 0 && otherDebt === 0`)
- When checked: a thin (`strokeWidth: 1.5`) dotted (`strokeDasharray: "3 4"`) gray (`#9ca3af`) `Line` is drawn on the same chart showing the projected `totalPortfolio` if `consumerDebt` and `otherDebt` were both zero (mortgage is kept — it is tied to housing)
- The no-debt projection is computed via `projectScenario(scenario, { consumerDebt: 0, otherDebt: 0 })` inside a `useMemo`
- A legend chip below the checkbox reads: `— without consumer debt`
- The checkbox state is local (`useState`), not persisted

---

## Edge Cases

| Case | Behavior |
|---|---|
| No consumer debt or other debt | Checkbox is hidden entirely; no-debt line never shown |
| No-debt portfolio is identical to base (debt already $0) | Checkbox shown but both lines overlap — acceptable |
| Pre-retirement annotation: no `_portfolioDrain` | Card not shown (existing behaviour) |
| Pre-retirement annotation: salary fully covers need | Line 3 ("gap from RRSP") is omitted; card shows "salary fully covers expenses" |
| Multiple milestones at same age | Deduplication is handled by existing `ages` Set in `buildMilestones` |
| Chart narrower than mobile width | Labels may still clip at extreme widths — acceptable for now |

---

## File Size Concern

`PortfolioChart.jsx` is currently 359 lines. Adding ~60 lines of new code would push it to ~420 lines, violating the 300-line limit.

**Required refactor:**
- Extract `buildMilestones` + `buildPhaseAnnotations` + formatting helpers → `src/views/dashboard/portfolioChartHelpers.js` (~120 lines)
- Extract `CustomTooltip` → `src/views/dashboard/PortfolioChartTooltip.jsx` (~50 lines)
- `PortfolioChart.jsx` after extraction + additions: ~280 lines ✓

---

## Files to Create / Modify

| File | Action | Reason |
|---|---|---|
| `src/views/dashboard/PortfolioChart.jsx` | Modify | Add stagger labels, no-debt line, checkbox, import helpers |
| `src/views/dashboard/portfolioChartHelpers.js` | **Create** | Extract `buildMilestones`, `buildPhaseAnnotations`, formatting helpers |
| `src/views/dashboard/PortfolioChartTooltip.jsx` | **Create** | Extract `CustomTooltip` component |
| `docs/architecture.md` | Modify | Record new files |
| `tests/portfolioChartHelpers.test.js` | **Create** | Tests for `buildPhaseAnnotations` and `buildMilestones` logic |

---

## Tests to Write (Phase 2 — before implementation)

File: `tests/portfolioChartHelpers.test.js`

### `buildMilestones`
- Returns markers only for ages within `[currentAge, lifeExpectancy]`
- Assigns `level` 0 to first milestone
- Assigns `level` 1 to a milestone within 3 years of a level-0 milestone
- Assigns `level` 2 to a third close milestone, wraps back to 0 at level 3
- Does not duplicate ages (same age added twice → only first label)

### `buildPhaseAnnotations`
- Returns empty array when no pre-retirement rows with drain > 0
- Pre-retirement card line 1 contains salary formatted as "$XK"
- Pre-retirement card contains the gap value when gap > 0
- Pre-retirement card line 4 (debt context) present only when `consumerDebt > 0`
- Early-retirement card is present for retired-at-start scenario
- Early-retirement card omits debt line when no debt payments

---

## Dependencies

- `projectScenario` from `../../engines/projectionEngine` — imported in `PortfolioChart.jsx` for no-debt computation
- `useState` from React — already available
- No new packages required
