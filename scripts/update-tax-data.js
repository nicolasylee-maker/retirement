#!/usr/bin/env node
/**
 * Annual tax data update script.
 *
 * Run after each federal/provincial budget to check for bracket changes.
 * This script audits data freshness and prints a step-by-step checklist.
 *
 * Usage:
 *   node scripts/update-tax-data.js
 */
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ---------------------------------------------------------------------------
// Read all province JSON files (via fs, not import — works in plain Node)
// ---------------------------------------------------------------------------
const provDir = join(ROOT, 'data', 'provinces');
const provinces = readdirSync(provDir)
  .filter(f => f.endsWith('.json'))
  .sort()
  .map(f => {
    const code = f.replace('.json', '');
    const data = JSON.parse(readFileSync(join(provDir, f), 'utf8'));
    return { code, taxYear: data.taxYear, lastVerified: data.lastVerified };
  });

const federal = JSON.parse(readFileSync(join(ROOT, 'data', 'federal.json'), 'utf8'));
const thisYear = new Date().getFullYear();

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------
console.log('\n=== Canadian Retirement Planner — Annual Tax Data Update ===\n');
console.log(`Federal   taxYear=${federal.taxYear}  lastVerified=${federal.lastVerified}` +
  (federal.taxYear < thisYear ? '  ← STALE' : ''));
console.log('\nProvince data:');
for (const p of provinces) {
  const stale = p.taxYear < thisYear;
  console.log(`  ${p.code.padEnd(3)}  taxYear=${p.taxYear}  lastVerified=${p.lastVerified}` +
    (stale ? '  ← STALE' : ''));
}

// ---------------------------------------------------------------------------
// Checklist
// ---------------------------------------------------------------------------
console.log(`
=== Update Checklist ===

1. Federal brackets  (data/federal.json)
   - CRA brackets: https://www.canada.ca/en/revenue-agency/services/tax/individuals/frequently-asked-questions-individuals/canadian-income-tax-rates-individuals-current-previous-years.html
   - Cross-check:  https://www.taxtips.ca/tax-rates/canada.htm
   - Check:  brackets[], basicPersonalAmount, ageAmount, ageIncomeThreshold, ageClawbackRate
   - Check:  OAS clawback threshold (oasClawbackThreshold) and OAS max (oasMax)
   - Check:  CAPITAL_GAINS.inclusionRate (currently 0.5 since Mar 2025 reversal)
   - Check:  TFSA annual limit (tfsaAnnualLimit)
   - Note:   The first-year federal bracket may need a mid-year blend if the rate changes mid-year

2. Provincial brackets  (data/provinces/*.json)
   - taxtips.ca/tax-rates/{province}.htm  (replace {province} with on, bc, ab, etc.)
   - Key items: brackets[], basicPersonalAmount, ageAmount, ageIncomeThreshold, ageClawbackRate
   - Ontario: surtax thresholds (surtax.tier1, surtax.tier2) change most years
   - NS: ageClawbackRate is 0.0 (Budget 2025 eliminated the phase-out; keep this)

3. After editing JSON files:
   a) Update "taxYear" and "lastVerified" in every changed file
   b) npm test                    ← must still pass (engine logic unchanged)
   c) npm run generate:golden     ← reset golden snapshots
   d) npm test                    ← golden tests must pass
   e) node scripts/check-canlii.js --fetch  ← check for probate/intestacy amendments
   f) git add data/ tests/golden/ && git commit -m "chore: update to ${thisYear} tax data"

4. Reference sources:
   - kronostechnologies/tax-ca:  https://github.com/kronostechnologies/tax-ca
   - CRA T4127 (payroll deductions):  https://www.canada.ca/en/revenue-agency/services/forms-publications/payroll/t4127-payroll-deductions-formulas.html
   - TaxTips.ca (provincial):  https://www.taxtips.ca/tax-rates/
`);
