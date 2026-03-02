/**
 * Golden file generator — run this to (re)create golden snapshots.
 *
 *   npm run generate:golden
 *
 * Commit the generated files in tests/golden/. goldenFileTests.test.js
 * asserts that engine output continues to match them on every `npm test`.
 *
 * When to regenerate:
 *   - After an intentional tax-year update to data/provinces/*.json
 *   - After a deliberate engine behaviour change
 * Do NOT regenerate just to make failing tests pass; investigate the delta first.
 */
import { describe, it } from 'vitest';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import { PROVINCE_CODES } from '../../src/constants/taxTables.js';
import { projectScenario } from '../../src/engines/projectionEngine.js';
import { calcEstateImpact } from '../../src/engines/estateEngine.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Standardised moderate-income single-person scenario used for all provinces.
 * Keep this stable across tax years so diffs are meaningful.
 */
const BASE_SCENARIO = {
  currentAge: 60,
  retirementAge: 65,
  lifeExpectancy: 90,
  // Working years
  employmentIncome: 70000,
  stillWorking: true,
  // Balances at age 60
  rrspBalance: 300000,
  tfsaBalance: 100000,
  tfsaContributionRoom: 0,
  nonRegInvestments: 50000,
  nonRegCostBasis: 50000,
  otherAssets: 0,
  realEstateValue: 0,
  // Spending
  monthlyExpenses: 4000,
  expenseReductionAtRetirement: 0,
  // Government benefits (at 65)
  cppMonthly: 800,
  cppStartAge: 65,
  oasMonthly: 713,
  oasStartAge: 65,
  // Returns & inflation
  realReturn: 0.04,
  tfsaReturn: 0.04,
  nonRegReturn: 0.04,
  inflationRate: 0.025,
  // Household
  isCouple: false,
  // Pension
  pensionType: 'none',
  // Income-tested benefits
  gisEligible: false,
  gainsEligible: false,
  // RRSP strategy
  rrspMeltdownEnabled: false,
  withdrawalOrder: ['nonReg', 'rrsp', 'tfsa'],
  // Estate
  hasWill: true,
  primaryBeneficiary: 'children', // no spouse rollover — RRSP taxed on final return
  numChildren: 2,
};

describe('Generate golden files', () => {
  for (const province of PROVINCE_CODES) {
    it(`generates golden file for ${province}`, () => {
      const scenario = { ...BASE_SCENARIO, province };
      const projectionData = projectScenario(scenario);

      const year1     = projectionData[0];
      const age65Row  = projectionData.find(r => r.age === 65);
      const age85Row  = projectionData.find(r => r.age === 85);
      const estate    = calcEstateImpact(scenario, projectionData, 85);

      const golden = {
        generated: new Date().toISOString().slice(0, 10),
        taxYear: 2025,
        scenario,
        expected: {
          year1TotalTax:           year1?.totalTax           ?? 0,
          age65AfterTaxIncome:     age65Row?.afterTaxIncome  ?? 0,
          portfolioAtAge85:        age85Row?.totalPortfolio  ?? 0,
          estateNetToHeirsAtAge85: estate.netToHeirs,
        },
      };

      writeFileSync(
        join(__dirname, `${province}-golden.json`),
        JSON.stringify(golden, null, 2) + '\n',
      );
    });
  }
});
