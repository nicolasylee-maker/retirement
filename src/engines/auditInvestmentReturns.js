/**
 * Audit section 13b — Investment Returns by Phase.
 *
 * Computes portfolio returns, deposits, and withdrawals per life phase
 * using the same residual method as PortfolioWaterfall.
 * Pure function — no React, no side-effects.
 */

import { formatCurrency, mdTable } from '../utils/formatters.js';

const $ = (v) => formatCurrency(v);

/**
 * Compute single-year investment returns as the algebraic residual:
 *   returns = portfolioChange + withdrawals - deposits
 */
function computeYearReturns(row, prevTotalPortfolio) {
  const portfolioChange = (row.totalPortfolio || 0) - (prevTotalPortfolio || 0);
  const W = (row.rrspWithdrawal || 0) + (row.tfsaWithdrawal || 0)
          + (row.nonRegWithdrawal || 0) + (row.otherWithdrawal || 0);
  const D = (row.tfsaDeposit || 0) + (row.nonRegDeposit || 0);
  return portfolioChange + W - D;
}

/** Initial portfolio from scenario fields. */
function scenarioStartPortfolio(s) {
  let total = (s.rrspBalance || 0) + (s.rrifBalance || 0) + (s.dcPensionBalance || 0)
    + (s.liraBalance || 0) + (s.tfsaBalance || 0) + (s.nonRegInvestments || 0)
    + (s.cashSavings || 0) + (s.otherAssets || 0);
  if (s.isCouple) {
    total += (s.spouseRrspBalance || 0) + (s.spouseRrifBalance || 0)
      + (s.spouseDcPensionBalance || 0) + (s.spouseTfsaBalance || 0);
  }
  return total;
}

/**
 * Aggregate returns/deposits/withdrawals for a range of projection rows.
 */
function aggregatePhase(projectionData, startAge, endAge, prevPortfolio) {
  const rows = projectionData.filter(r => r.age >= startAge && r.age <= endAge);
  if (rows.length === 0) return null;

  let totalReturns = 0, totalDeposits = 0, totalWithdrawals = 0;
  let prevP = prevPortfolio;
  for (const row of rows) {
    totalReturns += computeYearReturns(row, prevP);
    totalDeposits += (row.tfsaDeposit || 0) + (row.nonRegDeposit || 0);
    totalWithdrawals += (row.rrspWithdrawal || 0) + (row.tfsaWithdrawal || 0)
      + (row.nonRegWithdrawal || 0) + (row.otherWithdrawal || 0);
    prevP = row.totalPortfolio || 0;
  }

  const startPortfolio = prevPortfolio;
  const endPortfolio = rows[rows.length - 1].totalPortfolio || 0;

  return { startPortfolio, endPortfolio, totalReturns, totalDeposits, totalWithdrawals };
}

/**
 * Generate Markdown table of investment returns by life phase.
 *
 * @param {object} scenario
 * @param {Array}  projectionData
 * @returns {string} Markdown section
 */
export function auditInvestmentReturns(scenario, projectionData) {
  if (!projectionData || projectionData.length === 0) {
    return '## 13b. Investment Returns by Phase\n\nNo projection data.\n\n';
  }

  const { currentAge, retirementAge, lifeExpectancy } = scenario;
  const startPortfolio = scenarioStartPortfolio(scenario);

  const phases = [];

  // Working: currentAge to retirementAge - 1
  if (currentAge < retirementAge) {
    const prevP = startPortfolio;
    const result = aggregatePhase(projectionData, currentAge, retirementAge - 1, prevP);
    if (result) phases.push({ label: `Working (${currentAge}–${retirementAge - 1})`, ...result });
  }

  // Early Retirement: retirementAge to min(71, lifeExpectancy)
  const earlyEnd = Math.min(71, lifeExpectancy);
  if (retirementAge <= earlyEnd) {
    const prevRow = projectionData.find(r => r.age === retirementAge - 1);
    const prevP = prevRow ? (prevRow.totalPortfolio || 0) : startPortfolio;
    const result = aggregatePhase(projectionData, retirementAge, earlyEnd, prevP);
    if (result) phases.push({ label: `Early Retirement (${retirementAge}–${earlyEnd})`, ...result });
  }

  // RRIF Era: 72 to lifeExpectancy
  if (lifeExpectancy >= 72) {
    const prevRow = projectionData.find(r => r.age === 71);
    const prevP = prevRow ? (prevRow.totalPortfolio || 0) : startPortfolio;
    const result = aggregatePhase(projectionData, 72, lifeExpectancy, prevP);
    if (result) phases.push({ label: `RRIF Era (72–${lifeExpectancy})`, ...result });
  }

  if (phases.length === 0) {
    return '## 13b. Investment Returns by Phase\n\nInsufficient data for phase analysis.\n\n';
  }

  const headers = ['Phase', 'Start Portfolio', '+ Returns', '+ Deposits', '- Withdrawals', 'End Portfolio'];
  const rows = phases.map(p => [
    p.label,
    $(p.startPortfolio),
    $(p.totalReturns),
    $(p.totalDeposits),
    $(p.totalWithdrawals),
    $(p.endPortfolio),
  ]);

  return '## 13b. Investment Returns by Phase\n\n' +
    '*Reconciliation: End = Start + Returns + Deposits - Withdrawals (± rounding)*\n\n' +
    mdTable(headers, rows) + '\n\n';
}
