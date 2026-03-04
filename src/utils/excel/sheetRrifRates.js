/**
 * Sheet 5: RRIF Minimum Rates — CRA prescribed lookup table.
 * Projection sheet uses VLOOKUP against this table.
 */
import { RRIF_MIN_RATES } from '../../constants/taxTables.js';
import {
  FONTS, FMT,
  styleHeaderRow, setColWidths, freezeRows,
  addPurposeRows, addDocCell,
} from './styles.js';

const SHEET_NAME = 'RRIF Rates';
const PURPOSE_ROWS = 3; // rows 1-2 purpose + row 3 blank

export function buildRrifRatesSheet(wb) {
  const ws = wb.addWorksheet(SHEET_NAME, { properties: { tabColor: { argb: 'FF548235' } } });
  setColWidths(ws, [[1, 10], [2, 14], [3, 16], [4, 16]]);

  // Purpose rows (1-2)
  addPurposeRows(ws,
    'After age 71, the government forces you to convert your RRSP to a RRIF and withdraw a minimum ' +
    'percentage every year. These are the CRA-prescribed rates. The percentage increases with age \u2014 ' +
    'by 95, you must withdraw 20% per year.',
    1, 4);

  // Header
  const hdr = ws.getRow(PURPOSE_ROWS + 1);
  hdr.getCell(1).value = 'Age';
  hdr.getCell(2).value = 'Min Rate';
  hdr.getCell(3).value = 'On $100K';
  hdr.getCell(4).value = 'On $200K';
  styleHeaderRow(hdr, 4);
  freezeRows(ws, PURPOSE_ROWS + 1);

  // Under-71 formula rows: 1 / (90 - age)
  let r = PURPOSE_ROWS + 2;
  for (let age = 55; age <= 70; age++) {
    const row = ws.getRow(r);
    row.getCell(1).value = age;
    row.getCell(1).numFmt = FMT.int;
    const rate = 1 / (90 - age);
    row.getCell(2).value = rate;
    row.getCell(2).numFmt = FMT.pct;
    row.getCell(2).font = FONTS.normal;
    // Example columns
    row.getCell(3).value = Math.round(100000 * rate);
    row.getCell(3).numFmt = FMT.currency;
    row.getCell(3).font = FONTS.small;
    row.getCell(4).value = Math.round(200000 * rate);
    row.getCell(4).numFmt = FMT.currency;
    row.getCell(4).font = FONTS.small;
    r++;
  }

  // CRA prescribed rates 71–95
  const ages = Object.keys(RRIF_MIN_RATES).map(Number).sort((a, b) => a - b);
  for (const age of ages) {
    const row = ws.getRow(r);
    const rate = RRIF_MIN_RATES[age];
    row.getCell(1).value = age;
    row.getCell(1).numFmt = FMT.int;
    row.getCell(2).value = rate;
    row.getCell(2).numFmt = FMT.pct;
    row.getCell(2).font = FONTS.normal;
    row.getCell(3).value = Math.round(100000 * rate);
    row.getCell(3).numFmt = FMT.currency;
    row.getCell(3).font = FONTS.small;
    row.getCell(4).value = Math.round(200000 * rate);
    row.getCell(4).numFmt = FMT.currency;
    row.getCell(4).font = FONTS.small;
    r++;
  }

  // Define named range for VLOOKUP: RrifRates = A{firstData}:B{last}
  const firstDataRow = PURPOSE_ROWS + 2;
  const lastRow = r - 1;
  wb.definedNames.add(`'${SHEET_NAME}'!$A$${firstDataRow}:$B$${lastRow}`, 'RrifRates');

  r++; // blank

  // === Dictionary ===
  const dictHdr = ws.getRow(r);
  dictHdr.getCell(1).value = 'COLUMN DICTIONARY';
  dictHdr.getCell(1).font = { ...FONTS.bold, size: 12 };
  r++;

  const dictEntries = [
    ['Age',         'Your age in this row'],
    ['Min Rate',    'CRA-prescribed minimum percentage you must withdraw from your RRIF each year'],
    ['On $100K',    'Example: how much you\'d have to withdraw if your RRIF balance were $100,000'],
    ['On $200K',    'Example: how much you\'d have to withdraw if your RRIF balance were $200,000'],
  ];

  for (const [term, desc] of dictEntries) {
    addDocCell(ws, r, 1, term);
    ws.getRow(r).getCell(1).font = { ...FONTS.small, bold: true };
    addDocCell(ws, r, 2, desc);
    r++;
  }

  return ws;
}

export { SHEET_NAME as RRIF_SHEET_NAME };
