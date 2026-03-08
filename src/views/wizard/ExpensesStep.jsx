import React, { useMemo } from 'react';
import FormField from '../../components/FormField';
import Card from '../../components/Card';
import QuickFillPills from '../../components/QuickFillPills';
import SliderControl from '../../components/SliderControl';
import { EXPENSE_PRESETS, RETURN_PRESETS } from '../../constants/defaults';
import { PulsingDot } from '../../components/PulsingDot';
import { calcTotalMonthlyDebt } from '../../utils/debtCalc';

const expensePresetList = Object.entries(EXPENSE_PRESETS).map(([key, p]) => ({
  key,
  label: p.label,
}));

const returnPresetList = Object.entries(RETURN_PRESETS).map(([key, p]) => ({
  key,
  label: p.label,
}));

function findExpensePreset(scenario) {
  for (const [key, preset] of Object.entries(EXPENSE_PRESETS)) {
    if (scenario.monthlyExpenses === preset.monthlyExpenses) return key;
  }
  return null;
}

function findReturnPreset(scenario) {
  for (const [key, preset] of Object.entries(RETURN_PRESETS)) {
    if (
      scenario.realReturn === preset.realReturn &&
      scenario.inflationRate === preset.inflationRate &&
      scenario.tfsaReturn === preset.tfsaReturn &&
      scenario.nonRegReturn === preset.nonRegReturn
    ) {
      return key;
    }
  }
  return null;
}

