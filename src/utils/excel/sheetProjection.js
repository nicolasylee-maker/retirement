/**
 * Sheet 4: Projection — year-by-year formulas.
 * Every cell is an Excel formula referencing Assumptions + Tax Engine + RRIF Rates.
 * Couple scenarios add 10 spouse columns (AT–BC) after NonReg Cost Basis.
 */
import {
  FONTS, COLORS, FMT,
  styleHeaderRow, freezeRows, setColWidths,
  addPurposeRows, addDocCell,
} from './styles.js';
import {
  fedTaxFormula, provTaxFormula,
  debtPaymentFormula, mortgageBalFormula,
  buildSpouseCells, buildBaseDictEntries,
  SPOUSE_DICT_ENTRIES,
} from './projectionFormulas.js';

const SHEET_NAME = 'Projection';
const PURPOSE_ROWS = 3; // rows 1-2 purpose + row 3 blank
const HDR_ROW = PURPOSE_ROWS + 2; // row 5
export const FIRST_DATA = PURPOSE_ROWS + 3; // row 6 = first year

const BASE_HEADERS = [
  'Age','Year','Retired?','Inflation Factor',
  'Employment','CPP','OAS Gross','Pension',
  'RRIF Min','Meltdown','Base RRSP Wd',
  'Taxable Before Grossup',
  'Expenses','Mortgage Pmt','Debt Pmt','Total Need',
  'Tax on Known','After-Tax Known','Shortfall',
  'TFSA Wd','After TFSA',
  'NonReg Wd','After NonReg',
  'Marginal Rate','RRSP Grossup','Total RRSP Wd',
  'Other Wd',
  'OAS Clawback','OAS Net',
  'NonReg Gain','Total Taxable',
  'Federal Tax','Provincial Tax','Total Tax',
  'After-Tax Income','Surplus',
  'TFSA Deposit',
  'RRSP Bal','TFSA Bal','NonReg Bal','Other Bal',
  'Mortgage Bal','Total Portfolio','Net Worth','NonReg Cost Basis',
];

const SPOUSE_HEADERS = [
  'Spouse Age', 'Spouse Employment', 'Spouse CPP', 'Spouse OAS Gross',
  'Spouse Pension', 'Spouse RRIF Min', 'Spouse OAS Net', 'Spouse RRSP Wd',
  'Spouse RRSP Bal', 'Spouse TFSA Bal',
];

