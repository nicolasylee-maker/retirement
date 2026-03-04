/**
 * Sheet 7: Optimizer Comparison — static snapshot from optimizationResult.
 * This sheet uses hardcoded values (not formulas) since optimizer results
 * come from running many scenario variations in JS.
 */
import {
  FONTS, COLORS, FMT,
  styleHeaderRow, styleSectionRow, setColWidths, freezeRows,
  addPurposeRows, addDocCell,
} from './styles.js';

const SHEET_NAME = 'Optimizer';
const PURPOSE_ROWS = 3; // rows 1-2 purpose + row 3 blank

const DIM_LABELS = {
  cpp: 'CPP Timing', oas: 'OAS Timing', withdrawalOrder: 'Withdrawal Order',
  meltdown: 'RRSP Meltdown', debt: 'Debt Payoff', expenses: 'Expense Level',
  spouseCpp: 'Spouse CPP Timing', spouseOas: 'Spouse OAS Timing',
};

export function buildOptimizerSheet(wb, scenario, optimizationResult) {
  const ws = wb.addWorksheet(SHEET_NAME, { properties: { tabColor: { argb: 'FFED7D31' } } });
  setColWidths(ws, [[1, 24], [2, 20], [3, 18], [4, 18], [5, 18], [6, 18]]);

  // Purpose rows (1-2)
  addPurposeRows(ws,
    'Side-by-side comparison of your current plan vs what the optimizer recommends. ' +
    'Each row shows a different strategy dimension \u2014 CPP timing, OAS timing, withdrawal order, ' +
    'or meltdown approach.',
    1, 6);

  let r = PURPOSE_ROWS + 1; // start at row 4

  // Title
  ws.getRow(r).getCell(1).value = 'OPTIMIZER RESULTS';
  ws.getRow(r).getCell(1).font = { ...FONTS.header, color: { argb: COLORS.headerBg } };
  r += 2;

  if (!optimizationResult) {
    ws.getRow(r).getCell(1).value = 'Optimizer not yet run \u2014 navigate to the Optimize tab first.';
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
  r += 2;

  // === Dictionary ===
  const dictHdr = ws.getRow(r);
  dictHdr.getCell(1).value = 'COLUMN DICTIONARY';
  dictHdr.getCell(1).font = { ...FONTS.bold, size: 12 };
  r++;

  const dictEntries = [
    ['Dimension',     'The strategy lever being tested (CPP timing, withdrawal order, etc.)'],
    ['Status',        '"Already Optimal" = your current choice is best; otherwise shows the recommendation'],
    ['Before',        'Your current setting for this dimension'],
    ['After',         'The optimizer\'s recommended setting'],
    ['Years Gained',  'How many more years your portfolio lasts with the recommended change'],
    ['Income Gained', 'Additional lifetime after-tax income from the recommended change'],
  ];

  for (const [term, desc] of dictEntries) {
    addDocCell(ws, r, 1, term);
    ws.getRow(r).getCell(1).font = { ...FONTS.small, bold: true };
    addDocCell(ws, r, 2, desc);
    r++;
  }

  return ws;
}

export { SHEET_NAME as OPTIMIZER_SHEET_NAME };
