import React, { useMemo } from 'react';
import FormField from '../../components/FormField';
import Card from '../../components/Card';
import { formatCurrency } from '../../utils/formatters';

function calcPayoffSummary(balance, rate, payoffAge, currentAge) {
  if (!balance || balance <= 0 || payoffAge <= currentAge) return null;
  const years = payoffAge - currentAge;
  let annualPayment;
  if (rate === 0) {
    annualPayment = balance / years;
  } else {
    annualPayment = balance * (rate * Math.pow(1 + rate, years)) / (Math.pow(1 + rate, years) - 1);
  }
  const totalPaid = annualPayment * years;
  const totalInterest = totalPaid - balance;
  return { annualPayment, monthlyPayment: annualPayment / 12, totalInterest, totalPaid, years };
}

export default function LiabilitiesStep({ scenario, onChange }) {
  const handleChange = (field) => (value) => {
    onChange({ [field]: value });
  };

  const consumerSummary = useMemo(() =>
    calcPayoffSummary(
      scenario.consumerDebt,
      scenario.consumerDebtRate || 0.08,
      scenario.consumerDebtPayoffAge || (scenario.currentAge + 10),
      scenario.currentAge,
    ),
    [scenario.consumerDebt, scenario.consumerDebtRate, scenario.consumerDebtPayoffAge, scenario.currentAge],
  );

  const mortgageSummary = useMemo(() =>
    calcPayoffSummary(
      scenario.mortgageBalance,
      scenario.mortgageRate || 0.05,
      scenario.currentAge + (scenario.mortgageYearsLeft || 0),
      scenario.currentAge,
    ),
    [scenario.mortgageBalance, scenario.mortgageRate, scenario.mortgageYearsLeft, scenario.currentAge],
  );

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Liabilities</h2>
        <p className="text-gray-500 mt-1">
          Outstanding debts that will affect your retirement cash flow.
        </p>
      </div>

      {/* Mortgage */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Mortgage</h3>
        <div className="grid sm:grid-cols-3 gap-3">
          <FormField
            label="Balance Remaining"
            name="mortgageBalance"
            type="number"
            value={scenario.mortgageBalance}
            onChange={handleChange('mortgageBalance')}
            prefix="$"
            min={0}
            helper="Outstanding principal"
          />
          <FormField
            label="Interest Rate"
            name="mortgageRate"
            type="number"
            value={parseFloat((scenario.mortgageRate * 100).toFixed(4))}
            onChange={(v) => onChange({ mortgageRate: (v || 0) / 100 })}
            suffix="%"
            min={0}
            max={15}
            step={0.1}
            helper="Current annual rate"
          />
          <FormField
            label="Years Left"
            name="mortgageYearsLeft"
            type="number"
            value={scenario.mortgageYearsLeft}
            onChange={handleChange('mortgageYearsLeft')}
            min={0}
            max={35}
            helper="Remaining amortization"
          />
        </div>
        {mortgageSummary && (
          <div className="mt-3 bg-gray-50 rounded-lg p-3 grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-xs text-gray-500">Monthly Payment</p>
              <p className="text-sm font-semibold text-gray-800">{formatCurrency(Math.round(mortgageSummary.monthlyPayment))}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Interest</p>
              <p className="text-sm font-semibold text-red-600">{formatCurrency(Math.round(mortgageSummary.totalInterest))}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Paid Off By</p>
              <p className="text-sm font-semibold text-gray-800">Age {scenario.currentAge + (scenario.mortgageYearsLeft || 0)}</p>
            </div>
          </div>
        )}
      </Card>

      {/* Consumer debt */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Consumer Debt</h3>
        <div className="grid sm:grid-cols-3 gap-3">
          <FormField
            label="Total Balance"
            name="consumerDebt"
            type="number"
            value={scenario.consumerDebt}
            onChange={handleChange('consumerDebt')}
            prefix="$"
            min={0}
            helper="Credit cards, LOCs, car loans"
          />
          <FormField
            label="Average Interest Rate"
            name="consumerDebtRate"
            type="number"
            value={parseFloat((scenario.consumerDebtRate * 100).toFixed(4))}
            onChange={(v) => onChange({ consumerDebtRate: (v || 0) / 100 })}
            suffix="%"
            min={0}
            max={30}
            step={0.1}
            helper="Weighted average across debts"
          />
          <FormField
            label="Pay Off By Age"
            name="consumerDebtPayoffAge"
            type="number"
            value={scenario.consumerDebtPayoffAge || (scenario.currentAge + 10)}
            onChange={handleChange('consumerDebtPayoffAge')}
            min={scenario.currentAge + 1}
            max={scenario.lifeExpectancy}
            helper="Target age to be debt-free"
          />
        </div>
        {consumerSummary && (
          <div className="mt-3 bg-gray-50 rounded-lg p-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-xs text-gray-500">Monthly Payment</p>
                <p className="text-sm font-semibold text-gray-800">{formatCurrency(Math.round(consumerSummary.monthlyPayment))}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Interest</p>
                <p className="text-sm font-semibold text-red-600">{formatCurrency(Math.round(consumerSummary.totalInterest))}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Cost</p>
                <p className="text-sm font-semibold text-gray-800">{formatCurrency(Math.round(consumerSummary.totalPaid))}</p>
              </div>
            </div>
            {scenario.consumerDebtPayoffAge > scenario.retirementAge && (
              <p className="text-xs text-amber-700 mt-2 bg-amber-50 rounded p-2">
                You'll still be paying this debt {scenario.consumerDebtPayoffAge - scenario.retirementAge} years into retirement.
                Consider paying it off sooner to reduce your retirement expenses.
              </p>
            )}
          </div>
        )}
      </Card>

      {/* Other debt */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Other Debt</h3>
        <FormField
          label="Other Liabilities"
          name="otherDebt"
          type="number"
          value={scenario.otherDebt}
          onChange={handleChange('otherDebt')}
          prefix="$"
          min={0}
          helper="Student loans, family loans, tax owing, etc."
        />
      </Card>
    </div>
  );
}
