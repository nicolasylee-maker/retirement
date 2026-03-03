/**
 * Tests for pure helper functions used by TaxDataContext and TaxDataEditor.
 *
 * These functions will live in:
 *   - src/contexts/TaxDataContext.jsx   → buildTaxDataFromRows, buildTaxDataFromBundled
 *   - src/views/admin/components/TaxDataEditor.jsx → parseTaxJson, runTaxSmokeTest
 *
 * All tests will FAIL until those functions are implemented and exported.
 */
import { describe, it, expect } from 'vitest';

// ── Context helpers ────────────────────────────────────────────────────────────
import {
  buildTaxDataFromRows,   // not yet exported — tests fail
} from '../src/contexts/TaxDataContext.jsx';

// ── Editor helpers ─────────────────────────────────────────────────────────────
import {
  parseTaxJson,           // not yet exported — tests fail
  runTaxSmokeTest,        // not yet exported — tests fail
} from '../src/views/admin/components/TaxDataEditor.jsx';

// ── Sample province row matching DB shape ─────────────────────────────────────
const sampleOnData = {
  taxYear: 2025,
  name: 'Ontario',
  brackets: [
    { min: 0,      max: 52886,   rate: 0.0505 },
    { min: 52886,  max: 105775,  rate: 0.0915 },
    { min: 105775, max: null,    rate: 0.1116 },
  ],
  credits: { basicPersonalAmount: 12747 },
  surtax: { threshold1: 5710, rate1: 0.20, threshold2: 7307, rate2: 0.36 },
  probate: { type: 'tiered', tiers: [{ upTo: 50000, ratePerThousand: 5 }, { upTo: null, ratePerThousand: 15 }] },
  intestacy: { spousePreferentialShare: 350000 },
  lowIncomeSupplement: { maxAnnual: 1025, singleIncomeThreshold: 25000, clawbackRate: 0.05, minAge: 65 },
};

const sampleFederalData = {
  taxYear: 2025,
  brackets: [
    { min: 0,      max: 57375,  rate: 0.145 },
    { min: 57375,  max: 114750, rate: 0.205 },
    { min: 114750, max: null,   rate: 0.26  },
  ],
  credits: { basicPersonalAmount: 16129 },
  oas: {
    maxAnnual: 8580,
    clawbackThreshold: 90997,
    clawbackRate: 0.15,
    startAge: 65,
    deferralBonusPerMonth: 0.006,
    maxDeferAge: 70,
    maxMonthlyAge65to74: 727.67,
    maxMonthlyAge75plus: 800.44,
  },
  cpp: { maxAnnualAt65: 16375, earlyReductionPerMonth: 0.006, lateIncreasePerMonth: 0.007, earliestAge: 60, latestAge: 70 },
  gis: { maxAnnual: 12000, singleIncomeThreshold: 21624, clawbackRate: 0.5 },
  capitalGains: { inclusionRate: 0.5 },
  tfsa: { annualLimit: 7000 },
  rrifMinRates: { 71: 0.0528, 72: 0.054, 73: 0.0553 },
};

// DB rows as returned by supabase: [{province, data}]
const dbRows = [
  { province: 'federal', data: sampleFederalData },
  { province: 'ON',      data: sampleOnData },
];

// ── buildTaxDataFromRows ───────────────────────────────────────────────────────
describe('buildTaxDataFromRows', () => {
  it('returns object with federal and provinces keys', () => {
    const result = buildTaxDataFromRows(dbRows);
    expect(result).toHaveProperty('federal');
    expect(result).toHaveProperty('provinces');
  });

  it('federal key matches the federal row data', () => {
    const { federal } = buildTaxDataFromRows(dbRows);
    expect(federal.taxYear).toBe(2025);
    expect(federal.oas.clawbackThreshold).toBe(90997);
  });

  it('provinces key has ON province', () => {
    const { provinces } = buildTaxDataFromRows(dbRows);
    expect(provinces).toHaveProperty('ON');
    expect(provinces.ON.name).toBe('Ontario');
  });

  it('normalizes null max → Infinity in province brackets', () => {
    const { provinces } = buildTaxDataFromRows(dbRows);
    const top = provinces.ON.brackets[provinces.ON.brackets.length - 1];
    expect(top.max).toBe(Infinity);
  });

  it('normalizes null max → Infinity in federal brackets', () => {
    const { federal } = buildTaxDataFromRows(dbRows);
    const top = federal.brackets[federal.brackets.length - 1];
    expect(top.max).toBe(Infinity);
  });

  it('handles empty rows array without throwing', () => {
    expect(() => buildTaxDataFromRows([])).not.toThrow();
  });

  it('returns null federal when no federal row present', () => {
    const onlyProvince = [{ province: 'ON', data: sampleOnData }];
    const { federal } = buildTaxDataFromRows(onlyProvince);
    expect(federal).toBeNull();
  });

  it('ignores unknown province codes gracefully', () => {
    const weirdRow = [{ province: 'XX', data: { name: 'Unknown', brackets: [] } }];
    expect(() => buildTaxDataFromRows(weirdRow)).not.toThrow();
  });
});

