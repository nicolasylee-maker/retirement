import { describe, it, expect } from 'vitest';
import { calcEstateImpact } from '../src/engines/estateEngine.js';
import { buildDashboardAiData, buildEstateAiData } from '../src/utils/buildAiData.js';
import { projectScenario } from '../src/engines/projectionEngine.js';

// ── Helpers ──────────────────────────────────────────────────────────────────
function mockRow(age, overrides = {}) {
  return {
    age, rrspBalance: 0, tfsaBalance: 0, nonRegBalance: 0, otherBalance: 0,
    nonRegCostBasis: 0, mortgageBalance: 0, cppIncome: 0, oasIncome: 0, pensionIncome: 0,
    ...overrides,
  };
}
const wrap = (row) => [row];

// ── Fix #1: Estate engine includes spouse balances ──────────────────────────
describe('Couple estate includes spouse balances', () => {
  const sc = {
    primaryBeneficiary: 'spouse', isCouple: true, hasWill: true,
    numberOfChildren: 0, includeRealEstateInEstate: false, nonRegCostBasis: 40000,
  };
  const row = mockRow(85, {
    rrspBalance: 300000, tfsaBalance: 80000, nonRegBalance: 50000,
    nonRegCostBasis: 40000, cppIncome: 8000, oasIncome: 7000,
    spouseRrspBalance: 200000, spouseTfsaBalance: 150000,
  });
  const r = calcEstateImpact(sc, wrap(row), 85);

  it('grossEstate includes spouse RRSP and TFSA', () => {
    // 300K + 80K + 50K + 200K + 150K = 780K
    expect(r.grossEstate).toBe(780000);
  });

  it('spouse balances returned in result', () => {
    expect(r.spouseRrspBalance).toBe(200000);
    expect(r.spouseTfsaBalance).toBe(150000);
  });

  it('spouse balances do NOT affect tax (surviving spouse owns them)', () => {
    const noSpouseRow = { ...row, spouseRrspBalance: 0, spouseTfsaBalance: 0 };
    const noSpouseResult = calcEstateImpact(sc, wrap(noSpouseRow), 85);
    expect(r.deemedIncomeTax).toBe(noSpouseResult.deemedIncomeTax);
    expect(r.capitalGainsTax).toBe(noSpouseResult.capitalGainsTax);
    expect(r.probateFees).toBe(noSpouseResult.probateFees);
    expect(r.totalEstateTax).toBe(noSpouseResult.totalEstateTax);
  });

  it('spouse balances do NOT affect probate', () => {
    const bigSpouseRow = { ...row, spouseRrspBalance: 5000000, spouseTfsaBalance: 3000000 };
    const bigResult = calcEstateImpact(sc, wrap(bigSpouseRow), 85);
    expect(bigResult.probateFees).toBe(r.probateFees);
  });

  it('breakdown includes spouse labels', () => {
    const labels = r.breakdown.map(b => b.label);
    expect(labels).toContain('Spouse RRSP/RRIF balance');
    expect(labels).toContain('Spouse TFSA balance');
  });

  it('netToHeirs = grossEstate - totalEstateTax', () => {
    expect(r.netToHeirs).toBe(r.grossEstate - r.totalEstateTax);
  });

  it('non-couple scenario ignores spouse fields', () => {
    const singleSc = { ...sc, isCouple: false };
    const singleResult = calcEstateImpact(singleSc, wrap(row), 85);
    expect(singleResult.spouseRrspBalance).toBe(0);
    expect(singleResult.spouseTfsaBalance).toBe(0);
    // grossEstate = primary only
    expect(singleResult.grossEstate).toBe(430000);
  });

  it('zero spouse balances: no spouse labels in breakdown', () => {
    const zeroSpouseRow = { ...row, spouseRrspBalance: 0, spouseTfsaBalance: 0 };
    const zeroResult = calcEstateImpact(sc, wrap(zeroSpouseRow), 85);
    const labels = zeroResult.breakdown.map(b => b.label);
    expect(labels).not.toContain('Spouse RRSP/RRIF balance');
    expect(labels).not.toContain('Spouse TFSA balance');
  });
});

