/**
 * Sheet 4: Projection — year-by-year formulas.
 * Every cell is an Excel formula referencing Assumptions + Tax Engine + RRIF Rates.
 */
import {
  FONTS, COLORS, FMT,
  styleHeaderRow, freezeRows, setColWidths,
  addPurposeRows, addDocCell,
} from './styles.js';

const SHEET_NAME = 'Projection';
const PURPOSE_ROWS = 3; // rows 1-2 purpose + row 3 blank
const HDR_ROW = PURPOSE_ROWS + 2; // row 5
export const FIRST_DATA = PURPOSE_ROWS + 3; // row 6 = first year

// Column letters (A=1)
const C = {
  age: 'A', year: 'B', retired: 'C', inflFactor: 'D',
  employment: 'E', cpp: 'F', oasGross: 'G', pension: 'H',
  rrifMin: 'I', meltdown: 'J', baseRrspWd: 'K',
  taxableBeforeGrossup: 'L',
  expenses: 'M', mortgagePmt: 'N', debtPmt: 'O', totalNeed: 'P',
  taxOnKnown: 'Q', afterTaxKnown: 'R', shortfall: 'S',
  tfsaWd: 'T', remainAfterTfsa: 'U',
  nonRegWd: 'V', remainAfterNonReg: 'W',
  margRate: 'X', rrspGrossup: 'Y', totalRrspWd: 'Z',
  otherWd: 'AA',
  oasClawback: 'AB', oasNet: 'AC',
  nonRegGain: 'AD', totalTaxable: 'AE',
  fedTax: 'AF', provTax: 'AG', totalTax: 'AH',
  afterTaxIncome: 'AI', surplus: 'AJ',
  tfsaDeposit: 'AK',
  rrspBal: 'AL', tfsaBal: 'AM', nonRegBal: 'AN', otherBal: 'AO',
  mortgageBal: 'AP', totalPortfolio: 'AQ', netWorth: 'AR',
  nonRegCostBasis: 'AS',
};

const HEADERS = [
  ['Age','Year','Retired?','Inflation Factor',
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
   'Mortgage Bal','Total Portfolio','Net Worth','NonReg Cost Basis'],
];

/** Tax SUMPRODUCT formula for a bracket set. */
function taxSumproduct(incomeCell, bracketMin, bracketMax, bracketRate) {
  return `SUMPRODUCT(MAX(MIN(${incomeCell},${bracketMax})-${bracketMin},0)*${bracketRate})`;
}

/** Federal tax formula with credits. */
function fedTaxFormula(r) {
  const inc = `AE${r}`;
  const grossTax = taxSumproduct(inc, 'FedBracketMin', 'FedBracketMax', 'FedBracketRate');
  // Credits: basic personal + age amount (if 65+) + pension credit (if RRSP wd or pension)
  const ageAmt = `IF(A${r}>=65, MAX(0, FedAgeAmount - MAX(0, ${inc}-FedAgeThreshold)*FedAgeClawRate), 0)`;
  const penCr = `IF(OR(H${r}>0, I${r}>0), FedPensionCredit, 0)`;
  return `MAX(0, ${grossTax} - (FedBasicPersonal + ${ageAmt} + ${penCr}) * FedCreditRate)`;
}

/** Provincial tax formula with credits + surtax. */
function provTaxFormula(r) {
  const inc = `AE${r}`;
  const grossTax = taxSumproduct(inc, 'ProvBracketMin', 'ProvBracketMax', 'ProvBracketRate');
  const ageAmt = `IF(A${r}>=65, MAX(0, ProvAgeAmount - MAX(0, ${inc}-ProvAgeThreshold)*ProvAgeClawRate), 0)`;
  const penCr = `IF(OR(H${r}>0, I${r}>0), ProvPensionCredit, 0)`;
  const basicTax = `MAX(0, ${grossTax} - (ProvBasicPersonal + ${ageAmt} + ${penCr}) * ProvCreditRate)`;
  // Surtax
  const st1 = `MAX(0, (${basicTax}-SurtaxThreshold1)*SurtaxRate1)`;
  const st2 = `MAX(0, (${basicTax}-SurtaxThreshold2)*SurtaxRate2)`;
  return `${basicTax} + ${st1} + ${st2}`;
}

