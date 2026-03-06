import React from 'react';
import FormField from '../../components/FormField';
import Card from '../../components/Card';
import { calcTotalTax } from '../../engines/taxEngine';
import { formatCurrency } from '../../utils/formatters';

const ACCOUNT_LABELS = {
  tfsa: 'TFSA',
  nonReg: 'Non-Registered',
  rrsp: 'RRSP / RRIF',
  other: 'Other Accounts',
};

export default function WithdrawalStep({ scenario, onChange }) {
  const handleChange = (field) => (value) => {
    onChange({ [field]: value });
  };

  const meltdownAgeError = scenario.rrspMeltdownEnabled
    && scenario.rrspMeltdownTargetAge <= scenario.rrspMeltdownStartAge
    ? 'Target age must be after start age' : null;

  const moveItem = (index, direction) => {
    const order = [...scenario.withdrawalOrder];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= order.length) return;
    [order[index], order[newIndex]] = [order[newIndex], order[index]];
    onChange({ withdrawalOrder: order });
  };

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Withdrawal Strategy</h2>
        <p className="text-gray-500 mt-1">
          When you retire, you'll draw money from different accounts.
          The order matters because each account type is taxed differently
          — the right order can save you thousands in taxes.
        </p>
      </div>

      {/* Withdrawal order */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Withdrawal Order</h3>
        <p className="text-sm text-gray-500 mb-2">
          Which accounts to spend first. Use the arrows to reorder.
          A common approach: spend taxable accounts first, then RRSP/RRIF,
          and save your tax-free TFSA for last.
        </p>
        <div className="space-y-2">
          {scenario.withdrawalOrder.map((accountKey, index) => (
            <div
              key={accountKey}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
            >
              {/* Position indicator */}
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-sunset-100 text-sunset-700 text-xs font-bold flex items-center justify-center">
                {index + 1}
              </span>

              {/* Grip handle */}
              <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path d="M7 2a2 2 0 10.001 4.001A2 2 0 007 2zm0 6a2 2 0 10.001 4.001A2 2 0 007 8zm0 6a2 2 0 10.001 4.001A2 2 0 007 14zm6-8a2 2 0 10-.001-4.001A2 2 0 0013 6zm0 2a2 2 0 10.001 4.001A2 2 0 0013 8zm0 6a2 2 0 10.001 4.001A2 2 0 0013 14z" />
              </svg>

              {/* Account label */}
              <span className="flex-1 text-sm font-medium text-gray-800">
                {ACCOUNT_LABELS[accountKey] || accountKey}
              </span>

              {/* Reorder buttons */}
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => moveItem(index, -1)}
                  disabled={index === 0}
                  className={`p-1 rounded transition-colors ${
                    index === 0
                      ? 'text-gray-300 cursor-not-allowed'
                      : 'text-gray-500 hover:text-sunset-600 hover:bg-sunset-50'
                  }`}
                  aria-label={`Move ${ACCOUNT_LABELS[accountKey]} up`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => moveItem(index, 1)}
                  disabled={index === scenario.withdrawalOrder.length - 1}
                  className={`p-1 rounded transition-colors ${
                    index === scenario.withdrawalOrder.length - 1
                      ? 'text-gray-300 cursor-not-allowed'
                      : 'text-gray-500 hover:text-sunset-600 hover:bg-sunset-50'
                  }`}
                  aria-label={`Move ${ACCOUNT_LABELS[accountKey]} down`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* RRSP Meltdown */}
      <Card>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">RRSP Meltdown Strategy</h3>
            <p className="text-sm text-gray-500 mt-1">
              Gradually withdraw from your RRSP in low-income years to reduce
              taxes later
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={scenario.rrspMeltdownEnabled}
            onClick={() => {
              const updates = { rrspMeltdownEnabled: !scenario.rrspMeltdownEnabled };
              if (!scenario.rrspMeltdownEnabled) {
                updates.rrspMeltdownStartAge = scenario.retirementAge;
              }
              onChange(updates);
            }}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-sunset-400 focus:ring-offset-2 ${
              scenario.rrspMeltdownEnabled ? 'bg-sunset-500' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                scenario.rrspMeltdownEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {scenario.rrspMeltdownEnabled && (
          <div className="space-y-4 pt-4 border-t border-gray-200 view-enter">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm text-amber-800">
                The idea: after you retire but before government benefits start,
                your income is low and your tax rate is low. By pulling money
                out of your RRSP during these years, you pay less tax than if you
                waited until age 71, when the government forces you to withdraw.
                This can also help you avoid losing some of your OAS payments
                to clawback.
              </p>
            </div>
            {/* Tax warning when meltdown starts before retirement during working years */}
            {(scenario.rrspMeltdownStartAge ?? scenario.retirementAge) < scenario.retirementAge
              && (scenario.stillWorking ?? true) && scenario.employmentIncome > 0
              && (() => {
              const meltdownAnnual = scenario.rrspMeltdownAnnual || 0;
              const empIncome = scenario.employmentIncome || 0;
              const startAge = scenario.rrspMeltdownStartAge ?? scenario.retirementAge;
              const preRetYears = scenario.retirementAge - Math.max(startAge, scenario.currentAge);
              if (preRetYears <= 0) return null;
              const taxWithMeltdown = calcTotalTax(empIncome + meltdownAnnual, scenario.currentAge, false, scenario.province || 'ON');
              const taxWithout = calcTotalTax(empIncome, scenario.currentAge, false, scenario.province || 'ON');
              const extraTaxPerYear = taxWithMeltdown - taxWithout;
              const totalExtraTax = extraTaxPerYear * preRetYears;
              const marginalRate = meltdownAnnual > 0
                ? (extraTaxPerYear / meltdownAnnual * 100).toFixed(1) : '0.0';
              if (extraTaxPerYear <= 0) return null;
              return (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <p className="text-sm font-semibold text-orange-800 mb-1">
                    Tax impact: meltdown during working years
                  </p>
                  <p className="text-sm text-orange-700">
                    While you're still earning {formatCurrency(empIncome)}/yr, withdrawing
                    an extra {formatCurrency(meltdownAnnual)}/yr from your RRSP costs
                    ~{formatCurrency(extraTaxPerYear)}/yr in additional tax
                    ({marginalRate}% effective rate on the meltdown amount).
                    Over {preRetYears} pre-retirement years, that's ~{formatCurrency(totalExtraTax)} in
                    extra tax.
                  </p>
                  <p className="text-sm text-orange-700 mt-1">
                    Consider setting start age to {scenario.retirementAge} instead,
                    when your income drops and you'd pay less tax on the withdrawals.
                  </p>
                </div>
              );
            })()}

            <div className="grid sm:grid-cols-3 gap-4">
              <FormField
                label="Start Age"
                name="rrspMeltdownStartAge"
                type="number"
                value={scenario.rrspMeltdownStartAge}
                onChange={handleChange('rrspMeltdownStartAge')}
                min={scenario.currentAge}
                max={90}
                helper="Most people start at retirement when income drops and tax rates are lower."
              />
              <FormField
                label="End Age"
                name="rrspMeltdownTargetAge"
                type="number"
                value={scenario.rrspMeltdownTargetAge}
                onChange={handleChange('rrspMeltdownTargetAge')}
                min={scenario.currentAge}
                max={95}
                helper={meltdownAgeError ? null : "Defaults to 71 (RRIF conversion). You can extend beyond 71 to continue withdrawing above RRIF minimums at a controlled rate."}
                error={meltdownAgeError}
              />
              <FormField
                label="Annual Withdrawal"
                name="rrspMeltdownAnnual"
                type="number"
                value={scenario.rrspMeltdownAnnual}
                onChange={handleChange('rrspMeltdownAnnual')}
                prefix="$"
                suffix="/yr"
                min={0}
                helper="How much to take out of your RRSP each year — aim to stay in a low tax bracket"
              />
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
