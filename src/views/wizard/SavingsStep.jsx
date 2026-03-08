import React, { useMemo, useEffect, useRef, useState } from 'react';
import FormField from '../../components/FormField';
import Card from '../../components/Card';
import { PulsingDot } from '../../components/PulsingDot';
import { estimateTfsaRoom, cumulativeTfsaLimit, estimateRrspRoom } from '../../constants/tfsaLimits';

const CURRENT_YEAR = new Date().getFullYear();

const fmtK = (v) => `$${Math.round(v).toLocaleString('en-CA')}`;

function TfsaRoomHelper({ age, balance }) {
  const cumLimit = useMemo(() => cumulativeTfsaLimit(age, CURRENT_YEAR), [age]);
  if (balance > cumLimit) {
    return (
      <span className="text-amber-700">
        Your balance exceeds the lifetime contribution limit — your room is likely $0 unless you've made withdrawals that restored room.
      </span>
    );
  }
  return (
    <span>
      Estimated: {fmtK(cumLimit)} lifetime limit − {fmtK(balance)} balance. Check CRA My Account for exact amount.
    </span>
  );
}

function RrspEstimateButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="ml-2 px-2 py-0.5 text-xs font-medium rounded bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
    >
      Estimate
    </button>
  );
}

export default function SavingsStep({ scenario, onChange, dismissedDots, dismissDot }) {
  const handleChange = (field) => (value) => {
    onChange({ [field]: value });
  };

  // Track whether user has manually edited contribution room fields
  const userEditedRef = useRef({});
  const [rrspEstimateWarning, setRrspEstimateWarning] = useState(null);
  const [spouseRrspEstimateWarning, setSpouseRrspEstimateWarning] = useState(null);

  // TFSA room estimate — auto-populate when field is 0 and not user-edited
  const tfsaRoomEstimate = useMemo(
    () => estimateTfsaRoom(scenario.currentAge, CURRENT_YEAR, scenario.tfsaBalance),
    [scenario.currentAge, scenario.tfsaBalance],
  );

  useEffect(() => {
    if (!userEditedRef.current.tfsaContributionRoom && !scenario.tfsaContributionRoom && tfsaRoomEstimate > 0) {
      onChange({ tfsaContributionRoom: tfsaRoomEstimate });
    }
  }, [tfsaRoomEstimate]); // eslint-disable-line react-hooks/exhaustive-deps

  // Spouse TFSA room estimate
  const spouseTfsaRoomEstimate = useMemo(
    () => scenario.isCouple ? estimateTfsaRoom(scenario.spouseAge, CURRENT_YEAR, scenario.spouseTfsaBalance) : 0,
    [scenario.isCouple, scenario.spouseAge, scenario.spouseTfsaBalance],
  );

  useEffect(() => {
    if (!scenario.isCouple) return;
    if (!userEditedRef.current.spouseTfsaContributionRoom && !scenario.spouseTfsaContributionRoom && spouseTfsaRoomEstimate > 0) {
      onChange({ spouseTfsaContributionRoom: spouseTfsaRoomEstimate });
    }
  }, [spouseTfsaRoomEstimate, scenario.isCouple]); // eslint-disable-line react-hooks/exhaustive-deps

  // RRSP room estimate — button-triggered
  const handleEstimateRrsp = () => {
    const est = estimateRrspRoom(
      scenario.currentAge, scenario.employmentIncome,
      scenario.rrspBalance, scenario.dcPensionBalance, scenario.liraBalance,
    );
    onChange({ rrspContributionRoom: est });
    setRrspEstimateWarning('Rough estimate based on current income. Actual room depends on income history and pension adjustments.');
  };

  const handleEstimateSpouseRrsp = () => {
    const est = estimateRrspRoom(
      scenario.spouseAge, scenario.spouseEmploymentIncome,
      scenario.spouseRrspBalance, scenario.spouseDcPensionBalance, 0,
    );
    onChange({ spouseRrspContributionRoom: est });
    setSpouseRrspEstimateWarning('Rough estimate based on current income. Actual room depends on income history and pension adjustments.');
  };

  const handleUserEdit = (field) => (value) => {
    userEditedRef.current[field] = true;
    if (field === 'rrspContributionRoom') setRrspEstimateWarning(null);
    if (field === 'spouseRrspContributionRoom') setSpouseRrspEstimateWarning(null);
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
          <div>
            <FormField
              label={
                <span className="flex items-center gap-1">
                  Contribution Room
                  {!scenario.rrspContributionRoom && (
                    <RrspEstimateButton onClick={handleEstimateRrsp} />
                  )}
                </span>
              }
              name="rrspContributionRoom"
              type="number"
              value={scenario.rrspContributionRoom}
              onChange={handleUserEdit('rrspContributionRoom')}
              prefix="$"
              min={0}
              helper="How much more you can still put in — listed on your CRA Notice of Assessment or My Account. Used to cap RRSP contributions from monthly savings."
            />
            {rrspEstimateWarning && (
              <p className="text-xs text-amber-700 mt-1">{rrspEstimateWarning}</p>
            )}
          </div>
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
          <div>
            <FormField
              label="Contribution Room"
              name="tfsaContributionRoom"
              type="number"
              value={scenario.tfsaContributionRoom}
              onChange={handleUserEdit('tfsaContributionRoom')}
              prefix="$"
              min={0}
              helper={
                scenario.tfsaContributionRoom > 0
                  ? <TfsaRoomHelper age={scenario.currentAge} balance={scenario.tfsaBalance} />
                  : "How much more you can contribute — unused room carries forward from past years"
              }
            />
          </div>
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
            <div>
              <FormField
                label={
                  <span className="flex items-center gap-1">
                    Spouse RRSP Contribution Room
                    {!scenario.spouseRrspContributionRoom && (
                      <RrspEstimateButton onClick={handleEstimateSpouseRrsp} />
                    )}
                  </span>
                }
                name="spouseRrspContributionRoom"
                type="number"
                value={scenario.spouseRrspContributionRoom}
                onChange={handleUserEdit('spouseRrspContributionRoom')}
                prefix="$"
                min={0}
                helper="How much more your spouse can contribute to their RRSP. Check their CRA Notice of Assessment."
              />
              {spouseRrspEstimateWarning && (
                <p className="text-xs text-amber-700 mt-1">{spouseRrspEstimateWarning}</p>
              )}
            </div>
            <div>
              <FormField
                label="Spouse TFSA Contribution Room"
                name="spouseTfsaContributionRoom"
                type="number"
                value={scenario.spouseTfsaContributionRoom}
                onChange={handleUserEdit('spouseTfsaContributionRoom')}
                prefix="$"
                min={0}
                helper={
                  scenario.spouseTfsaContributionRoom > 0
                    ? <TfsaRoomHelper age={scenario.spouseAge} balance={scenario.spouseTfsaBalance} />
                    : "How much more your spouse can contribute to their TFSA. Unused room carries forward."
                }
              />
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
