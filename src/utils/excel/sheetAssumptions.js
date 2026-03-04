/**
 * Sheet 1: Assumptions — all user inputs as named ranges.
 * Changing any value here recalculates the entire workbook.
 */
import {
  FONTS, COLORS, FMT,
  styleSectionRow, styleInputCell, styleHighlight,
  setColWidths, addNamedRange, addPurposeRows,
  DOC_FONT, DOC_BG,
} from './styles.js';

const ROW_OFFSET = 3; // purpose rows 1-2 + blank row 3

/** Row definitions: [row, label, namedRange, value, format, highlight?, description?] */
function buildRows(s) {
  const b = (v) => v ? 1 : 0;
  const rrsp = (s.rrspBalance || 0) + (s.rrifBalance || 0) + (s.dcPensionBalance || 0) + (s.liraBalance || 0);
  const nonReg = (s.nonRegInvestments || 0) + (s.cashSavings || 0);
  const other = (s.otherAssets || 0) + (s.otherRegisteredBalance || 0);
  const O = ROW_OFFSET;

  return [
    [3+O,  'Personal',             null, null, null],
    [4+O,  'Current Age',          'Assumptions_CurrentAge',        s.currentAge,                    FMT.int,  false, 'Your age today \u2014 the starting point for all projections'],
    [5+O,  'Retirement Age',       'Assumptions_RetirementAge',     s.retirementAge,                 FMT.int,  false, 'When you plan to stop working and draw from savings'],
    [6+O,  'Life Expectancy',      'Assumptions_LifeExpectancy',    s.lifeExpectancy,                FMT.int,  false, 'How far we project \u2014 plan conservatively (longer = safer)'],
    [7+O,  'Province',             'Assumptions_Province',          s.province || 'ON',              FMT.text, false, 'Used for provincial tax brackets, credits, and surtax'],

    [9+O,  'Income',               null, null, null],
    [10+O, 'Employment Income',    'Assumptions_EmploymentIncome',  s.employmentIncome || 0,         FMT.currency, false, 'Current annual gross salary or self-employment income'],
    [11+O, 'Still Working',        'Assumptions_StillWorking',      b(s.stillWorking ?? true),       FMT.int,  false, '1 = currently employed, 0 = already retired'],

    [13+O, 'Government Benefits',  null, null, null],
    [14+O, 'CPP Monthly at 65',    'Assumptions_CppMonthly',        s.cppMonthly || 0,               FMT.currency, false, 'Estimated CPP pension per month if you start at age 65'],
    [15+O, 'CPP Start Age',        'Assumptions_CppStartAge',       s.cppStartAge || 65,             FMT.int,  false, 'When you start CPP (60\u201370). Early = smaller; late = larger'],
    [16+O, 'OAS Monthly at 65',    'Assumptions_OasMonthly',        s.oasMonthly || 0,               FMT.currency, false, 'Estimated OAS pension per month at age 65'],
    [17+O, 'OAS Start Age',        'Assumptions_OasStartAge',       s.oasStartAge || 65,             FMT.int,  false, 'When you start OAS (65\u201370). Deferring increases by 0.6%/mo'],

    [19+O, 'Pension',              null, null, null],
    [20+O, 'Pension Type',         'Assumptions_PensionType',       s.pensionType || 'none',         FMT.text, false, '"db" = defined benefit, "dc" = defined contribution, "none"'],
    [21+O, 'DB Pension Annual',    'Assumptions_DbPensionAnnual',   s.dbPensionAnnual || 0,          FMT.currency, false, 'Annual DB pension amount at start age (before inflation)'],
    [22+O, 'DB Pension Start Age', 'Assumptions_DbPensionStartAge', s.dbPensionStartAge || 65,       FMT.int,  false, 'Age when DB pension payments begin'],
    [23+O, 'DB Pension Indexed',   'Assumptions_DbPensionIndexed',  b(s.dbPensionIndexed),           FMT.int,  false, '1 = pension grows with inflation, 0 = fixed dollar amount'],

    [25+O, 'Account Balances',     null, null, null],
    [26+O, 'RRSP Balance',         'Assumptions_RrspBalance',       rrsp,                            FMT.currency, false, 'Combined RRSP + RRIF + DC Pension + LIRA balances'],
    [27+O, 'TFSA Balance',         'Assumptions_TfsaBalance',       s.tfsaBalance || 0,              FMT.currency, false, 'Tax-Free Savings Account balance'],
    [28+O, 'Non-Reg Balance',      'Assumptions_NonRegBalance',     nonReg,                          FMT.currency, false, 'Non-registered investments + cash savings'],
    [29+O, 'Non-Reg Cost Basis',   'Assumptions_NonRegCostBasis',   s.nonRegCostBasis || nonReg,     FMT.currency, false, 'What you originally paid \u2014 used to calculate capital gains tax'],
    [30+O, 'Other Assets',         'Assumptions_OtherAssets',       other,                           FMT.currency, false, 'Other registered accounts + miscellaneous assets'],

    [32+O, 'Real Estate',          null, null, null],
    [33+O, 'Real Estate Value',    'Assumptions_RealEstateValue',   s.realEstateValue || 0,          FMT.currency, false, 'Current market value of your home'],
    [34+O, 'Is Primary Residence', 'Assumptions_IsPrimaryRes',      b(s.isPrimaryResidence ?? true), FMT.int,  false, '1 = primary residence (exempt from cap gains), 0 = investment'],
    [35+O, 'Est. Cost Basis',      'Assumptions_RealEstateCost',    s.estimatedCostBasis || 0,       FMT.currency, false, 'Purchase price (for cap gains if not primary residence)'],

    [37+O, 'Liabilities',          null, null, null],
    [38+O, 'Mortgage Balance',     'Assumptions_MortgageBalance',   s.mortgageBalance || 0,          FMT.currency, false, 'Remaining mortgage principal'],
    [39+O, 'Mortgage Rate',        'Assumptions_MortgageRate',      s.mortgageRate || 0,             FMT.pct,  false, 'Annual mortgage interest rate'],
    [40+O, 'Mortgage Years Left',  'Assumptions_MortgageYears',     s.mortgageYearsLeft || 0,        FMT.int,  false, 'Years remaining on mortgage'],
    [41+O, 'Consumer Debt',        'Assumptions_ConsumerDebt',      s.consumerDebt || 0,             FMT.currency, false, 'Credit cards, lines of credit, car loans, etc.'],
    [42+O, 'Consumer Debt Rate',   'Assumptions_ConsumerDebtRate',  s.consumerDebtRate || 0,         FMT.pct,  false, 'Average annual interest rate on consumer debt'],
    [43+O, 'Consumer Payoff Age',  'Assumptions_ConsumerPayoffAge', s.consumerDebtPayoffAge || (s.currentAge + 10), FMT.int, false, 'Target age to be consumer debt-free'],
    [44+O, 'Other Debt',           'Assumptions_OtherDebt',         s.otherDebt || 0,                FMT.currency, false, 'Student loans, family loans, other liabilities'],
    [45+O, 'Other Debt Rate',      'Assumptions_OtherDebtRate',     s.otherDebtRate || 0,            FMT.pct,  false, 'Average annual interest rate on other debt'],
    [46+O, 'Other Payoff Age',     'Assumptions_OtherPayoffAge',    s.otherDebtPayoffAge || 70,      FMT.int,  false, 'Target age to be completely debt-free'],

    [48+O, 'Expenses & Returns',   null, null, null],
    [49+O, 'Monthly Expenses',     'Assumptions_MonthlyExpenses',   s.monthlyExpenses ?? 4000,       FMT.currency, false, 'Total monthly living expenses (housing, food, transport, etc.)'],
    [50+O, 'Expense Reduction',    'Assumptions_ExpenseReduction',  s.expenseReductionAtRetirement || 0, FMT.pct, true, 'How much expenses drop in retirement (no commute, paid-off home)'],
    [51+O, 'Inflation Rate',       'Assumptions_Inflation',         s.inflationRate || 0.025,        FMT.pct, true, 'Expected annual price increases (BoC target = 2%)'],
    [52+O, 'Real Return (RRSP)',   'Assumptions_RealReturn',        s.realReturn || 0.04,            FMT.pct, true, 'Investment return above inflation for RRSP accounts'],
    [53+O, 'TFSA Return',          'Assumptions_TfsaReturn',        s.tfsaReturn || (s.realReturn || 0.04), FMT.pct, true, 'Investment return above inflation for TFSA'],
    [54+O, 'Non-Reg Return',       'Assumptions_NonRegReturn',      s.nonRegReturn || (s.realReturn || 0.04), FMT.pct, true, 'Investment return above inflation for non-registered accounts'],

    [56+O, 'Withdrawal Strategy',  null, null, null],
    [57+O, 'Withdrawal Order',     null,                            'TFSA > NonReg > RRSP > Other',  FMT.text, false, 'TFSA first (tax-free), then NonReg, then RRSP (most taxed)'],
    [58+O, 'RRSP Meltdown Enabled','Assumptions_MeltdownEnabled',   b(s.rrspMeltdownEnabled),        FMT.int,  false, '1 = gradually draw down RRSP before 72, 0 = wait for RRIF'],
    [59+O, 'Meltdown Start Age',   'Assumptions_MeltdownStartAge',  s.rrspMeltdownStartAge ?? s.retirementAge, FMT.int, false, 'Age to start RRSP meltdown withdrawals'],
    [60+O, 'Meltdown Target Age',  'Assumptions_MeltdownTargetAge', s.rrspMeltdownTargetAge || 71,   FMT.int,  false, 'Age to finish meltdown (must be \u226471, before RRIF kicks in)'],
    [61+O, 'Meltdown Annual',      'Assumptions_MeltdownAnnual',    s.rrspMeltdownAnnual || 0,       FMT.currency, false, 'Annual meltdown withdrawal amount'],

    [63+O, 'Tax Constants',        null, null, null],
    [64+O, 'Capital Gains Inclusion', 'Assumptions_CapGainsRate',   0.50,                            FMT.pct,  false, 'Fraction of capital gains that are taxable (currently 50%)'],
    [65+O, 'TFSA Annual Limit',    'Assumptions_TfsaAnnualLimit',   7000,                            FMT.currency, false, 'Maximum annual TFSA contribution room'],
    [66+O, 'OAS Clawback Threshold','Assumptions_OasClawbackThresh',93454,                           FMT.currency, false, 'Income above this triggers OAS clawback at 15%'],
    [67+O, 'OAS Clawback Rate',    'Assumptions_OasClawbackRate',   0.15,                            FMT.pct,  false, 'Rate at which OAS is clawed back (15%)'],
    [68+O, 'OAS Max Annual',       'Assumptions_OasMaxAnnual',      8881,                            FMT.currency, false, 'Maximum annual OAS benefit (for clawback cap)'],
  ];
}

