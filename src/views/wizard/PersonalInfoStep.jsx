import React from 'react';
import FormField from '../../components/FormField';
import Card from '../../components/Card';

export default function PersonalInfoStep({ scenario, onChange, userName, onUserNameChange }) {
  const handleChange = (field) => (value) => {
    onChange({ [field]: value });
  };

  const handleCoupleToggle = () => {
    onChange({ isCouple: !scenario.isCouple });
  };

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Personal Information</h2>
        <p className="text-gray-500 mt-1">
          Tell us about yourself to build your retirement timeline.
        </p>
      </div>

      {/* Name */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Your Name</h3>
        <FormField
          label="Name"
          name="userName"
          type="text"
          value={userName || ''}
          onChange={(val) => onUserNameChange?.(val)}
          helper="This name will appear throughout your plan and reports"
          placeholder="e.g. Mary, John & Sarah"
        />
      </Card>

      <Card>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Your Details</h3>
        <div className="grid sm:grid-cols-3 gap-4">
          <FormField
            label="Current Age"
            name="currentAge"
            type="number"
            value={scenario.currentAge}
            onChange={handleChange('currentAge')}
            min={18}
            max={100}
            helper="Your age today"
          />
          <FormField
            label="Retirement Age"
            name="retirementAge"
            type="number"
            value={scenario.retirementAge}
            onChange={handleChange('retirementAge')}
            min={scenario.currentAge}
            max={80}
            helper="When you plan to stop working"
          />
          <FormField
            label="Life Expectancy"
            name="lifeExpectancy"
            type="number"
            value={scenario.lifeExpectancy}
            onChange={handleChange('lifeExpectancy')}
            min={70}
            max={110}
            helper="Plan conservatively -- aim high"
          />
        </div>
      </Card>

      {/* Employment income */}
      {scenario.currentAge < scenario.retirementAge && (
        <Card>
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Still Working?</h3>
              <p className="text-sm text-gray-500 mt-1">
                If you're earning income before retirement, it covers your expenses
                so you don't drain savings early
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={scenario.stillWorking ?? true}
              onClick={() => onChange({ stillWorking: !(scenario.stillWorking ?? true) })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-sunset-400 focus:ring-offset-2 ${
                (scenario.stillWorking ?? true) ? 'bg-sunset-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                  (scenario.stillWorking ?? true) ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          {(scenario.stillWorking ?? true) && (
            <div className="view-enter">
              <FormField
                label="Annual Employment Income (Gross)"
                name="employmentIncome"
                type="number"
                value={scenario.employmentIncome}
                onChange={handleChange('employmentIncome')}
                prefix="$"
                suffix="/yr"
                min={0}
                helper={`Your salary/wages before tax — used from now until you retire at age ${scenario.retirementAge}`}
              />
              <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  This income covers your living expenses until retirement.
                  Without it, the calculator assumes you're drawing from savings
                  for the next {scenario.retirementAge - scenario.currentAge} years,
                  which dramatically reduces your safe spending in retirement.
                </p>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Non-taxed / informal income */}
      <Card>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Other Non-Taxed Income</h3>
            <p className="text-sm text-gray-500 mt-1">
              Cash income, side work, family support, or any money you receive
              that isn't reported on your tax return
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={(scenario.nonTaxedIncome || 0) > 0}
            onClick={() => onChange({ nonTaxedIncome: scenario.nonTaxedIncome > 0 ? 0 : 10000 })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-sunset-400 focus:ring-offset-2 ${
              (scenario.nonTaxedIncome || 0) > 0 ? 'bg-sunset-500' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                (scenario.nonTaxedIncome || 0) > 0 ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
        {(scenario.nonTaxedIncome || 0) > 0 && (
          <div className="view-enter space-y-4">
            <FormField
              label="Annual Non-Taxed Income"
              name="nonTaxedIncome"
              type="number"
              value={scenario.nonTaxedIncome}
              onChange={handleChange('nonTaxedIncome')}
              prefix="$"
              suffix="/yr"
              min={0}
              helper="How much you receive per year (not reported on tax return)"
            />
            <div className="grid sm:grid-cols-2 gap-4">
              <FormField
                label="From Age"
                name="nonTaxedIncomeStartAge"
                type="number"
                value={scenario.nonTaxedIncomeStartAge ?? scenario.currentAge}
                onChange={handleChange('nonTaxedIncomeStartAge')}
                min={scenario.currentAge}
                max={scenario.lifeExpectancy}
                helper="When this income starts"
              />
              <FormField
                label="Until Age"
                name="nonTaxedIncomeEndAge"
                type="number"
                value={scenario.nonTaxedIncomeEndAge ?? scenario.lifeExpectancy}
                onChange={handleChange('nonTaxedIncomeEndAge')}
                min={scenario.nonTaxedIncomeStartAge ?? scenario.currentAge}
                max={scenario.lifeExpectancy}
                helper="When this income stops"
              />
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm text-amber-800">
                This income reduces how much you need to withdraw from savings.
                It is <strong>not included in tax calculations</strong> — your
                tax bill stays the same as if you didn't have it.
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* Couple toggle */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Planning as a couple?</h3>
            <p className="text-sm text-gray-500 mt-1">
              Include your spouse or partner in the plan
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={scenario.isCouple}
            onClick={handleCoupleToggle}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-sunset-400 focus:ring-offset-2 ${
              scenario.isCouple ? 'bg-sunset-500' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                scenario.isCouple ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </Card>

      {/* Spouse fields */}
      {scenario.isCouple && (
        <Card className="view-enter">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Spouse / Partner Details</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <FormField
              label="Spouse Age"
              name="spouseAge"
              type="number"
              value={scenario.spouseAge}
              onChange={handleChange('spouseAge')}
              min={18}
              max={100}
              helper="Your partner's current age"
            />
            <FormField
              label="Spouse Retirement Age"
              name="spouseRetirementAge"
              type="number"
              value={scenario.spouseRetirementAge}
              onChange={handleChange('spouseRetirementAge')}
              min={scenario.spouseAge}
              max={80}
              helper="When your partner plans to retire"
            />
          </div>
        </Card>
      )}
    </div>
  );
}
