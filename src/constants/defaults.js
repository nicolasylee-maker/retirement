export const STEP_LABELS = [
  'Personal Info',
  'Gov Benefits',
  'Pensions',
  'Savings',
  'Other Assets',
  'Liabilities',
  'Expenses',
  'Withdrawal',
  'Estate',
];

export const WIZARD_STEPS = STEP_LABELS.length;

export function createDefaultScenario(name = 'My Scenario') {
  return {
    id: crypto.randomUUID?.() || Math.random().toString(36).slice(2),
    name,
    createdAt: new Date().toISOString(),

    // Step 1: Personal
    province: 'ON',
    currentAge: 60,
    retirementAge: 65,
    lifeExpectancy: 90,
    isCouple: false,
    spouseAge: 60,
    spouseRetirementAge: 65,

    // Spouse employment income
    spouseEmploymentIncome: 0,
    spouseStillWorking: true,

    // Pre-retirement income
    stillWorking: true,
    employmentIncome: 50000, // Annual gross employment income before retirement

    // Non-taxed income (cash / informal)
    nonTaxedIncome: 0,
    nonTaxedIncomeStartAge: 60,
    nonTaxedIncomeEndAge: 90,

    // Step 2: Government Benefits
    cppMonthly: 800,
    cppStartAge: 65,
    oasMonthly: 713,
    oasStartAge: 65,
    gisEligible: false,
    gainsEligible: false,

    spouseCppMonthly: 0,
    spouseCppStartAge: 65,
    spouseOasMonthly: 0,
    spouseOasStartAge: 65,

    // Step 3: Pensions
    pensionType: 'none', // 'none' | 'db' | 'dc'
    dbPensionAnnual: 0,
    dbPensionStartAge: 65,
    dbPensionIndexed: false,
    dcPensionBalance: 0,
    liraBalance: 0,

    // Step 3: Spouse pension
    spousePensionType: 'none',       // 'none' | 'db' | 'dc'
    spouseDbPensionAnnual: 0,
    spouseDbPensionStartAge: 65,
    spouseDbPensionIndexed: false,
    spouseDcPensionBalance: 0,

    // Step 4: Savings
    rrspBalance: 0,
    rrspContributionRoom: 0,
    tfsaBalance: 0,
    tfsaContributionRoom: 0,
    rrifBalance: 0,
    otherRegisteredBalance: 0,

    // Step 4: Spouse registered savings
    spouseRrspBalance: 0,
    spouseRrifBalance: 0,
    spouseTfsaBalance: 0,
    spouseTfsaContributionRoom: 0,

    // Step 5: Other Assets
    cashSavings: 0,
    nonRegInvestments: 0,
    nonRegCostBasis: 0,
    realEstateValue: 0,
    realEstateIsPrimary: true,
    otherAssets: 0,

    // Step 6: Liabilities
    mortgageBalance: 0,
    mortgageRate: 0.05,
    mortgageYearsLeft: 0,
    consumerDebt: 0,
    consumerDebtRate: 0.08,
    consumerDebtPayoffAge: 70, // Target age to be debt-free
    otherDebt: 0,

    // Step 7: Expenses & Assumptions
    monthlyExpenses: 4000,
    expenseReductionAtRetirement: 0.10,
    inflationRate: 0.025,
    realReturn: 0.04,
    tfsaReturn: 0.04,
    nonRegReturn: 0.04,

    // Step 8: Withdrawal Strategy
    withdrawalOrder: ['tfsa', 'nonReg', 'rrsp', 'other'],
    rrspMeltdownEnabled: false,
    rrspMeltdownStartAge: 65,
    rrspMeltdownTargetAge: 71,
    rrspMeltdownAnnual: 0,

    // Step 9: Estate
    hasWill: true,
    primaryBeneficiary: 'spouse',
    numberOfChildren: 0,
    estimatedCostBasis: 0,
    includeRealEstateInEstate: true,
  };
}

// Quick-fill presets for government benefits
export const GOV_BENEFIT_PRESETS = {
  average: { label: 'Average', cppMonthly: 815, oasMonthly: 713 },
  maximum: { label: 'Maximum', cppMonthly: 1365, oasMonthly: 713 },
  low: { label: 'Low / partial', cppMonthly: 400, oasMonthly: 500 },
  none: { label: 'No CPP/OAS', cppMonthly: 0, oasMonthly: 0 },
};

// Quick-fill presets for expenses
export const EXPENSE_PRESETS = {
  modest: { label: 'Modest', monthlyExpenses: 3000 },
  comfortable: { label: 'Comfortable', monthlyExpenses: 5000 },
  generous: { label: 'Generous', monthlyExpenses: 7500 },
  premium: { label: 'Premium', monthlyExpenses: 10000 },
};

// Quick-fill presets for return assumptions
export const RETURN_PRESETS = {
  conservative: { label: 'Conservative', realReturn: 0.03, inflationRate: 0.025 },
  balanced: { label: 'Balanced', realReturn: 0.04, inflationRate: 0.025 },
  aggressive: { label: 'Aggressive', realReturn: 0.06, inflationRate: 0.025 },
};
