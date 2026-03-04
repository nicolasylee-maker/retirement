import React from 'react';
import FormField from '../../components/FormField';
import Card from '../../components/Card';
import QuickFillPills from '../../components/QuickFillPills';
import HelpIcon from '../../components/HelpIcon';
import { GOV_BENEFIT_PRESETS } from '../../constants/defaults';
import { PulsingDot } from '../../components/PulsingDot';

const presetList = Object.entries(GOV_BENEFIT_PRESETS).map(([key, preset]) => ({
  key,
  label: preset.label,
}));

function findActivePreset(scenario) {
  for (const [key, preset] of Object.entries(GOV_BENEFIT_PRESETS)) {
    if (
      scenario.cppMonthly === preset.cppMonthly &&
      scenario.oasMonthly === preset.oasMonthly
    ) {
      return key;
    }
  }
  return null;
}

function findActiveSpousePreset(scenario) {
  for (const [key, preset] of Object.entries(GOV_BENEFIT_PRESETS)) {
    if (
      scenario.spouseCppMonthly === preset.cppMonthly &&
      scenario.spouseOasMonthly === preset.oasMonthly
    ) {
      return key;
    }
  }
  return null;
}

export default function GovBenefitsStep({ scenario, onChange, dismissedDots, dismissDot }) {
  const handleChange = (field) => (value) => {
    onChange({ [field]: value });
  };

  const handlePresetSelect = (key) => {
    const preset = GOV_BENEFIT_PRESETS[key];
    if (preset) {
      onChange({
        cppMonthly: preset.cppMonthly,
        oasMonthly: preset.oasMonthly,
      });
    }
  };

  const handleSpousePresetSelect = (key) => {
    const preset = GOV_BENEFIT_PRESETS[key];
    if (preset) {
      onChange({
        spouseCppMonthly: preset.cppMonthly,
        spouseOasMonthly: preset.oasMonthly,
      });
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Government Benefits</h2>
        <p className="text-gray-500 mt-1">
          These are monthly payments from the government you'll receive in
          retirement. Most Canadians get both CPP and OAS. Use a preset below
          or enter your own amounts.
        </p>
      </div>

      {/* Quick-fill presets */}
      <Card>
        <div className="flex items-center gap-3 mb-3">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Quick Fill
          </h3>
        </div>
        <QuickFillPills
          presets={presetList}
          onSelect={handlePresetSelect}
          activeKey={findActivePreset(scenario)}
        />
      </Card>

      {/* CPP */}
      <Card>
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-lg font-semibold text-gray-800">
            Canada Pension Plan (CPP)
          </h3>
          <HelpIcon text="CPP is a monthly payment you earn by working and contributing through payroll deductions. The amount depends on how much you earned and how long you contributed." />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <FormField
            label={<>Monthly CPP (at age 65) <PulsingDot id="cppMonthly" dismissed={dismissedDots?.has('cppMonthly')} onDismiss={dismissDot} /></>}
            name="cppMonthly"
            type="number"
            value={scenario.cppMonthly}
            onChange={handleChange('cppMonthly')}
            prefix="$"
            suffix="/mo"
            min={0}
            max={2000}
            helper="The amount shown on your Service Canada statement at age 65. If you're already receiving CPP, enter what your statement said your age-65 amount would be. Check My Service Canada Account online if unsure."
          />
          <FormField
            label="CPP Start Age"
            name="cppStartAge"
            type="number"
            value={scenario.cppStartAge}
            onChange={handleChange('cppStartAge')}
            min={60}
            max={70}
            helper="You can start as early as 60 (smaller payments) or delay to 70 (larger payments). 65 is the standard age."
          />
        </div>
      </Card>

      {/* OAS */}
      <Card>
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-lg font-semibold text-gray-800">
            Old Age Security (OAS)
          </h3>
          <HelpIcon text="OAS is a monthly payment from the government for people 65 and older. Unlike CPP, you don't need to have worked — it's based on how long you've lived in Canada." />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <FormField
            label={<>Monthly OAS (at age 65) <PulsingDot id="oasMonthly" dismissed={dismissedDots?.has('oasMonthly')} onDismiss={dismissDot} /></>}
            name="oasMonthly"
            type="number"
            value={scenario.oasMonthly}
            onChange={handleChange('oasMonthly')}
            prefix="$"
            suffix="/mo"
            min={0}
            max={1000}
            helper="Your estimated monthly OAS at age 65 based on years of Canadian residency. Check My Service Canada Account for your personal estimate. The maximum changes quarterly with inflation."
          />
          <FormField
            label="OAS Start Age"
            name="oasStartAge"
            type="number"
            value={scenario.oasStartAge}
            onChange={handleChange('oasStartAge')}
            min={65}
            max={70}
            helper="Delaying past 65 increases your payment. Each month you wait adds 0.6% more."
          />
        </div>
      </Card>

      {/* Income-tested benefits */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          Income-Tested Benefits
        </h3>
        <div className="space-y-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={scenario.gisEligible}
              onChange={() => onChange({ gisEligible: !scenario.gisEligible })}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-sunset-500 focus:ring-sunset-400"
            />
            <div>
              <span className="text-sm font-medium text-gray-800 flex items-center gap-1">
                GIS Eligible
                <HelpIcon text="GIS is an extra monthly payment on top of OAS for seniors with low income. You qualify automatically based on your tax return — no separate application needed." />
              </span>
              <p className="text-xs text-gray-500 mt-0.5">
                Extra monthly money for seniors with limited retirement income (income under ~$21K single / ~$28K couple)
              </p>
              {scenario.gisEligible && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5 mt-1.5">
                  GIS is for low-income retirees. It's reduced if your total annual income (excluding OAS) is above ~$21,000 (single) or ~$28,000 (couple). Most people with significant RRSP or pension income won't qualify.
                </p>
              )}
            </div>
          </label>

          {(scenario.province || 'ON') === 'ON' && (
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={scenario.gainsEligible}
                onChange={() => onChange({ gainsEligible: !scenario.gainsEligible })}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-sunset-500 focus:ring-sunset-400"
              />
              <div>
                <span className="text-sm font-medium text-gray-800 flex items-center gap-1">
                  GAINS Eligible
                  <HelpIcon text="GAINS is an Ontario-only benefit that tops up your income if you already receive OAS and GIS. It's automatic — no application required." />
                </span>
                <p className="text-xs text-gray-500 mt-0.5">
                  Ontario-only top-up for seniors already receiving GIS — provides a bit more each month
                </p>
                {scenario.gainsEligible && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5 mt-1.5">
                    GAINS is for Ontario residents with annual income under ~$16,500 (single) or ~$23,000 (couple).
                  </p>
                )}
              </div>
            </label>
          )}
        </div>
      </Card>

      {/* Spouse CPP/OAS */}
      {scenario.isCouple && (
        <Card className="view-enter">
          <h3 className="text-lg font-semibold text-gray-800 mb-1">
            Spouse / Partner Benefits
          </h3>
          <p className="text-sm text-gray-500 mb-2">
            Your spouse's government payments — these affect your household's total retirement income and tax picture.
          </p>
          <div className="mb-3">
            <div className="flex items-center gap-3 mb-2">
              <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Quick Fill
              </h4>
            </div>
            <QuickFillPills
              presets={presetList}
              onSelect={handleSpousePresetSelect}
              activeKey={findActiveSpousePreset(scenario)}
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <FormField
              label="Spouse Monthly CPP (at age 65)"
              name="spouseCppMonthly"
              type="number"
              value={scenario.spouseCppMonthly}
              onChange={handleChange('spouseCppMonthly')}
              prefix="$"
              suffix="/mo"
              min={0}
              max={2000}
              helper="The amount shown on their Service Canada statement at age 65. Check My Service Canada Account if unsure."
            />
            <FormField
              label="Spouse CPP Start Age"
              name="spouseCppStartAge"
              type="number"
              value={scenario.spouseCppStartAge}
              onChange={handleChange('spouseCppStartAge')}
              min={60}
              max={70}
              helper="Same rules apply — 60 to 70, with 65 as standard"
            />
            <FormField
              label="Spouse Monthly OAS (at age 65)"
              name="spouseOasMonthly"
              type="number"
              value={scenario.spouseOasMonthly}
              onChange={handleChange('spouseOasMonthly')}
              prefix="$"
              suffix="/mo"
              min={0}
              max={1000}
              helper="Their estimated monthly OAS at age 65 based on years of Canadian residency. Check My Service Canada Account for their personal estimate. The maximum changes quarterly with inflation."
            />
            <FormField
              label="Spouse OAS Start Age"
              name="spouseOasStartAge"
              type="number"
              value={scenario.spouseOasStartAge}
              onChange={handleChange('spouseOasStartAge')}
              min={65}
              max={70}
              helper="OAS starts at 65, can be deferred to 70 for larger payments"
            />
          </div>
        </Card>
      )}
    </div>
  );
}
