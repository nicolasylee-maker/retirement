/**
 * Phase 2 TDD: Province-aware engine tests.
 * All province-specific tests MUST FAIL until Phase 3 implements the functions.
 * Backward-compat tests (ON default) may already pass.
 */

import { describe, it, expect } from 'vitest';
import {
  calcProvincialTax,   // NEW — not yet exported; will be undefined until Phase 3
  calcTotalTax,
  calcMarginalRate,
} from '../src/engines/taxEngine.js';
import {
  calcEstateImpact,
  calcProvincialProbateFees, // NEW — not yet exported; will be undefined until Phase 3
} from '../src/engines/estateEngine.js';
import { calcGainsBenefit } from '../src/engines/incomeHelpers.js';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------
function mkRow(age, overrides = {}) {
  return {
    age, rrspBalance: 0, tfsaBalance: 0, nonRegBalance: 0, otherBalance: 0,
    nonRegCostBasis: 0, mortgageBalance: 0, cppIncome: 0, oasIncome: 0, pensionIncome: 0,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// 1. calcProvincialTax — new function (currently undefined → TypeError)
// ---------------------------------------------------------------------------

describe('calcProvincialTax — BC', () => {
  // BC 2025: [0-49279@5.06%, 49279-98560@7.70%]; BPA=12932 creditRate=5.06%
  it('$80K, no credits: raw 4859 minus BPA credit 654 ≈ 4205', () => {
    // 49279*0.0506 + 30721*0.077 = 2493.52 + 2365.52 = 4859.04; credit 12932*0.0506 = 654.36
    expect(calcProvincialTax('BC', 80000)).toBeCloseTo(4205, 0);
  });
  it('below BC BPA ($12,932) returns $0', () => {
    expect(calcProvincialTax('BC', 12932)).toBe(0);
  });
  it('$0 income returns $0', () => {
    expect(calcProvincialTax('BC', 0)).toBe(0);
  });
});

describe('calcProvincialTax — AB', () => {
  // AB 2025: [0-60000@8%]; BPA=22323 creditRate=8%
  it('$50K, no credits: 4000 raw minus BPA credit 1786 ≈ 2214', () => {
    expect(calcProvincialTax('AB', 50000)).toBeCloseTo(2214, 0);
  });
  it('$50K age 70: age credit partially reduces tax', () => {
    // ageAmt=6221; clawback=(50000-46308)*0.15=553.8; net=5667.2; credit=(22323+5667.2)*0.08=2239.22; net tax≈1761
    expect(calcProvincialTax('AB', 50000, { age: 70 })).toBeCloseTo(1761, 0);
  });
  it('$30K < ON at same income (large $22K BPA + low-bracket 8% favours lower incomes)', () => {
    // AB: 30000*0.08=2400; credit=22323*0.08=1786; net=614
    // ON: 30000*0.0505=1515; credit=12747*0.0505=644; net=871
    expect(calcProvincialTax('AB', 30000)).toBeLessThan(calcProvincialTax('ON', 30000));
  });
});

describe('calcProvincialTax — NS (no age amount clawback, NS Budget 2025)', () => {
  // NS 2025: ageIncomeThreshold=null → full $5,734 age amount regardless of income
  it('$80K age 70: age credit = full $5,734 × creditRate (no income test)', () => {
    // raw: 30507*0.0879 + 30508*0.1495 + 18985*0.1667 ≈ 10407
    // credits: (11744+5734)*0.0879 = 1536; net ≈ 8871
    expect(calcProvincialTax('NS', 80000, { age: 70 })).toBeCloseTo(8871, 0);
  });
  it('NS age benefit is same at $120K as at $60K (no clawback unlike ON/BC/AB)', () => {
    const benefit60k = calcProvincialTax('NS', 60000, { age: 60 }) - calcProvincialTax('NS', 60000, { age: 70 });
    const benefit120k = calcProvincialTax('NS', 120000, { age: 60 }) - calcProvincialTax('NS', 120000, { age: 70 });
    expect(benefit120k).toBeCloseTo(benefit60k, 0);
  });
});

describe('calcProvincialTax — MB', () => {
  // MB 2025: [0-47000@10.80%, 47000-100000@12.75%]; BPA=15780 creditRate=10.80%
  it('$80K, no credits ≈ 7579', () => {
    // 47000*0.108 + 33000*0.1275 = 5076 + 4207.5 = 9283.5; credit 15780*0.108=1704.24; net≈7579
    expect(calcProvincialTax('MB', 80000)).toBeCloseTo(7579, 0);
  });
});

describe("calcProvincialTax — ON backward compat (province='ON' matches legacy calcOntarioTax)", () => {
  it("$50K age 70 pension → same as legacy calcOntarioTax result ($1,505.83)", () => {
    expect(calcProvincialTax('ON', 50000, { age: 70, hasPensionIncome: true })).toBeCloseTo(1505.83, 0);
  });
  it("$30K no credits → same as legacy result (~$871)", () => {
    expect(calcProvincialTax('ON', 30000)).toBeCloseTo(871.28, 0);
  });
});

// ---------------------------------------------------------------------------
// 2. calcTotalTax — extended with province param (4th argument)
// ---------------------------------------------------------------------------

describe('calcTotalTax with province param', () => {
  it("backward compat: 3-arg form still works (defaults to ON)", () => {
    // calcTotalTax(income, age, hasPensionIncome) — no province arg
    expect(calcTotalTax(50000, 70, true)).toBeCloseTo(1505.83 + 3409.63, 0);
  });
  it("AB $30K lower than ON $30K total (large AB BPA wins at low income)", () => {
    expect(calcTotalTax(30000, 0, false, 'AB')).toBeLessThan(calcTotalTax(30000, 0, false, 'ON'));
  });
  it("BC $60K differs from ON $60K (different provincial brackets)", () => {
    const bcTotal = calcTotalTax(60000, 0, false, 'BC');
    const onTotal = calcTotalTax(60000, 0, false, 'ON');
    expect(bcTotal).not.toBeCloseTo(onTotal, 0);
  });
  it("zero income returns $0 for every province", () => {
    for (const prov of ['ON', 'BC', 'AB', 'SK', 'MB', 'NB', 'NS', 'NL', 'PE']) {
      expect(calcTotalTax(0, 0, false, prov)).toBe(0);
    }
  });
  it("incremental deemed income differs by province (AB vs ON at $50K base + $100K deemed)", () => {
    const abDeemed = calcTotalTax(150000, 0, false, 'AB') - calcTotalTax(50000, 0, false, 'AB');
    const onDeemed = calcTotalTax(150000, 0, false, 'ON') - calcTotalTax(50000, 0, false, 'ON');
    expect(abDeemed).not.toBeCloseTo(onDeemed, 0);
  });
});

// ---------------------------------------------------------------------------
// 3. calcMarginalRate — extended with province param
// ---------------------------------------------------------------------------

describe('calcMarginalRate with province param', () => {
  it("default province is ON for backward compat", () => {
    // No province arg: should equal explicit 'ON'
    expect(calcMarginalRate(30000)).toBeCloseTo(calcMarginalRate(30000, 'ON'), 6);
  });
  it("ON $30K unchanged: 14.5% fed + 5.05% ON = 19.55%", () => {
    expect(calcMarginalRate(30000, 'ON')).toBeCloseTo(0.1955, 4);
  });
  it("AB $50K: 14.5% fed + 8% AB = 22.5%", () => {
    expect(calcMarginalRate(50000, 'AB')).toBeCloseTo(0.225, 3);
  });
  it("MB $30K: 14.5% fed + 10.8% MB = 25.3%", () => {
    expect(calcMarginalRate(30000, 'MB')).toBeCloseTo(0.253, 3);
  });
  it("BC $60K: 20.5% fed + 7.7% BC = 28.2%", () => {
    expect(calcMarginalRate(60000, 'BC')).toBeCloseTo(0.282, 3);
  });
  it("zero income returns 0 for all provinces", () => {
    for (const prov of ['BC', 'AB', 'MB', 'SK']) {
      expect(calcMarginalRate(0, prov)).toBe(0);
    }
  });
  it("marginal rates increase at bracket boundaries for BC", () => {
    expect(calcMarginalRate(60000, 'BC')).toBeGreaterThan(calcMarginalRate(30000, 'BC'));
  });
});

// ---------------------------------------------------------------------------
// 4. calcProvincialProbateFees — new export (currently undefined → TypeError)
// ---------------------------------------------------------------------------

describe('calcProvincialProbateFees', () => {
  it('ON: $100K → $1,000 (Ontario EAT: $5/$1K first $50K, $15/$1K above)', () => {
    expect(calcProvincialProbateFees(100000, 'ON')).toBe(1000);
  });
  it('ON: $0 → $0', () => {
    expect(calcProvincialProbateFees(0, 'ON')).toBe(0);
  });
  it('BC: $20K → $0 (first $25K is free)', () => {
    expect(calcProvincialProbateFees(20000, 'BC')).toBe(0);
  });
  it('BC: $100K → $850 (0 on first $25K; $6/$1K on $25K-$50K; $14/$1K above)', () => {
    // 0 + 25000*6/1000 + 50000*14/1000 = 0 + 150 + 700 = 850
    expect(calcProvincialProbateFees(100000, 'BC')).toBeCloseTo(850, 0);
  });
  it('AB: $30K → $275 (flat tier: $30K falls in upTo $125K tier)', () => {
    expect(calcProvincialProbateFees(30000, 'AB')).toBe(275);
  });
  it('AB: $200K → $400 (flat tier: upTo $250K)', () => {
    expect(calcProvincialProbateFees(200000, 'AB')).toBe(400);
  });
  it('AB: $600K → $525 (flat tier: above $250K)', () => {
    expect(calcProvincialProbateFees(600000, 'AB')).toBe(525);
  });
  it('MB: any estate → $0 (eliminated November 2020)', () => {
    expect(calcProvincialProbateFees(500000, 'MB')).toBe(0);
    expect(calcProvincialProbateFees(0, 'MB')).toBe(0);
  });
  it('SK: $100K → $700 (per_thousand: $7 per $1K)', () => {
    expect(calcProvincialProbateFees(100000, 'SK')).toBeCloseTo(700, 0);
  });
  it('SK: $0 → $0', () => {
    expect(calcProvincialProbateFees(0, 'SK')).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 5. Province-aware calcEstateImpact — probate fees via scenario.province
// ---------------------------------------------------------------------------

describe('calcEstateImpact — province-aware probate', () => {
  const baseSc = (province) => ({
    province, primaryBeneficiary: 'estate', isCouple: false, hasWill: true,
    numberOfChildren: 1, includeRealEstateInEstate: false, nonRegCostBasis: 0,
  });
  // $100K non-reg with full cost basis → $0 gain → all probate differences visible
  const row100k = mkRow(80, { nonRegBalance: 100000, nonRegCostBasis: 100000 });

  it('MB: $100K estate → $0 probate', () => {
    expect(calcEstateImpact(baseSc('MB'), [row100k], 80).probateFees).toBe(0);
  });
  it('BC: $100K estate → $850 probate (tiered, free first $25K)', () => {
    expect(calcEstateImpact(baseSc('BC'), [row100k], 80).probateFees).toBeCloseTo(850, 0);
  });
  it('AB: $30K estate → $275 probate (flat fee schedule)', () => {
    const row30k = mkRow(80, { nonRegBalance: 30000, nonRegCostBasis: 30000 });
    expect(calcEstateImpact(baseSc('AB'), [row30k], 80).probateFees).toBe(275);
  });
  it('SK: $100K estate → $700 probate ($7 per $1K)', () => {
    expect(calcEstateImpact(baseSc('SK'), [row100k], 80).probateFees).toBeCloseTo(700, 0);
  });
  it('ON backward compat: scenario without province field → ON probate ($1,000)', () => {
    const scNoProvince = { ...baseSc('ON') };
    delete scNoProvince.province;
    expect(calcEstateImpact(scNoProvince, [row100k], 80).probateFees).toBe(1000);
  });
});

// ---------------------------------------------------------------------------
// 6. Province-aware calcEstateImpact — intestacy distribution
// ---------------------------------------------------------------------------

describe('calcEstateImpact — province-aware intestacy', () => {
  const intestateSc = (province) => ({
    province, primaryBeneficiary: 'estate', isCouple: true, hasWill: false,
    numberOfChildren: 2, includeRealEstateInEstate: false, nonRegCostBasis: 0,
  });

  it('AB: spouse gets 1/2 remainder (AB law: always 50%, not 1/3 for 2+ children)', () => {
    const row = mkRow(80, { nonRegBalance: 500000, nonRegCostBasis: 500000 });
    const r = calcEstateImpact(intestateSc('AB'), [row], 80);
    // AB pref share = $150K; remainder gets 50% to spouse
    const prefShare = 150000;
    const remainder = r.netToHeirs - prefShare;
    expect(r.distribution.spouse).toBe(Math.round(prefShare + remainder * 0.5));
  });

  it('BC: preferential share = $300K (not $350K as in ON)', () => {
    const row = mkRow(80, { nonRegBalance: 800000, nonRegCostBasis: 800000 });
    const rBC = calcEstateImpact(intestateSc('BC'), [row], 80);
    const rON = calcEstateImpact({ ...intestateSc('BC'), province: 'ON' }, [row], 80);
    // BC $300K pref share vs ON $350K → spouse amounts differ
    expect(rBC.distribution.spouse).not.toBe(rON.distribution.spouse);
  });

  it('ON backward compat: 2 children → spouse gets 1/3 remainder (SLRA unchanged)', () => {
    const row = mkRow(80, { nonRegBalance: 800000, nonRegCostBasis: 800000 });
    const r = calcEstateImpact(intestateSc('ON'), [row], 80);
    const prefShare = 350000;
    const remainder = r.netToHeirs - prefShare;
    expect(r.distribution.spouse).toBe(Math.round(prefShare + remainder / 3));
  });
});

// ---------------------------------------------------------------------------
// 7. calcGainsBenefit — province gating (Ontario GAINS is ON-only)
// ---------------------------------------------------------------------------

describe('calcGainsBenefit — province gating', () => {
  it('backward compat: no province arg → ON → positive benefit', () => {
    expect(calcGainsBenefit(70, 500)).toBeGreaterThan(0);
  });
  it("ON: age 70, low income → positive GAINS benefit", () => {
    expect(calcGainsBenefit(70, 500, 'ON')).toBeGreaterThan(0);
  });
  it("BC: age 70, low income → $0 (GAINS is Ontario-only)", () => {
    expect(calcGainsBenefit(70, 500, 'BC')).toBe(0);
  });
  it("AB: age 70, low income → $0 (GAINS is Ontario-only)", () => {
    expect(calcGainsBenefit(70, 500, 'AB')).toBe(0);
  });
  it("MB: age 70, low income → $0 (GAINS is Ontario-only)", () => {
    expect(calcGainsBenefit(70, 500, 'MB')).toBe(0);
  });
  it("ON: below age 65 → $0 (age requirement unchanged)", () => {
    expect(calcGainsBenefit(64, 500, 'ON')).toBe(0);
  });
});
