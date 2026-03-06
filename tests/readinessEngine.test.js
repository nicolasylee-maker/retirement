import { describe, it, expect } from 'vitest';
import { computeReadinessRank } from '../src/engines/readinessEngine.js';

function makeScenario(overrides = {}) {
  return {
    currentAge: 45,
    rrspBalance: 0,
    tfsaBalance: 0,
    pensionType: 'none',
    isCouple: false,
    ...overrides,
  };
}

describe('computeReadinessRank', () => {
  describe('bracket selection', () => {
    it('selects Under 35 for age 18', () => {
      const r = computeReadinessRank(makeScenario({ currentAge: 18 }));
      expect(r.bracket.label).toBe('Under 35');
    });

    it('selects Under 35 for age 34', () => {
      const r = computeReadinessRank(makeScenario({ currentAge: 34 }));
      expect(r.bracket.label).toBe('Under 35');
    });

    it('selects 35 to 44 for age 35', () => {
      const r = computeReadinessRank(makeScenario({ currentAge: 35 }));
      expect(r.bracket.label).toBe('35 to 44');
    });

    it('selects 35 to 44 for age 44', () => {
      const r = computeReadinessRank(makeScenario({ currentAge: 44 }));
      expect(r.bracket.label).toBe('35 to 44');
    });

    it('selects 45 to 54 for age 45', () => {
      const r = computeReadinessRank(makeScenario({ currentAge: 45 }));
      expect(r.bracket.label).toBe('45 to 54');
    });

    it('selects 45 to 54 for age 54', () => {
      const r = computeReadinessRank(makeScenario({ currentAge: 54 }));
      expect(r.bracket.label).toBe('45 to 54');
    });

    it('selects 55 to 64 for age 55', () => {
      const r = computeReadinessRank(makeScenario({ currentAge: 55 }));
      expect(r.bracket.label).toBe('55 to 64');
    });

    it('selects 55 to 64 for age 64', () => {
      const r = computeReadinessRank(makeScenario({ currentAge: 64 }));
      expect(r.bracket.label).toBe('55 to 64');
    });

    it('selects 65 and up for age 65', () => {
      const r = computeReadinessRank(makeScenario({ currentAge: 65 }));
      expect(r.bracket.label).toBe('65 and up');
    });

    it('selects 65 and up for age 90', () => {
      const r = computeReadinessRank(makeScenario({ currentAge: 90 }));
      expect(r.bracket.label).toBe('65 and up');
    });

    it('clamps ages below 18 to Under 35', () => {
      const r = computeReadinessRank(makeScenario({ currentAge: 10 }));
      expect(r.bracket.label).toBe('Under 35');
    });

    it('clamps ages above 99 to 65 and up', () => {
      const r = computeReadinessRank(makeScenario({ currentAge: 110 }));
      expect(r.bracket.label).toBe('65 and up');
    });
  });

  describe('percentile calculation', () => {
    it('returns high percentile (>= 85) for $0 savings', () => {
      const r = computeReadinessRank(makeScenario({ currentAge: 45, rrspBalance: 0, tfsaBalance: 0 }));
      expect(r.percentile).toBeGreaterThanOrEqual(85);
    });

    it('returns approximately 50 for median savings in bracket', () => {
      // 45-54 bracket median is $58,000
      const r = computeReadinessRank(makeScenario({ currentAge: 45, rrspBalance: 58_000 }));
      expect(r.percentile).toBeGreaterThan(40);
      expect(r.percentile).toBeLessThan(60);
    });

    it('returns approximately 10 for p90 savings in bracket', () => {
      // 45-54 bracket p90 is $380,000
      const r = computeReadinessRank(makeScenario({ currentAge: 45, rrspBalance: 380_000 }));
      expect(r.percentile).toBeGreaterThan(5);
      expect(r.percentile).toBeLessThan(20);
    });

    it('caps at 1 for very high savings', () => {
      const r = computeReadinessRank(makeScenario({ currentAge: 45, rrspBalance: 5_000_000 }));
      expect(r.percentile).toBe(1);
    });

    it('adds RRSP and TFSA together for userSavings', () => {
      const r = computeReadinessRank(makeScenario({ currentAge: 45, rrspBalance: 30_000, tfsaBalance: 28_000 }));
      expect(r.userSavings).toBe(58_000);
    });
  });

  describe('returned fields', () => {
    it('returns correct medianSavings for the bracket', () => {
      const r = computeReadinessRank(makeScenario({ currentAge: 45 }));
      expect(r.medianSavings).toBe(58_000);
    });

    it('returns correct topDecileSavings for the bracket', () => {
      const r = computeReadinessRank(makeScenario({ currentAge: 45 }));
      expect(r.topDecileSavings).toBe(380_000);
    });

    it('returns hasPension true for DB pension type', () => {
      const r = computeReadinessRank(makeScenario({ currentAge: 45, pensionType: 'db' }));
      expect(r.hasPension).toBe(true);
    });

    it('returns hasPension false for no pension', () => {
      const r = computeReadinessRank(makeScenario({ currentAge: 45, pensionType: 'none' }));
      expect(r.hasPension).toBe(false);
    });

    it('returns hasPension false for DC pension', () => {
      const r = computeReadinessRank(makeScenario({ currentAge: 45, pensionType: 'dc' }));
      expect(r.hasPension).toBe(false);
    });

    it('percentile is an integer between 1 and 99', () => {
      const r = computeReadinessRank(makeScenario({ currentAge: 45, rrspBalance: 100_000 }));
      expect(Number.isInteger(r.percentile)).toBe(true);
      expect(r.percentile).toBeGreaterThanOrEqual(1);
      expect(r.percentile).toBeLessThanOrEqual(99);
    });
  });

  describe('couple scenario', () => {
    it('uses primary age (currentAge) for bracket, not spouse age', () => {
      const r = computeReadinessRank(makeScenario({ currentAge: 45, isCouple: true, spouseAge: 32 }));
      expect(r.bracket.label).toBe('45 to 54');
    });
  });
});
