import { describe, it, expect } from 'vitest';
import { calcEstateImpact } from '../src/engines/estateEngine.js';

function mockRow(age, overrides = {}) {
  return {
    age, rrspBalance: 0, tfsaBalance: 0, nonRegBalance: 0, otherBalance: 0,
    nonRegCostBasis: 0, mortgageBalance: 0, cppIncome: 0, oasIncome: 0, pensionIncome: 0,
    ...overrides,
  };
}
const wrap = (row) => [row];

// Shared no-estate scenario for probate / structural tests
const noEstateSc = {
  primaryBeneficiary: 'estate', isCouple: false, hasWill: true,
  numberOfChildren: 0, includeRealEstateInEstate: false, nonRegCostBasis: 0,
};

// --- 1. Margaret: spouse rollover, RRSP tax-free ---
describe('Margaret (dies at 85, spouse rollover)', () => {
  const sc = {
    primaryBeneficiary: 'spouse', isCouple: true, hasWill: true,
    numberOfChildren: 0, includeRealEstateInEstate: false, nonRegCostBasis: 40000,
  };
  const row = mockRow(85, {
    rrspBalance: 300000, tfsaBalance: 80000, nonRegBalance: 50000,
    nonRegCostBasis: 40000, cppIncome: 8000, oasIncome: 7000,
  });
  const r = calcEstateImpact(sc, wrap(row), 85);

  it('RRSP deemed income is 0 (spouse rollover)', () => expect(r.rrspRrifDeemed).toBe(0));
  it('gross estate = RRSP + TFSA + nonReg', () => expect(r.grossEstate).toBe(430000));
  it('capital gains tax > 0 on $10K non-reg gain', () => expect(r.capitalGainsTax).toBeGreaterThan(0));
  it('spouse gets everything (has will)', () => {
    expect(r.distribution.spouse).toBeCloseTo(r.netToHeirs, 0);
    expect(r.distribution.children).toBe(0);
  });
  it('breakdown has spousal rollover label', () => {
    expect(r.breakdown.map(b => b.label)).toContain('RRSP/RRIF (spousal rollover, tax-free)');
  });
});

// --- 2. Frank: intestate, no spouse, 2 children ---
describe('Frank (dies at 90, intestate, 2 children)', () => {
  const sc = {
    primaryBeneficiary: 'estate', isCouple: false, hasWill: false,
    numberOfChildren: 2, includeRealEstateInEstate: false, nonRegCostBasis: 20000,
  };
  const row = mockRow(90, { rrspBalance: 50000, tfsaBalance: 10000, nonRegBalance: 30000, nonRegCostBasis: 20000 });
  const r = calcEstateImpact(sc, wrap(row), 90);

  it('deems full RRSP as income', () => expect(r.rrspRrifDeemed).toBe(50000));
  it('children get everything (no spouse)', () => {
    expect(r.distribution.spouse).toBe(0);
    expect(r.distribution.children).toBeCloseTo(r.netToHeirs, 0);
    expect(r.distribution.other).toBe(0);
  });
  it('distribution sums to netToHeirs', () => {
    const d = r.distribution;
    expect(d.spouse + d.children + d.other).toBeCloseTo(r.netToHeirs, 0);
  });
});