// ── parseTaxJson ───────────────────────────────────────────────────────────────
describe('parseTaxJson', () => {
  it('returns { data, error:null } for valid JSON', () => {
    const raw = JSON.stringify(sampleOnData);
    const { data, error } = parseTaxJson(raw);
    expect(error).toBeNull();
    expect(data).toMatchObject({ taxYear: 2025 });
  });

  it('returns { data:null, error } for invalid JSON', () => {
    const { data, error } = parseTaxJson('{ not valid json }');
    expect(data).toBeNull();
    expect(typeof error).toBe('string');
    expect(error.length).toBeGreaterThan(0);
  });

  it('returns error for empty string', () => {
    const { data, error } = parseTaxJson('');
    expect(data).toBeNull();
    expect(error).toBeTruthy();
  });

  it('returns error for non-object JSON (array)', () => {
    const { data, error } = parseTaxJson('[1, 2, 3]');
    expect(data).toBeNull();
    expect(error).toBeTruthy();
  });

  it('returns error for JSON null', () => {
    const { data, error } = parseTaxJson('null');
    expect(data).toBeNull();
    expect(error).toBeTruthy();
  });

  it('returns { data, error:null } for valid federal JSON', () => {
    const raw = JSON.stringify(sampleFederalData);
    const { data, error } = parseTaxJson(raw);
    expect(error).toBeNull();
    expect(data.oas.clawbackThreshold).toBe(90997);
  });
});

// ── runTaxSmokeTest ────────────────────────────────────────────────────────────
describe('runTaxSmokeTest', () => {
  it('returns positive federalTax for $100K income with valid federal data', () => {
    const result = runTaxSmokeTest(sampleFederalData, sampleOnData);
    expect(result.federalTax).toBeGreaterThan(0);
  });

  it('returns positive provincialTax for $100K income with valid ON data', () => {
    const result = runTaxSmokeTest(sampleFederalData, sampleOnData);
    expect(result.provincialTax).toBeGreaterThan(0);
  });

  it('result has federalTax and provincialTax numeric keys', () => {
    const result = runTaxSmokeTest(sampleFederalData, sampleOnData);
    expect(typeof result.federalTax).toBe('number');
    expect(typeof result.provincialTax).toBe('number');
  });

  it('throws or returns error when brackets is null in province data', () => {
    const broken = { ...sampleOnData, brackets: null };
    expect(() => runTaxSmokeTest(sampleFederalData, broken)).toThrow();
  });

  it('throws or returns error when federal data is null', () => {
    expect(() => runTaxSmokeTest(null, sampleOnData)).toThrow();
  });

  it('throws or returns error when federal brackets is empty array', () => {
    const broken = { ...sampleFederalData, brackets: [] };
    expect(() => runTaxSmokeTest(broken, sampleOnData)).toThrow();
  });

  it('$0 income returns federalTax of 0', () => {
    const result = runTaxSmokeTest(sampleFederalData, sampleOnData, 0);
    expect(result.federalTax).toBe(0);
  });

  it('sample $100K federal tax is in a plausible range ($10K–$30K)', () => {
    const result = runTaxSmokeTest(sampleFederalData, sampleOnData);
    expect(result.federalTax).toBeGreaterThan(10000);
    expect(result.federalTax).toBeLessThan(30000);
  });

  it('sample $100K ON provincial tax is in a plausible range ($3K–$12K)', () => {
    const result = runTaxSmokeTest(sampleFederalData, sampleOnData);
    expect(result.provincialTax).toBeGreaterThan(3000);
    expect(result.provincialTax).toBeLessThan(12000);
  });
});
