import React from 'react';
import Button from '../../components/Button';
import { STEP_LABELS, WIZARD_STEPS } from '../../constants/defaults';
import { formatCurrency } from '../../utils/formatters';
import { PROVINCE_NAMES } from '../../constants/taxTables';

const ORDER_LABELS = { tfsa: 'TFSA', nonReg: 'Non-reg', rrsp: 'RRSP', other: 'Other' };

const STEP_SUMMARY = [
  // Step 0: Personal Info
  {
    fields: [
      { label: 'Province',   get: (s) => PROVINCE_NAMES[s.province] || s.province },
      { label: 'Your age',   get: (s) => s.currentAge },
      { label: 'Retire at',  get: (s) => s.retirementAge },
      { label: 'Plan to age',get: (s) => s.lifeExpectancy },
      { label: 'Income',     get: (s) => s.employmentIncome ? `${formatCurrency(s.employmentIncome)}/yr` : '—' },
      { label: 'Couple',     get: (s) => s.isCouple ? 'Yes' : 'No' },
    ],
  },
  // Step 1: Gov Benefits
  {
    fields: [
      { label: 'CPP', get: (s) => s.cppMonthly ? `${formatCurrency(s.cppMonthly)}/mo @ ${s.cppStartAge}` : '—' },
      { label: 'OAS', get: (s) => s.oasMonthly ? `${formatCurrency(s.oasMonthly)}/mo @ ${s.oasStartAge}` : '—' },
      { label: 'GIS',  get: (s) => s.gisEligible ? 'Yes' : 'No' },
      { label: 'GAINS', get: (s) => s.province === 'ON' ? (s.gainsEligible ? 'Yes' : 'No') : '—' },
    ],
  },
  // Step 2: Pensions
  {
    fields: [
      { label: 'Type',      get: (s) => ({ none: 'None', db: 'DB', dc: 'DC' }[s.pensionType] ?? '—') },
      { label: 'DB annual', get: (s) => s.pensionType === 'db' ? formatCurrency(s.dbPensionAnnual) : '—' },
      { label: 'DC balance',get: (s) => s.pensionType === 'dc' ? formatCurrency(s.dcPensionBalance) : '—' },
      { label: 'LIRA',      get: (s) => s.liraBalance ? formatCurrency(s.liraBalance) : '—' },
    ],
  },
  // Step 3: Savings
  {
    fields: [
      { label: 'RRSP',      get: (s) => formatCurrency(s.rrspBalance) },
      { label: 'TFSA',      get: (s) => formatCurrency(s.tfsaBalance) },
      { label: 'RRIF',      get: (s) => formatCurrency(s.rrifBalance) },
      { label: 'Other reg.',get: (s) => formatCurrency(s.otherRegisteredBalance) },
    ],
  },
  // Step 4: Other Assets
  {
    fields: [
      { label: 'Cash',        get: (s) => formatCurrency(s.cashSavings) },
      { label: 'Non-reg',     get: (s) => formatCurrency(s.nonRegInvestments) },
      { label: 'Real estate', get: (s) => s.realEstateValue ? formatCurrency(s.realEstateValue) : '—' },
      { label: 'Other assets',get: (s) => s.otherAssets ? formatCurrency(s.otherAssets) : '—' },
    ],
  },
  // Step 5: Liabilities
  {
    fields: [
      { label: 'Mortgage',      get: (s) => s.mortgageBalance ? formatCurrency(s.mortgageBalance) : '—' },
      { label: 'Consumer debt', get: (s) => s.consumerDebt ? formatCurrency(s.consumerDebt) : '—' },
      { label: 'Other debt',    get: (s) => s.otherDebt ? formatCurrency(s.otherDebt) : '—' },
    ],
  },
  // Step 6: Expenses
  {
    fields: [
      { label: 'Monthly spend',  get: (s) => `${formatCurrency(s.monthlyExpenses)}/mo` },
      { label: 'Inflation',      get: (s) => `${(s.inflationRate * 100).toFixed(1)}%` },
      { label: 'Real return',    get: (s) => `${(s.realReturn * 100).toFixed(1)}%` },
      { label: 'Retire cutback', get: (s) => `${(s.expenseReductionAtRetirement * 100).toFixed(0)}%` },
    ],
  },
  // Step 7: Withdrawal
  {
    fields: [
      { label: 'Order',        get: (s) => (s.withdrawalOrder || []).map((k) => ORDER_LABELS[k] || k).join(' → ') },
      { label: 'RRSP meltdown',get: (s) => s.rrspMeltdownEnabled ? `${s.rrspMeltdownStartAge}–${s.rrspMeltdownTargetAge}` : 'Off' },
    ],
  },
  // Step 8: Estate
  {
    fields: [
      { label: 'Has will',    get: (s) => s.hasWill ? 'Yes' : 'No' },
      { label: 'Beneficiary', get: (s) => ({ spouse: 'Spouse', children: 'Children', charity: 'Charity', estate: 'Estate' }[s.primaryBeneficiary] ?? '—') },
      { label: 'Children',    get: (s) => s.numberOfChildren > 0 ? String(s.numberOfChildren) : 'None' },
    ],
  },
];

export default function WizardSidePanel({
  scenario,
  currentStep,
  isLastStep,
  isFirstStep,
  onNext,
  onBack,
  onComplete,
}) {
  const stepConfig = STEP_SUMMARY[currentStep] ?? STEP_SUMMARY[0];

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-white border-l border-gray-200 fixed top-0 right-0 h-screen z-10">
      {/* Step header */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-100">
        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
          Step {currentStep + 1} of {WIZARD_STEPS}
        </p>
        <p className="text-sm font-semibold text-gray-800 mt-0.5">
          {STEP_LABELS[currentStep]}
        </p>
      </div>

      {/* Live summary fields */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {stepConfig.fields.map(({ label, get }) => {
          let value;
          try { value = get(scenario); } catch { value = '—'; }
          return (
            <div key={label} className="flex justify-between items-baseline gap-2">
              <span className="text-xs text-gray-500 shrink-0">{label}</span>
              <span className="text-xs font-medium text-gray-800 text-right truncate max-w-[120px]">
                {value ?? '—'}
              </span>
            </div>
          );
        })}
      </div>

      {/* Navigation */}
      <div className="px-4 py-4 border-t border-gray-100 space-y-2">
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={onBack}
            disabled={isFirstStep}
            className="flex-1 text-sm"
          >
            Back
          </Button>
          <Button
            variant="primary"
            onClick={onNext}
            className="flex-[2] text-sm"
          >
            {isLastStep ? 'Finish' : 'Next →'}
          </Button>
        </div>
        <button
          type="button"
          onClick={onComplete}
          className="w-full text-xs text-sunset-600 hover:text-sunset-700 text-center py-1 transition-colors duration-150"
        >
          View Results
        </button>
      </div>
    </aside>
  );
}