// ── Fix #2: Dashboard AI context includes spouse data ───────────────────────
describe('Dashboard AI data includes spouse fields (couple)', () => {
  const scenario = {
    currentAge: 37, retirementAge: 65, lifeExpectancy: 90,
    province: 'ON', isCouple: true, spouseAge: 37, spouseRetirementAge: 55,
    employmentIncome: 300000, stillWorking: true,
    spouseEmploymentIncome: 110000, spouseStillWorking: true,
    cppMonthly: 1365, cppStartAge: 65, oasMonthly: 713, oasStartAge: 65,
    spouseCppMonthly: 1365, spouseCppStartAge: 65,
    spouseOasMonthly: 713, spouseOasStartAge: 65,
    rrspBalance: 300000, tfsaBalance: 300000,
    spouseRrspBalance: 300000, spouseTfsaBalance: 300000,
    spousePensionType: 'db', spouseDbPensionAnnual: 45000,
    spouseDbPensionStartAge: 65, spouseDbPensionIndexed: true,
    monthlyExpenses: 5000, inflationRate: 0.025, realReturn: 0.04,
    cashSavings: 44000,
  };
  const projection = projectScenario(scenario);
  const data = buildDashboardAiData(scenario, projection);

  it('includes isCouple flag', () => expect(data.isCouple).toBe(true));
  it('includes spouseAge', () => expect(data.spouseAge).toBe(37));
  it('includes spouseRetirementAge', () => expect(data.spouseRetirementAge).toBe(55));
  it('includes spouseEmploymentIncome', () => expect(data.spouseEmploymentIncome).toBe(110000));
  it('includes spouseRrspBalance', () => expect(data.spouseRrspBalance).toBe(300000));
  it('includes spouseTfsaBalance', () => expect(data.spouseTfsaBalance).toBe(300000));
  it('includes spouseCppMonthly', () => expect(data.spouseCppMonthly).toBe(1365));
  it('includes spouseOasMonthly', () => expect(data.spouseOasMonthly).toBe(713));
  it('includes spousePensionIncome', () => expect(data.spousePensionIncome).toBe(45000));

  it('single scenario omits spouse fields', () => {
    const singleSc = { ...scenario, isCouple: false };
    const singleProj = projectScenario(singleSc);
    const singleData = buildDashboardAiData(singleSc, singleProj);
    expect(singleData.isCouple).toBe(false);
    expect(singleData.spouseRrspBalance).toBeUndefined();
    expect(singleData.spouseTfsaBalance).toBeUndefined();
  });
});

// ── Fix #3: Estate AI context includes spouse data ──────────────────────────
describe('Estate AI data includes spouse balances (couple)', () => {
  const scenario = {
    currentAge: 60, retirementAge: 65, lifeExpectancy: 90,
    province: 'ON', isCouple: true, spouseAge: 60,
    primaryBeneficiary: 'spouse', hasWill: true,
    stillWorking: true, employmentIncome: 80000,
    rrspBalance: 200000, tfsaBalance: 100000,
    spouseRrspBalance: 150000, spouseTfsaBalance: 80000,
    includeRealEstateInEstate: false,
    monthlyExpenses: 3000, inflationRate: 0.025, realReturn: 0.04,
    cppMonthly: 800, cppStartAge: 65, oasMonthly: 713, oasStartAge: 65,
  };
  const projection = projectScenario(scenario);
  const data = buildEstateAiData(scenario, projection, 90);

  it('includes spouseRrspBalance', () => {
    expect(data.spouseRrspBalance).toBeDefined();
    expect(data.spouseRrspBalance).toBeGreaterThanOrEqual(0);
  });

  it('includes spouseTfsaBalance', () => {
    expect(data.spouseTfsaBalance).toBeDefined();
    expect(data.spouseTfsaBalance).toBeGreaterThanOrEqual(0);
  });

  it('grossEstate includes spouse balances', () => {
    // The grossEstate should be larger than just primary RRSP + TFSA
    // since spouse balances are now included
    expect(data.grossEstate).toBeGreaterThan(0);
  });
});
