/**
 * Sheet 4: Projection — year-by-year formulas.
 * Every cell is an Excel formula referencing Assumptions + Tax Engine + RRIF Rates.
 * Couple scenarios add 10 spouse columns (AT–BC) after NonReg Cost Basis,
 * followed by savings cascade columns (RRSP Deposit, Room tracking, spouse variants).
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
  SPOUSE_DICT_ENTRIES, colToLetter,
  buildCascade, buildCascadeCells,
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

const CASCADE_HEADERS = ['RRSP Deposit', 'RRSP Room', 'TFSA Room'];
const COUPLE_CASCADE = ['Spouse RRSP Deposit', 'Spouse TFSA Deposit', 'Spouse RRSP Room', 'Spouse TFSA Room'];

export function buildProjectionSheet(wb, scenario) {
  const ws = wb.addWorksheet(SHEET_NAME, { properties: { tabColor: { argb: 'FF2E75B6' } } });
  const isCouple = !!scenario.isCouple;

  const currentYear = new Date().getFullYear();
  const numYears = scenario.lifeExpectancy - scenario.currentAge + 1;
  const headers = isCouple
    ? [...BASE_HEADERS, ...SPOUSE_HEADERS, ...CASCADE_HEADERS, ...COUPLE_CASCADE]
    : [...BASE_HEADERS, ...CASCADE_HEADERS];

  // Cascade column indices (1-based) and letters
  const cStart = (isCouple ? BASE_HEADERS.length + SPOUSE_HEADERS.length : BASE_HEADERS.length) + 1;
  const cl = {
    rrspDep: colToLetter(cStart), rrspRoom: colToLetter(cStart + 1), tfsaRoom: colToLetter(cStart + 2),
  };
  if (isCouple) {
    cl.spRrspDep = colToLetter(cStart + 3);
    cl.spTfsaDep = colToLetter(cStart + 4);
    cl.spRrspRoom = colToLetter(cStart + 5);
    cl.spTfsaRoom = colToLetter(cStart + 6);
  }

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
  for (let c = cStart; c <= cStart + (isCouple ? 6 : 2); c++) widths.push([c, 14]);
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

    // Cascade formula fragments
    const cascade = buildCascade(r, prevR, isFirst, isCouple, cl);

    buildPrimaryCells(row, r, prevR, isFirst, isCouple, {
      prevRrsp, prevTfsa, prevNonReg, prevOther, prevMort,
      cppAdj, oasAdj, currentYear, cascade, cl,
    });

    if (isCouple) {
      buildSpouseCells(row, r, isFirst, prevR, spCppAdj, spOasAdj, cl.spRrspDep, cl.spTfsaDep);
    }

    buildCascadeCells(row, r, prevR, isFirst, isCouple, cl, cascade, cStart);
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
  const { prevRrsp, prevTfsa, prevNonReg, prevOther, prevMort, cppAdj, oasAdj, currentYear, cascade, cl } = ctx;
  const f = (col, formula, fmt = FMT.currency) => { row.getCell(col).value = { formula }; row.getCell(col).numFmt = fmt; };

  f(1, isFirst ? 'Assumptions_CurrentAge' : `A${prevR}+1`, FMT.int);
  f(2, `${currentYear}+(A${r}-Assumptions_CurrentAge)`, FMT.int);
  f(3, `IF(A${r}>=Assumptions_RetirementAge,1,0)`, FMT.int);
  f(4, `(1+Assumptions_Inflation)^(A${r}-Assumptions_CurrentAge)`, '0.0000');
  f(5, `IF(AND(C${r}=0,Assumptions_StillWorking=1),Assumptions_EmploymentIncome*D${r},0)`);
  f(6, `IF(A${r}>=Assumptions_CppStartAge, Assumptions_CppMonthly*12*${cppAdj}*D${r}, 0)`);
  f(7, `IF(A${r}>=Assumptions_OasStartAge, Assumptions_OasMonthly*12*(${oasAdj})*D${r}, 0)`);
  f(8, `IF(AND(Assumptions_PensionType="db",A${r}>=Assumptions_DbPensionStartAge), IF(Assumptions_DbPensionIndexed=1, Assumptions_DbPensionAnnual*D${r}, Assumptions_DbPensionAnnual), 0)`);
  f(9, `IF(AND(A${r}>=72,${prevRrsp}>0), VLOOKUP(MIN(A${r},95),RrifRates,2,TRUE)*${prevRrsp}, 0)`);
  f(10, `IF(AND(Assumptions_MeltdownEnabled=1,A${r}>=Assumptions_MeltdownStartAge,A${r}<Assumptions_MeltdownTargetAge), MIN(Assumptions_MeltdownAnnual,${prevRrsp}), 0)`);
  f(11, `MIN(MAX(I${r},J${r}),${prevRrsp})`);

  const lFormula = isCouple
    ? `E${r}+F${r}+G${r}+H${r}+K${r}+AU${r}+AV${r}+AZ${r}+AX${r}+BA${r}`
    : `E${r}+F${r}+G${r}+H${r}+K${r}`;
  f(12, lFormula);
  f(13, `IF(C${r}=1, Assumptions_MonthlyExpenses*12*(1-Assumptions_ExpenseReduction), Assumptions_MonthlyExpenses*12)*D${r}`);
  f(14, `IF(AND(${prevMort}>0, (A${r}-Assumptions_CurrentAge)<Assumptions_MortgageYears), IF(Assumptions_MortgageRate=0, ${prevMort}/MAX(1,Assumptions_MortgageYears-(A${r}-Assumptions_CurrentAge)), ${prevMort}*Assumptions_MortgageRate*(1+Assumptions_MortgageRate)^MAX(1,Assumptions_MortgageYears-(A${r}-Assumptions_CurrentAge))/((1+Assumptions_MortgageRate)^MAX(1,Assumptions_MortgageYears-(A${r}-Assumptions_CurrentAge))-1)), 0)`);
  f(15, debtPaymentFormula(r));
  f(16, `M${r}+N${r}+O${r}`);
  f(17, `IF(L${r}<=0, 0, ${fedTaxFormula(r).replace(/AE/g, 'L')})`);
  f(18, `L${r}-Q${r}`);
  f(19, `MAX(0,P${r}-R${r})`);
  f(20, `MIN(S${r},${prevTfsa})`);
  f(21, `MAX(0,S${r}-T${r})`);
  f(22, `MIN(U${r},${prevNonReg})`);
  f(23, `MAX(0,U${r}-V${r})`);
  f(24, `INDEX(FedBracketRate,MATCH(L${r},FedBracketMin,1))+INDEX(ProvBracketRate,MATCH(L${r},ProvBracketMin,1))`, FMT.pct);
  f(25, `IF(W${r}>0, MIN(IF(X${r}>=1, W${r}, W${r}/(1-X${r})), MAX(0,${prevRrsp}-K${r})), 0)`);
  f(26, `K${r}+Y${r}`);
  f(27, `IF(W${r}>Y${r}*(1-X${r}), MIN(MAX(0,W${r}-Y${r}*(1-X${r})),${prevOther}), 0)`);
  f(28, `MIN(Assumptions_OasMaxAnnual, MAX(0,(E${r}+F${r}+G${r}+H${r}+Z${r}-Assumptions_OasClawbackThresh)*Assumptions_OasClawbackRate))`);
  f(29, `MAX(0,G${r}-AB${r})`);

  const cbRatio = isFirst
    ? `IF(Assumptions_NonRegBalance>0, MAX(0,1-Assumptions_NonRegCostBasis/Assumptions_NonRegBalance), 0)`
    : `IF(AN${prevR}>0, MAX(0,1-AS${prevR}/AN${prevR}), 0)`;
  f(30, `V${r}*${cbRatio}*Assumptions_CapGainsRate`);

  const ae = isCouple
    ? `E${r}+F${r}+AC${r}+H${r}+Z${r}+AD${r}+AU${r}+AV${r}+AZ${r}+AX${r}+BA${r}`
    : `E${r}+F${r}+AC${r}+H${r}+Z${r}+AD${r}`;
  f(31, ae);
  f(32, fedTaxFormula(r));
  f(33, provTaxFormula(r));
  f(34, `AF${r}+AG${r}`);

  const ai = isCouple
    ? `E${r}+F${r}+AC${r}+H${r}+Z${r}+T${r}+V${r}+AA${r}+AU${r}+AV${r}+AZ${r}+AX${r}+BA${r}-AH${r}`
    : `E${r}+F${r}+AC${r}+H${r}+Z${r}+T${r}+V${r}+AA${r}-AH${r}`;
  f(35, ai);

  // AJ: Surplus — subtract savings target
  f(36, `AI${r}-M${r}-N${r}-O${r}-${cascade.savTarget}`);

  // AK: TFSA Deposit — savings cascade TFSA + surplus TFSA
  const { tfsaFromSav, availTfsaRoom, nonRegFromSav } = cascade;
  const surplusTfsa = `IF(AJ${r}>0,MIN(AJ${r},MAX(0,${availTfsaRoom}-${tfsaFromSav})),0)`;
  f(37, `${tfsaFromSav}+${surplusTfsa}`);

  // AL: RRSP Balance — add RRSP deposits
  f(38, `MAX(0,${prevRrsp}-Z${r}+${cl.rrspDep}${r})*(1+Assumptions_RealReturn)`);
  f(39, `MAX(0,${prevTfsa}-T${r}+AK${r})*(1+Assumptions_TfsaReturn)`);

  // AN: NonReg Balance — add savings cascade NonReg + surplus overflow (after primary TFSA + spouse TFSA)
  const spTfsaDepRef = isCouple ? `${cl.spTfsaDep}${r}` : '0';
  const surplusNonReg = `MAX(0,AJ${r}-AK${r}+${tfsaFromSav}-${spTfsaDepRef})`;
  f(40, `MAX(0,${prevNonReg}-V${r}+${nonRegFromSav}+${surplusNonReg})*(1+Assumptions_NonRegReturn)`);
  f(41, `MAX(0,${prevOther}-AA${r})*(1+Assumptions_RealReturn)`);
  f(42, mortgageBalFormula(r, prevMort));

  const aq = isCouple ? `AL${r}+AM${r}+AN${r}+AO${r}+BB${r}+BC${r}` : `AL${r}+AM${r}+AN${r}+AO${r}`;
  f(43, aq);
  f(44, `AQ${r}+Assumptions_RealEstateValue-AP${r}`);

  // AS: NonReg Cost Basis
  const prevCB = isFirst ? 'Assumptions_NonRegCostBasis' : `AS${prevR}`;
  const cbBal = isFirst ? 'Assumptions_NonRegBalance' : `AN${prevR}`;
  const totNrDep = `${nonRegFromSav}+${surplusNonReg}`;
  f(45, `MAX(0,${prevCB}*MAX(0,${cbBal}-V${r})/IF(${cbBal}>0,${cbBal},1))+${totNrDep}`);
}

export { SHEET_NAME as PROJECTION_SHEET_NAME };
