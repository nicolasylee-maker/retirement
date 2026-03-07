# Spec: Basic Wizard — Mortgage Disclosure

## Problem

The basic wizard asks for "Monthly Spending in Retirement" but users will enter
their current total monthly spending, which typically includes a mortgage payment.
The engine treats that number as permanent retirement spending — overstating
retirement expenses by the mortgage payment amount for the entire projection
horizon. For a typical Canadian with a $2,500/mo mortgage, this can misstate
retirement expenses by ~$30K/year, producing a projection that looks far worse
than reality.

## Solution

After the monthly expenses field, ask: **"Does this include a mortgage payment?"**
as an inline yes/no (not a toggle). If yes, show two fields: monthly payment and
years remaining. Back-solve a synthetic mortgage balance and feed it into the
existing engine debt path — no engine changes required.

---

## Acceptance Criteria

1. Below the `monthlyExpenses` field, render the question:
   **"Does this include a mortgage payment?"** with **Yes / No** buttons (pill
   style, mutually exclusive). Default: No selected.

2. When **Yes** is selected, reveal two fields inline:
   - **Monthly Payment** — number, prefix `$`, suffix `/mo`
   - **Years Remaining** — number, suffix `yrs`, min 1, max 35

3. When **No** is selected (or nothing entered), the two fields are hidden and
   no mortgage data is written to the scenario.

4. On submit, when Yes + both fields filled:
   - Back-solve mortgage balance:
     `balance = payment * 12 * ((1 - (1.05)^-n) / 0.05)`
     where `payment` is the monthly payment and `n` is years remaining.
   - Write to scenario:
     ```
     mortgageBalance: <solved balance>
     mortgageRate: 0.05
     mortgageYearsLeft: <years remaining>
     expensesIncludeDebt: true
     ```
   - These feed directly into the existing `projectionEngine.js` debt path
     (lines 17, 29–42, 67–82) with zero engine changes.

5. Validation: if Yes is selected, both fields are required before submit.
   Show inline error: *"Enter your monthly payment"* / *"Enter years remaining"*.

6. The monthly expenses field label stays **"Monthly Expenses"** but the helper
   text changes to:
   > "In today's dollars — include everything you spend monthly (mortgage is fine
   > to include, we'll ask about it below)"

7. The card heading stays **"Monthly Spending in Retirement"**.

---

## Edge Cases

- **Mortgage paid off before retirement:** years remaining < (retirementAge −
  currentAge). Engine carries `debtPayments` only during working years, zeroes
  at payoff. No special handling needed — engine already does this.

- **Mortgage extends into retirement:** years remaining > (retirementAge −
  currentAge). Engine continues charging `debtPayments` into retirement years.
  This is correct and intentional — it's a burden the user will actually carry.

- **User enters 0 for monthly payment or years:** treat as No / skip. Don't
  write mortgage fields.

- **Rate assumption accuracy:** using a flat 5% for back-solving introduces
  minor balance error (e.g. at 3% the true balance is ~5% higher; at 7% it's
  ~5% lower). The resulting amortization payment error is small relative to the
  error we're fixing. Acceptable for a quick-start tool.

- **User switches No → Yes → No:** clearing Yes must unset `mortgageBalance`,
  `mortgageRate`, `mortgageYearsLeft`, and `expensesIncludeDebt` from scenario.

---

## Files Affected

- `src/views/wizard/BasicWizardView.jsx` — add yes/no question + conditional
  fields + back-solve logic on submit
- No engine changes
- No other files

---

## Out of Scope

- Consumer debt / other debt in basic wizard (smaller impact, belongs in full wizard)
- Exact rate input (5% assumption is sufficient for quick-start accuracy)
- Full amortization table or payment breakdown (full wizard already does this)
