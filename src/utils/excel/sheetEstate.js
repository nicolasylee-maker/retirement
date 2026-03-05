/**
 * Sheet 6: Estate Calculator — deemed disposition tax at death.
 * References Assumptions + Projection final-year balances.
 * Couple scenarios include spouse RRSP/TFSA in final balances.
 */
import {
  FONTS, COLORS, FMT,
  styleHeaderRow, styleSectionRow, setColWidths,
  addPurposeRows, addDocCell,
} from './styles.js';
import { PROVINCE_DATA, PROBATE } from '../../constants/taxTables.js';
import { FIRST_DATA as PROJ_FIRST_DATA } from './sheetProjection.js';

const SHEET_NAME = 'Estate';
const PURPOSE_ROWS = 3; // rows 1-2 purpose + row 3 blank

export function buildEstateSheet(wb, scenario, projectionData) {
  const ws = wb.addWorksheet(SHEET_NAME, { properties: { tabColor: { argb: 'FF7030A0' } } });
  setColWidths(ws, [[1, 28], [2, 18], [3, 18]]);
  const isCouple = !!scenario.isCouple;

  // Purpose rows (1-2)
  addPurposeRows(ws,
    'What happens to your money when you die. This shows how much your heirs actually receive ' +
    'after the government takes its share in taxes and probate fees.',
    1, 3);

  const lastAge = scenario.lifeExpectancy;
  const numYears = lastAge - scenario.currentAge + 1;
  const lastProjRow = PROJ_FIRST_DATA + numYears - 1; // last data row in Projection

  let r = PURPOSE_ROWS + 1; // start at row 4

  // Title
  const titleRow = ws.getRow(r);
  titleRow.getCell(1).value = 'ESTATE ANALYSIS AT DEATH';
  titleRow.getCell(1).font = { ...FONTS.header, color: { argb: COLORS.headerBg } };
  r += 2;

  // Section: Final Balances (from Projection last row)
  styleSectionRow(ws.getRow(r), 3);
  ws.getRow(r).getCell(1).value = 'Final Portfolio Balances';
  r++;

  const balRows = [
    ['RRSP/RRIF Balance',  `'Projection'!AL${lastProjRow}`, FMT.currency],
    ['TFSA Balance',        `'Projection'!AM${lastProjRow}`, FMT.currency],
    ['Non-Reg Balance',     `'Projection'!AN${lastProjRow}`, FMT.currency],
    ['Other Assets',        `'Projection'!AO${lastProjRow}`, FMT.currency],
  ];

  // Couple: add spouse accounts
  if (isCouple) {
    balRows.push(
      ['Spouse RRSP/RRIF',   `'Projection'!BB${lastProjRow}`, FMT.currency],
      ['Spouse TFSA',         `'Projection'!BC${lastProjRow}`, FMT.currency],
    );
  }

  balRows.push(
    ['Total Portfolio',     `'Projection'!AQ${lastProjRow}`, FMT.currency],
    ['Real Estate Value',   'Assumptions_RealEstateValue',   FMT.currency],
    ['Mortgage Balance',    `'Projection'!AP${lastProjRow}`, FMT.currency],
  );

  const balStartRow = r;
  for (const [label, formula, fmt] of balRows) {
    const row = ws.getRow(r);
    row.getCell(1).value = label;
    row.getCell(1).font = FONTS.normal;
    row.getCell(2).value = { formula };
    row.getCell(2).numFmt = fmt;
    r++;
  }

  // Cell references depend on whether couple (shifted by 2 for spouse rows)
  const rrspBalCell = `B${balStartRow}`;
  const nonRegBalCell = `B${balStartRow + 2}`;
  const totalPortCell = isCouple ? `B${balStartRow + 6}` : `B${balStartRow + 4}`;
  const realEstCell = isCouple ? `B${balStartRow + 7}` : `B${balStartRow + 5}`;
  const mortBalCell = isCouple ? `B${balStartRow + 8}` : `B${balStartRow + 6}`;
  const tfsaBalCell = `B${balStartRow + 1}`;

  if (isCouple) {
    r++;
    ws.getRow(r).getCell(1).value = 'Note: Spouse accounts pass to surviving spouse tax-free on first death.';
    ws.getRow(r).getCell(1).font = { ...FONTS.small, italic: true };
    r++;
  }

  r++; // blank

  // Section: Deemed Disposition
  styleSectionRow(ws.getRow(r), 3);
  ws.getRow(r).getCell(1).value = 'Deemed Disposition at Death';
  r++;

  // RRSP fully taxable (primary only — spouse RRSP rolls over tax-free)
  const rrspDeemedRow = r;
  ws.getRow(r).getCell(1).value = 'RRSP Deemed Income';
  ws.getRow(r).getCell(1).font = FONTS.normal;
  ws.getRow(r).getCell(2).value = { formula: rrspBalCell };
  ws.getRow(r).getCell(2).numFmt = FMT.currency;
  r++;

  // Non-Reg capital gains (50% inclusion)
  ws.getRow(r).getCell(1).value = 'Non-Reg Capital Gain';
  ws.getRow(r).getCell(1).font = FONTS.normal;
  ws.getRow(r).getCell(2).value = { formula: `MAX(0,${nonRegBalCell}-Assumptions_NonRegCostBasis)*Assumptions_CapGainsRate` };
  ws.getRow(r).getCell(2).numFmt = FMT.currency;
  const nonRegGainCell = `B${r}`;
  r++;

  // Real estate capital gain (if not primary residence)
  ws.getRow(r).getCell(1).value = 'Real Estate Cap Gain';
  ws.getRow(r).getCell(1).font = FONTS.normal;
  ws.getRow(r).getCell(2).value = { formula: `IF(Assumptions_IsPrimaryRes=1, 0, MAX(0,${realEstCell}-Assumptions_RealEstateCost)*Assumptions_CapGainsRate)` };
  ws.getRow(r).getCell(2).numFmt = FMT.currency;
  const reGainCell = `B${r}`;
  r++;

  // Total deemed income
  ws.getRow(r).getCell(1).value = 'Total Deemed Income';
  ws.getRow(r).getCell(1).font = FONTS.bold;
  ws.getRow(r).getCell(2).value = { formula: `B${rrspDeemedRow}+${nonRegGainCell}+${reGainCell}` };
  ws.getRow(r).getCell(2).numFmt = FMT.currency;
  const totalDeemedCell = `B${r}`;
  r++;

  if (isCouple) {
    ws.getRow(r).getCell(1).value = 'Spouse RRSP passes to surviving spouse without tax; only primary RRSP triggers deemed disposition.';
    ws.getRow(r).getCell(1).font = { ...FONTS.small, italic: true };
    r++;
  }

  r++; // blank

  // Section: Tax on Deemed Income
  styleSectionRow(ws.getRow(r), 3);
  ws.getRow(r).getCell(1).value = 'Tax on Deemed Income';
  r++;

  // Federal tax on deemed
  const fedTaxDeemedRow = r;
  ws.getRow(r).getCell(1).value = 'Federal Tax';
  ws.getRow(r).getCell(1).font = FONTS.normal;
  ws.getRow(r).getCell(2).value = { formula: `MAX(0, SUMPRODUCT(MAX(MIN(${totalDeemedCell},FedBracketMax)-FedBracketMin,0)*FedBracketRate) - FedBasicPersonal*FedCreditRate)` };
  ws.getRow(r).getCell(2).numFmt = FMT.currency;
  r++;

  // Provincial tax on deemed
  ws.getRow(r).getCell(1).value = 'Provincial Tax';
  ws.getRow(r).getCell(1).font = FONTS.normal;
  const provBasicTax = `MAX(0, SUMPRODUCT(MAX(MIN(${totalDeemedCell},ProvBracketMax)-ProvBracketMin,0)*ProvBracketRate) - ProvBasicPersonal*ProvCreditRate)`;
  ws.getRow(r).getCell(2).value = { formula: `${provBasicTax} + MAX(0,(${provBasicTax}-SurtaxThreshold1)*SurtaxRate1) + MAX(0,(${provBasicTax}-SurtaxThreshold2)*SurtaxRate2)` };
  ws.getRow(r).getCell(2).numFmt = FMT.currency;
  r++;

  // Total tax
  ws.getRow(r).getCell(1).value = 'Total Estate Tax';
  ws.getRow(r).getCell(1).font = FONTS.bold;
  ws.getRow(r).getCell(2).value = { formula: `B${fedTaxDeemedRow}+B${fedTaxDeemedRow + 1}` };
  ws.getRow(r).getCell(2).numFmt = FMT.currency;
  const totalTaxCell = `B${r}`;
  r++;

  r++; // blank

  // Section: Probate
  styleSectionRow(ws.getRow(r), 3);
  ws.getRow(r).getCell(1).value = 'Probate Fees';
  r++;

  // Probate estate = portfolio + real estate - TFSA (passes outside estate) - mortgage
  ws.getRow(r).getCell(1).value = 'Probate Estate';
  ws.getRow(r).getCell(1).font = FONTS.normal;
  ws.getRow(r).getCell(2).value = { formula: `MAX(0, ${totalPortCell}+${realEstCell}-${tfsaBalCell}-${mortBalCell})` };
  ws.getRow(r).getCell(2).numFmt = FMT.currency;
  const probateEstateCell = `B${r}`;
  r++;

  // Probate fee formula
  ws.getRow(r).getCell(1).value = 'Probate Fee';
  ws.getRow(r).getCell(1).font = FONTS.normal;
  const firstThresh = PROBATE.firstThreshold;
  const firstRate = PROBATE.firstRate;
  const aboveRate = PROBATE.aboveRate;
  ws.getRow(r).getCell(2).value = { formula: `MIN(${probateEstateCell},${firstThresh})*${firstRate}+MAX(0,${probateEstateCell}-${firstThresh})*${aboveRate}` };
  ws.getRow(r).getCell(2).numFmt = FMT.currency;
  const probateFeeCell = `B${r}`;
  r++;

  r++; // blank

  // Section: Net Estate
  styleSectionRow(ws.getRow(r), 3);
  ws.getRow(r).getCell(1).value = 'Net Estate Summary';
  r++;

  ws.getRow(r).getCell(1).value = 'Gross Estate';
  ws.getRow(r).getCell(1).font = FONTS.normal;
  ws.getRow(r).getCell(2).value = { formula: `${totalPortCell}+${realEstCell}` };
  ws.getRow(r).getCell(2).numFmt = FMT.currency;
  r++;

  ws.getRow(r).getCell(1).value = 'Less: Mortgage';
  ws.getRow(r).getCell(1).font = FONTS.normal;
  ws.getRow(r).getCell(2).value = { formula: mortBalCell };
  ws.getRow(r).getCell(2).numFmt = FMT.currency;
  r++;

  ws.getRow(r).getCell(1).value = 'Less: Estate Tax';
  ws.getRow(r).getCell(1).font = FONTS.normal;
  ws.getRow(r).getCell(2).value = { formula: totalTaxCell };
  ws.getRow(r).getCell(2).numFmt = FMT.currency;
  r++;

  ws.getRow(r).getCell(1).value = 'Less: Probate Fee';
  ws.getRow(r).getCell(1).font = FONTS.normal;
  ws.getRow(r).getCell(2).value = { formula: probateFeeCell };
  ws.getRow(r).getCell(2).numFmt = FMT.currency;
  r++;

  ws.getRow(r).getCell(1).value = 'NET ESTATE';
  ws.getRow(r).getCell(1).font = { ...FONTS.bold, size: 13 };
  ws.getRow(r).getCell(2).value = { formula: `${totalPortCell}+${realEstCell}-${mortBalCell}-${totalTaxCell}-${probateFeeCell}` };
  ws.getRow(r).getCell(2).numFmt = FMT.currency;
  ws.getRow(r).getCell(2).font = { ...FONTS.bold, size: 13 };
  r += 2;

  // === Dictionary ===
  const dictHdr = ws.getRow(r);
  dictHdr.getCell(1).value = 'COLUMN DICTIONARY';
  dictHdr.getCell(1).font = { ...FONTS.bold, size: 12 };
  r++;

  const dictEntries = [
    ['RRSP/RRIF at Death',  'Full balance is treated as income in your final tax return'],
    ['Deemed Income Tax',   'Tax owed on RRSP + capital gains as if you sold everything at death'],
    ['Capital Gains',       'Taxable gain on non-reg investments and investment real estate (50% inclusion)'],
    ['Probate Estate',      'Assets that go through probate (portfolio + real estate - TFSA - mortgage)'],
    ['Probate Fees',        'Provincial fee for validating your will (varies by province)'],
    ['Net to Heirs',        'What your beneficiaries actually receive after all deductions'],
  ];

  if (isCouple) {
    dictEntries.push(
      ['Spouse RRSP/RRIF',   'Passes to surviving spouse tax-free on first death (not deemed disposed)'],
      ['Spouse TFSA',         'Passes to surviving spouse outside probate (designated beneficiary)'],
    );
  }

  for (const [term, desc] of dictEntries) {
    addDocCell(ws, r, 1, term);
    ws.getRow(r).getCell(1).font = { ...FONTS.small, bold: true };
    addDocCell(ws, r, 2, desc);
    r++;
  }

  return ws;
}

export { SHEET_NAME as ESTATE_SHEET_NAME };
