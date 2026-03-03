/**
 * Audit export orchestrator.
 *
 * Assembles all 11 audit sections into a single Markdown document
 * and triggers a browser download.
 */

import { auditInputSnapshot } from '../engines/auditInputSnapshot.js';
import { auditProjectionTable, auditCppOasVerification } from '../engines/auditProjection.js';
import { auditTaxVerification, auditDebtTrace } from '../engines/auditTaxDebt.js';

import {
  auditEstateVerification,
  auditSustainableWithdrawal,
  auditRrifSchedule,
  auditKnownGaps,
  auditKpiDerivations,
} from '../engines/auditAnalysis.js';

const DIM_LABELS = {
  cpp: 'CPP Timing', oas: 'OAS Timing', withdrawalOrder: 'Withdrawal Order',
  meltdown: 'RRSP Meltdown', debt: 'Debt Payoff', expenses: 'Expense Level',
  spouseCpp: 'Spouse CPP Timing', spouseOas: 'Spouse OAS Timing',
}

function fmtAudit(n) {
  if (!n) return '$0'
  if (Math.abs(n) >= 1000000) return `$${(Math.abs(n) / 1000000).toFixed(1)}M`
  return `$${Math.round(Math.abs(n) / 1000)}K`
}

function auditOptimizerTrace(scenario, optimizationResult) {
  if (!optimizationResult) {
    return '## 11. Optimizer Recommendations\n\nOptimizer not yet run — navigate to the Optimize tab first to generate recommendations.\n\n'
  }

  const { recommendations, alreadyOptimal, runCount, baselineDepletion, baselineLifetimeIncome, lifeExpectancy } = optimizationResult

  // Build a map of what happened to each dimension
  const dimStatus = {}
  for (const rec of recommendations) dimStatus[rec.dimension] = { type: 'rec', rec }
  for (const ao of alreadyOptimal) dimStatus[ao.dimension] = { type: 'optimal' }

  // Infer skipped dimensions
  const hasRrsp = (scenario.rrspBalance || 0) + (scenario.rrifBalance || 0) > 0
  const skipReasons = {
    cpp: !scenario.cppMonthly ? 'no CPP benefit configured' : null,
    oas: !scenario.oasMonthly ? 'no OAS benefit configured' : null,
    withdrawalOrder: !hasRrsp ? 'no RRSP/RRIF balance' : null,
    meltdown: !hasRrsp ? 'no RRSP/RRIF balance' : null,
    debt: !(scenario.consumerDebt > 0) ? 'no consumer debt' : null,
    expenses: baselineDepletion === null ? 'plan does not deplete before life expectancy' : null,
    spouseCpp: !scenario.isCouple || !scenario.spouseCppMonthly ? 'single person or no spouse CPP' : null,
    spouseOas: !scenario.isCouple || !scenario.spouseOasMonthly ? 'single person or no spouse OAS' : null,
  }

  let md = '## 11. Optimizer Recommendations\n\n'
  md += `Tested **${runCount}** plan variations.\n`
  md += `Baseline: depletes at **${baselineDepletion ?? `never (outlasts age ${lifeExpectancy})`}**`
  if (baselineLifetimeIncome) md += ` | lifetime after-tax income: **${fmtAudit(baselineLifetimeIncome)}**`
  md += '\n\n'

  for (const dim of Object.keys(DIM_LABELS)) {
    md += `### ${DIM_LABELS[dim]}\n`
    const skip = skipReasons[dim]
    const status = dimStatus[dim]

    if (skip) {
      md += `- SKIPPED — ${skip}\n\n`
    } else if (!status || status.type === 'optimal') {
      md += `- ALREADY OPTIMAL — no change improves the outcome\n\n`
    } else {
      const { rec } = status
      md += `- Best found: **${rec.title}**\n`
      md += `- Before: ${rec.before.label} | depletes: ${rec.before.depletionAge ?? 'never'} | income: ${fmtAudit(rec.before.lifetimeIncome)}\n`
      md += `- After:  ${rec.after.label} | depletes: ${rec.after.depletionAge ?? 'never'} | income: ${fmtAudit(rec.after.lifetimeIncome)}\n`
      md += `- Impact: +${rec.impact.depletionYearsGained} yrs | +${fmtAudit(rec.impact.lifetimeIncomeGained)} income`
      if (rec.impact.lifetimeTaxSaved > 0) md += ` | ${fmtAudit(rec.impact.lifetimeTaxSaved)} tax saved`
      md += '\n- Recommendation: **APPLY**\n\n'
    }
  }

  md += '_Note: Each dimension is optimized independently. Applying multiple recommendations simultaneously may produce different combined results than the sum of individual gains._\n\n'

  return md
}

/**
 * Generate the full audit Markdown document.
 *
 * @param {object} scenario             The scenario data
 * @param {Array}  projectionData       Output from projectScenario() — passed in, NOT re-run
 * @param {object} [optimizationResult] Output from runOptimization() — optional
 * @returns {string} Full Markdown audit document
 */
export function generateAuditMarkdown(scenario, projectionData, optimizationResult = null) {
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const engineFiles = 'projectionEngine.js + taxEngine.js + estateEngine.js + withdrawalCalc.js';

  let md = '# Calculation Audit Report\n\n';
  md += `**Scenario**: ${scenario.name}\n`;
  md += `**Generated**: ${timestamp}\n`;
  md += `**Engine files**: ${engineFiles}\n`;
  md += `**Bug fix status**: CPP/OAS inflation-indexed, tax gross-up loop, estate $0 cap gains guard — all applied\n`;
  md += '\n---\n\n';

  md += auditInputSnapshot(scenario);
  md += '\n---\n\n';
  md += auditProjectionTable(scenario, projectionData);
  md += '---\n\n';
  md += auditCppOasVerification(scenario, projectionData);
  md += '---\n\n';
  md += auditTaxVerification(scenario, projectionData);
  md += '---\n\n';
  md += auditDebtTrace(scenario);
  md += '---\n\n';
  md += auditEstateVerification(scenario, projectionData);
  md += '---\n\n';
  md += auditSustainableWithdrawal(scenario);
  md += '---\n\n';
  md += auditRrifSchedule();
  md += '---\n\n';
  md += auditKnownGaps();
  md += '---\n\n';
  md += auditKpiDerivations(scenario, projectionData);
  md += '\n---\n\n';
  md += auditOptimizerTrace(scenario, optimizationResult);

  return md;
}

/**
 * Download the audit as a .md file.
 *
 * @param {object} scenario             The scenario data
 * @param {Array}  projectionData       Output from projectScenario() — passed in, NOT re-run
 * @param {object} [optimizationResult] Output from runOptimization() — optional
 */
export function downloadAudit(scenario, projectionData, optimizationResult = null) {
  const md = generateAuditMarkdown(scenario, projectionData, optimizationResult);
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const safeName = (scenario.name || 'audit').replace(/[^a-zA-Z0-9_-]/g, '_');
  const link = Object.assign(document.createElement('a'), {
    href: url,
    download: `CALCULATION_AUDIT_${safeName}_${new Date().toISOString().slice(0, 10)}.md`,
  });
  link.click();
  URL.revokeObjectURL(url);
}
