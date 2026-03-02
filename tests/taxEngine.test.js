import { describe, it, expect } from 'vitest';
import {
  calcFederalTax, calcOntarioTax, calcTotalTax,
  calcOasClawback, calcRrifMinimum, calcMarginalRate, calcTaxOnDeemedIncome,
} from '../src/engines/taxEngine.js';

// Personas
const Margaret = { age: 70, hasPensionIncome: true };   // $50K, age+pension credits
const Frank    = { age: 63, hasPensionIncome: false };   // $30K, basic personal only
const Rajesh   = { age: 72, hasPensionIncome: true };    // $120K, OAS clawback zone
const Winnie   = { age: 68, hasPensionIncome: true };    // $250K, top brackets + surtax
const Louise   = { age: 66, hasPensionIncome: false };   // $15K, below basic personal

// --- calcFederalTax --------------------------------------------------------
// 2025: first bracket 14.5%, BPA $16,129, age amount $9,028 @ $45,522 threshold
describe('calcFederalTax', () => {
  it('Margaret (70, $50K, pension): age + pension credits reduce tax', () => {
    // gross=50000*0.145=7250; ageAmt=9028-(50000-45522)*0.15=8356.30
    // credits=(16129+8356.30+2000)*0.145=3840.37; tax=7250-3840.37=3409.63
    expect(calcFederalTax(50000, Margaret)).toBeCloseTo(3409.63, 0);
  });
  it('Frank (63, $30K, no pension): basic personal only, no age credit', () => {
    // gross=4350; credits=16129*0.145=2338.71; tax=2011.29
    expect(calcFederalTax(30000, Frank)).toBeCloseTo(2011.30, 0);
  });
  it('Rajesh (72, $120K, pension): spans two brackets, age credit fully clawed back', () => {
    // Age fully clawed back at $105,709 ($45,522 + $9,028/0.15). Credits=pension+BPA only.
    expect(calcFederalTax(120000, Rajesh)).toBeCloseTo(18817.55, 0);
  });
  it('Winnie (68, $250K, pension): hits 4th bracket (29%) — not top bracket', () => {
    // $250K < $253,414 (top bracket threshold)
    expect(calcFederalTax(250000, Winnie)).toBeCloseTo(54781.08, 0);
  });
  it('Louise (66, $15K): below basic personal = $0', () => {
    expect(calcFederalTax(15000, Louise)).toBe(0);
  });
  it('basic personal eliminates tax on first $16,129 exactly', () => {
    expect(calcFederalTax(16129)).toBe(0);
    expect(calcFederalTax(16130)).toBeGreaterThan(0);
  });
  it('zero and negative income return $0', () => {
    expect(calcFederalTax(0)).toBe(0);
    expect(calcFederalTax(-5000)).toBe(0);
  });
  it('bracket boundary at $57,375 steps from 14.5% to 20.5%', () => {
    const below = calcFederalTax(57375);
    const above = calcFederalTax(57376);
    expect(above - below).toBeCloseTo(0.205, 2);
  });
});

// --- calcOntarioTax --------------------------------------------------------
// 2025: brackets 0-52886@5.05%, 52886-105775@9.15%, ...; BPA $12,747; surtax $5,710/$7,307
describe('calcOntarioTax', () => {
  it('Margaret (70, $50K, pension): Ontario credits reduce tax', () => {
    // ageAmt=6223-(50000-46330)*0.15=5672.50; credits=(12747+5672.50+1762)*0.0505=1019.17
    // basicTax=2525-1019.17=1505.83; below surtax threshold
    expect(calcOntarioTax(50000, Margaret)).toBeCloseTo(1505.83, 0);
  });
  it('Frank (63, $30K, no pension): basic personal only', () => {
    // basicTax=1515-643.72=871.28; below surtax threshold
    expect(calcOntarioTax(30000, Frank)).toBeCloseTo(871.28, 0);
  });
  it('Rajesh (72, $120K, pension): third bracket + surtax territory', () => {
    // Age fully clawed back at $87,817. basicTax=8364.89; surtax both tiers
    expect(calcOntarioTax(120000, Rajesh)).toBeCloseTo(9277, 0);
  });
  it('Winnie (68, $250K, pension): top bracket with full surtax', () => {
    expect(calcOntarioTax(250000, Winnie)).toBeCloseTo(33937, 0);
  });
  it('Louise (66, $15K): below basic personal with age credit = $0', () => {
    expect(calcOntarioTax(15000, Louise)).toBe(0);
  });
  it('Ontario basic personal eliminates tax on first $12,747', () => {
    expect(calcOntarioTax(12747)).toBe(0);
    expect(calcOntarioTax(12748)).toBeGreaterThan(0);
  });
  it('surtax is additive: 20% over $5,710 AND 36% over $7,307', () => {
    const tax100k = calcOntarioTax(100000);
    const tax150k = calcOntarioTax(150000);
    expect(tax150k).toBeGreaterThan(tax100k);
    expect(tax100k).toBeCloseTo(6464, 0);
    expect(tax150k).toBeCloseTo(14638, 0);
  });
  it('bracket boundary at $52,886 steps from 5.05% to 9.15%', () => {
    const below = calcOntarioTax(52886);
    const above = calcOntarioTax(52887);
    expect(above - below).toBeCloseTo(0.0915, 2);
  });
});

