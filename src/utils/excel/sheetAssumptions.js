/**
 * Sheet 1: Assumptions — all user inputs as named ranges.
 * Changing any value here recalculates the entire workbook.
 */
import {
  FONTS, COLORS, FMT,
  styleSectionRow, styleInputCell, styleHighlight,
  setColWidths, addNamedRange,
} from './styles.js';

/** Row definitions: [row, label, namedRange, valueGetter, format, highlight?] */
function buildRows(s) {
  const b = (v) => v ? 1 : 0;
  const rrsp = (s.rrspBalance || 0) + (s.rrifBalance || 0) + (s.dcPensionBalance || 0) + (s.liraBalance || 0);
  const nonReg = (s.nonRegInvestments || 0) + (s.cashSavings || 0);
  const other = (s.otherAssets || 0) + (s.otherRegisteredBalance || 0);

  return [
    // [row, label, namedRange, value, format, highlight]
    [3,  'Personal',             null, null, null],
    [4,  'Current Age',          'Assumptions_CurrentAge',        s.currentAge,                    FMT.int],
    [5,  'Retirement Age',       'Assumptions_RetirementAge',     s.retirementAge,                 FMT.int],
    [6,  'Life Expectancy',      'Assumptions_LifeExpectancy',    s.lifeExpectancy,                FMT.int],
    [7,  'Province',             'Assumptions_Province',          s.province || 'ON',              FMT.text],

    [9,  'Income',               null, null, null],
    [10, 'Employment Income',    'Assumptions_EmploymentIncome',  s.employmentIncome || 0,         FMT.currency],
    [11, 'Still Working',        'Assumptions_StillWorking',      b(s.stillWorking ?? true),       FMT.int],

    [13, 'Government Benefits',  null, null, null],
    [14, 'CPP Monthly at 65',    'Assumptions_CppMonthly',        s.cppMonthly || 0,               FMT.currency],
    [15, 'CPP Start Age',        'Assumptions_CppStartAge',       s.cppStartAge || 65,             FMT.int],
    [16, 'OAS Monthly at 65',    'Assumptions_OasMonthly',        s.oasMonthly || 0,               FMT.currency],
    [17, 'OAS Start Age',        'Assumptions_OasStartAge',       s.oasStartAge || 65,             FMT.int],

    [19, 'Pension',              null, null, null],
    [20, 'Pension Type',         'Assumptions_PensionType',       s.pensionType || 'none',         FMT.text],
    [21, 'DB Pension Annual',    'Assumptions_DbPensionAnnual',   s.dbPensionAnnual || 0,          FMT.currency],
    [22, 'DB Pension Start Age', 'Assumptions_DbPensionStartAge', s.dbPensionStartAge || 65,       FMT.int],
    [23, 'DB Pension Indexed',   'Assumptions_DbPensionIndexed',  b(s.dbPensionIndexed),           FMT.int],

    [25, 'Account Balances',     null, null, null],
    [26, 'RRSP Balance',         'Assumptions_RrspBalance',       rrsp,                            FMT.currency],
    [27, 'TFSA Balance',         'Assumptions_TfsaBalance',       s.tfsaBalance || 0,              FMT.currency],
    [28, 'Non-Reg Balance',      'Assumptions_NonRegBalance',     nonReg,                          FMT.currency],
    [29, 'Non-Reg Cost Basis',   'Assumptions_NonRegCostBasis',   s.nonRegCostBasis || nonReg,     FMT.currency],
    [30, 'Other Assets',         'Assumptions_OtherAssets',       other,                           FMT.currency],

    [32, 'Real Estate',          null, null, null],
    [33, 'Real Estate Value',    'Assumptions_RealEstateValue',   s.realEstateValue || 0,          FMT.currency],
    [34, 'Is Primary Residence', 'Assumptions_IsPrimaryRes',      b(s.isPrimaryResidence ?? true), FMT.int],
    [35, 'Est. Cost Basis',      'Assumptions_RealEstateCost',    s.estimatedCostBasis || 0,       FMT.currency],

    [37, 'Liabilities',          null, null, null],
    [38, 'Mortgage Balance',     'Assumptions_MortgageBalance',   s.mortgageBalance || 0,          FMT.currency],
    [39, 'Mortgage Rate',        'Assumptions_MortgageRate',      s.mortgageRate || 0,             FMT.pct],
    [40, 'Mortgage Years Left',  'Assumptions_MortgageYears',     s.mortgageYearsLeft || 0,        FMT.int],
    [41, 'Consumer Debt',        'Assumptions_ConsumerDebt',      s.consumerDebt || 0,             FMT.currency],
    [42, 'Consumer Debt Rate',   'Assumptions_ConsumerDebtRate',  s.consumerDebtRate || 0,         FMT.pct],
    [43, 'Consumer Payoff Age',  'Assumptions_ConsumerPayoffAge', s.consumerDebtPayoffAge || (s.currentAge + 10), FMT.int],
    [44, 'Other Debt',           'Assumptions_OtherDebt',         s.otherDebt || 0,                FMT.currency],
    [45, 'Other Debt Rate',      'Assumptions_OtherDebtRate',     s.otherDebtRate || 0,            FMT.pct],
    [46, 'Other Payoff Age',     'Assumptions_OtherPayoffAge',    s.otherDebtPayoffAge || 70,      FMT.int],

    [48, 'Expenses & Returns',   null, null, null],
    [49, 'Monthly Expenses',     'Assumptions_MonthlyExpenses',   s.monthlyExpenses ?? 4000,       FMT.currency],
    [50, 'Expense Reduction',    'Assumptions_ExpenseReduction',  s.expenseReductionAtRetirement || 0, FMT.pct, true],
    [51, 'Inflation Rate',       'Assumptions_Inflation',         s.inflationRate || 0.025,        FMT.pct, true],
    [52, 'Real Return (RRSP)',   'Assumptions_RealReturn',        s.realReturn || 0.04,            FMT.pct, true],
    [53, 'TFSA Return',          'Assumptions_TfsaReturn',        s.tfsaReturn || (s.realReturn || 0.04), FMT.pct, true],
    [54, 'Non-Reg Return',       'Assumptions_NonRegReturn',      s.nonRegReturn || (s.realReturn || 0.04), FMT.pct, true],

    [56, 'Withdrawal Strategy',  null, null, null],
    [57, 'Withdrawal Order',     null,                            'TFSA > NonReg > RRSP > Other',  FMT.text],
    [58, 'RRSP Meltdown Enabled','Assumptions_MeltdownEnabled',   b(s.rrspMeltdownEnabled),        FMT.int],
    [59, 'Meltdown Start Age',   'Assumptions_MeltdownStartAge',  s.rrspMeltdownStartAge ?? s.retirementAge, FMT.int],
    [60, 'Meltdown Target Age',  'Assumptions_MeltdownTargetAge', s.rrspMeltdownTargetAge || 71,   FMT.int],
    [61, 'Meltdown Annual',      'Assumptions_MeltdownAnnual',    s.rrspMeltdownAnnual || 0,       FMT.currency],

    [63, 'Tax Constants',        null, null, null],
    [64, 'Capital Gains Inclusion', 'Assumptions_CapGainsRate',   0.50,                            FMT.pct],
    [65, 'TFSA Annual Limit',    'Assumptions_TfsaAnnualLimit',   7000,                            FMT.currency],
    [66, 'OAS Clawback Threshold','Assumptions_OasClawbackThresh',93454,                           FMT.currency],
    [67, 'OAS Clawback Rate',    'Assumptions_OasClawbackRate',   0.15,                            FMT.pct],
    [68, 'OAS Max Annual',       'Assumptions_OasMaxAnnual',      8881,                            FMT.currency],
  ];
}

