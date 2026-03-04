import React from 'react';
import FormField from '../../components/FormField';
import Card from '../../components/Card';
import QuickFillPills from '../../components/QuickFillPills';
import SliderControl from '../../components/SliderControl';
import { EXPENSE_PRESETS, RETURN_PRESETS } from '../../constants/defaults';
import { PulsingDot } from '../../components/PulsingDot';

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
      scenario.inflationRate === preset.inflationRate
    ) {
      return key;
    }
  }
  return null;
}

export default function ExpensesStep({ scenario, onChange, dismissedDots, dismissDot }) {
  const handleExpensePreset = (key) => {
    const preset = EXPENSE_PRESETS[key];
    if (preset) onChange({ monthlyExpenses: preset.monthlyExpenses });
  };

  const handleReturnPreset = (key) => {
    const preset = RETURN_PRESETS[key];
    if (preset) {
      onChange({
        realReturn: preset.realReturn,
        inflationRate: preset.inflationRate,
      });
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
          helper="Total household spending including housing, food, transport, health"
        />
      </Card>

      {/* Retirement expense reduction */}
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