const SHEET_NAME = 'Assumptions';

export function buildAssumptionsSheet(wb, scenario) {
  const ws = wb.addWorksheet(SHEET_NAME, { properties: { tabColor: { argb: 'FF1F4E79' } } });
  setColWidths(ws, [[1, 28], [2, 18], [3, 44]]);

  // Purpose rows (1-2)
  addPurposeRows(ws,
    'These are YOUR numbers \u2014 everything about your life, income, savings, and debts. ' +
    'Change any blue number and the entire workbook recalculates. ' +
    'Yellow cells are the most important assumptions to experiment with.',
    1, 3);

  // Title row (shifted down)
  const titleRow = ws.getRow(ROW_OFFSET + 1);
  titleRow.getCell(1).value = 'ASSUMPTIONS';
  titleRow.getCell(1).font = { ...FONTS.header, color: { argb: COLORS.headerBg } };
  titleRow.getCell(2).value = scenario.name || 'Scenario';
  titleRow.getCell(2).font = FONTS.small;
  titleRow.getCell(3).value = 'What it means';
  titleRow.getCell(3).font = { ...FONTS.small, italic: true };

  const rows = buildRows(scenario);
  for (const [rowNum, label, namedRange, value, fmt, highlight, description] of rows) {
    const row = ws.getRow(rowNum);
    row.getCell(1).value = label;

    if (value === null && namedRange === null) {
      // Section header
      styleSectionRow(row, 3);
    } else {
      row.getCell(1).font = FONTS.normal;
      const cell = row.getCell(2);
      cell.value = value;
      styleInputCell(cell, fmt);
      if (highlight) styleHighlight(cell);
      if (namedRange) addNamedRange(wb, namedRange, SHEET_NAME, 'B' + rowNum);
      // Column C: plain English explanation
      if (description) {
        row.getCell(3).value = description;
        row.getCell(3).font = DOC_FONT;
        row.getCell(3).alignment = { wrapText: true, vertical: 'middle' };
      }
    }
  }

  // Note at bottom
  const noteRow = ws.getRow(70 + ROW_OFFSET);
  noteRow.getCell(1).value = 'Change any blue value \u2192 entire workbook recalculates.';
  noteRow.getCell(1).font = FONTS.small;
  const noteRow2 = ws.getRow(71 + ROW_OFFSET);
  noteRow2.getCell(1).value = 'Yellow cells = key assumptions to sensitivity-test.';
  noteRow2.getCell(1).font = FONTS.small;

  return ws;
}

export { SHEET_NAME as ASSUMPTIONS_SHEET_NAME };
