/**
 * Audit export orchestrator.
 *
 * Assembles all 10 audit sections into a single Markdown document
 * and triggers a browser download.
 */

import {
  auditInputSnapshot,
  auditProjectionTable,
  auditCppOasVerification,
  auditTaxVerification,
  auditDebtTrace,
} from '../engines/auditProjection.js';

import {
  auditEstateVerification,
  auditSustainableWithdrawal,
  auditRrifSchedule,
  auditKnownGaps,
  auditKpiDerivations,
} from '../engines/auditAnalysis.js';

/**
 * Generate the full audit Markdown document.
 *
 * @param {object} scenario        The scenario data
 * @param {Array}  projectionData  Output from projectScenario() — passed in, NOT re-run
 * @returns {string} Full Markdown audit document
 */
export function generateAuditMarkdown(scenario, projectionData) {
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

  return md;
}

/**
 * Download the audit as a .md file.
 *
 * @param {object} scenario        The scenario data
 * @param {Array}  projectionData  Output from projectScenario() — passed in, NOT re-run
 */
export function downloadAudit(scenario, projectionData) {
  const md = generateAuditMarkdown(scenario, projectionData);
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
