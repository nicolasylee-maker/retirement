// 2024 Federal tax brackets
export const FEDERAL_BRACKETS = [
  { min: 0,       max: 57375,   rate: 0.15   },
  { min: 57375,   max: 114750,  rate: 0.205  },
  { min: 114750,  max: 158468,  rate: 0.26   },
  { min: 158468,  max: 221708,  rate: 0.29   },
  { min: 221708,  max: Infinity, rate: 0.33  },
];

// 2024 Ontario tax brackets
export const ONTARIO_BRACKETS = [
  { min: 0,       max: 51446,   rate: 0.0505 },
  { min: 51446,   max: 102894,  rate: 0.0915 },
  { min: 102894,  max: 150000,  rate: 0.1116 },
  { min: 150000,  max: 220000,  rate: 0.1216 },
  { min: 220000,  max: Infinity, rate: 0.1316 },
];

// Ontario surtax thresholds
export const ONTARIO_SURTAX = {
  threshold1: 4991,
  rate1: 0.20,
  threshold2: 6387,
  rate2: 0.36,
};

// Federal credits & amounts
export const FEDERAL_CREDITS = {
  basicPersonal: 15705,
  ageAmount: 8790,
  ageIncomeThreshold: 44325,
  ageClawbackRate: 0.15,
  pensionCredit: 2000,
  creditRate: 0.15,
};

// Ontario credits & amounts
export const ONTARIO_CREDITS = {
  basicPersonal: 11865,
  ageAmount: 5586,
  ageIncomeThreshold: 42335,
  ageClawbackRate: 0.15,
  pensionCredit: 1640,
  creditRate: 0.0505,
};

// OAS parameters
export const OAS_PARAMS = {
  maxAnnual: 8560,           // ~$713/month × 12
  clawbackStart: 90997,
  clawbackRate: 0.15,
  clawbackFullRepay: 148065,
  startAge: 65,
  deferralBonus: 0.006,      // 0.6% per month deferred past 65, max age 70
  maxDeferAge: 70,
};

// CPP parameters
export const CPP_PARAMS = {
  maxAt65: 16375,            // ~$1,365/month × 12
  earlyReduction: 0.006,     // 0.6% per month before 65
  lateIncrease: 0.007,       // 0.7% per month after 65
  earliestAge: 60,
  latestAge: 70,
};

// GIS parameters (single, approximate)
export const GIS_PARAMS = {
  maxAnnual: 12432,
  incomeThreshold: 21624,
  clawbackRate: 0.50,
};

// Ontario GAINS (Guaranteed Annual Income System)
export const GAINS_PARAMS = {
  maxAnnual: 1632,
  singleIncomeThreshold: 1632,
  clawbackRate: 1.0,         // Reduced dollar-for-dollar above private income threshold
  minAge: 65,
};

// RRIF minimum withdrawal percentages by age
export const RRIF_MIN_RATES = {
  // Under 71: 1/(90-age) but typically not forced until 71
  71: 0.0528, 72: 0.0540, 73: 0.0553, 74: 0.0567,
  75: 0.0582, 76: 0.0598, 77: 0.0617, 78: 0.0636,
  79: 0.0658, 80: 0.0682, 81: 0.0708, 82: 0.0738,
  83: 0.0771, 84: 0.0808, 85: 0.0851, 86: 0.0899,
  87: 0.0955, 88: 0.1021, 89: 0.1099, 90: 0.1192,
  91: 0.1306, 92: 0.1449, 93: 0.1634, 94: 0.1879,
  95: 0.2000,  // 20% for 95+
};

// Capital gains inclusion rates (2024+ rules)
export const CAPITAL_GAINS = {
  inclusionRate: 0.50,
  enhancedThreshold: 250000,
  enhancedRate: 0.6667,
};

// TFSA parameters
export const TFSA_PARAMS = {
  annualLimit: 7000,   // 2024+ annual contribution limit
};

// Ontario probate (Estate Administration Tax)
export const PROBATE = {
  firstThreshold: 50000,
  firstRate: 5 / 1000,       // $5 per $1,000
  aboveRate: 15 / 1000,      // $15 per $1,000
};

// Intestacy rules (Ontario SLRA)
export const INTESTACY = {
  spousePreferentialShare: 350000,
  // Remainder: spouse gets 1/2 if one child, 1/3 if two+ children
};