// --- 3. Wealthy Winnie: large estate, non-primary real estate ---
describe('Wealthy Winnie (dies at 80, large estate)', () => {
  const sc = {
    primaryBeneficiary: 'estate', isCouple: false, hasWill: true, numberOfChildren: 3,
    includeRealEstateInEstate: true, realEstateValue: 800000,
    realEstateIsPrimary: false, estimatedCostBasis: 200000, nonRegCostBasis: 400000,
  };
  const row = mockRow(80, {
    rrspBalance: 500000, tfsaBalance: 200000, nonRegBalance: 1000000,
    nonRegCostBasis: 400000, cppIncome: 10000, oasIncome: 8000,
  });
  const r = calcEstateImpact(sc, wrap(row), 80);

  it('deems full $500K RRSP as income', () => expect(r.rrspRrifDeemed).toBe(500000));
  it('capital gains tax > $100K', () => expect(r.capitalGainsTax).toBeGreaterThan(100000));
  it('gross estate includes real estate', () => expect(r.grossEstate).toBe(2500000));
  it('netToHeirs < grossEstate', () => expect(r.netToHeirs).toBeLessThan(r.grossEstate));
  it('children get everything (will, no spouse)', () => {
    expect(r.distribution.children).toBeCloseTo(r.netToHeirs, 0);
    expect(r.distribution.spouse).toBe(0);
  });
  it('breakdown has capital gains tax entry', () => {
    expect(r.breakdown.some(b => b.label.startsWith('Capital gains tax'))).toBe(true);
  });
});

// --- 4. Probate fee edge cases ---
describe('Probate fees', () => {
  it('$0 estate -> $0 probate', () => {
    expect(calcEstateImpact(noEstateSc, wrap(mockRow(80)), 80).probateFees).toBe(0);
  });
  it('$50K estate -> first tier only ($250)', () => {
    const row = mockRow(80, { nonRegBalance: 50000, nonRegCostBasis: 50000 });
    expect(calcEstateImpact(noEstateSc, wrap(row), 80).probateFees).toBe(250);
  });
  it('$100K estate -> both tiers ($1000)', () => {
    const row = mockRow(80, { nonRegBalance: 100000, nonRegCostBasis: 100000 });
    // 50000*5/1000 + 50000*15/1000 = 250 + 750
    expect(calcEstateImpact(noEstateSc, wrap(row), 80).probateFees).toBe(1000);
  });
});

// --- 5. Intestacy distribution (Ontario SLRA) ---
describe('Intestacy distribution (Ontario SLRA)', () => {
  const mkSc = (isCouple, n) => ({
    primaryBeneficiary: 'estate', isCouple, hasWill: false,
    numberOfChildren: n, includeRealEstateInEstate: false, nonRegCostBasis: 0,
  });

  it('spouse + 1 child: $350K pref + 1/2 remainder', () => {
    const r = calcEstateImpact(mkSc(true, 1), wrap(mockRow(80, { nonRegBalance: 1e6, nonRegCostBasis: 1e6 })), 80);
    const rem = r.netToHeirs - 350000;
    expect(r.distribution.spouse).toBe(Math.round(350000 + rem * 0.5));
    expect(r.distribution.children).toBe(Math.round(rem * 0.5));
  });
  it('spouse + 2 children: $350K pref + 1/3 remainder', () => {
    const r = calcEstateImpact(mkSc(true, 2), wrap(mockRow(80, { nonRegBalance: 1e6, nonRegCostBasis: 1e6 })), 80);
    const rem = r.netToHeirs - 350000;
    expect(r.distribution.spouse).toBe(Math.round(350000 + rem / 3));
    expect(r.distribution.children).toBe(Math.round(rem - rem / 3));
  });
  it('spouse, no children: spouse gets everything', () => {
    const r = calcEstateImpact(mkSc(true, 0), wrap(mockRow(80, { nonRegBalance: 500000, nonRegCostBasis: 500000 })), 80);
    expect(r.distribution.spouse).toBeCloseTo(r.netToHeirs, 0);
    expect(r.distribution.children).toBe(0);
  });
  it('no spouse, no children: all goes to other', () => {
    const r = calcEstateImpact(mkSc(false, 0), wrap(mockRow(80, { nonRegBalance: 200000, nonRegCostBasis: 200000 })), 80);
    expect(r.distribution.other).toBeCloseTo(r.netToHeirs, 0);
    expect(r.distribution.spouse).toBe(0);
  });
  it('small estate with spouse: preferential absorbs all', () => {
    const r = calcEstateImpact(mkSc(true, 2), wrap(mockRow(80, { nonRegBalance: 200000, nonRegCostBasis: 200000 })), 80);
    expect(r.distribution.spouse).toBeCloseTo(r.netToHeirs, 0);
    expect(r.distribution.children).toBe(0);
  });
});

