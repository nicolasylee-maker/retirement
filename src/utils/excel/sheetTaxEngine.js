/**
 * Sheet 3: Tax Engine — federal + provincial bracket tables, credits, CPP/OAS params.
 * Projection formulas reference named ranges from this sheet.
 */
import {
  FEDERAL_BRACKETS, FEDERAL_CREDITS,
  PROVINCE_DATA, CPP_PARAMS, OAS_PARAMS,
} from '../../constants/taxTables.js';
import {
  FONTS, FMT,
  styleHeaderRow, styleSectionRow, setColWidths, freezeRows,
  addPurposeRows, addDocCell,
} from './styles.js';

const SHEET_NAME = 'Tax Engine';
const PURPOSE_ROWS = 3; // rows 1-2 purpose + row 3 blank

export function buildTaxEngineSheet(wb, province) {
  const ws = wb.addWorksheet(SHEET_NAME, { properties: { tabColor: { argb: 'FFC00000' } } });
  setColWidths(ws, [[1, 18], [2, 16], [3, 14], [4, 6], [5, 18], [6, 16], [7, 14]]);

  // Purpose rows (1-2)
  addPurposeRows(ws,
    'This is how Canadian income tax works, bracket by bracket. You pay a low rate on your first ' +
    'dollars of income, and higher rates on additional income. Credits reduce the tax you owe.',
    1, 3);

  const provData = PROVINCE_DATA[province] || PROVINCE_DATA.ON;
  const fc = FEDERAL_CREDITS;
  const pc = provData.credits;
  let r = PURPOSE_ROWS + 1; // start at row 4

  // ===== FEDERAL BRACKETS =====
  const fedHdr = ws.getRow(r);
  fedHdr.getCell(1).value = 'Federal Brackets';
  fedHdr.getCell(2).value = 'Max';
  fedHdr.getCell(3).value = 'Rate';
  styleHeaderRow(fedHdr, 3);
  r++;

  const fedBracketStartRow = r;
  for (const b of FEDERAL_BRACKETS) {
    const row = ws.getRow(r);
    row.getCell(1).value = b.min;
    row.getCell(1).numFmt = FMT.currency;
    row.getCell(2).value = b.max === Infinity ? 999999999 : b.max;
    row.getCell(2).numFmt = FMT.currency;
    row.getCell(3).value = b.rate;
    row.getCell(3).numFmt = FMT.pct;
    r++;
  }
  const fedBracketEndRow = r - 1;

  // Named ranges for federal brackets
  wb.definedNames.add(`'${SHEET_NAME}'!$A$${fedBracketStartRow}:$A$${fedBracketEndRow}`, 'FedBracketMin');
  wb.definedNames.add(`'${SHEET_NAME}'!$B$${fedBracketStartRow}:$B$${fedBracketEndRow}`, 'FedBracketMax');
  wb.definedNames.add(`'${SHEET_NAME}'!$C$${fedBracketStartRow}:$C$${fedBracketEndRow}`, 'FedBracketRate');

  r++; // blank row

  // ===== PROVINCIAL BRACKETS =====
  const provHdr = ws.getRow(r);
  provHdr.getCell(1).value = `${provData.name || province} Brackets`;
  provHdr.getCell(2).value = 'Max';
  provHdr.getCell(3).value = 'Rate';
  styleHeaderRow(provHdr, 3);
  r++;

  const provBracketStartRow = r;
  for (const b of provData.brackets) {
    const row = ws.getRow(r);
    row.getCell(1).value = b.min;
    row.getCell(1).numFmt = FMT.currency;
    row.getCell(2).value = b.max === Infinity ? 999999999 : b.max;
    row.getCell(2).numFmt = FMT.currency;
    row.getCell(3).value = b.rate;
    row.getCell(3).numFmt = FMT.pct;
    r++;
  }
  const provBracketEndRow = r - 1;

  wb.definedNames.add(`'${SHEET_NAME}'!$A$${provBracketStartRow}:$A$${provBracketEndRow}`, 'ProvBracketMin');
  wb.definedNames.add(`'${SHEET_NAME}'!$B$${provBracketStartRow}:$B$${provBracketEndRow}`, 'ProvBracketMax');
  wb.definedNames.add(`'${SHEET_NAME}'!$C$${provBracketStartRow}:$C$${provBracketEndRow}`, 'ProvBracketRate');

  r++; // blank row

  // ===== CREDITS =====
  const credHdr = ws.getRow(r);
  credHdr.getCell(1).value = 'Credits';
  credHdr.getCell(2).value = 'Federal';
  credHdr.getCell(3).value = province;
  styleHeaderRow(credHdr, 3);
  r++;

  const creditRows = [
    ['Basic Personal',       fc.basicPersonal,       pc.basicPersonal,       'FedBasicPersonal',   'ProvBasicPersonal',   FMT.currency],
    ['Age Amount',           fc.ageAmount,            pc.ageAmount,            'FedAgeAmount',       'ProvAgeAmount',       FMT.currency],
    ['Age Income Threshold', fc.ageIncomeThreshold,   pc.ageIncomeThreshold,   'FedAgeThreshold',    'ProvAgeThreshold',    FMT.currency],
    ['Age Clawback Rate',    fc.ageClawbackRate,      pc.ageClawbackRate,      'FedAgeClawRate',     'ProvAgeClawRate',     FMT.pct],
    ['Pension Credit',       fc.pensionCredit,        pc.pensionCredit,        'FedPensionCredit',   'ProvPensionCredit',   FMT.currency],
    ['Credit Rate',          fc.creditRate,           pc.creditRate,           'FedCreditRate',      'ProvCreditRate',      FMT.pct],
  ];

  for (const [label, fedVal, provVal, fedName, provName, fmt] of creditRows) {
    const row = ws.getRow(r);
    row.getCell(1).value = label;
    row.getCell(1).font = FONTS.normal;
    row.getCell(2).value = fedVal;
    row.getCell(2).numFmt = fmt;
    row.getCell(3).value = provVal;
    row.getCell(3).numFmt = fmt;
    wb.definedNames.add(`'${SHEET_NAME}'!$B$${r}`, fedName);
    wb.definedNames.add(`'${SHEET_NAME}'!$C$${r}`, provName);
    r++;
  }

  r++; // blank row

  // ===== SURTAX (if applicable) =====
  const surtaxHdr = ws.getRow(r);
  surtaxHdr.getCell(1).value = `${province} Surtax`;
  styleHeaderRow(surtaxHdr, 3);
  r++;

  const st = provData.surtax;
  if (st) {
    const surtaxRows = [
      ['Surtax Threshold 1', st.threshold1, 'SurtaxThreshold1', FMT.currency],
      ['Surtax Rate 1',      st.rate1,      'SurtaxRate1',      FMT.pct],
      ['Surtax Threshold 2', st.threshold2, 'SurtaxThreshold2', FMT.currency],
      ['Surtax Rate 2',      st.rate2,      'SurtaxRate2',      FMT.pct],
    ];
    for (const [label, val, name, fmt] of surtaxRows) {
      const row = ws.getRow(r);
      row.getCell(1).value = label;
      row.getCell(1).font = FONTS.normal;
      row.getCell(2).value = val;
      row.getCell(2).numFmt = fmt;
      wb.definedNames.add(`'${SHEET_NAME}'!$B$${r}`, name);
      r++;
    }
  } else {
    // No surtax — separate threshold and rate into distinct cells
    const row = ws.getRow(r);
    row.getCell(1).value = 'No surtax for this province';
    row.getCell(1).font = FONTS.small;
    row.getCell(2).value = 0;
    row.getCell(2).numFmt = FMT.currency;
    wb.definedNames.add(`'${SHEET_NAME}'!$B$${r}`, 'SurtaxThreshold1');
    row.getCell(3).value = 0;
    row.getCell(3).numFmt = FMT.pct;
    wb.definedNames.add(`'${SHEET_NAME}'!$C$${r}`, 'SurtaxRate1');
    r++;
    const row2 = ws.getRow(r);
    row2.getCell(2).value = 0;
    row2.getCell(2).numFmt = FMT.currency;
    wb.definedNames.add(`'${SHEET_NAME}'!$B$${r}`, 'SurtaxThreshold2');
    row2.getCell(3).value = 0;
    row2.getCell(3).numFmt = FMT.pct;
    wb.definedNames.add(`'${SHEET_NAME}'!$C$${r}`, 'SurtaxRate2');
    r++;
  }

  r++; // blank

  // ===== CPP / OAS PARAMS =====
  const cppHdr = ws.getRow(r);
  cppHdr.getCell(1).value = 'CPP/OAS Parameters';
  styleHeaderRow(cppHdr, 2);
  r++;

  const paramRows = [
    ['CPP Early Reduction/mo', CPP_PARAMS.earlyReduction,  'CppEarlyReduction', FMT.pct],
    ['CPP Late Increase/mo',   CPP_PARAMS.lateIncrease,    'CppLateIncrease',   FMT.pct],
    ['OAS Deferral Bonus/mo',  OAS_PARAMS.deferralBonus,   'OasDeferralBonus',  FMT.pct],
    ['OAS Max Defer Age',      OAS_PARAMS.maxDeferAge,     'OasMaxDeferAge',    FMT.int],
    ['OAS Start Age',          OAS_PARAMS.startAge,        'OasStdStartAge',    FMT.int],
  ];

  for (const [label, val, name, fmt] of paramRows) {
    const row = ws.getRow(r);
    row.getCell(1).value = label;
    row.getCell(1).font = FONTS.normal;
    row.getCell(2).value = val;
    row.getCell(2).numFmt = fmt;
    wb.definedNames.add(`'${SHEET_NAME}'!$B$${r}`, name);
    r++;
  }

  r++; // blank

  // ===== DICTIONARY =====
  const dictHdr = ws.getRow(r);
  dictHdr.getCell(1).value = 'COLUMN DICTIONARY';
  dictHdr.getCell(1).font = { ...FONTS.bold, size: 12 };
  r++;

  const dictEntries = [
    ['Bracket Min',       'The income threshold where this tax bracket begins'],
    ['Bracket Max',       'The income threshold where this tax bracket ends'],
    ['Rate',              'Tax rate applied to income within this bracket'],
    ['Basic Personal',    'Income amount everyone can earn tax-free (non-refundable credit)'],
    ['Age Amount',        'Extra tax credit available at age 65+ (income-tested)'],
    ['Age Income Thresh.','Income level where the age amount starts being clawed back'],
    ['Pension Credit',    'Tax credit on first $2,000 of eligible pension/RRIF income'],
    ['Credit Rate',       'Lowest bracket rate used to convert credits to tax savings'],
    ['Surtax',            'Additional tax some provinces charge on top of basic provincial tax'],
    ['Effective Rate',    'Your actual overall tax rate (total tax / total income)'],
  ];

  for (const [term, desc] of dictEntries) {
    addDocCell(ws, r, 1, term);
    ws.getRow(r).getCell(1).font = { ...FONTS.small, bold: true };
    addDocCell(ws, r, 2, desc);
    r++;
  }

  freezeRows(ws, PURPOSE_ROWS + 1);
  return ws;
}

export { SHEET_NAME as TAX_ENGINE_SHEET_NAME };
