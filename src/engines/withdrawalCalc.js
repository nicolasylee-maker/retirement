import { projectScenario } from './projectionEngine.js';

/**
 * Use binary search to find the maximum sustainable monthly expense
 * that does not deplete the portfolio before targetAge.
 *
 * @param {object} scenario   Full scenario object
 * @param {number} [targetAge] Age the portfolio must survive to (default 95)
 * @param {object} [overrides] Passed through to projectScenario
 * @returns {{ sustainableMonthly: number, projection: Array }}
 */
export function calcSustainableWithdrawal(scenario, targetAge = 95, overrides = {}) {
  const iterations = 20;
  let low = 0;
  let high = 30000;
  let lastGoodProjection = null;

  for (let i = 0; i < iterations; i++) {
    const mid = (low + high) / 2;
    const projection = projectScenario(scenario, {
      ...overrides,
      monthlyExpenses: mid,
    });

    const solvent = isPortfolioSolvent(projection, targetAge, scenario.currentAge);

    if (solvent) {
      low = mid;
      lastGoodProjection = projection;
    } else {
      high = mid;
    }
  }

  // Round down to nearest dollar for safety
  const sustainableMonthly = Math.floor(low);

  // Run one final projection at the rounded amount if we haven't yet
  if (!lastGoodProjection) {
    lastGoodProjection = projectScenario(scenario, {
      ...overrides,
      monthlyExpenses: sustainableMonthly,
    });
  }

  return {
    sustainableMonthly,
    projection: lastGoodProjection,
  };
}

/**
 * Check whether the portfolio can sustain expenses through targetAge.
 * Insolvency = portfolio is depleted AND expenses still exceed income.
 */
function isPortfolioSolvent(projection, targetAge, currentAge) {
  for (const year of projection) {
    if (year.age > currentAge && year.totalPortfolio <= 0 && year.surplus < -1) {
      return false;
    }
    if (year.age >= targetAge) return true;
  }
  // If projection ends before targetAge, check the last entry
  const last = projection[projection.length - 1];
  if (!last) return false;
  return last.age >= targetAge || (last.totalPortfolio >= 0 && last.surplus >= -1);
}