export function buildProjectionSheet(wb, scenario) {
  const ws = wb.addWorksheet(SHEET_NAME, { properties: { tabColor: { argb: 'FF2E75B6' } } });
  const isCouple = !!scenario.isCouple;

  const currentYear = new Date().getFullYear();
  const numYears = scenario.lifeExpectancy - scenario.currentAge + 1;
  const headers = isCouple ? [...BASE_HEADERS, ...SPOUSE_HEADERS] : BASE_HEADERS;

  addPurposeRows(ws,
    'This is your complete financial life, one row per year from today until life expectancy. ' +
    'Every number is a formula \u2014 change an assumption and watch your entire future recalculate. ' +
    'Green surplus = saving money. Red = drawing down. Portfolio hits $0 = trouble.',
    1, headers.length);

  const titleRow = ws.getRow(PURPOSE_ROWS + 1);
  titleRow.getCell(1).value = 'YEAR-BY-YEAR PROJECTION';
  titleRow.getCell(1).font = { ...FONTS.header, color: { argb: COLORS.headerBg } };

  const widths = [
    [1,6],[2,6],[3,4],[4,10],[5,14],[6,12],[7,12],[8,12],
    [9,12],[10,12],[11,12],[12,14],[13,14],[14,12],[15,12],[16,14],
    [17,12],[18,14],[19,12],[20,12],[21,12],[22,12],[23,12],
    [24,8],[25,14],[26,14],[27,12],[28,12],[29,12],[30,12],[31,14],
    [32,12],[33,12],[34,12],[35,14],[36,12],[37,12],
    [38,14],[39,14],[40,14],[41,14],[42,14],[43,14],[44,14],[45,14],
  ];
  if (isCouple) { for (let c = 46; c <= 55; c++) widths.push([c, 14]); }
  setColWidths(ws, widths);

  const hdr = ws.getRow(HDR_ROW);
  headers.forEach((h, i) => { hdr.getCell(i + 1).value = h; });
  styleHeaderRow(hdr, headers.length);
  freezeRows(ws, HDR_ROW);

  // Adjustment factors
  const cppAdj = `IF((Assumptions_CppStartAge-65)*12<0, 1+(Assumptions_CppStartAge-65)*12*CppEarlyReduction, 1+(Assumptions_CppStartAge-65)*12*CppLateIncrease)`;
  const oasAdj = `1+MAX(0, MIN(Assumptions_OasStartAge, OasMaxDeferAge)-OasStdStartAge)*12*OasDeferralBonus`;
  const spCppAdj = `IF((Assumptions_SpouseCppStartAge-65)*12<0, 1+(Assumptions_SpouseCppStartAge-65)*12*CppEarlyReduction, 1+(Assumptions_SpouseCppStartAge-65)*12*CppLateIncrease)`;
  const spOasAdj = `1+MAX(0, MIN(Assumptions_SpouseOasStartAge, OasMaxDeferAge)-OasStdStartAge)*12*OasDeferralBonus`;

  for (let i = 0; i < numYears; i++) {
    const r = FIRST_DATA + i;
    const prevR = r - 1;
    const isFirst = i === 0;
    const row = ws.getRow(r);

    const prevRrsp   = isFirst ? 'Assumptions_RrspBalance'     : `AL${prevR}`;
    const prevTfsa   = isFirst ? 'Assumptions_TfsaBalance'     : `AM${prevR}`;
    const prevNonReg = isFirst ? 'Assumptions_NonRegBalance'   : `AN${prevR}`;
    const prevOther  = isFirst ? 'Assumptions_OtherAssets'     : `AO${prevR}`;
    const prevMort   = isFirst ? 'Assumptions_MortgageBalance' : `AP${prevR}`;

    buildPrimaryCells(row, r, prevR, isFirst, isCouple, {
      prevRrsp, prevTfsa, prevNonReg, prevOther, prevMort,
      cppAdj, oasAdj, currentYear,
    });

    if (isCouple) {
      buildSpouseCells(row, r, isFirst, prevR, spCppAdj, spOasAdj);
    }
  }

  // Conditional formatting
  const lastDataRow = FIRST_DATA + numYears - 1;
  ws.addConditionalFormatting({
    ref: `AQ${FIRST_DATA}:AQ${lastDataRow}`,
    rules: [{ type: 'cellIs', operator: 'lessThanOrEqual', formulae: ['0'],
      style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: COLORS.redFill } } } }],
  });
  ws.addConditionalFormatting({
    ref: `AJ${FIRST_DATA}:AJ${lastDataRow}`,
    rules: [{ type: 'cellIs', operator: 'greaterThan', formulae: ['0'],
      style: { font: { color: { argb: COLORS.greenFont } } } }],
  });

  // Dictionary
  let dr = lastDataRow + 2;
  ws.getRow(dr).getCell(1).value = 'COLUMN DICTIONARY';
  ws.getRow(dr).getCell(1).font = { ...FONTS.bold, size: 12 };
  dr++;

  const dictEntries = buildBaseDictEntries(isCouple);
  if (isCouple) dictEntries.push(...SPOUSE_DICT_ENTRIES);
  for (const [col, desc] of dictEntries) {
    addDocCell(ws, dr, 1, col);
    addDocCell(ws, dr, 2, desc);
    ws.getRow(dr).getCell(1).font = { ...FONTS.small, bold: true };
    dr++;
  }

  return ws;
}

