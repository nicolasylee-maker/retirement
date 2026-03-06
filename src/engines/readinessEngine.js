/**
 * readinessEngine.js
 *
 * Computes a Canadian retirement savings percentile rank based on the user's
 * RRSP + TFSA balance vs Statistics Canada / Fidelity Canada benchmarks by age bracket.
 *
 * The savings distribution within each bracket is modelled as log-normal
 * (right-skewed, consistent with wealth data). Given the bracket's median and p90,
 * we solve for mu and sigma, then use the log-normal CDF to place the user.
 *
 * Returns: percentile = the "top X%" number (e.g. 18 = "top 18%")
 */

// Benchmark data: RRSP + TFSA combined balances by age bracket
// Source: Statistics Canada Survey of Financial Security (2023), Fidelity Canada (2024)
const BRACKETS = [
  { label: 'Under 35',  ages: [18, 34], median: 15_000,  p25: 3_000,   p75: 45_000,  p90: 110_000 },
  { label: '35 to 44',  ages: [35, 44], median: 33_000,  p25: 8_000,   p75: 95_000,  p90: 220_000 },
  { label: '45 to 54',  ages: [45, 54], median: 58_000,  p25: 15_000,  p75: 170_000, p90: 380_000 },
  { label: '55 to 64',  ages: [55, 64], median: 120_000, p25: 30_000,  p75: 320_000, p90: 650_000 },
  { label: '65 and up', ages: [65, 99], median: 140_000, p25: 35_000,  p75: 360_000, p90: 720_000 },
];

/**
 * Approximate the standard normal CDF using the Abramowitz & Stegun rational
 * approximation (max error ~1.5e-7). Sufficient for percentile display purposes.
 */
function normalCDF(x) {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const poly = t * (0.319381530
    + t * (-0.356563782
    + t * (1.781477937
    + t * (-1.821255978
    + t * 1.330274429))));
  const pdf = Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
  const cdf = 1 - pdf * poly;
  return x >= 0 ? cdf : 1 - cdf;
}

/**
 * Derive log-normal parameters (mu, sigma) from median and p90.
 *   median = exp(mu)   =>  mu = ln(median)
 *   p90    = exp(mu + sigma * z90)  =>  sigma = (ln(p90) - mu) / z90
 * z90 (the 90th percentile of the standard normal) ~ 1.2816
 */
function logNormalParams(median, p90) {
  const mu = Math.log(median);
  const z90 = 1.2816;
  const sigma = (Math.log(p90) - mu) / z90;
  return { mu, sigma };
}

/**
 * Compute the log-normal CDF at value x given mu and sigma.
 * P(X <= x) = normalCDF( (ln(x) - mu) / sigma )
 */
function logNormalCDF(x, mu, sigma) {
  if (x <= 0) return 0;
  return normalCDF((Math.log(x) - mu) / sigma);
}

function findBracket(age) {
  const clamped = Math.max(18, Math.min(99, age));
  return BRACKETS.find(b => clamped >= b.ages[0] && clamped <= b.ages[1]) ?? BRACKETS[BRACKETS.length - 1];
}

/**
 * computeReadinessRank(scenario)
 *
 * @param {object} scenario - scenario object from the wizard
 * @returns {{
 *   percentile: number,      // top-X% integer (1-99); e.g. 18 = "top 18%"
 *   bracket: object,         // the matched BRACKETS entry
 *   userSavings: number,     // rrspBalance + tfsaBalance
 *   medianSavings: number,   // bracket median
 *   topDecileSavings: number,// bracket p90
 *   hasPension: boolean,     // true if pensionType === 'db'
 * }}
 */
export function computeReadinessRank(scenario) {
  const age = scenario.currentAge ?? 45;
  const bracket = findBracket(age);

  const userSavings = (scenario.rrspBalance ?? 0) + (scenario.tfsaBalance ?? 0);
  const hasPension = scenario.pensionType === 'db';

  let percentile;

  if (userSavings <= 0) {
    // Below median — place at bottom 5% (top 95%)
    percentile = 95;
  } else {
    const { mu, sigma } = logNormalParams(bracket.median, bracket.p90);
    // cdfValue = P(X <= userSavings) = fraction of population with <= this much saved
    const cdfValue = logNormalCDF(userSavings, mu, sigma);
    // top-X% = fraction with MORE than user = 1 - cdfValue
    const topFraction = 1 - cdfValue;
    const raw = Math.round(topFraction * 100);
    // Clamp: never show 0% or 100%
    percentile = Math.max(1, Math.min(99, raw));
  }

  return {
    percentile,
    bracket,
    userSavings,
    medianSavings: bracket.median,
    topDecileSavings: bracket.p90,
    hasPension,
  };
}
