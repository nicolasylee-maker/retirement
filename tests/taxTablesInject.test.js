/**
 * Tests for `_injectLiveTaxData` — the runtime override mechanism in taxTables.js.
 *
 * These tests will FAIL until _injectLiveTaxData is implemented.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  PROVINCE_DATA,
  FEDERAL_BRACKETS,
  FEDERAL_CREDITS,
  OAS_PARAMS,
  CPP_PARAMS,
  GIS_PARAMS,
  RRIF_MIN_RATES,
  CAPITAL_GAINS,
  TFSA_PARAMS,
  _injectLiveTaxData,   // not yet exported — tests will fail
} from '../src/constants/taxTables.js';

// ── Snapshot of original static values (taken at import time) ─────────────────
const ORIG_ON_RATE  = PROVINCE_DATA.ON?.brackets[0]?.rate;
const ORIG_FED_RATE = FEDERAL_BRACKETS[0]?.rate;
const ORIG_OAS_START = OAS_PARAMS?.clawbackStart;

// Minimal fake federal blob (mirrors shape of data/federal.json)
const fakeFederal = {
  taxYear: 9999,
  brackets: [
    { min: 0,      max: 60000,  rate: 0.01 },
    { min: 60000,  max: null,   rate: 0.02 },
  ],
  credits: { basicPersonalAmount: 99000 },
  oas: {
    maxAnnual: 1234,
    clawbackThreshold: 55555,
    clawbackRate: 0.15,
    startAge: 65,
    deferralBonusPerMonth: 0.006,
    maxDeferAge: 70,
    maxMonthlyAge65to74: 700,
    maxMonthlyAge75plus: 770,
  },
  cpp: { maxAnnualAt65: 9999, earlyReductionPerMonth: 0.006, lateIncreasePerMonth: 0.007, earliestAge: 60, latestAge: 70 },
  gis: { maxAnnual: 999, singleIncomeThreshold: 11000, clawbackRate: 0.5 },
  capitalGains: { inclusionRate: 0.5 },
  tfsa: { annualLimit: 7777 },
  rrifMinRates: { 71: 0.0528, 72: 0.054 },
};

// Minimal fake province data keyed by province code
const fakeProvinces = {
  ON: {
    name: 'Ontario',
    brackets: [{ min: 0, max: null, rate: 0.001 }],
    credits: { basicPersonalAmount: 11111 },
    surtax: { threshold1: 0, rate1: 0, threshold2: 0, rate2: 0 },
    probate: { type: 'tiered', tiers: [] },
    intestacy: { spousePreferentialShare: 100000 },
    lowIncomeSupplement: null,
  },
  BC: {
    name: 'British Columbia',
    brackets: [{ min: 0, max: null, rate: 0.002 }],
    credits: { basicPersonalAmount: 22222 },
    probate: { type: 'tiered', tiers: [] },
    intestacy: { spousePreferentialShare: 200000 },
  },
};

afterEach(() => {
  // Restore static data after each test so other test files aren't affected
  if (typeof _injectLiveTaxData === 'function') {
    // Re-import statics by injecting undefined to reset (implementation may handle this)
    // If not, calling with null/undefined should be a no-op or re-read statics
    // Tests for reset behaviour are covered separately
  }
});

// ── _injectLiveTaxData exists ─────────────────────────────────────────────────
describe('_injectLiveTaxData', () => {
  it('is exported as a function', () => {
    expect(typeof _injectLiveTaxData).toBe('function');
  });

  // ── PROVINCE_DATA live binding ───────────────────────────────────────────────
  describe('PROVINCE_DATA live binding', () => {
    beforeEach(() => { _injectLiveTaxData(fakeFederal, fakeProvinces); });
    afterEach(() => { _injectLiveTaxData(null, null); }); // reset to statics

    it('updates ON bracket rate to injected value', () => {
      expect(PROVINCE_DATA.ON.brackets[0].rate).toBe(0.001);
    });

    it('normalizes null max to Infinity in injected province brackets', () => {
      expect(PROVINCE_DATA.ON.brackets[0].max).toBe(Infinity);
    });

    it('updates BC bracket rate to injected value', () => {
      expect(PROVINCE_DATA.BC.brackets[0].rate).toBe(0.002);
    });

    it('original ON rate is no longer seen', () => {
      expect(PROVINCE_DATA.ON.brackets[0].rate).not.toBe(ORIG_ON_RATE);
    });
  });

  // ── FEDERAL_BRACKETS live binding ────────────────────────────────────────────
  describe('FEDERAL_BRACKETS live binding', () => {
    beforeEach(() => { _injectLiveTaxData(fakeFederal, fakeProvinces); });
    afterEach(() => { _injectLiveTaxData(null, null); });

    it('updates first bracket rate', () => {
      expect(FEDERAL_BRACKETS[0].rate).toBe(0.01);
    });

    it('normalizes null max to Infinity', () => {
      expect(FEDERAL_BRACKETS[1].max).toBe(Infinity);
    });

    it('original federal rate is no longer seen', () => {
      expect(FEDERAL_BRACKETS[0].rate).not.toBe(ORIG_FED_RATE);
    });
  });

  // ── OAS_PARAMS live binding ──────────────────────────────────────────────────
  describe('OAS_PARAMS live binding', () => {
    beforeEach(() => { _injectLiveTaxData(fakeFederal, fakeProvinces); });
    afterEach(() => { _injectLiveTaxData(null, null); });

    it('updates clawbackStart from fakeFederal', () => {
      expect(OAS_PARAMS.clawbackStart).toBe(55555);
    });

    it('updates maxAnnual from fakeFederal', () => {
      expect(OAS_PARAMS.maxAnnual).toBe(1234);
    });

    it('original clawbackStart is no longer seen', () => {
      expect(OAS_PARAMS.clawbackStart).not.toBe(ORIG_OAS_START);
    });
  });

  // ── TFSA / CAPITAL_GAINS / RRIF live bindings ────────────────────────────────
  describe('other federal live bindings', () => {
    beforeEach(() => { _injectLiveTaxData(fakeFederal, fakeProvinces); });
    afterEach(() => { _injectLiveTaxData(null, null); });

    it('TFSA annualLimit reflects injected value', () => {
      expect(TFSA_PARAMS.annualLimit).toBe(7777);
    });

    it('CAPITAL_GAINS inclusionRate reflects injected value', () => {
      expect(CAPITAL_GAINS.inclusionRate).toBe(0.5);
    });

    it('RRIF_MIN_RATES key 71 reflects injected value', () => {
      expect(RRIF_MIN_RATES[71]).toBe(0.0528);
    });
  });

  // ── Reset: null/null restores static values ──────────────────────────────────
  describe('reset to static values (null, null)', () => {
    it('restores PROVINCE_DATA.ON to static after reset', () => {
      _injectLiveTaxData(fakeFederal, fakeProvinces);
      _injectLiveTaxData(null, null);
      expect(PROVINCE_DATA.ON.brackets[0].rate).toBe(ORIG_ON_RATE);
    });

    it('restores FEDERAL_BRACKETS to static after reset', () => {
      _injectLiveTaxData(fakeFederal, fakeProvinces);
      _injectLiveTaxData(null, null);
      expect(FEDERAL_BRACKETS[0].rate).toBe(ORIG_FED_RATE);
    });

    it('restores OAS_PARAMS.clawbackStart to static after reset', () => {
      _injectLiveTaxData(fakeFederal, fakeProvinces);
      _injectLiveTaxData(null, null);
      expect(OAS_PARAMS.clawbackStart).toBe(ORIG_OAS_START);
    });
  });

  // ── Static values are still correct before any injection ─────────────────────
  describe('static baseline (no injection)', () => {
    it('PROVINCE_DATA contains all 9 provinces', () => {
      const codes = Object.keys(PROVINCE_DATA);
      expect(codes).toEqual(expect.arrayContaining(['ON','BC','AB','SK','MB','NB','NS','NL','PE']));
      expect(codes).toHaveLength(9);
    });

    it('all province brackets have Infinity max (not null)', () => {
      for (const [code, data] of Object.entries(PROVINCE_DATA)) {
        const lastBracket = data.brackets[data.brackets.length - 1];
        expect(lastBracket.max, `${code} top bracket should be Infinity`).toBe(Infinity);
      }
    });

    it('FEDERAL_BRACKETS top bracket has Infinity max', () => {
      const top = FEDERAL_BRACKETS[FEDERAL_BRACKETS.length - 1];
      expect(top.max).toBe(Infinity);
    });
  });
});
