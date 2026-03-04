/**
 * Tests for audit sections 11-16 (dashboard KPIs, depletion, pre-retirement
 * health, inflation crosswalk, chart snapshots, AI context dump).
 */
import { describe, it, expect } from 'vitest';
import { projectScenario } from '../src/engines/projectionEngine.js';
import { createDefaultScenario } from '../src/constants/defaults.js';
import { auditDashboardSummary, auditDepletionAnalysis, auditPreRetirementHealth } from '../src/engines/auditDashboard.js';
import { auditInflationCrosswalk, auditChartSnapshots } from '../src/engines/auditCrosswalk.js';
import { generateAuditMarkdown } from '../src/utils/downloadAudit.js';

// -- Personas ---------------------------------------------------------------

function margaret() {
  return {
    ...createDefaultScenario('Margaret'),
    currentAge: 65, retirementAge: 65, lifeExpectancy: 90,
    rrspBalance: 300000, tfsaBalance: 80000,
    nonRegInvestments: 50000, nonRegCostBasis: 30000,
    cppMonthly: 1000, cppStartAge: 65, oasMonthly: 713, oasStartAge: 65,
    pensionType: 'db', dbPensionAnnual: 24000, dbPensionStartAge: 65, dbPensionIndexed: false,
    monthlyExpenses: 4500, realReturn: 0.04, inflationRate: 0.025,
    cashSavings: 0, otherAssets: 0, expenseReductionAtRetirement: 0,
  };
}

function frank() {
  return {
    ...createDefaultScenario('Frank'),
    currentAge: 63, retirementAge: 65, lifeExpectancy: 85,
    rrspBalance: 0, tfsaBalance: 10000,
    nonRegInvestments: 60000, nonRegCostBasis: 40000,
    cppMonthly: 600, cppStartAge: 60, oasMonthly: 500, oasStartAge: 65,
    pensionType: 'none', monthlyExpenses: 3000, realReturn: 0.04, inflationRate: 0.025,
    mortgageBalance: 50000, mortgageRate: 0.05, mortgageYearsLeft: 10,
    cashSavings: 0, otherAssets: 0, expenseReductionAtRetirement: 0,
  };
}

function rajesh() {
  return {
    ...createDefaultScenario('Rajesh'),
    currentAge: 55, retirementAge: 65, lifeExpectancy: 90,
    employmentIncome: 120000, rrspBalance: 500000, tfsaBalance: 120000,
    nonRegInvestments: 200000, nonRegCostBasis: 120000,
    cppMonthly: 1365, cppStartAge: 65, oasMonthly: 713, oasStartAge: 65,
    pensionType: 'none', monthlyExpenses: 5000, realReturn: 0.05, inflationRate: 0.025,
    cashSavings: 0, otherAssets: 0, expenseReductionAtRetirement: 0.1,
    realEstateValue: 800000, realEstateIsPrimary: true,
  };
}

// -- Tests ------------------------------------------------------------------

describe('Section 11: Dashboard Summary Cards', () => {
  it('produces markdown with all 5 KPI subsections', () => {
    const s = margaret();
    const proj = projectScenario(s);
    const md = auditDashboardSummary(s, proj);
    expect(md).toContain('## 11. Dashboard Summary Cards');
    expect(md).toContain('### NET WORTH');
    expect(md).toContain('### INCOME');
    expect(md).toContain('### TAX');
    expect(md).toContain('### SHORTFALL');
    expect(md).toContain('### SAFE MONTHLY SPENDING');
  });

  it('includes Portfolio (liquid) and Net Worth rows', () => {
    const s = rajesh();
    const proj = projectScenario(s);
    const md = auditDashboardSummary(s, proj);
    expect(md).toContain('Portfolio (liquid)');
    expect(md).toContain('Real Estate');
  });

  it("includes today's dollars for income sources", () => {
    const s = rajesh();
    const proj = projectScenario(s);
    const md = auditDashboardSummary(s, proj);
    expect(md).toContain("/mo");
    expect(md).toContain("Today's $/mo");
  });
});

