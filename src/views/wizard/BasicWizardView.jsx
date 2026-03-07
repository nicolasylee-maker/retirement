import React, { useState, useEffect, useRef } from 'react';
import Card from '../../components/Card';
import FormField from '../../components/FormField';
import QuickFillPills from '../../components/QuickFillPills';
import { PROVINCE_NAMES, PROVINCE_CODES } from '../../constants/taxTables.js';
import {
  GOV_BENEFIT_PRESETS,
  EXPENSE_PRESETS,
  RETURN_PRESETS,
} from '../../constants/defaults';
import { backSolveMortgageBalance } from '../../utils/debtCalc.js';

function findActivePresetKey(presets, scenarioValues) {
  return Object.entries(presets).find(([, vals]) =>
    Object.entries(vals)
      .filter(([k]) => k !== 'label')
      .every(([k, v]) => scenarioValues[k] === v)
  )?.[0] ?? null;
}

function incomeByAge(age) {
  if (age < 35) return 50000;
  if (age < 45) return 65000;
  if (age < 55) return 70000;
  return 60000;
}

export default function BasicWizardView({ scenario, onChange, onComplete, onExit }) {
  const [errors, setErrors] = useState({});
  const [hasMortgage, setHasMortgage] = useState(null); // null = unanswered, true/false
  const [mortgagePayment, setMortgagePayment] = useState('');
  const [mortgageYears, setMortgageYears] = useState('');
  const incomeSuggested = useRef(false);

  // Set age-bracket employment income once on mount — never overwrites after that
  useEffect(() => {
    if (incomeSuggested.current) return;
    incomeSuggested.current = true;
    onChange({ employmentIncome: incomeByAge(scenario.currentAge ?? 50) });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = (updates) => onChange(updates);

  const expensePresetKey = findActivePresetKey(EXPENSE_PRESETS, scenario);
  const govPresetKey = findActivePresetKey(GOV_BENEFIT_PRESETS, scenario);
  const returnPresetKey = findActivePresetKey(RETURN_PRESETS, scenario);

  const handleExpensePreset = (key) => {
    const { label: _l, ...vals } = EXPENSE_PRESETS[key];
    handleChange(vals);
  };
  const handleGovPreset = (key) => {
    const { label: _l, ...vals } = GOV_BENEFIT_PRESETS[key];
    handleChange(vals);
  };
  const handleReturnPreset = (key) => {
    const { label: _l, ...vals } = RETURN_PRESETS[key];
    handleChange(vals);
  };

  const handleMortgageAnswer = (answer) => {
    setHasMortgage(answer);
    if (!answer) {
      // Clear any previously set mortgage fields
      setMortgagePayment('');
      setMortgageYears('');
      onChange({
        mortgageBalance: 0,
        mortgageRate: 0,
        mortgageYearsLeft: 0,
        expensesIncludeDebt: false,
      });
    }
  };

  const validate = () => {
    const errs = {};
    if (!scenario.currentAge || scenario.currentAge < 18 || scenario.currentAge > 100)
      errs.currentAge = 'Enter an age between 18–100';
    if (!scenario.retirementAge || scenario.retirementAge < scenario.currentAge)
      errs.retirementAge = 'Must be greater than current age';
    if (!scenario.lifeExpectancy || scenario.lifeExpectancy <= scenario.retirementAge)
      errs.lifeExpectancy = 'Must be greater than retirement age';
    if (!scenario.monthlyExpenses || scenario.monthlyExpenses <= 0)
      errs.monthlyExpenses = 'Enter your expected monthly spending';
    if (hasMortgage === true) {
      if (!mortgagePayment || Number(mortgagePayment) <= 0)
        errs.mortgagePayment = 'Enter your monthly mortgage payment';
      if (!mortgageYears || Number(mortgageYears) <= 0)
        errs.mortgageYears = 'Enter years remaining on your mortgage';
    }
    return errs;
  };

  const handleSubmit = () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      const firstErrId = Object.keys(errs)[0];
      document.getElementById(firstErrId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (hasMortgage === true) {
      const balance = backSolveMortgageBalance(Number(mortgagePayment), Number(mortgageYears));
      onChange({
        mortgageBalance: balance,
        mortgageRate: 0.05,
        mortgageYearsLeft: Number(mortgageYears),
        expensesIncludeDebt: true,
      });
    } else {
      onChange({
        mortgageBalance: 0,
        mortgageRate: 0,
        mortgageYearsLeft: 0,
        expensesIncludeDebt: false,
      });
    }

    if ((scenario.nonRegInvestments ?? 0) > 0) {
      onChange({ nonRegCostBasis: Math.round(scenario.nonRegInvestments * 0.7) });
    }

    onComplete({});
  };

  const stillWorking = scenario.currentAge < scenario.retirementAge;

  const expensePresetItems = Object.entries(EXPENSE_PRESETS).map(([key, { label }]) => ({ key, label }));
  const govPresetItems = Object.entries(GOV_BENEFIT_PRESETS).map(([key, { label }]) => ({ key, label }));
  const returnPresetItems = Object.entries(RETURN_PRESETS).map(([key, { label }]) => ({ key, label }));

  // Mobile progress: count visible sections
  const SECTIONS = ['Your Details', 'Monthly Spending', 'Your Savings', 'Government Benefits', ...(stillWorking ? ['Employment'] : []), 'Return Assumption'];
  const totalSections = SECTIONS.length;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6 pb-20">
      {/* Mobile-only sticky progress bar */}
      <div className="md:hidden sticky top-0 z-10 -mx-4 px-4 py-2 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-gray-100 rounded-full h-1.5">
            <div className="bg-sunset-500 h-1.5 rounded-full" style={{ width: '100%' }} />
          </div>
          <span className="text-xs text-gray-500 shrink-0 tabular-nums">{totalSections} sections</span>
        </div>
        <p className="text-xs text-gray-400 mt-0.5">Quick Start — answer all sections to see your plan</p>
      </div>

      {/* Back link */}
      <button
        type="button"
        onClick={onExit}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Quick Start</h1>
        <p className="text-gray-500 mt-1">Answer 10 questions to see your retirement snapshot.</p>
      </div>

      {/* Your Details */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Your Details</h2>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="province">
            Province
          </label>
          <select
            id="province"
            value={scenario.province || 'ON'}
            onChange={(e) => handleChange({ province: e.target.value })}
            className="w-full sm:w-auto rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-sunset-400 focus:outline-none focus:ring-1 focus:ring-sunset-400"
          >
            {PROVINCE_CODES.map((code) => (
              <option key={code} value={code}>{code} — {PROVINCE_NAMES[code]}</option>
            ))}
          </select>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <FormField
            label="Current Age"
            name="currentAge"
            type="number"
            value={scenario.currentAge}
            onChange={(v) => { handleChange({ currentAge: v }); setErrors(e => ({ ...e, currentAge: null })); }}
            min={18}
            max={100}
            error={errors.currentAge}
          />
          <FormField
            label="Retirement Age"
            name="retirementAge"
            type="number"
            value={scenario.retirementAge}
            onChange={(v) => { handleChange({ retirementAge: v }); setErrors(e => ({ ...e, retirementAge: null })); }}
            min={scenario.currentAge || 18}
            max={100}
            error={errors.retirementAge}
          />
          <FormField
            label="Life Expectancy"
            name="lifeExpectancy"
            type="number"
            value={scenario.lifeExpectancy}
            onChange={(v) => { handleChange({ lifeExpectancy: v }); setErrors(e => ({ ...e, lifeExpectancy: null })); }}
            min={scenario.retirementAge || 60}
            max={120}
            error={errors.lifeExpectancy}
          />
        </div>
      </Card>

      {/* Monthly Spending */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Monthly Spending in Retirement</h2>
        <div className="mb-3">
          <QuickFillPills
            presets={expensePresetItems}
            activeKey={expensePresetKey}
            onSelect={handleExpensePreset}
          />
        </div>
        <FormField
          label="Monthly Expenses"
          name="monthlyExpenses"
          type="number"
          value={scenario.monthlyExpenses}
          onChange={(v) => { handleChange({ monthlyExpenses: v }); setErrors(e => ({ ...e, monthlyExpenses: null })); }}
          prefix="$"
          error={errors.monthlyExpenses}
          helper="In today's dollars — include everything you spend monthly (mortgage is fine to include, we'll ask about it below)"
        />

        {/* Mortgage question */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-sm font-medium text-gray-700 mb-2">Does this include a mortgage payment?</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleMortgageAnswer(true)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                hasMortgage === true
                  ? 'bg-sunset-500 border-sunset-500 text-white'
                  : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
              }`}
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => handleMortgageAnswer(false)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                hasMortgage === false
                  ? 'bg-sunset-500 border-sunset-500 text-white'
                  : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
              }`}
            >
              No
            </button>
          </div>

          {hasMortgage === true && (
            <div className="mt-3 grid sm:grid-cols-2 gap-3">
              <FormField
                label="Monthly Payment"
                name="mortgagePayment"
                type="number"
                value={mortgagePayment}
                onChange={(v) => { setMortgagePayment(v); setErrors(e => ({ ...e, mortgagePayment: null })); }}
                prefix="$"
                suffix="/mo"
                min={1}
                error={errors.mortgagePayment}
              />
              <FormField
                label="Years Remaining"
                name="mortgageYears"
                type="number"
                value={mortgageYears}
                onChange={(v) => { setMortgageYears(v); setErrors(e => ({ ...e, mortgageYears: null })); }}
                suffix="yrs"
                min={1}
                max={35}
                error={errors.mortgageYears}
              />
            </div>
          )}
        </div>
      </Card>

      {/* Your Savings */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Your Savings</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <FormField
            label="RRSP / RRIF Balance"
            name="rrspBalance"
            type="number"
            value={scenario.rrspBalance}
            onChange={(v) => handleChange({ rrspBalance: v })}
            prefix="$"
          />
          <FormField
            label="TFSA Balance"
            name="tfsaBalance"
            type="number"
            value={scenario.tfsaBalance}
            onChange={(v) => handleChange({ tfsaBalance: v })}
            prefix="$"
          />
          <FormField
            label="Non-Registered"
            name="nonRegInvestments"
            type="number"
            value={scenario.nonRegInvestments}
            onChange={(v) => handleChange({ nonRegInvestments: v })}
            prefix="$"
          />
        </div>
      </Card>

      {/* Government Benefits */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Government Benefits</h2>
        <div className="mb-3">
          <QuickFillPills
            presets={govPresetItems}
            activeKey={govPresetKey}
            onSelect={handleGovPreset}
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <FormField
            label="CPP Monthly"
            name="cppMonthly"
            type="number"
            value={scenario.cppMonthly}
            onChange={(v) => handleChange({ cppMonthly: v })}
            prefix="$"
            helper="At age 65"
          />
          <FormField
            label="OAS Monthly"
            name="oasMonthly"
            type="number"
            value={scenario.oasMonthly}
            onChange={(v) => handleChange({ oasMonthly: v })}
            prefix="$"
            helper="At age 65 (2025: $713)"
          />
        </div>
      </Card>

      {/* Employment Income (only if still working) */}
      {stillWorking && (
        <Card>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Employment Income</h2>
          <FormField
            label="Annual Gross Income"
            name="employmentIncome"
            type="number"
            value={scenario.employmentIncome}
            onChange={(v) => handleChange({ employmentIncome: v, stillWorking: true })}
            prefix="$"
            helper="Before tax, until retirement age"
          />
        </Card>
      )}

      {/* Return Assumption */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Return Assumption</h2>
        <QuickFillPills
          presets={returnPresetItems}
          activeKey={returnPresetKey}
          onSelect={handleReturnPreset}
        />
        <p className="text-xs text-gray-500 mt-2">
          Conservative 3% · Balanced 4% · Aggressive 6% (real, after inflation)
        </p>
      </Card>

      {/* Footer */}
      <div className="pt-2 space-y-3">
        <p className="text-sm text-gray-500 text-center">
          Planning as a couple? Use{' '}
          <button
            type="button"
            className="text-indigo-600 underline font-medium"
            onClick={onExit}
          >
            Full Setup
          </button>{' '}
          instead.
        </p>
        <button
          type="button"
          onClick={handleSubmit}
          className="w-full bg-sunset-500 hover:bg-sunset-600 text-white font-semibold py-3 rounded-xl text-base transition-colors shadow-sm"
        >
          See My Plan →
        </button>
      </div>
    </div>
  );
}
