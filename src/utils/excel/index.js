/**
 * Excel Audit workbook — orchestrator + download.
 *
 * Generates a .xlsx with 7 sheets where every projection number is an
 * Excel formula. Change any assumption → entire workbook recalculates.
 */
import ExcelJS from 'exceljs';
import { buildAssumptionsSheet } from './sheetAssumptions.js';
import { buildCppOasSheet } from './sheetCppOas.js';
import { buildTaxEngineSheet } from './sheetTaxEngine.js';
import { buildProjectionSheet } from './sheetProjection.js';
import { buildRrifRatesSheet } from './sheetRrifRates.js';
import { buildEstateSheet } from './sheetEstate.js';
import { buildOptimizerSheet } from './sheetOptimizer.js';

/**
 * Generate and download the Excel audit workbook.
 *
 * @param {object} scenario          The scenario data
 * @param {Array}  projectionData    Output from projectScenario()
 * @param {object} [optimizationResult]  Output from runOptimization()
 */
export async function downloadExcelAudit(scenario, projectionData, optimizationResult = null) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'RetirePlanner.ca';
  wb.created = new Date();

  const province = scenario.province || 'ON';

  // Build sheets in tab order
  buildAssumptionsSheet(wb, scenario);       // Sheet 1
  buildCppOasSheet(wb, scenario, projectionData);  // Sheet 2
  buildTaxEngineSheet(wb, province);         // Sheet 3
  buildProjectionSheet(wb, scenario);        // Sheet 4
  buildRrifRatesSheet(wb);                   // Sheet 5
  buildEstateSheet(wb, scenario, projectionData);  // Sheet 6
  buildOptimizerSheet(wb, scenario, optimizationResult);  // Sheet 7

  // Generate blob and trigger download
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const safeName = (scenario.name || 'audit').replace(/[^a-zA-Z0-9_-]/g, '_');
  const link = Object.assign(document.createElement('a'), {
    href: url,
    download: `EXCEL_AUDIT_${safeName}_${new Date().toISOString().slice(0, 10)}.xlsx`,
  });
  link.click();
  URL.revokeObjectURL(url);
}
