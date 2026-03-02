import React from 'react';
import FormField from '../../components/FormField';
import Card from '../../components/Card';

const PENSION_OPTIONS = [
  { value: 'none', label: 'No workplace pension', description: 'I don\'t have an employer pension plan' },
  { value: 'db', label: 'Defined Benefit (DB)', description: 'Your employer promises a set annual income in retirement — like a paycheque for life' },
  { value: 'dc', label: 'Defined Contribution (DC)', description: 'You and your employer put money into an investment account — your retirement income depends on how much it grows' },
];

export default function PensionsStep({ scenario, onChange }) {
  const handleChange = (field) => (value) => {
    onChange({ [field]: value });
  };

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Workplace Pensions</h2>
        <p className="text-gray-500 mt-1">
          If your employer offers a pension plan, enter the details here.
          This also includes locked-in accounts from previous employers.
        </p>
      </div>

      {/* Pension type selection */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Pension Type</h3>
        <div className="space-y-3">
          {PENSION_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors duration-150 ${
                scenario.pensionType === option.value
                  ? 'border-sunset-400 bg-sunset-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="pensionType"
                value={option.value}
                checked={scenario.pensionType === option.value}
                onChange={() => onChange({ pensionType: option.value })}
                className="mt-0.5 h-4 w-4 border-gray-300 text-sunset-500 focus:ring-sunset-400"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">{option.label}</span>
                <p className="text-xs text-gray-500 mt-0.5">{option.description}</p>
              </div>
            </label>
          ))}
        </div>
      </Card>

      {/* DB Pension details */}
      {scenario.pensionType === 'db' && (
        <Card className="view-enter">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            Defined Benefit Details
          </h3>
          <p className="text-sm text-gray-500 mb-2">
            A DB pension pays you a guaranteed amount every year for life.
            Your employer calculates it based on your salary and years of service.
            Check your pension statement for the exact amount.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <FormField
              label="Annual Pension"
              name="dbPensionAnnual"
              type="number"
              value={scenario.dbPensionAnnual}
              onChange={handleChange('dbPensionAnnual')}
              prefix="$"
              suffix="/yr"
              min={0}
              helper="The yearly amount your employer will pay you — check your pension statement"
            />
            <FormField
              label="Pension Start Age"
              name="dbPensionStartAge"
              type="number"
              value={scenario.dbPensionStartAge}
              onChange={handleChange('dbPensionStartAge')}
              min={50}
              max={75}
              helper="The age you start collecting — some pensions reduce payments if you start early"
            />
          </div>
          <label className="flex items-center gap-3 mt-4 cursor-pointer">
            <input
              type="checkbox"
              checked={scenario.dbPensionIndexed}
              onChange={() => onChange({ dbPensionIndexed: !scenario.dbPensionIndexed })}
              className="h-4 w-4 rounded border-gray-300 text-sunset-500 focus:ring-sunset-400"
            />
            <div>
              <span className="text-sm font-medium text-gray-800">Indexed to inflation</span>
              <p className="text-xs text-gray-500">If checked, your pension goes up each year to keep pace with rising prices</p>
            </div>
          </label>
        </Card>
      )}

      {/* DC Pension details */}
      {scenario.pensionType === 'dc' && (
        <Card className="view-enter">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            Defined Contribution Details
          </h3>
          <p className="text-sm text-gray-500 mb-2">
            A DC pension is like a workplace savings account — you and your employer
            contribute, and the total grows based on investment returns. At retirement,
            you get the balance as a lump sum to convert into retirement income.
          </p>
          <FormField
            label="Current DC Balance"
            name="dcPensionBalance"
            type="number"
            value={scenario.dcPensionBalance}
            onChange={handleChange('dcPensionBalance')}
            prefix="$"
            min={0}
            helper="How much is in the account today — check your latest pension statement"
          />
        </Card>
      )}

      {/* LIRA */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          Locked-In Retirement Account (LIRA)
        </h3>
        <p className="text-sm text-gray-500 mb-2">
          A LIRA is a locked savings account that holds pension money from a
          previous job. You can't withdraw freely — the money stays locked until
          you convert it to retirement income (usually around age 55+).
        </p>
        <FormField
          label="LIRA Balance"
          name="liraBalance"
          type="number"
          value={scenario.liraBalance}
          onChange={handleChange('liraBalance')}
          prefix="$"
          min={0}
          helper="The total value today — check your investment statement from the institution holding it"
        />
      </Card>

      {/* Spouse pension (couples only) */}
      {scenario.isCouple && (
        <>
          <Card>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Spouse Pension Type</h3>
            <div className="space-y-3">
              {PENSION_OPTIONS.map((option) => (
                <label
                  key={`spouse-${option.value}`}
                  className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors duration-150 ${
                    scenario.spousePensionType === option.value
                      ? 'border-sunset-400 bg-sunset-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="spousePensionType"
                    value={option.value}
                    checked={scenario.spousePensionType === option.value}
                    onChange={() => onChange({ spousePensionType: option.value })}
                    className="mt-0.5 h-4 w-4 border-gray-300 text-sunset-500 focus:ring-sunset-400"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-900">{option.label}</span>
                    <p className="text-xs text-gray-500 mt-0.5">{option.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </Card>

          {scenario.spousePensionType === 'db' && (
            <Card className="view-enter">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Spouse Defined Benefit Details</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <FormField
                  label="Annual Pension"
                  name="spouseDbPensionAnnual"
                  type="number"
                  value={scenario.spouseDbPensionAnnual}
                  onChange={handleChange('spouseDbPensionAnnual')}
                  prefix="$"
                  suffix="/yr"
                  min={0}
                  helper="The yearly amount the employer will pay your spouse"
                />
                <FormField
                  label="Pension Start Age"
                  name="spouseDbPensionStartAge"
                  type="number"
                  value={scenario.spouseDbPensionStartAge}
                  onChange={handleChange('spouseDbPensionStartAge')}
                  min={50}
                  max={75}
                  helper="The age your spouse starts collecting"
                />
              </div>
              <label className="flex items-center gap-3 mt-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={scenario.spouseDbPensionIndexed}
                  onChange={() => onChange({ spouseDbPensionIndexed: !scenario.spouseDbPensionIndexed })}
                  className="h-4 w-4 rounded border-gray-300 text-sunset-500 focus:ring-sunset-400"
                />
                <div>
                  <span className="text-sm font-medium text-gray-800">Indexed to inflation</span>
                  <p className="text-xs text-gray-500">Spouse pension increases each year with inflation</p>
                </div>
              </label>
            </Card>
          )}

          {scenario.spousePensionType === 'dc' && (
            <Card className="view-enter">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Spouse Defined Contribution Details</h3>
              <FormField
                label="Spouse Current DC Balance"
                name="spouseDcPensionBalance"
                type="number"
                value={scenario.spouseDcPensionBalance}
                onChange={handleChange('spouseDcPensionBalance')}
                prefix="$"
                min={0}
                helper="How much is in your spouse's DC pension account today"
              />
            </Card>
          )}
        </>
      )}
    </div>
  );
}