export default function ExpensesStep({ scenario, onChange, dismissedDots, dismissDot }) {
  const alreadyRetired = scenario.currentAge >= scenario.retirementAge;

  const debtInfo = useMemo(() => calcTotalMonthlyDebt(scenario), [
    scenario.mortgageBalance, scenario.mortgageRate, scenario.mortgageYearsLeft,
    scenario.consumerDebt, scenario.consumerDebtRate, scenario.consumerDebtPayoffAge,
    scenario.otherDebt, scenario.otherDebtRate, scenario.otherDebtPayoffAge,
    scenario.currentAge,
  ]);
  const hasDebt = debtInfo.totalMonthly > 0;
  const adjustedMonthly = hasDebt && scenario.expensesIncludeDebt
    ? scenario.monthlyExpenses - debtInfo.totalMonthly
    : null;

  const handleExpensePreset = (key) => {
    const preset = EXPENSE_PRESETS[key];
    if (preset) onChange({ monthlyExpenses: preset.monthlyExpenses });
  };

  const handleReturnPreset = (key) => {
    const preset = RETURN_PRESETS[key];
    if (preset) {
      const { label, ...fields } = preset;
      onChange(fields);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Expenses & Assumptions</h2>
        <p className="text-gray-500 mt-1">
          Estimate your spending needs and investment return assumptions.
        </p>
      </div>

      {/* Monthly savings target */}
      {!alreadyRetired && (
        <Card>
          <h3 className="text-lg font-semibold text-gray-800 mb-1">Monthly Savings Target</h3>
          <p className="text-sm text-gray-500 mb-3">
            How much you plan to save each month during working years. Savings are
            routed to RRSP first (tax-deductible), then TFSA, then non-registered.
          </p>
          <FormField
            label="Monthly Savings"
            name="monthlySavings"
            type="number"
            value={scenario.monthlySavings || 0}
            onChange={(v) => onChange({ monthlySavings: v })}
            prefix="$"
            suffix="/mo"
            min={0}
            helper="Set to $0 if you don't plan to save more before retirement"
          />
        </Card>
      )}

      {/* Monthly expenses */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Monthly Spending</h3>
        <div className="mb-2">
          <QuickFillPills
            presets={expensePresetList}
            onSelect={handleExpensePreset}
            activeKey={findExpensePreset(scenario)}
          />
        </div>
        <FormField
          label={<>Monthly Expenses <PulsingDot id="monthlyExpenses" dismissed={dismissedDots?.has('monthlyExpenses')} onDismiss={dismissDot} /></>}
          name="monthlyExpenses"
          type="number"
          value={scenario.monthlyExpenses}
          onChange={(v) => onChange({ monthlyExpenses: v })}
          prefix="$"
          suffix="/mo"
          min={0}
          helper="Total household spending including housing, food, transport, health, and other regular spending"
        />

        {/* Debt overlap toggle — only when debts exist */}
        {hasDebt && (
          <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={!!scenario.expensesIncludeDebt}
                  onChange={(e) => onChange({ expensesIncludeDebt: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-300 rounded-full peer-checked:bg-blue-600 transition-colors" />
                <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow peer-checked:translate-x-4 transition-transform" />
              </div>
              <span className="text-sm font-medium text-gray-700">
                My expenses already include debt payments
              </span>
            </label>

            {scenario.expensesIncludeDebt && (
              <div className="mt-3 space-y-1 text-sm">
                {debtInfo.mortgage > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Mortgage payment</span>
                    <span className="text-red-600">-${debtInfo.mortgage.toLocaleString()}/mo</span>
                  </div>
                )}
                {debtInfo.consumer > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Consumer debt payment</span>
                    <span className="text-red-600">-${debtInfo.consumer.toLocaleString()}/mo</span>
                  </div>
                )}
                {debtInfo.other > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Other debt payment</span>
                    <span className="text-red-600">-${debtInfo.other.toLocaleString()}/mo</span>
                  </div>
                )}
                <div className="flex justify-between font-medium pt-1 border-t border-gray-200">
                  <span className="text-gray-700">Non-debt expenses used by engine</span>
                  <span className={adjustedMonthly <= 0 ? 'text-red-600' : 'text-green-700'}>
                    ${Math.max(0, adjustedMonthly).toLocaleString()}/mo
                  </span>
                </div>
                {adjustedMonthly <= 0 && (
                  <p className="text-red-600 text-xs mt-1">
                    Your debt payments exceed your total expenses. Check your numbers or turn this off.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Retirement expense reduction */}
      {!alreadyRetired ? (
        <Card>
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
            Retirement Expense Adjustment
          </h3>
          <SliderControl
            label="Spending reduction at retirement"
            value={scenario.expenseReductionAtRetirement * 100}
            onChange={(v) => onChange({ expenseReductionAtRetirement: v / 100 })}
            min={0}
            max={30}
            step={1}
            format="percent"
            helper="Many retirees spend 10-20% less due to no commute, work clothes, etc."
          />
        </Card>
      ) : (
        <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 text-sm text-blue-800">
          Since you&apos;re already retired, enter your <strong>current</strong> monthly
          spending above — no future adjustment needed.
        </div>
      )}

      {/* Return assumptions */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Return Assumptions</h3>
        <div className="mb-2">
          <QuickFillPills
            presets={returnPresetList}
            onSelect={handleReturnPreset}
            activeKey={findReturnPreset(scenario)}
          />
        </div>
        <div className="space-y-3 mt-4">
          <SliderControl
            label="Inflation Rate"
            value={scenario.inflationRate * 100}
            onChange={(v) => onChange({ inflationRate: v / 100 })}
            min={1}
            max={5}
            step={0.1}
            format="percent"
            helper="Bank of Canada targets 2%. Historical average is ~2.5%."
          />
          <SliderControl
            label="Real Return (after inflation)"
            value={scenario.realReturn * 100}
            onChange={(v) => onChange({ realReturn: v / 100 })}
            min={1}
            max={8}
            step={0.1}
            format="percent"
            helper="Expected return above inflation. 4% is a common balanced assumption."
          />
          <SliderControl
            label="TFSA Return"
            value={scenario.tfsaReturn * 100}
            onChange={(v) => onChange({ tfsaReturn: v / 100 })}
            min={1}
            max={8}
            step={0.1}
            format="percent"
            helper="TFSA may have a different asset mix than RRSP"
          />
          <SliderControl
            label="Non-Registered Return"
            value={scenario.nonRegReturn * 100}
            onChange={(v) => onChange({ nonRegReturn: v / 100 })}
            min={1}
            max={8}
            step={0.1}
            format="percent"
            helper="Taxable accounts may hold more tax-efficient investments"
          />
        </div>
      </Card>
    </div>
  );
}