// --- 6. Return value structure ---
describe('Return value structure', () => {
  const row = mockRow(85, { rrspBalance: 100000, tfsaBalance: 50000, nonRegBalance: 30000 });
  const r = calcEstateImpact(noEstateSc, wrap(row), 85);

  it('has all expected top-level keys', () => {
    for (const k of ['ageAtDeath', 'grossEstate', 'rrspRrifDeemed', 'capitalGainsTax',
      'probateFees', 'totalEstateTax', 'netToHeirs', 'breakdown', 'distribution']) {
      expect(r).toHaveProperty(k);
    }
    expect(r.ageAtDeath).toBe(85);
  });
  it('breakdown is non-empty array of {label, amount}', () => {
    expect(r.breakdown.length).toBeGreaterThan(0);
    r.breakdown.forEach(b => { expect(b).toHaveProperty('label'); expect(b).toHaveProperty('amount'); });
  });
  it('totalEstateTax = deemedIncomeTax + capitalGainsTax + probateFees', () => {
    const sum = r.deemedIncomeTax + r.capitalGainsTax + r.probateFees;
    expect(Math.abs(r.totalEstateTax - sum)).toBeLessThanOrEqual(2);
  });
  it('netToHeirs = grossEstate - totalEstateTax', () => {
    expect(r.netToHeirs).toBe(r.grossEstate - r.totalEstateTax);
  });
  it('distribution sums to netToHeirs', () => {
    const d = r.distribution;
    expect(d.spouse + d.children + d.other).toBeCloseTo(r.netToHeirs, 0);
  });
  it('falls back to last row when ageAtDeath not found', () => {
    const r2 = calcEstateImpact(noEstateSc, wrap(row), 999);
    expect(r2.ageAtDeath).toBe(999);
    expect(r2.grossEstate).toBe(r.grossEstate);
  });
});

// --- 7. Capital gains tiered inclusion ---
describe('Capital gains tiered inclusion', () => {
  it('gain under $250K uses 50% inclusion', () => {
    const r = calcEstateImpact(noEstateSc, wrap(mockRow(80, { nonRegBalance: 200000, nonRegCostBasis: 0 })), 80);
    expect(r.capitalGainsTax).toBeGreaterThan(0);
  });
  it('gain above $250K uses enhanced 66.7% on excess', () => {
    const rSmall = calcEstateImpact(noEstateSc, wrap(mockRow(80, { nonRegBalance: 250000, nonRegCostBasis: 0 })), 80);
    const rBig = calcEstateImpact(noEstateSc, wrap(mockRow(80, { nonRegBalance: 500000, nonRegCostBasis: 0 })), 80);
    // Enhanced rate makes big gain more than 1.5x the small gain's tax
    expect(rBig.capitalGainsTax).toBeGreaterThan(rSmall.capitalGainsTax * 1.5);
  });
});

// --- 8. Primary residence exemption ---
describe('Primary residence exemption', () => {
  const base = { ...noEstateSc, includeRealEstateInEstate: true, realEstateValue: 500000, estimatedCostBasis: 200000 };

  it('primary residence: no capital gains on real estate', () => {
    const r = calcEstateImpact({ ...base, realEstateIsPrimary: true }, wrap(mockRow(80)), 80);
    expect(r.capitalGainsTax).toBe(0);
  });
  it('non-primary residence: capital gains apply', () => {
    const r = calcEstateImpact({ ...base, realEstateIsPrimary: false }, wrap(mockRow(80)), 80);
    expect(r.capitalGainsTax).toBeGreaterThan(0);
  });
});
