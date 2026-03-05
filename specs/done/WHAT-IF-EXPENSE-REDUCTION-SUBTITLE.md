# Spec: What If Slider — Post-Reduction Expense Subtitle

## Problem

The Monthly Expenses slider in What If shows "$9,000" but AI insights reference "$8,100/mo in today's dollars." The 10% retirement expense reduction is applied silently by the projection engine — the user has no context for where that lower number comes from.

## Acceptance Criteria

1. When the user is **pre-retirement** (`scenario.currentAge < scenario.retirementAge`) **AND** `scenario.expenseReductionAtRetirement > 0`, a subtitle appears immediately below the label/value row of the Monthly Expenses slider:
   ```
   Monthly Expenses                    $9,000
   $8,100/mo after 10% retirement reduction
   ```

2. The subtitle value = `Math.round(currentSliderValue × (1 − expenseReductionAtRetirement))`.

3. The subtitle **does not appear** when:
   - `scenario.currentAge >= scenario.retirementAge` (already retired — the slider value IS the post-retirement amount)
   - `scenario.expenseReductionAtRetirement === 0` (no reduction configured)

4. If the user adjusts the slider (via `overrides.monthlyExpenses`), the subtitle updates live to reflect the overridden value.

## Files Affected

- `src/components/SliderControl.jsx` — add `subtitle` prop (renders between header row and slider track, `text-xs text-gray-400`)
- `src/views/WhatIfPanel.jsx` — compute and pass `subtitle` for the `monthlyExpenses` slider in `SliderList`

## Edge Cases

- `overrides.monthlyExpenses` takes precedence over `scenario.monthlyExpenses` (matches existing `raw` computation in `SliderList`)
- Percentage is displayed as integer (e.g. "10%" not "10.0%")
- `formatCurrency` is already imported in SliderControl — use it for the subtitle dollar value

## Verification

1. Default scenario (10% reduction, pre-retirement, $9,000 expenses): subtitle shows "$8,100/mo after 10% retirement reduction"
2. Drag slider to $5,000: subtitle updates live to "$4,500/mo after 10% retirement reduction"
3. Scenario with 0% reduction: no subtitle
4. Scenario where `currentAge >= retirementAge`: no subtitle
5. Custom reduction (e.g. 15%): subtitle reflects correct percentage and amount