export function buildProjectionSheet(wb, scenario) {
  const ws = wb.addWorksheet(SHEET_NAME, { properties: { tabColor: { argb: 'FF2E75B6' } } });

  const currentYear = new Date().getFullYear();
  const numYears = scenario.lifeExpectancy - scenario.currentAge + 1;

  // Purpose rows (1-2)
  addPurposeRows(ws,
    'This is your complete financial life, one row per year from today until life expectancy. ' +
    'Every number is a formula \u2014 change an assumption and watch your entire future recalculate. ' +
    'Green surplus = saving money. Red = drawing down. Portfolio hits $0 = trouble.',
    1, HEADERS[0].length);

  // Title row
  const titleRow = ws.getRow(PURPOSE_ROWS + 1);
  titleRow.getCell(1).value = 'YEAR-BY-YEAR PROJECTION';
  titleRow.getCell(1).font = { ...FONTS.header, color: { argb: COLORS.headerBg } };

  // Column widths
  const widths = [
    [1,6],[2,6],[3,4],[4,10],
    [5,14],[6,12],[7,12],[8,12],
    [9,12],[10,12],[11,12],[12,14],
    [13,14],[14,12],[15,12],[16,14],
    [17,12],[18,14],[19,12],
    [20,12],[21,12],[22,12],[23,12],
    [24,8],[25,14],[26,14],[27,12],
    [28,12],[29,12],[30,12],[31,14],
    [32,12],[33,12],[34,12],
    [35,14],[36,12],[37,12],
    [38,14],[39,14],[40,14],[41,14],
    [42,14],[43,14],[44,14],[45,14],
  ];
  setColWidths(ws, widths);

  // Header row
  const hdr = ws.getRow(HDR_ROW);
  HEADERS[0].forEach((h, i) => { hdr.getCell(i + 1).value = h; });
  styleHeaderRow(hdr, HEADERS[0].length);
  freezeRows(ws, HDR_ROW);

  // CPP adjustment factor formula (inline)
  // monthsDiff = (CppStartAge - 65) * 12
  // if < 0: 1 + monthsDiff * earlyReduction, else 1 + monthsDiff * lateIncrease
  const cppAdj = `IF((Assumptions_CppStartAge-65)*12<0, 1+(Assumptions_CppStartAge-65)*12*CppEarlyReduction, 1+(Assumptions_CppStartAge-65)*12*CppLateIncrease)`;

  // OAS adjustment factor
  // yearsDeferred = MIN(OasStartAge, OasMaxDeferAge) - OasStdStartAge
  // monthsDeferred = MAX(0, yearsDeferred) * 12
  // bonus = monthsDeferred * deferralBonus
  const oasAdj = `1+MAX(0, MIN(Assumptions_OasStartAge, OasMaxDeferAge)-OasStdStartAge)*12*OasDeferralBonus`;

  for (let i = 0; i < numYears; i++) {
    const r = FIRST_DATA + i;
    const prevR = r - 1;
    const isFirst = i === 0;
    const row = ws.getRow(r);

    // Helper: previous balance refs (first year uses Assumptions)
    const prevRrsp   = isFirst ? 'Assumptions_RrspBalance'   : `AL${prevR}`;
    const prevTfsa   = isFirst ? 'Assumptions_TfsaBalance'   : `AM${prevR}`;
    const prevNonReg = isFirst ? 'Assumptions_NonRegBalance' : `AN${prevR}`;
    const prevOther  = isFirst ? 'Assumptions_OtherAssets'   : `AO${prevR}`;
    const prevMort   = isFirst ? 'Assumptions_MortgageBalance' : `AP${prevR}`;

    // A: Age
    row.getCell(1).value = { formula: isFirst
      ? 'Assumptions_CurrentAge'
      : `A${prevR}+1` };
    row.getCell(1).numFmt = FMT.int;

    // B: Year
    row.getCell(2).value = { formula: `${currentYear}+(A${r}-Assumptions_CurrentAge)` };
    row.getCell(2).numFmt = FMT.int;

    // C: Retired?
    row.getCell(3).value = { formula: `IF(A${r}>=Assumptions_RetirementAge,1,0)` };
    row.getCell(3).numFmt = FMT.int;

    // D: Inflation Factor
    row.getCell(4).value = { formula: `(1+Assumptions_Inflation)^(A${r}-Assumptions_CurrentAge)` };
    row.getCell(4).numFmt = '0.0000';

    // E: Employment Income
    row.getCell(5).value = { formula: `IF(AND(C${r}=0,Assumptions_StillWorking=1),Assumptions_EmploymentIncome*D${r},0)` };
    row.getCell(5).numFmt = FMT.currency;

    // F: CPP Income
    row.getCell(6).value = { formula: `IF(A${r}>=Assumptions_CppStartAge, Assumptions_CppMonthly*12*${cppAdj}*D${r}, 0)` };
    row.getCell(6).numFmt = FMT.currency;

    // G: OAS Gross
    row.getCell(7).value = { formula: `IF(A${r}>=Assumptions_OasStartAge, Assumptions_OasMonthly*12*(${oasAdj})*D${r}, 0)` };
    row.getCell(7).numFmt = FMT.currency;

    // H: Pension Income
    row.getCell(8).value = { formula: `IF(AND(Assumptions_PensionType="db",A${r}>=Assumptions_DbPensionStartAge), IF(Assumptions_DbPensionIndexed=1, Assumptions_DbPensionAnnual*D${r}, Assumptions_DbPensionAnnual), 0)` };
    row.getCell(8).numFmt = FMT.currency;

    // I: RRIF Minimum (kicks in at age 72, matching JS engine)
    row.getCell(9).value = { formula: `IF(AND(A${r}>=72,${prevRrsp}>0), VLOOKUP(MIN(A${r},95),RrifRates,2,TRUE)*${prevRrsp}, 0)` };
    row.getCell(9).numFmt = FMT.currency;

    // J: Meltdown Withdrawal
    row.getCell(10).value = { formula: `IF(AND(Assumptions_MeltdownEnabled=1,A${r}>=Assumptions_MeltdownStartAge,A${r}<Assumptions_MeltdownTargetAge), MIN(Assumptions_MeltdownAnnual,${prevRrsp}), 0)` };
    row.getCell(10).numFmt = FMT.currency;

    // K: Base RRSP Withdrawal = MAX(RRIF min, meltdown)
    row.getCell(11).value = { formula: `MIN(MAX(I${r},J${r}),${prevRrsp})` };
    row.getCell(11).numFmt = FMT.currency;

    // L: Taxable Before Grossup
    row.getCell(12).value = { formula: `E${r}+F${r}+G${r}+H${r}+K${r}` };
    row.getCell(12).numFmt = FMT.currency;

    // M: Expenses
    row.getCell(13).value = { formula: `IF(C${r}=1, Assumptions_MonthlyExpenses*12*(1-Assumptions_ExpenseReduction), Assumptions_MonthlyExpenses*12)*D${r}` };
    row.getCell(13).numFmt = FMT.currency;

    // N: Mortgage Payment (simple amortization)
    row.getCell(14).value = { formula: `IF(AND(${prevMort}>0, (A${r}-Assumptions_CurrentAge)<Assumptions_MortgageYears), IF(Assumptions_MortgageRate=0, ${prevMort}/MAX(1,Assumptions_MortgageYears-(A${r}-Assumptions_CurrentAge)), ${prevMort}*Assumptions_MortgageRate*(1+Assumptions_MortgageRate)^MAX(1,Assumptions_MortgageYears-(A${r}-Assumptions_CurrentAge))/((1+Assumptions_MortgageRate)^MAX(1,Assumptions_MortgageYears-(A${r}-Assumptions_CurrentAge))-1)), 0)` };
    row.getCell(14).numFmt = FMT.currency;

    // O: Consumer + Other Debt payments (simplified — use static from first year)
    // For simplicity in formulas, debt payments are calculated similarly
    row.getCell(15).value = { formula: debtPaymentFormula(r) };
    row.getCell(15).numFmt = FMT.currency;

    // P: Total Need
    row.getCell(16).value = { formula: `M${r}+N${r}+O${r}` };
    row.getCell(16).numFmt = FMT.currency;

    // Q: Tax on Known Income (quick estimate using SUMPRODUCT)
    row.getCell(17).value = { formula: `IF(L${r}<=0, 0, ${fedTaxFormula(r).replace(/AE/g, 'L')})` };
    row.getCell(17).numFmt = FMT.currency;

    // R: After-Tax Known Income
    row.getCell(18).value = { formula: `L${r}-Q${r}` };
    row.getCell(18).numFmt = FMT.currency;

    // S: Shortfall
    row.getCell(19).value = { formula: `MAX(0,P${r}-R${r})` };
    row.getCell(19).numFmt = FMT.currency;

    // T: TFSA Withdrawal (first from shortfall)
    row.getCell(20).value = { formula: `MIN(S${r},${prevTfsa})` };
    row.getCell(20).numFmt = FMT.currency;

    // U: Remaining After TFSA
    row.getCell(21).value = { formula: `MAX(0,S${r}-T${r})` };
    row.getCell(21).numFmt = FMT.currency;

    // V: NonReg Withdrawal
    row.getCell(22).value = { formula: `MIN(U${r},${prevNonReg})` };
    row.getCell(22).numFmt = FMT.currency;

    // W: Remaining After NonReg
    row.getCell(23).value = { formula: `MAX(0,U${r}-V${r})` };
    row.getCell(23).numFmt = FMT.currency;

    // X: Marginal Rate (combined fed + prov)
    row.getCell(24).value = { formula: `INDEX(FedBracketRate,MATCH(L${r},FedBracketMin,1))+INDEX(ProvBracketRate,MATCH(L${r},ProvBracketMin,1))` };
    row.getCell(24).numFmt = FMT.pct;

    // Y: RRSP Grossup Withdrawal = shortfall / (1 - marginal_rate), capped by available RRSP
    row.getCell(25).value = { formula: `IF(W${r}>0, MIN(IF(X${r}>=1, W${r}, W${r}/(1-X${r})), MAX(0,${prevRrsp}-K${r})), 0)` };
    row.getCell(25).numFmt = FMT.currency;

    // Z: Total RRSP Withdrawal
    row.getCell(26).value = { formula: `K${r}+Y${r}` };
    row.getCell(26).numFmt = FMT.currency;

    // AA: Other Withdrawal (remaining shortfall after RRSP grossup)
    row.getCell(27).value = { formula: `IF(W${r}>Y${r}*(1-X${r}), MIN(MAX(0,W${r}-Y${r}*(1-X${r})),${prevOther}), 0)` };
    row.getCell(27).numFmt = FMT.currency;

    // AB: OAS Clawback
    row.getCell(28).value = { formula: `MIN(Assumptions_OasMaxAnnual, MAX(0,(E${r}+F${r}+G${r}+H${r}+Z${r}-Assumptions_OasClawbackThresh)*Assumptions_OasClawbackRate))` };
    row.getCell(28).numFmt = FMT.currency;

    // AC: OAS Net
    row.getCell(29).value = { formula: `MAX(0,G${r}-AB${r})` };
    row.getCell(29).numFmt = FMT.currency;

    // AD: NonReg Taxable Gain (50% inclusion on gains portion of withdrawal)
    // Year 1 uses initial cost basis; Year 2+ uses tracked cost basis from AS column
    const costBasisRatio = isFirst
      ? `IF(Assumptions_NonRegBalance>0, MAX(0,1-Assumptions_NonRegCostBasis/Assumptions_NonRegBalance), 0)`
      : `IF(AN${prevR}>0, MAX(0,1-AS${prevR}/AN${prevR}), 0)`;
    row.getCell(30).value = { formula: `V${r}*${costBasisRatio}*Assumptions_CapGainsRate` };
    row.getCell(30).numFmt = FMT.currency;

    // AE: Total Taxable Income
    row.getCell(31).value = { formula: `E${r}+F${r}+AC${r}+H${r}+Z${r}+AD${r}` };
    row.getCell(31).numFmt = FMT.currency;

    // AF: Federal Tax
    row.getCell(32).value = { formula: fedTaxFormula(r) };
    row.getCell(32).numFmt = FMT.currency;

    // AG: Provincial Tax
    row.getCell(33).value = { formula: provTaxFormula(r) };
    row.getCell(33).numFmt = FMT.currency;

    // AH: Total Tax
    row.getCell(34).value = { formula: `AF${r}+AG${r}` };
    row.getCell(34).numFmt = FMT.currency;

    // AI: After-Tax Income
    row.getCell(35).value = { formula: `E${r}+F${r}+AC${r}+H${r}+Z${r}+T${r}+V${r}+AA${r}-AH${r}` };
    row.getCell(35).numFmt = FMT.currency;

    // AJ: Surplus
    row.getCell(36).value = { formula: `AI${r}-M${r}-N${r}-O${r}` };
    row.getCell(36).numFmt = FMT.currency;

    // AK: TFSA Deposit (surplus into TFSA up to limit)
    row.getCell(37).value = { formula: `IF(AJ${r}>0, MIN(AJ${r}, Assumptions_TfsaAnnualLimit), 0)` };
    row.getCell(37).numFmt = FMT.currency;

    // AL: RRSP Balance (EOY)
    row.getCell(38).value = { formula: `MAX(0,${prevRrsp}-Z${r})*(1+Assumptions_RealReturn)` };
    row.getCell(38).numFmt = FMT.currency;

    // AM: TFSA Balance (EOY)
    row.getCell(39).value = { formula: `MAX(0,${prevTfsa}-T${r}+AK${r})*(1+Assumptions_TfsaReturn)` };
    row.getCell(39).numFmt = FMT.currency;

    // AN: NonReg Balance (EOY) — overflow surplus goes here
    const overflow = `MAX(0,AJ${r}-AK${r})`;
    row.getCell(40).value = { formula: `MAX(0,${prevNonReg}-V${r}+${overflow})*(1+Assumptions_NonRegReturn)` };
    row.getCell(40).numFmt = FMT.currency;

    // AO: Other Balance (EOY)
    row.getCell(41).value = { formula: `MAX(0,${prevOther}-AA${r})*(1+Assumptions_RealReturn)` };
    row.getCell(41).numFmt = FMT.currency;

    // AP: Mortgage Balance (EOY)
    row.getCell(42).value = { formula: mortgageBalFormula(r, prevMort) };
    row.getCell(42).numFmt = FMT.currency;

    // AQ: Total Portfolio
    row.getCell(43).value = { formula: `AL${r}+AM${r}+AN${r}+AO${r}` };
    row.getCell(43).numFmt = FMT.currency;

    // AR: Net Worth
    row.getCell(44).value = { formula: `AQ${r}+Assumptions_RealEstateValue-AP${r}` };
    row.getCell(44).numFmt = FMT.currency;

    // AS: NonReg Cost Basis (tracks year-over-year as withdrawals/deposits change ratio)
    // After withdrawal: reduce cost basis proportionally (costBasis * (balance - withdrawal) / balance)
    // After deposit: increase cost basis dollar-for-dollar (+ overflow surplus)
    const prevCostBasis = isFirst ? 'Assumptions_NonRegCostBasis' : `AS${prevR}`;
    const cbPrevBal = isFirst ? 'Assumptions_NonRegBalance' : `AN${prevR}`;
    const overflowDeposit = `MAX(0,AJ${r}-AK${r})`;
    row.getCell(45).value = { formula:
      `MAX(0,${prevCostBasis}*MAX(0,${cbPrevBal}-V${r})/IF(${cbPrevBal}>0,${cbPrevBal},1))+${overflowDeposit}` };
    row.getCell(45).numFmt = FMT.currency;
  }

  // Conditional formatting: red fill when portfolio <= 0
  const lastDataRow = FIRST_DATA + numYears - 1;
  ws.addConditionalFormatting({
    ref: `AQ${FIRST_DATA}:AQ${lastDataRow}`,
    rules: [{
      type: 'cellIs', operator: 'lessThanOrEqual',
      formulae: ['0'],
      style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: COLORS.redFill } } },
    }],
  });

  // Green font on surplus
  ws.addConditionalFormatting({
    ref: `AJ${FIRST_DATA}:AJ${lastDataRow}`,
    rules: [{
      type: 'cellIs', operator: 'greaterThan',
      formulae: ['0'],
      style: { font: { color: { argb: COLORS.greenFont } } },
    }],
  });

  // Dictionary section below data
  let dr = lastDataRow + 2;
  const dictHdr = ws.getRow(dr);
  dictHdr.getCell(1).value = 'COLUMN DICTIONARY';
  dictHdr.getCell(1).font = { ...FONTS.bold, size: 12 };
  dr++;

  const dictEntries = [
    ['Age',               'Your age in this projection year'],
    ['Year',              'Calendar year'],
    ['Retired?',          '1 = retired (no employment income), 0 = still working'],
    ['Inflation Factor',  'Cumulative inflation multiplier since today (compounds annually)'],
    ['Employment',        'Gross salary, inflation-adjusted. Drops to $0 at retirement age'],
    ['CPP',               'Canada Pension Plan income, adjusted for early/late start age'],
    ['OAS Gross',         'Old Age Security before clawback, adjusted for deferral bonus'],
    ['Pension',           'Defined-benefit pension income (if applicable)'],
    ['RRIF Min',          'Mandatory minimum RRSP/RRIF withdrawal after age 71 (CRA rates)'],
    ['Meltdown',          'Voluntary RRSP drawdown to reduce future forced RRIF withdrawals'],
    ['Base RRSP Wd',      'Greater of RRIF minimum or meltdown amount, capped at RRSP balance'],
    ['Taxable Before Grossup', 'Sum of all taxable income sources before extra RRSP withdrawals'],
    ['Expenses',          'Annual living expenses, inflation-adjusted, reduced in retirement'],
    ['Mortgage Pmt',      'Annual mortgage payment (principal + interest)'],
    ['Debt Pmt',          'Annual consumer + other debt payments'],
    ['Total Need',        'Expenses + mortgage + debt payments'],
    ['Tax on Known',      'Estimated tax on known taxable income (before RRSP grossup)'],
    ['After-Tax Known',   'Known income minus estimated tax'],
    ['Shortfall',         'How much more cash you need beyond known income'],
    ['TFSA Wd',           'Withdrawal from TFSA to cover shortfall (tax-free)'],
    ['After TFSA',        'Remaining shortfall after TFSA withdrawal'],
    ['NonReg Wd',         'Withdrawal from non-registered accounts'],
    ['After NonReg',      'Remaining shortfall after non-reg withdrawal'],
    ['Marginal Rate',     'Combined federal + provincial marginal tax rate on next dollar'],
    ['RRSP Grossup',      'Extra RRSP withdrawal grossed up for tax to cover remaining shortfall'],
    ['Total RRSP Wd',     'Base RRSP withdrawal + grossup amount'],
    ['Other Wd',          'Withdrawal from other assets if RRSP still not enough'],
    ['OAS Clawback',      'OAS repayment if total income exceeds clawback threshold'],
    ['OAS Net',           'OAS after clawback deduction'],
    ['NonReg Gain',       'Taxable capital gain on non-reg withdrawal (gains portion \u00D7 50%)'],
    ['Total Taxable',     'All taxable income including RRSP withdrawals and capital gains'],
    ['Federal Tax',       'Federal income tax with personal, age, and pension credits'],
    ['Provincial Tax',    'Provincial income tax with credits + surtax (if applicable)'],
    ['Total Tax',         'Federal + provincial tax combined'],
    ['After-Tax Income',  'Total cash received after all taxes'],
    ['Surplus',           'After-tax income minus total spending needs (negative = shortfall)'],
    ['TFSA Deposit',      'Surplus deposited into TFSA (up to annual limit)'],
    ['RRSP Bal',          'End-of-year RRSP balance after withdrawals + investment returns'],
    ['TFSA Bal',          'End-of-year TFSA balance after withdrawals/deposits + returns'],
    ['NonReg Bal',        'End-of-year non-reg balance after withdrawals + overflow deposits + returns'],
    ['Other Bal',         'End-of-year other assets balance'],
    ['Mortgage Bal',      'Remaining mortgage principal'],
    ['Total Portfolio',   'RRSP + TFSA + NonReg + Other (all investment accounts)'],
    ['Net Worth',         'Total portfolio + real estate - mortgage balance'],
    ['NonReg Cost Basis', 'Tracks what you originally paid into non-reg accounts, adjusted for withdrawals/deposits. Used to calculate capital gains tax.'],
  ];

  for (const [col, desc] of dictEntries) {
    addDocCell(ws, dr, 1, col);
    addDocCell(ws, dr, 2, desc);
    ws.getRow(dr).getCell(1).font = { ...FONTS.small, bold: true };
    dr++;
  }

  return ws;
}