/** Build primary columns A–AS (cols 1–45) for a single row. */
function buildPrimaryCells(row, r, prevR, isFirst, isCouple, ctx) {
  const { prevRrsp, prevTfsa, prevNonReg, prevOther, prevMort, cppAdj, oasAdj, currentYear } = ctx;

  row.getCell(1).value = { formula: isFirst ? 'Assumptions_CurrentAge' : `A${prevR}+1` };
  row.getCell(1).numFmt = FMT.int;
  row.getCell(2).value = { formula: `${currentYear}+(A${r}-Assumptions_CurrentAge)` };
  row.getCell(2).numFmt = FMT.int;
  row.getCell(3).value = { formula: `IF(A${r}>=Assumptions_RetirementAge,1,0)` };
  row.getCell(3).numFmt = FMT.int;
  row.getCell(4).value = { formula: `(1+Assumptions_Inflation)^(A${r}-Assumptions_CurrentAge)` };
  row.getCell(4).numFmt = '0.0000';

  row.getCell(5).value = { formula: `IF(AND(C${r}=0,Assumptions_StillWorking=1),Assumptions_EmploymentIncome*D${r},0)` };
  row.getCell(5).numFmt = FMT.currency;
  row.getCell(6).value = { formula: `IF(A${r}>=Assumptions_CppStartAge, Assumptions_CppMonthly*12*${cppAdj}*D${r}, 0)` };
  row.getCell(6).numFmt = FMT.currency;
  row.getCell(7).value = { formula: `IF(A${r}>=Assumptions_OasStartAge, Assumptions_OasMonthly*12*(${oasAdj})*D${r}, 0)` };
  row.getCell(7).numFmt = FMT.currency;
  row.getCell(8).value = { formula: `IF(AND(Assumptions_PensionType="db",A${r}>=Assumptions_DbPensionStartAge), IF(Assumptions_DbPensionIndexed=1, Assumptions_DbPensionAnnual*D${r}, Assumptions_DbPensionAnnual), 0)` };
  row.getCell(8).numFmt = FMT.currency;

  row.getCell(9).value = { formula: `IF(AND(A${r}>=72,${prevRrsp}>0), VLOOKUP(MIN(A${r},95),RrifRates,2,TRUE)*${prevRrsp}, 0)` };
  row.getCell(9).numFmt = FMT.currency;
  row.getCell(10).value = { formula: `IF(AND(Assumptions_MeltdownEnabled=1,A${r}>=Assumptions_MeltdownStartAge,A${r}<Assumptions_MeltdownTargetAge), MIN(Assumptions_MeltdownAnnual,${prevRrsp}), 0)` };
  row.getCell(10).numFmt = FMT.currency;
  row.getCell(11).value = { formula: `MIN(MAX(I${r},J${r}),${prevRrsp})` };
  row.getCell(11).numFmt = FMT.currency;

  // L: Taxable Before Grossup — couple includes spouse income
  const lFormula = isCouple
    ? `E${r}+F${r}+G${r}+H${r}+K${r}+AU${r}+AV${r}+AZ${r}+AX${r}+BA${r}`
    : `E${r}+F${r}+G${r}+H${r}+K${r}`;
  row.getCell(12).value = { formula: lFormula };
  row.getCell(12).numFmt = FMT.currency;

  row.getCell(13).value = { formula: `IF(C${r}=1, Assumptions_MonthlyExpenses*12*(1-Assumptions_ExpenseReduction), Assumptions_MonthlyExpenses*12)*D${r}` };
  row.getCell(13).numFmt = FMT.currency;
  row.getCell(14).value = { formula: `IF(AND(${prevMort}>0, (A${r}-Assumptions_CurrentAge)<Assumptions_MortgageYears), IF(Assumptions_MortgageRate=0, ${prevMort}/MAX(1,Assumptions_MortgageYears-(A${r}-Assumptions_CurrentAge)), ${prevMort}*Assumptions_MortgageRate*(1+Assumptions_MortgageRate)^MAX(1,Assumptions_MortgageYears-(A${r}-Assumptions_CurrentAge))/((1+Assumptions_MortgageRate)^MAX(1,Assumptions_MortgageYears-(A${r}-Assumptions_CurrentAge))-1)), 0)` };
  row.getCell(14).numFmt = FMT.currency;
  row.getCell(15).value = { formula: debtPaymentFormula(r) };
  row.getCell(15).numFmt = FMT.currency;
  row.getCell(16).value = { formula: `M${r}+N${r}+O${r}` };
  row.getCell(16).numFmt = FMT.currency;

  row.getCell(17).value = { formula: `IF(L${r}<=0, 0, ${fedTaxFormula(r).replace(/AE/g, 'L')})` };
  row.getCell(17).numFmt = FMT.currency;
  row.getCell(18).value = { formula: `L${r}-Q${r}` };
  row.getCell(18).numFmt = FMT.currency;
  row.getCell(19).value = { formula: `MAX(0,P${r}-R${r})` };
  row.getCell(19).numFmt = FMT.currency;

  row.getCell(20).value = { formula: `MIN(S${r},${prevTfsa})` };
  row.getCell(20).numFmt = FMT.currency;
  row.getCell(21).value = { formula: `MAX(0,S${r}-T${r})` };
  row.getCell(21).numFmt = FMT.currency;
  row.getCell(22).value = { formula: `MIN(U${r},${prevNonReg})` };
  row.getCell(22).numFmt = FMT.currency;
  row.getCell(23).value = { formula: `MAX(0,U${r}-V${r})` };
  row.getCell(23).numFmt = FMT.currency;
  row.getCell(24).value = { formula: `INDEX(FedBracketRate,MATCH(L${r},FedBracketMin,1))+INDEX(ProvBracketRate,MATCH(L${r},ProvBracketMin,1))` };
  row.getCell(24).numFmt = FMT.pct;
  row.getCell(25).value = { formula: `IF(W${r}>0, MIN(IF(X${r}>=1, W${r}, W${r}/(1-X${r})), MAX(0,${prevRrsp}-K${r})), 0)` };
  row.getCell(25).numFmt = FMT.currency;
  row.getCell(26).value = { formula: `K${r}+Y${r}` };
  row.getCell(26).numFmt = FMT.currency;
  row.getCell(27).value = { formula: `IF(W${r}>Y${r}*(1-X${r}), MIN(MAX(0,W${r}-Y${r}*(1-X${r})),${prevOther}), 0)` };
  row.getCell(27).numFmt = FMT.currency;

  row.getCell(28).value = { formula: `MIN(Assumptions_OasMaxAnnual, MAX(0,(E${r}+F${r}+G${r}+H${r}+Z${r}-Assumptions_OasClawbackThresh)*Assumptions_OasClawbackRate))` };
  row.getCell(28).numFmt = FMT.currency;
  row.getCell(29).value = { formula: `MAX(0,G${r}-AB${r})` };
  row.getCell(29).numFmt = FMT.currency;

  const costBasisRatio = isFirst
    ? `IF(Assumptions_NonRegBalance>0, MAX(0,1-Assumptions_NonRegCostBasis/Assumptions_NonRegBalance), 0)`
    : `IF(AN${prevR}>0, MAX(0,1-AS${prevR}/AN${prevR}), 0)`;
  row.getCell(30).value = { formula: `V${r}*${costBasisRatio}*Assumptions_CapGainsRate` };
  row.getCell(30).numFmt = FMT.currency;

  // AE: Total Taxable — couple adds spouse
  const aeFormula = isCouple
    ? `E${r}+F${r}+AC${r}+H${r}+Z${r}+AD${r}+AU${r}+AV${r}+AZ${r}+AX${r}+BA${r}`
    : `E${r}+F${r}+AC${r}+H${r}+Z${r}+AD${r}`;
  row.getCell(31).value = { formula: aeFormula };
  row.getCell(31).numFmt = FMT.currency;

  row.getCell(32).value = { formula: fedTaxFormula(r) };
  row.getCell(32).numFmt = FMT.currency;
  row.getCell(33).value = { formula: provTaxFormula(r) };
  row.getCell(33).numFmt = FMT.currency;
  row.getCell(34).value = { formula: `AF${r}+AG${r}` };
  row.getCell(34).numFmt = FMT.currency;

  // AI: After-Tax Income — couple adds spouse income
  const aiFormula = isCouple
    ? `E${r}+F${r}+AC${r}+H${r}+Z${r}+T${r}+V${r}+AA${r}+AU${r}+AV${r}+AZ${r}+AX${r}+BA${r}-AH${r}`
    : `E${r}+F${r}+AC${r}+H${r}+Z${r}+T${r}+V${r}+AA${r}-AH${r}`;
  row.getCell(35).value = { formula: aiFormula };
  row.getCell(35).numFmt = FMT.currency;

  row.getCell(36).value = { formula: `AI${r}-M${r}-N${r}-O${r}` };
  row.getCell(36).numFmt = FMT.currency;
  row.getCell(37).value = { formula: `IF(AJ${r}>0, MIN(AJ${r}, Assumptions_TfsaAnnualLimit), 0)` };
  row.getCell(37).numFmt = FMT.currency;
  row.getCell(38).value = { formula: `MAX(0,${prevRrsp}-Z${r})*(1+Assumptions_RealReturn)` };
  row.getCell(38).numFmt = FMT.currency;
  row.getCell(39).value = { formula: `MAX(0,${prevTfsa}-T${r}+AK${r})*(1+Assumptions_TfsaReturn)` };
  row.getCell(39).numFmt = FMT.currency;

  const overflow = `MAX(0,AJ${r}-AK${r})`;
  row.getCell(40).value = { formula: `MAX(0,${prevNonReg}-V${r}+${overflow})*(1+Assumptions_NonRegReturn)` };
  row.getCell(40).numFmt = FMT.currency;
  row.getCell(41).value = { formula: `MAX(0,${prevOther}-AA${r})*(1+Assumptions_RealReturn)` };
  row.getCell(41).numFmt = FMT.currency;
  row.getCell(42).value = { formula: mortgageBalFormula(r, prevMort) };
  row.getCell(42).numFmt = FMT.currency;

  // AQ: Total Portfolio — couple includes spouse
  const aqFormula = isCouple
    ? `AL${r}+AM${r}+AN${r}+AO${r}+BB${r}+BC${r}`
    : `AL${r}+AM${r}+AN${r}+AO${r}`;
  row.getCell(43).value = { formula: aqFormula };
  row.getCell(43).numFmt = FMT.currency;

  row.getCell(44).value = { formula: `AQ${r}+Assumptions_RealEstateValue-AP${r}` };
  row.getCell(44).numFmt = FMT.currency;

  const prevCostBasis = isFirst ? 'Assumptions_NonRegCostBasis' : `AS${prevR}`;
  const cbPrevBal = isFirst ? 'Assumptions_NonRegBalance' : `AN${prevR}`;
  const overflowDeposit = `MAX(0,AJ${r}-AK${r})`;
  row.getCell(45).value = { formula:
    `MAX(0,${prevCostBasis}*MAX(0,${cbPrevBal}-V${r})/IF(${cbPrevBal}>0,${cbPrevBal},1))+${overflowDeposit}` };
  row.getCell(45).numFmt = FMT.currency;
}

export { SHEET_NAME as PROJECTION_SHEET_NAME };
