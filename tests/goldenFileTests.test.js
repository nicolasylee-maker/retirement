/**
 * Golden file regression tests.
 *
 * Each province has a pre-computed JSON snapshot in tests/golden/.
 * These tests re-run the same scenario through the engines and assert
 * exact equality against the stored expected values.
 *
 * If a test fails, one of two things happened:
 *   (a) An unintentional engine change — fix the bug, don't regenerate.
 *   (b) An intentional tax-year or rule update — run `npm run generate:golden`
 *       to reset the snapshots, then commit both the data and golden files.
 *
 * If golden files are missing, run: npm run generate:golden
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import { PROVINCE_CODES } from '../src/constants/taxTables.js';
import { projectScenario } from '../src/engines/projectionEngine.js';
import { calcEstateImpact } from '../src/engines/estateEngine.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('Golden file regression tests', () => {
  for (const province of PROVINCE_CODES) {
    describe(province, () => {
      let golden;
      try {
        const raw = readFileSync(
          join(__dirname, 'golden', `${province}-golden.json`),
          'utf8',
        );
        golden = JSON.parse(raw);
      } catch {
        it.skip(`golden file missing — run: npm run generate:golden`, () => {});
        return;
      }

      const { scenario, expected } = golden;
      const projectionData = projectScenario(scenario);
      const year1    = projectionData[0];
      const age65Row = projectionData.find(r => r.age === 65);
      const age85Row = projectionData.find(r => r.age === 85);
      const estate   = calcEstateImpact(scenario, projectionData, 85);

      it('year-1 total tax', () => {
        expect(year1?.totalTax).toBe(expected.year1TotalTax);
      });

      it('age-65 after-tax income', () => {
        expect(age65Row?.afterTaxIncome).toBe(expected.age65AfterTaxIncome);
      });

      it('portfolio at age 85', () => {
        expect(age85Row?.totalPortfolio).toBe(expected.portfolioAtAge85);
      });

      it('estate net-to-heirs at age 85', () => {
        expect(estate.netToHeirs).toBe(expected.estateNetToHeirsAtAge85);
      });
    });
  }
});
