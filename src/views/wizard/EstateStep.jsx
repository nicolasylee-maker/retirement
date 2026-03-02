import React from 'react';
import FormField from '../../components/FormField';
import Card from '../../components/Card';

const BENEFICIARY_OPTIONS = [
  { value: 'spouse', label: 'Spouse / Partner' },
  { value: 'children', label: 'Children' },
  { value: 'other', label: 'Other' },
];

export default function EstateStep({ scenario, onChange }) {
  const handleChange = (field) => (value) => {
    onChange({ [field]: value });
  };

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Estate Planning</h2>
        <p className="text-gray-500 mt-1">
          What happens to your money and property when you pass away.
          Planning ahead means less stress and fewer taxes for your family.
        </p>
      </div>

      {/* Will */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Do you have a will?</h3>
            <p className="text-sm text-gray-500 mt-1">
              A will is a legal document that says who gets your money, property,
              and belongings after you pass away
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={scenario.hasWill}
            onClick={() => onChange({ hasWill: !scenario.hasWill })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-sunset-400 focus:ring-offset-2 ${
              scenario.hasWill ? 'bg-sunset-500' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                scenario.hasWill ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {!scenario.hasWill && (
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3 view-enter">
            <div className="flex gap-2">
              <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-amber-800">
                  Without a will, the government decides who gets what
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  In Ontario, when someone dies without a will (called "intestacy"),
                  there's a fixed formula: the first $350,000 goes to your spouse,
                  and the rest is split between your spouse and children. This may
                  not match what you actually want. A basic will typically costs
                  $300-$1,000 through a lawyer.
                </p>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Beneficiary */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-800 mb-1">Primary Beneficiary</h3>
        <p className="text-sm text-gray-500 mb-2">
          The person who will receive most of your assets. This affects tax
          calculations — a spouse can inherit RRSPs tax-free, while others cannot.
        </p>
        <div className="space-y-3">
          {BENEFICIARY_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors duration-150 ${
                scenario.primaryBeneficiary === option.value
                  ? 'border-sunset-400 bg-sunset-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="primaryBeneficiary"
                value={option.value}
                checked={scenario.primaryBeneficiary === option.value}
                onChange={() => onChange({ primaryBeneficiary: option.value })}
                className="h-4 w-4 border-gray-300 text-sunset-500 focus:ring-sunset-400"
              />
              <span className="text-sm font-medium text-gray-900">{option.label}</span>
            </label>
          ))}
        </div>
      </Card>

      {/* Cost basis */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-800 mb-1">Estate Tax Considerations</h3>
        <p className="text-sm text-gray-500 mb-2">
          When you pass away, Canada treats most of your assets as if you sold
          them. This can trigger a tax bill on your final tax return that your
          estate must pay.
        </p>
        <FormField
          label="Estimated Cost Basis of Estate Assets"
          name="estimatedCostBasis"
          type="number"
          value={scenario.estimatedCostBasis}
          onChange={handleChange('estimatedCostBasis')}
          prefix="$"
          min={0}
          helper="What you originally paid for your investments and property. The tax at death is based on how much they've grown since you bought them."
        />
        <label className="flex items-center gap-3 mt-4 cursor-pointer">
          <input
            type="checkbox"
            checked={scenario.includeRealEstateInEstate}
            onChange={() => onChange({ includeRealEstateInEstate: !scenario.includeRealEstateInEstate })}
            className="h-4 w-4 rounded border-gray-300 text-sunset-500 focus:ring-sunset-400"
          />
          <div>
            <span className="text-sm font-medium text-gray-800">
              Include real estate in estate value
            </span>
            {scenario.includeRealEstateInEstate ? (
              <p className="text-xs text-gray-500 mt-0.5">
                Your property{scenario.realEstateValue > 0 ? ` ($${(scenario.realEstateValue / 1000).toFixed(0)}K)` : ''} will be included in your estate.
                {scenario.realEstateIsPrimary
                  ? ' As your primary residence, the capital gain is tax-free — but the full value adds to probate fees (Ontario charges ~1.5% on estates over $50K).'
                  : ' As a non-primary property, capital gains tax applies on the growth since purchase, plus probate fees.'}
              </p>
            ) : (
              <p className="text-xs text-gray-500 mt-0.5">
                Your property is excluded from the estate calculation.
                {' '}This assumes you'll sell it, gift it, or transfer it before you pass away — your heirs won't inherit it, but your estate won't owe probate fees or taxes on it either.
              </p>
            )}
          </div>
        </label>
      </Card>

      {/* Summary note */}
      <Card>
        <div className="flex items-start gap-3 text-sky-700 bg-sky-50 rounded-lg p-4">
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm">
            This is a simplified estate overview. For detailed estate planning
            including probate fees, trust strategies, and tax optimization,
            consult a qualified estate planner or tax professional.
          </p>
        </div>
      </Card>
    </div>
  );
}
