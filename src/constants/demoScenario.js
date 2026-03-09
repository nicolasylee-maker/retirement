import { projectScenario } from '../engines/projectionEngine';

// Sophie Martin — made-up Ontario retiree used for the landing page interactive demo.
// Computed once at module load; never re-run during renders.
export const DEMO_SCENARIO = {
  id: 'demo',
  name: 'Sophie Martin',
  createdAt: '2026-03-02T00:00:00.000Z',

  // Personal
  province: 'ON',
  currentAge: 64,
  retirementAge: 68,
  lifeExpectancy: 95,
  isCouple: false,
  spouseAge: 60,
  spouseRetirementAge: 65,
  spouseEmploymentIncome: 0,
  spouseStillWorking: true,

  // Pre-retirement income
  stillWorking: true,
  employmentIncome: 68000,
  nonTaxedIncome: 0,
  nonTaxedIncomeStartAge: 64,
  nonTaxedIncomeEndAge: 95,

  // Government benefits (deferred to 68)
  cppMonthly: 980,
  cppStartAge: 68,
  oasMonthly: 713,
  oasStartAge: 68,
  gisEligible: false,
  gainsEligible: false,
  spouseCppMonthly: 0,
  spouseCppStartAge: 65,
  spouseOasMonthly: 0,
  spouseOasStartAge: 65,

  // Pensions
  pensionType: 'none',
  dbPensionAnnual: 0,
  dbPensionStartAge: 65,
  dbPensionIndexed: false,
  dcPensionBalance: 0,
  liraBalance: 0,
  spousePensionType: 'none',
  spouseDbPensionAnnual: 0,
  spouseDbPensionStartAge: 65,
  spouseDbPensionIndexed: false,
  spouseDcPensionBalance: 0,

  // Registered savings
  rrspBalance: 315000,
  rrspContributionRoom: 18000,
  tfsaBalance: 95000,
  tfsaContributionRoom: 6000,
  rrifBalance: 0,
  otherRegisteredBalance: 0,
  spouseRrspBalance: 0,
  spouseRrifBalance: 0,
  spouseTfsaBalance: 0,
  spouseTfsaContributionRoom: 0,

  // Other assets
  cashSavings: 48000,
  nonRegInvestments: 0,
  nonRegCostBasis: 0,
  realEstateValue: 900000,
  realEstateIsPrimary: true,
  otherAssets: 0,

  // Liabilities (debt-free)
  mortgageBalance: 0,
  mortgageRate: 0.05,
  mortgageYearsLeft: 0,
  consumerDebt: 0,
  consumerDebtRate: 0.08,
  consumerDebtPayoffAge: 70,
  otherDebt: 0,

  // Expenses & assumptions
  monthlyExpenses: 4600,
  expenseReductionAtRetirement: 0.05,
  inflationRate: 0.025,
  realReturn: 0.04,
  tfsaReturn: 0.04,
  nonRegReturn: 0.04,

  // Withdrawal strategy — RRSP meltdown ages 70–71
  withdrawalOrder: ['nonReg', 'rrsp', 'tfsa', 'other'],
  rrspMeltdownEnabled: true,
  rrspMeltdownStartAge: 70,
  rrspMeltdownTargetAge: 71,
  rrspMeltdownAnnual: 42000,

  // Estate
  hasWill: true,
  primaryBeneficiary: 'spouse',
  numberOfChildren: 2,
  estimatedCostBasis: 0,
  includeRealEstateInEstate: true,
};

export const DEMO_PROJECTION = projectScenario(DEMO_SCENARIO);
