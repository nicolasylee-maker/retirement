import React from 'react';
import FormField from '../../components/FormField';
import Card from '../../components/Card';
import { PROVINCE_NAMES, PROVINCE_CODES } from '../../constants/taxTables.js';
import { PulsingDot } from '../../components/PulsingDot';

export default function PersonalInfoStep({ scenario, onChange, dismissedDots, dismissDot }) {
  const handleChange = (field) => (value) => {
    onChange({ [field]: value });
  };

  const lifeExpError = scenario.lifeExpectancy <= scenario.retirementAge
    ? 'Must be greater than retirement age' : null;
  const spouseRetireError = scenario.isCouple && scenario.spouseRetirementAge < scenario.spouseAge
    ? 'Must be greater than spouse current age' : null;
  const nonTaxedAgeError = (scenario.nonTaxedIncome || 0) > 0
    && scenario.nonTaxedIncomeEndAge < scenario.nonTaxedIncomeStartAge
    ? 'End age must be after start age' : null;

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

      <Card>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Your Details</h3>
        {/* Province selector */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="province">
            Province
          </label>
          <select
            id="province"
            value={scenario.province || 'ON'}
            onChange={(e) => onChange({ province: e.target.value })}
            className="w-full sm:w-auto rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-sunset-400 focus:outline-none focus:ring-1 focus:ring-sunset-400"
          >
            {PROVINCE_CODES.map((code) => (
              <option key={code} value={code}>{code} — {PROVINCE_NAMES[code]}</option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Selects provincial tax brackets, probate fees, and intestacy rules
          </p>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <FormField
            label={<>Current Age <PulsingDot id="currentAge" dismissed={dismissedDots?.has('currentAge')} onDismiss={dismissDot} /></>}
            name="currentAge"
            type="number"
            value={scenario.currentAge}
            onChange={handleChange('currentAge')}
            min={18}
            max={100}
            helper="Your age today"
          />
          <FormField
            label={<>Retirement Age <PulsingDot id="retirementAge" dismissed={dismissedDots?.has('retirementAge')} onDismiss={dismissDot} /></>}
            name="retirementAge"
            type="number"
            value={scenario.retirementAge}
            onChange={handleChange('retirementAge')}
            min={scenario.currentAge}
            max={80}
            helper="When you plan to stop working"
          />
          <FormField
            label={<>Life Expectancy <PulsingDot id="lifeExpectancy" dismissed={dismissedDots?.has('lifeExpectancy')} onDismiss={dismissDot} /></>}
            name="lifeExpectancy"
            type="number"
            value={scenario.lifeExpectancy}
            onChange={handleChange('lifeExpectancy')}
            min={70}
            max={110}
            helper={lifeExpError ? null : "Plan conservatively -- aim high"}
            error={lifeExpError}
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
                helper={nonTaxedAgeError ? null : "When this income stops"}
                error={nonTaxedAgeError}
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
              helper={spouseRetireError ? null : "When your partner plans to retire"}
              error={spouseRetireError}
            />
          </div>
          {/* Spouse employment income */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h4 className="text-sm font-semibold text-gray-800">Spouse Still Working?</h4>
                <p className="text-xs text-gray-500 mt-0.5">
                  Include spouse income until they retire at age {scenario.spouseRetirementAge}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={scenario.spouseStillWorking ?? true}
                onClick={() => onChange({ spouseStillWorking: !(scenario.spouseStillWorking ?? true) })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-sunset-400 focus:ring-offset-2 ${
                  (scenario.spouseStillWorking ?? true) ? 'bg-sunset-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                    (scenario.spouseStillWorking ?? true) ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            {(scenario.spouseStillWorking ?? true) && (
              <FormField
                label="Spouse Annual Employment Income (Gross)"
                name="spouseEmploymentIncome"
                type="number"
                value={scenario.spouseEmploymentIncome}
                onChange={handleChange('spouseEmploymentIncome')}
                prefix="$"
                suffix="/yr"
                min={0}
                helper={`Spouse salary/wages before tax — used until they retire at age ${scenario.spouseRetirementAge}`}
              />
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