// --- calcTotalTax ----------------------------------------------------------
describe('calcTotalTax', () => {
  it('equals federal + Ontario for Margaret', () => {
    const fed = calcFederalTax(50000, Margaret);
    const ont = calcOntarioTax(50000, Margaret);
    expect(calcTotalTax(50000, 70, true)).toBeCloseTo(fed + ont, 2);
  });
  it('Winnie $250K combined tax is ~$88,718', () => {
    expect(calcTotalTax(250000, 68, true)).toBeCloseTo(88718, 0);
  });
  it('Louise $15K combined is $0', () => {
    expect(calcTotalTax(15000, 66, false)).toBe(0);
  });
  it('zero income returns $0', () => {
    expect(calcTotalTax(0)).toBe(0);
  });
  it('pension flag affects total (more credits = less tax)', () => {
    const withPension = calcTotalTax(50000, 70, true);
    const noPension   = calcTotalTax(50000, 70, false);
    expect(withPension).toBeLessThan(noPension);
  });
  it('age 65+ reduces tax vs age 64 at same income', () => {
    expect(calcTotalTax(80000, 65, false)).toBeLessThan(calcTotalTax(80000, 64, false));
  });
});

// --- calcOasClawback -------------------------------------------------------
// 2025: clawback threshold $93,454; max OAS $8,881/yr
describe('calcOasClawback', () => {
  it('no clawback at or below threshold ($93,454)', () => {
    expect(calcOasClawback(93454)).toBe(0);
    expect(calcOasClawback(50000)).toBe(0);
    expect(calcOasClawback(0)).toBe(0);
  });
  it('15% of income over $93,454', () => {
    // (100000 - 93454) * 0.15 = 981.90
    expect(calcOasClawback(100000)).toBeCloseTo(981.90, 2);
  });
  it('Rajesh ($120K): partial clawback', () => {
    // (120000 - 93454) * 0.15 = 3981.90
    expect(calcOasClawback(120000)).toBeCloseTo(3981.90, 2);
  });
  it('capped at max OAS ($8,881/yr)', () => {
    expect(calcOasClawback(200000)).toBe(8881);
    expect(calcOasClawback(300000)).toBe(8881);
  });
  it('$1 over threshold yields $0.15 clawback', () => {
    expect(calcOasClawback(93455)).toBeCloseTo(0.15, 2);
  });
  it('full repayment point caps at max OAS', () => {
    // Full repayment: 93454 + 8881/0.15 = ~152,661
    expect(calcOasClawback(152661)).toBe(8881);
  });
});

// --- calcRrifMinimum -------------------------------------------------------
describe('calcRrifMinimum', () => {
  it('age 71: 5.28% of balance', () => {
    expect(calcRrifMinimum(500000, 71)).toBeCloseTo(26400, 2);
  });
  it('age 80: 6.82% of balance', () => {
    expect(calcRrifMinimum(500000, 80)).toBeCloseTo(34100, 2);
  });
  it('age 95: 20% of balance', () => {
    expect(calcRrifMinimum(500000, 95)).toBeCloseTo(100000, 2);
  });
  it('age 100: uses 95+ rate (20%)', () => {
    expect(calcRrifMinimum(500000, 100)).toBeCloseTo(100000, 2);
  });
  it('under 71: uses 1/(90-age) formula', () => {
    // age 65: 1/25 = 4% -> 500000 * 0.04 = 20000
    expect(calcRrifMinimum(500000, 65)).toBeCloseTo(20000, 2);
  });
  it('zero or negative balance returns $0', () => {
    expect(calcRrifMinimum(0, 75)).toBe(0);
    expect(calcRrifMinimum(-100, 71)).toBe(0);
  });
  it('negative age returns $0', () => {
    expect(calcRrifMinimum(500000, -5)).toBe(0);
  });
  it('rates increase monotonically from 71 to 95', () => {
    let prev = calcRrifMinimum(100000, 71);
    for (let age = 72; age <= 95; age++) {
      const curr = calcRrifMinimum(100000, age);
      expect(curr).toBeGreaterThan(prev);
      prev = curr;
    }
  });
});

