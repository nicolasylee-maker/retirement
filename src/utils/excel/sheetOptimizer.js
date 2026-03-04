/**
 * Sheet 7: Optimizer Comparison — static snapshot from optimizationResult.
 * This sheet uses hardcoded values (not formulas) since optimizer results
 * come from running many scenario variations in JS.
 */
import {
  FONTS, COLORS, FMT,
  styleHeaderRow, styleSectionRow, setColWidths, freezeRows,
} from './styles.js';

const SHEET_NAME = 'Optimizer';

const DIM_LABELS = {
  cpp: 'CPP Timing', oas: 'OAS Timing', withdrawalOrder: 'Withdrawal Order',
  meltdown: 'RRSP Meltdown', debt: 'Debt Payoff', expenses: 'Expense Level',
  spouseCpp: 'Spouse CPP Timing', spouseOas: 'Spouse OAS Timing',
};

export function buildOptimizerSheet(wb, scenario, optimizationResult) {
  const ws = wb.addWorksheet(SHEET_NAME, { properties: { tabColor: { argb: 'FFED7D31' } } });
  setColWidths(ws, [[1, 24], [2, 20], [3, 18], [4, 18], [5, 18], [6, 18]]);

  let r = 1;

  // Title
  ws.getRow(r).getCell(1).value = 'OPTIMIZER RESULTS';
  ws.getRow(r).getCell(1).font = { ...FONTS.header, color: { argb: COLORS.headerBg } };
  r += 2;

  if (!optimizationResult) {
    ws.getRow(r).getCell(1).value = 'Optimizer not yet run — navigate to the Optimize tab first.';
    ws.getRow(r).getCell(1).font = FONTS.small;
    return ws;
  }

  const { recommendations, alreadyOptimal, runCount, baselineDepletion, baselineLifetimeIncome } = optimizationResult;

  // Summary
  ws.getRow(r).getCell(1).value = 'Variations Tested';
  ws.getRow(r).getCell(1).font = FONTS.normal;
  ws.getRow(r).getCell(2).value = runCount;
  r++;
  ws.getRow(r).getCell(1).value = 'Baseline Depletion Age';
  ws.getRow(r).getCell(1).font = FONTS.normal;
  ws.getRow(r).getCell(2).value = baselineDepletion ?? 'Never';
  r++;
  ws.getRow(r).getCell(1).value = 'Baseline Lifetime Income';
  ws.getRow(r).getCell(1).font = FONTS.normal;
  ws.getRow(r).getCell(2).value = baselineLifetimeIncome || 0;
  ws.getRow(r).getCell(2).numFmt = FMT.currency;
  r += 2;

  // Build map
  const dimStatus = {};
  for (const rec of recommendations) dimStatus[rec.dimension] = { type: 'rec', rec };
  for (const ao of alreadyOptimal) dimStatus[ao.dimension] = { type: 'optimal' };

  // Header row for recommendations table
  const hdr = ws.getRow(r);
  hdr.getCell(1).value = 'Dimension';
  hdr.getCell(2).value = 'Status';
  hdr.getCell(3).value = 'Before';
  hdr.getCell(4).value = 'After';
  hdr.getCell(5).value = 'Years Gained';
  hdr.getCell(6).value = 'Income Gained';
  styleHeaderRow(hdr, 6);
  r++;
  freezeRows(ws, r - 1);

  for (const dim of Object.keys(DIM_LABELS)) {
    const status = dimStatus[dim];
    const row = ws.getRow(r);
    row.getCell(1).value = DIM_LABELS[dim];
    row.getCell(1).font = FONTS.normal;

    if (!status) {
      row.getCell(2).value = 'Skipped';
      row.getCell(2).font = FONTS.small;
    } else if (status.type === 'optimal') {
      row.getCell(2).value = 'Already Optimal';
      row.getCell(2).font = { ...FONTS.normal, color: { argb: COLORS.greenFont } };
    } else {
      const { rec } = status;
      row.getCell(2).value = rec.title;
      row.getCell(2).font = FONTS.bold;
      row.getCell(3).value = rec.before.label;
      row.getCell(4).value = rec.after.label;
      row.getCell(5).value = rec.impact.depletionYearsGained;
      row.getCell(5).numFmt = FMT.int;
      row.getCell(6).value = rec.impact.lifetimeIncomeGained;
      row.getCell(6).numFmt = FMT.currency;
    }
    r++;
  }

  r++;
  ws.getRow(r).getCell(1).value = 'Note: Each dimension optimized independently. Combined results may differ.';
  ws.getRow(r).getCell(1).font = FONTS.small;

  return ws;
}

export { SHEET_NAME as OPTIMIZER_SHEET_NAME };
