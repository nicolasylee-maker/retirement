import React from 'react';
import FormField from '../../components/FormField';
import Card from '../../components/Card';

export default function OtherAssetsStep({ scenario, onChange }) {
  const handleChange = (field) => (value) => {
    onChange({ [field]: value });
  };

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Other Assets</h2>
        <p className="text-gray-500 mt-1">
          Savings and investments outside of RRSP/TFSA accounts, plus any
          property or other valuable things you own.
        </p>
      </div>

      {/* Cash */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-800 mb-1">Cash Savings</h3>
        <p className="text-sm text-gray-500 mb-2">
          Money that's readily available — not locked in any special account.
        </p>
        <FormField
          label="Cash & Savings Accounts"
          name="cashSavings"
          type="number"
          value={scenario.cashSavings}
          onChange={handleChange('cashSavings')}
          prefix="$"
          min={0}
          helper="Chequing, savings accounts, GICs, or money market funds — anything you can access easily"
        />
      </Card>

      {/* Non-registered investments */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-800 mb-1">Non-Registered Investments</h3>
        <p className="text-sm text-gray-500 mb-2">
          Investments held in a regular (taxable) account — not inside an
          RRSP or TFSA. You pay tax on gains each year.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          <FormField
            label="Market Value"
            name="nonRegInvestments"
            type="number"
            value={scenario.nonRegInvestments}
            onChange={handleChange('nonRegInvestments')}
            prefix="$"
            min={0}
            helper="What your investments are worth today if you sold them"
          />
          <FormField
            label="Adjusted Cost Base"
            name="nonRegCostBasis"
            type="number"
            value={scenario.nonRegCostBasis}
            onChange={handleChange('nonRegCostBasis')}
            prefix="$"
            min={0}
            helper="What you originally paid for these investments. The difference between this and market value is your taxable gain when you sell."
          />
        </div>
      </Card>

      {/* Real estate */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Real Estate</h3>
        <FormField
          label="Property Value"
          name="realEstateValue"
          type="number"
          value={scenario.realEstateValue}
          onChange={handleChange('realEstateValue')}
          prefix="$"
          min={0}
          helper="What your property would sell for today — a rough estimate is fine"
        />
        <label className="flex items-center gap-3 mt-4 cursor-pointer">
          <input
            type="checkbox"
            checked={scenario.realEstateIsPrimary}
            onChange={() => onChange({ realEstateIsPrimary: !scenario.realEstateIsPrimary })}
            className="h-4 w-4 rounded border-gray-300 text-sunset-500 focus:ring-sunset-400"
          />
          <div>
            <span className="text-sm font-medium text-gray-800">This is my primary residence</span>
            <p className="text-xs text-gray-500">
              If this is the home you live in, any profit when you sell it is tax-free
            </p>
          </div>
        </label>
      </Card>

      {/* Other */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Other Assets</h3>
        <FormField
          label="Other Assets"
          name="otherAssets"
          type="number"
          value={scenario.otherAssets}
          onChange={handleChange('otherAssets')}
          prefix="$"
          min={0}
          helper="Vehicles, collectibles, business interests, etc."
        />
      </Card>
    </div>
  );
}