// --- calcMarginalRate ------------------------------------------------------
// 2025: first federal bracket 14.5%; ON surtax thresholds $5,710/$7,307
describe('calcMarginalRate', () => {
  it('$30K: 14.5% fed + 5.05% ont = 19.55%', () => {
    expect(calcMarginalRate(30000)).toBeCloseTo(0.1955, 4);
  });
  it('$60K: 20.5% fed + 9.15% ont = 29.65%', () => {
    expect(calcMarginalRate(60000)).toBeCloseTo(0.2965, 4);
  });
  it('$120K: 26% fed + surtax-adjusted ont', () => {
    expect(calcMarginalRate(120000)).toBeCloseTo(0.4341, 3);
  });
  it('$250K: 29% fed bracket + full surtax-adjusted ON (13.16% × 1.56)', () => {
    // fed=29%; ontRate=13.16%; surtaxMultiplier=1.56; total≈49.53%
    expect(calcMarginalRate(250000)).toBeCloseTo(0.4953, 3);
  });
  it('zero and negative income return 0', () => {
    expect(calcMarginalRate(0)).toBe(0);
    expect(calcMarginalRate(-1000)).toBe(0);
  });
  it('marginal rates increase at bracket boundaries', () => {
    const rate30  = calcMarginalRate(30000);
    const rate60  = calcMarginalRate(60000);
    const rate120 = calcMarginalRate(120000);
    const rate250 = calcMarginalRate(250000);
    expect(rate60).toBeGreaterThan(rate30);
    expect(rate120).toBeGreaterThan(rate60);
    expect(rate250).toBeGreaterThan(rate120);
  });
});

// --- calcTaxOnDeemedIncome -------------------------------------------------
describe('calcTaxOnDeemedIncome', () => {
  it('$100K deemed on top of $50K base (age 70)', () => {
    // total $150K tax (age 70, no pension) minus tax on $50K (age 70, no pension)
    expect(calcTaxOnDeemedIncome(50000, 100000, 70)).toBeCloseTo(36252, 0);
  });
  it('$50K deemed with $0 base equals total tax on $50K', () => {
    const deemed = calcTaxOnDeemedIncome(0, 50000, 0);
    const total  = calcTotalTax(50000, 0, false);
    expect(deemed).toBeCloseTo(total, 2);
  });
  it('zero deemed income returns $0', () => {
    expect(calcTaxOnDeemedIncome(50000, 0, 70)).toBe(0);
  });
  it('negative deemed income returns $0', () => {
    expect(calcTaxOnDeemedIncome(50000, -10000, 70)).toBe(0);
  });
  it('incremental tax is always >= 0', () => {
    expect(calcTaxOnDeemedIncome(100000, 50000, 65)).toBeGreaterThanOrEqual(0);
    expect(calcTaxOnDeemedIncome(0, 1000, 0)).toBeGreaterThanOrEqual(0);
  });
  it('higher deemed amount on same base yields more tax', () => {
    const small = calcTaxOnDeemedIncome(50000, 10000, 0);
    const large = calcTaxOnDeemedIncome(50000, 100000, 0);
    expect(large).toBeGreaterThan(small);
  });
});

// --- Age amount clawback ---------------------------------------------------
// 2025: federal threshold $45,522; Ontario threshold $46,330
describe('age amount clawback', () => {
  it('federal age amount reduces with income above $45,522', () => {
    const highIncome = calcFederalTax(100000, { age: 70 });
    const highNoAge  = calcFederalTax(100000, { age: 60 });
    expect(highIncome).toBeLessThan(highNoAge);
    // At $100K, age credit is partially clawed back so benefit < $1,500
    expect(highNoAge - highIncome).toBeLessThan(1500);
  });
  it('Ontario age amount reduces with income above $46,330', () => {
    const withAge = calcOntarioTax(60000, { age: 70 });
    const noAge   = calcOntarioTax(60000, { age: 60 });
    expect(withAge).toBeLessThan(noAge);
    // Benefit shrinks as income rises through clawback zone
    const benefit60k = calcOntarioTax(60000, { age: 60 }) - calcOntarioTax(60000, { age: 70 });
    const benefit80k = calcOntarioTax(80000, { age: 60 }) - calcOntarioTax(80000, { age: 70 });
    expect(benefit80k).toBeLessThan(benefit60k);
  });
  it('age 64 gets no age credit at either level', () => {
    expect(calcFederalTax(50000, { age: 64 })).toBe(calcFederalTax(50000, { age: 30 }));
  });
});