describe('Section 12: Portfolio Depletion Analysis', () => {
  it('shows depletion details when portfolio depletes', () => {
    const s = frank();
    const proj = projectScenario(s);
    const md = auditDepletionAnalysis(s, proj);
    expect(md).toContain('## 12. Portfolio Depletion Analysis');
    // Frank has modest savings — likely depletes
    expect(md).toMatch(/Portfolio depleted\?/);
  });

  it('shows "Never" when portfolio survives', () => {
    const s = margaret();
    s.monthlyExpenses = 2000; // very low expenses
    const proj = projectScenario(s);
    const md = auditDepletionAnalysis(s, proj);
    expect(md).toContain('Never');
  });
});

describe('Section 13: Pre-Retirement Health', () => {
  it('shows working year metrics for Rajesh (10 working years)', () => {
    const s = rajesh();
    const proj = projectScenario(s);
    const md = auditPreRetirementHealth(s, proj);
    expect(md).toContain('## 13. Pre-Retirement Financial Health');
    expect(md).toContain('10 years');
    expect(md).toContain('Average annual net cash flow');
  });

  it('shows "Already retired" for Margaret (currentAge = retirementAge)', () => {
    const s = margaret();
    const proj = projectScenario(s);
    const md = auditPreRetirementHealth(s, proj);
    expect(md).toContain('Already retired');
  });
});

describe('Section 14: Inflation Crosswalk', () => {
  it('shows inflation rate and user inputs', () => {
    const s = rajesh();
    const proj = projectScenario(s);
    const md = auditInflationCrosswalk(s, proj);
    expect(md).toContain('## 14. Inflation Crosswalk');
    expect(md).toContain('2.5%');
    expect(md).toContain('Monthly Expenses');
    expect(md).toContain('CPP');
    expect(md).toContain('OAS');
  });

  it('skips crosswalk when inflation is 0', () => {
    const s = rajesh();
    s.inflationRate = 0;
    const proj = projectScenario(s);
    const md = auditInflationCrosswalk(s, proj);
    expect(md).toContain('Inflation rate is 0%');
  });
});

describe('Section 15: Chart Tooltip Snapshots', () => {
  it('produces snapshots at key ages', () => {
    const s = rajesh();
    const proj = projectScenario(s);
    const md = auditChartSnapshots(s, proj);
    expect(md).toContain('## 15. Chart Tooltip Snapshots');
    expect(md).toContain(`Age ${s.retirementAge}`);
    expect(md).toContain('Age 72');
    expect(md).toContain('Portfolio');
  });

  it('labels retirement and RRIF conversion ages', () => {
    const s = rajesh();
    const proj = projectScenario(s);
    const md = auditChartSnapshots(s, proj);
    expect(md).toContain('Retirement');
    expect(md).toContain('RRIF Conversion');
  });
});

describe('Full audit integration', () => {
  it('generateAuditMarkdown includes all 17 sections', () => {
    const s = rajesh();
    const proj = projectScenario(s);
    const md = generateAuditMarkdown(s, proj);
    expect(md).toContain('## 1.');
    expect(md).toContain('## 11. Dashboard Summary Cards');
    expect(md).toContain('## 12. Portfolio Depletion Analysis');
    expect(md).toContain('## 13. Pre-Retirement Financial Health');
    expect(md).toContain('## 14. Inflation Crosswalk');
    expect(md).toContain('## 15. Chart Tooltip Snapshots');
    expect(md).toContain('## 16. AI Insights Context Dump');
    expect(md).toContain('## 17. Optimizer Recommendations');
  });

  it('AI context dump contains expected variables', () => {
    const s = rajesh();
    const proj = projectScenario(s);
    const md = generateAuditMarkdown(s, proj);
    expect(md).toContain('currentAge');
    expect(md).toContain('retirementAge');
    expect(md).toContain('sustainableMonthly');
    expect(md).toContain('depletionAge');
  });
});
