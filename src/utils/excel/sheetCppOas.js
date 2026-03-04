/**
 * Sheet 2: CPP/OAS Verification — shows adjustment calculations
 * and compares formula results to JS engine values.
 */
import {
  FONTS, COLORS, FMT,
  styleHeaderRow, styleSectionRow, setColWidths, freezeRows,
  addPurposeRows, addDocCell,
} from './styles.js';
import { FIRST_DATA as PROJ_FIRST_DATA } from './sheetProjection.js';

const SHEET_NAME = 'CPP-OAS Verify';
const PURPOSE_ROWS = 3; // rows 1-2 purpose + row 3 blank

export function buildCppOasSheet(wb, scenario, projectionData) {
  const ws = wb.addWorksheet(SHEET_NAME, { properties: { tabColor: { argb: 'FF00B050' } } });
  setColWidths(ws, [[1, 22], [2, 16], [3, 16], [4, 16], [5, 14]]);

  // Purpose rows (1-2)
  addPurposeRows(ws,
    'This sheet shows exactly how your CPP and OAS payments are calculated \u2014 the adjustment ' +
    'for starting early or late, inflation indexing, and the OAS clawback check.',
    1, 5);

  let r = PURPOSE_ROWS + 1; // start at row 4

  // === CPP Section ===
  const cppHdr = ws.getRow(r);
  cppHdr.getCell(1).value = 'CPP Benefit Calculation';
  styleHeaderRow(cppHdr, 5);
  r++;

  const cppRows = [
    ['Monthly at 65',         { formula: 'Assumptions_CppMonthly' },               FMT.currency],
    ['Start Age',             { formula: 'Assumptions_CppStartAge' },              FMT.int],
    ['Months from 65',        { formula: '(Assumptions_CppStartAge-65)*12' },      FMT.int],
    ['Early Reduction/mo',    { formula: 'CppEarlyReduction' },                    FMT.pct],
    ['Late Increase/mo',      { formula: 'CppLateIncrease' },                      FMT.pct],
    ['Adjustment Factor',     { formula: 'IF((Assumptions_CppStartAge-65)*12<0, 1+(Assumptions_CppStartAge-65)*12*CppEarlyReduction, 1+(Assumptions_CppStartAge-65)*12*CppLateIncrease)' }, '0.0000'],
    ['Annual at Start Age',   { formula: 'Assumptions_CppMonthly*12*IF((Assumptions_CppStartAge-65)*12<0, 1+(Assumptions_CppStartAge-65)*12*CppEarlyReduction, 1+(Assumptions_CppStartAge-65)*12*CppLateIncrease)' }, FMT.currency],
  ];

  for (const [label, val, fmt] of cppRows) {
    const row = ws.getRow(r);
    row.getCell(1).value = label;
    row.getCell(1).font = FONTS.normal;
    row.getCell(2).value = val;
    row.getCell(2).numFmt = fmt;
    r++;
  }

  r++; // blank

  // === OAS Section ===
  const oasHdr = ws.getRow(r);
  oasHdr.getCell(1).value = 'OAS Benefit Calculation';
  styleHeaderRow(oasHdr, 5);
  r++;

  const oasRows = [
    ['Monthly at 65',         { formula: 'Assumptions_OasMonthly' },               FMT.currency],
    ['Start Age',             { formula: 'Assumptions_OasStartAge' },              FMT.int],
    ['Years Deferred',        { formula: 'MAX(0,MIN(Assumptions_OasStartAge,OasMaxDeferAge)-OasStdStartAge)' }, FMT.int],
    ['Deferral Bonus/mo',     { formula: 'OasDeferralBonus' },                     FMT.pct],
    ['Deferral Multiplier',   { formula: '1+MAX(0,MIN(Assumptions_OasStartAge,OasMaxDeferAge)-OasStdStartAge)*12*OasDeferralBonus' }, '0.0000'],
    ['Annual at Start Age',   { formula: 'Assumptions_OasMonthly*12*(1+MAX(0,MIN(Assumptions_OasStartAge,OasMaxDeferAge)-OasStdStartAge)*12*OasDeferralBonus)' }, FMT.currency],
    ['OAS Clawback Thresh.',  { formula: 'Assumptions_OasClawbackThresh' },        FMT.currency],
  ];

  for (const [label, val, fmt] of oasRows) {
    const row = ws.getRow(r);
    row.getCell(1).value = label;
    row.getCell(1).font = FONTS.normal;
    row.getCell(2).value = val;
    row.getCell(2).numFmt = fmt;
    r++;
  }

  r++; // blank

  // === Comparison Table ===
  const compHdr = ws.getRow(r);
  compHdr.getCell(1).value = 'Age';
  compHdr.getCell(2).value = 'CPP (Formula)';
  compHdr.getCell(3).value = 'CPP (JS Engine)';
  compHdr.getCell(4).value = 'OAS (Formula)';
  compHdr.getCell(5).value = 'OAS (JS Engine)';
  styleHeaderRow(compHdr, 5);
  r++;
  freezeRows(ws, r - 1);

  // Show every 5 years, plus start ages
  const ages = new Set();
  for (let age = scenario.currentAge; age <= scenario.lifeExpectancy; age += 5) ages.add(age);
  ages.add(scenario.cppStartAge || 65);
  ages.add(scenario.oasStartAge || 65);
  ages.add(scenario.retirementAge);

  const sortedAges = [...ages].sort((a, b) => a - b);
  for (const age of sortedAges) {
    if (age < scenario.currentAge || age > scenario.lifeExpectancy) continue;
    const projRow = projectionData?.find(p => p.age === age);
    const row = ws.getRow(r);
    row.getCell(1).value = age;
    row.getCell(1).numFmt = FMT.int;

    // CPP formula (references Projection sheet)
    const projSheetRow = PROJ_FIRST_DATA + (age - scenario.currentAge);
    row.getCell(2).value = { formula: `'Projection'!F${projSheetRow}` };
    row.getCell(2).numFmt = FMT.currency;

    // CPP from JS
    row.getCell(3).value = projRow?.cppIncome || 0;
    row.getCell(3).numFmt = FMT.currency;
    row.getCell(3).font = FONTS.small;

    // OAS formula
    row.getCell(4).value = { formula: `'Projection'!G${projSheetRow}` };
    row.getCell(4).numFmt = FMT.currency;

    // OAS from JS
    row.getCell(5).value = projRow?.oasIncome || 0;
    row.getCell(5).numFmt = FMT.currency;
    row.getCell(5).font = FONTS.small;
    r++;
  }

  r++; // blank

  // === Dictionary ===
  const dictHdr2 = ws.getRow(r);
  dictHdr2.getCell(1).value = 'COLUMN DICTIONARY';
  dictHdr2.getCell(1).font = { ...FONTS.bold, size: 12 };
  r++;

  const dictEntries = [
    ['Monthly at 65',       'Your estimated CPP/OAS monthly payment if starting at the standard age of 65'],
    ['Months from 65',      'Number of months you are starting early (negative) or late (positive) versus 65'],
    ['Adjustment Factor',   'Multiplier applied to your benefit: <1 if early, >1 if late'],
    ['Annual at Start Age', 'Your first-year annual CPP/OAS payment after the early/late adjustment'],
    ['Clawback Threshold',  'If total income exceeds this, OAS is reduced at 15% on the excess'],
    ['CPP (Formula)',       'CPP value from the live Excel formula (recalculates if you change assumptions)'],
    ['CPP (JS Engine)',     'CPP value from the app\'s JavaScript engine (static snapshot for comparison)'],
  ];

  for (const [term, desc] of dictEntries) {
    addDocCell(ws, r, 1, term);
    ws.getRow(r).getCell(1).font = { ...FONTS.small, bold: true };
    addDocCell(ws, r, 2, desc);
    r++;
  }

  return ws;
}

export { SHEET_NAME as CPPOAS_SHEET_NAME };