/** Consumer + other debt payment formula (simplified). */
function debtPaymentFormula(r) {
  // Consumer debt: if payoff age not reached and debt exists
  const cYearsLeft = `MAX(1,Assumptions_ConsumerPayoffAge-Assumptions_CurrentAge-(A${r}-Assumptions_CurrentAge))`;
  const cPmt = `IF(AND(Assumptions_ConsumerDebt>0, A${r}<Assumptions_ConsumerPayoffAge), IF(Assumptions_ConsumerDebtRate=0, Assumptions_ConsumerDebt/${cYearsLeft}, Assumptions_ConsumerDebt*Assumptions_ConsumerDebtRate*(1+Assumptions_ConsumerDebtRate)^${cYearsLeft}/((1+Assumptions_ConsumerDebtRate)^${cYearsLeft}-1)), 0)`;
  // Other debt
  const oYearsLeft = `MAX(1,Assumptions_OtherPayoffAge-Assumptions_CurrentAge-(A${r}-Assumptions_CurrentAge))`;
  const oPmt = `IF(AND(Assumptions_OtherDebt>0, A${r}<Assumptions_OtherPayoffAge), IF(Assumptions_OtherDebtRate=0, Assumptions_OtherDebt/${oYearsLeft}, Assumptions_OtherDebt*Assumptions_OtherDebtRate*(1+Assumptions_OtherDebtRate)^${oYearsLeft}/((1+Assumptions_OtherDebtRate)^${oYearsLeft}-1)), 0)`;
  return `${cPmt}+${oPmt}`;
}

/** Mortgage balance EOY formula. */
function mortgageBalFormula(r, prevMort) {
  // If payment made, reduce balance by principal portion; else 0
  return `IF(N${r}>0, MAX(0, ${prevMort}*(1+Assumptions_MortgageRate)-N${r}), 0)`;
}

export { SHEET_NAME as PROJECTION_SHEET_NAME };