const SHEET_NAME = 'Assumptions';

export function buildAssumptionsSheet(wb, scenario) {
  const ws = wb.addWorksheet(SHEET_NAME, { properties: { tabColor: { argb: 'FF1F4E79' } } });
  setColWidths(ws, [[1, 28], [2, 18]]);

  // Title row
  const titleRow = ws.getRow(1);
  titleRow.getCell(1).value = 'ASSUMPTIONS';
  titleRow.getCell(1).font = { ...FONTS.header, color: { argb: COLORS.headerBg } };
  titleRow.getCell(2).value = scenario.name || 'Scenario';
  titleRow.getCell(2).font = FONTS.small;

  const rows = buildRows(scenario);
  for (const [rowNum, label, namedRange, value, fmt, highlight] of rows) {
    const row = ws.getRow(rowNum);
    row.getCell(1).value = label;

    if (value === null && namedRange === null) {
      // Section header
      styleSectionRow(row, 2);
    } else {
      row.getCell(1).font = FONTS.normal;
      const cell = row.getCell(2);
      cell.value = value;
      styleInputCell(cell, fmt);
      if (highlight) styleHighlight(cell);
      if (namedRange) addNamedRange(wb, namedRange, SHEET_NAME, 'B' + rowNum);
    }
  }

  // Note at bottom
  const noteRow = ws.getRow(70);
  noteRow.getCell(1).value = 'Change any blue value → entire workbook recalculates.';
  noteRow.getCell(1).font = FONTS.small;
  const noteRow2 = ws.getRow(71);
  noteRow2.getCell(1).value = 'Yellow cells = key assumptions to sensitivity-test.';
  noteRow2.getCell(1).font = FONTS.small;

  return ws;
}

export { SHEET_NAME as ASSUMPTIONS_SHEET_NAME };
