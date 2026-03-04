/**
 * Sheet 5: RRIF Minimum Rates — CRA prescribed lookup table.
 * Projection sheet uses VLOOKUP against this table.
 */
import { RRIF_MIN_RATES } from '../../constants/taxTables.js';
import {
  FONTS, FMT,
  styleHeaderRow, setColWidths, freezeRows,
} from './styles.js';

const SHEET_NAME = 'RRIF Rates';

export function buildRrifRatesSheet(wb) {
  const ws = wb.addWorksheet(SHEET_NAME, { properties: { tabColor: { argb: 'FF548235' } } });
  setColWidths(ws, [[1, 10], [2, 14]]);

  // Header
  const hdr = ws.getRow(1);
  hdr.getCell(1).value = 'Age';
  hdr.getCell(2).value = 'Min Rate';
  styleHeaderRow(hdr, 2);
  freezeRows(ws, 1);

  // Under-71 formula rows: 1 / (90 - age)
  // Write ages 55–70 with the formula
  let r = 2;
  for (let age = 55; age <= 70; age++) {
    const row = ws.getRow(r);
    row.getCell(1).value = age;
    row.getCell(1).numFmt = FMT.int;
    // 1/(90-age)
    const rate = 1 / (90 - age);
    row.getCell(2).value = rate;
    row.getCell(2).numFmt = FMT.pct;
    row.getCell(2).font = FONTS.normal;
    r++;
  }

  // CRA prescribed rates 71–95
  const ages = Object.keys(RRIF_MIN_RATES).map(Number).sort((a, b) => a - b);
  for (const age of ages) {
    const row = ws.getRow(r);
    row.getCell(1).value = age;
    row.getCell(1).numFmt = FMT.int;
    row.getCell(2).value = RRIF_MIN_RATES[age];
    row.getCell(2).numFmt = FMT.pct;
    row.getCell(2).font = FONTS.normal;
    r++;
  }

  // Define named range for VLOOKUP: RrifRates = A2:B<last>
  const lastRow = r - 1;
  wb.definedNames.add(`'${SHEET_NAME}'!$A$2:$B$${lastRow}`, 'RrifRates');

  return ws;
}

export { SHEET_NAME as RRIF_SHEET_NAME };
