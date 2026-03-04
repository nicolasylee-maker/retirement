import React from 'react';
import FormField from '../../components/FormField';
import Card from '../../components/Card';
import { PulsingDot } from '../../components/PulsingDot';

export default function SavingsStep({ scenario, onChange, dismissedDots, dismissDot }) {
  const handleChange = (field) => (value) => {
    onChange({ [field]: value });
  };

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Registered Savings</h2>
        <p className="text-gray-500 mt-1">
          These are accounts with special tax rules that help your savings
          grow faster. Enter the current balances for each.
        </p>
      </div>

      {/* RRSP */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-800 mb-1">RRSP</h3>
        <p className="text-sm text-gray-500 mb-2">
          Your tax-deferred retirement savings. Contributions reduce your taxes
          now, but you pay tax when you withdraw in retirement.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          <FormField
            label={<>RRSP Balance <PulsingDot id="rrspBalance" dismissed={dismissedDots?.has('rrspBalance')} onDismiss={dismissDot} /></>}
            name="rrspBalance"
            type="number"
            value={scenario.rrspBalance}
            onChange={handleChange('rrspBalance')}
            prefix="$"
            min={0}
            helper="How much is in your RRSP today — check your bank or investment statement"
          />
          <FormField
            label="Contribution Room"
            name="rrspContributionRoom"
            type="number"
            value={scenario.rrspContributionRoom}
            onChange={handleChange('rrspContributionRoom')}
            prefix="$"
            min={0}
            helper="How much more you can still put in — listed on your CRA Notice of Assessment or My Account. For reference only — catch-up RRSP contributions are not modeled in projections."
          />
        </div>
      </Card>

      {/* TFSA */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-800 mb-1">TFSA</h3>
        <p className="text-sm text-gray-500 mb-2">
          Your tax-free savings. You don't get a tax break when you put
          money in, but everything you earn and withdraw is completely
          tax-free.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          <FormField
            label={<>TFSA Balance <PulsingDot id="tfsaBalance" dismissed={dismissedDots?.has('tfsaBalance')} onDismiss={dismissDot} /></>}
            name="tfsaBalance"
            type="number"
            value={scenario.tfsaBalance}
            onChange={handleChange('tfsaBalance')}
            prefix="$"
            min={0}
            helper="How much is in your TFSA today — check your bank or investment statement"
          />
          <FormField
            label="Contribution Room"
            name="tfsaContributionRoom"
            type="number"
            value={scenario.tfsaContributionRoom}
            onChange={handleChange('tfsaContributionRoom')}
            prefix="$"
            min={0}
            helper="How much more you can contribute — unused room carries forward from past years"
          />
        </div>
      </Card>

      {/* RRIF and Other */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-800 mb-1">Other Registered Accounts</h3>
        <p className="text-sm text-gray-500 mb-2">
          Any other government-registered accounts you may have.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          <FormField
            label="RRIF Balance"
            name="rrifBalance"
            type="number"
            value={scenario.rrifBalance}
            onChange={handleChange('rrifBalance')}
            prefix="$"
            min={0}
            helper="A RRIF is what your RRSP becomes when you start taking regular income from it. You must convert by age 71."
          />
          <FormField
            label="Other Registered"
            name="otherRegisteredBalance"
            type="number"
            value={scenario.otherRegisteredBalance}
            onChange={handleChange('otherRegisteredBalance')}
            prefix="$"
            min={0}
            helper="Education savings (RESP), disability savings (RDSP), or any other registered accounts"
          />
        </div>
      </Card>

      {/* Spouse registered savings (couples only) */}
      {scenario.isCouple && (
        <Card>
          <h3 className="text-lg font-semibold text-gray-800 mb-1">Spouse Registered Savings</h3>
          <p className="text-sm text-gray-500 mb-2">
            Your spouse's tax-sheltered accounts. These are tracked and taxed separately.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <FormField
              label="Spouse RRSP Balance"
              name="spouseRrspBalance"
              type="number"
              value={scenario.spouseRrspBalance}
              onChange={handleChange('spouseRrspBalance')}
              prefix="$"
              min={0}
              helper="Spouse's RRSP balance today"
            />
            <FormField
              label="Spouse RRIF Balance"
              name="spouseRrifBalance"
              type="number"
              value={scenario.spouseRrifBalance}
              onChange={handleChange('spouseRrifBalance')}
              prefix="$"
              min={0}
              helper="Spouse's RRIF balance today (if already converted)"
            />
            <FormField
              label="Spouse TFSA Balance"
              name="spouseTfsaBalance"
              type="number"
              value={scenario.spouseTfsaBalance}
              onChange={handleChange('spouseTfsaBalance')}
              prefix="$"
              min={0}
              helper="Spouse's TFSA balance today"
            />
          </div>
        </Card>
      )}
    </div>
  );
}
