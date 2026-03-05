/**
 * Extracted formula helpers for the Projection sheet.
 * Pure string-building functions — no ExcelJS dependency.
 */

import { FMT } from './styles.js';

/** Tax SUMPRODUCT formula for a bracket set. */
export function taxSumproduct(incomeCell, bracketMin, bracketMax, bracketRate) {
  return `SUMPRODUCT(MAX(MIN(${incomeCell},${bracketMax})-${bracketMin},0)*${bracketRate})`;
}

/** Federal tax formula with credits. */
export function fedTaxFormula(r) {
  const inc = `AE${r}`;
  const grossTax = taxSumproduct(inc, 'FedBracketMin', 'FedBracketMax', 'FedBracketRate');
  const ageAmt = `IF(A${r}>=65, MAX(0, FedAgeAmount - MAX(0, ${inc}-FedAgeThreshold)*FedAgeClawRate), 0)`;
  const penCr = `IF(OR(H${r}>0, I${r}>0), FedPensionCredit, 0)`;
  return `MAX(0, ${grossTax} - (FedBasicPersonal + ${ageAmt} + ${penCr}) * FedCreditRate)`;
}

/** Provincial tax formula with credits + surtax. */
export function provTaxFormula(r) {
  const inc = `AE${r}`;
  const grossTax = taxSumproduct(inc, 'ProvBracketMin', 'ProvBracketMax', 'ProvBracketRate');
  const ageAmt = `IF(A${r}>=65, MAX(0, ProvAgeAmount - MAX(0, ${inc}-ProvAgeThreshold)*ProvAgeClawRate), 0)`;
  const penCr = `IF(OR(H${r}>0, I${r}>0), ProvPensionCredit, 0)`;
  const basicTax = `MAX(0, ${grossTax} - (ProvBasicPersonal + ${ageAmt} + ${penCr}) * ProvCreditRate)`;
  const st1 = `MAX(0, (${basicTax}-SurtaxThreshold1)*SurtaxRate1)`;
  const st2 = `MAX(0, (${basicTax}-SurtaxThreshold2)*SurtaxRate2)`;
  return `${basicTax} + ${st1} + ${st2}`;
}

/** Consumer + other debt payment formula (simplified). */
export function debtPaymentFormula(r) {
  const cYearsLeft = `MAX(1,Assumptions_ConsumerPayoffAge-Assumptions_CurrentAge-(A${r}-Assumptions_CurrentAge))`;
  const cPmt = `IF(AND(Assumptions_ConsumerDebt>0, A${r}<Assumptions_ConsumerPayoffAge), IF(Assumptions_ConsumerDebtRate=0, Assumptions_ConsumerDebt/${cYearsLeft}, Assumptions_ConsumerDebt*Assumptions_ConsumerDebtRate*(1+Assumptions_ConsumerDebtRate)^${cYearsLeft}/((1+Assumptions_ConsumerDebtRate)^${cYearsLeft}-1)), 0)`;
  const oYearsLeft = `MAX(1,Assumptions_OtherPayoffAge-Assumptions_CurrentAge-(A${r}-Assumptions_CurrentAge))`;
  const oPmt = `IF(AND(Assumptions_OtherDebt>0, A${r}<Assumptions_OtherPayoffAge), IF(Assumptions_OtherDebtRate=0, Assumptions_OtherDebt/${oYearsLeft}, Assumptions_OtherDebt*Assumptions_OtherDebtRate*(1+Assumptions_OtherDebtRate)^${oYearsLeft}/((1+Assumptions_OtherDebtRate)^${oYearsLeft}-1)), 0)`;
  return `${cPmt}+${oPmt}`;
}

/** Mortgage balance EOY formula. */
export function mortgageBalFormula(r, prevMort) {
  return `IF(N${r}>0, MAX(0, ${prevMort}*(1+Assumptions_MortgageRate)-N${r}), 0)`;
}

/**
 * Build spouse cells (AT–BC, cols 46–55) for a single row.
 * @param {object} row       ExcelJS row
 * @param {number} r         Row number
 * @param {boolean} isFirst  Whether this is the first data row
 * @param {number} prevR     Previous row number
 * @param {string} spCppAdj  Spouse CPP adjustment factor formula
 * @param {string} spOasAdj  Spouse OAS adjustment factor formula
 */
export function buildSpouseCells(row, r, isFirst, prevR, spCppAdj, spOasAdj) {
  const prevSpRrsp = isFirst ? 'Assumptions_SpouseRrspBalance' : `BB${prevR}`;
  const prevSpTfsa = isFirst ? 'Assumptions_SpouseTfsaBalance' : `BC${prevR}`;

  // AT (46): Spouse Age
  row.getCell(46).value = { formula: isFirst
    ? 'Assumptions_SpouseAge'
    : `AT${prevR}+1` };
  row.getCell(46).numFmt = FMT.int;

  // AU (47): Spouse Employment
  row.getCell(47).value = { formula: `IF(AND(AT${r}<Assumptions_SpouseRetirementAge,Assumptions_SpouseStillWorking=1),Assumptions_SpouseEmploymentIncome*D${r},0)` };
  row.getCell(47).numFmt = FMT.currency;

  // AV (48): Spouse CPP
  row.getCell(48).value = { formula: `IF(AT${r}>=Assumptions_SpouseCppStartAge, Assumptions_SpouseCppMonthly*12*(${spCppAdj})*D${r}, 0)` };
  row.getCell(48).numFmt = FMT.currency;

  // AW (49): Spouse OAS Gross
  row.getCell(49).value = { formula: `IF(AT${r}>=Assumptions_SpouseOasStartAge, Assumptions_SpouseOasMonthly*12*(${spOasAdj})*D${r}, 0)` };
  row.getCell(49).numFmt = FMT.currency;

  // AX (50): Spouse Pension
  row.getCell(50).value = { formula: `IF(AND(Assumptions_SpousePensionType="db",AT${r}>=Assumptions_SpouseDbPensionStartAge), IF(Assumptions_SpouseDbPensionIndexed=1, Assumptions_SpouseDbPensionAnnual*D${r}, Assumptions_SpouseDbPensionAnnual), 0)` };
  row.getCell(50).numFmt = FMT.currency;

  // AY (51): Spouse RRIF Min
  row.getCell(51).value = { formula: `IF(AND(AT${r}>=72,${prevSpRrsp}>0), VLOOKUP(MIN(AT${r},95),RrifRates,2,TRUE)*${prevSpRrsp}, 0)` };
  row.getCell(51).numFmt = FMT.currency;

  // AZ (52): Spouse OAS Net (per-person clawback)
  const spIncome = `AU${r}+AV${r}+AW${r}+AX${r}+BA${r}`;
  const spClawback = `MIN(Assumptions_OasMaxAnnual, MAX(0,(${spIncome}-Assumptions_OasClawbackThresh)*Assumptions_OasClawbackRate))`;
  row.getCell(52).value = { formula: `MAX(0,AW${r}-${spClawback})` };
  row.getCell(52).numFmt = FMT.currency;

  // BA (53): Spouse RRSP Wd (= RRIF min only)
  row.getCell(53).value = { formula: `AY${r}` };
  row.getCell(53).numFmt = FMT.currency;

  // BB (54): Spouse RRSP Balance (EOY)
  row.getCell(54).value = { formula: `MAX(0,${prevSpRrsp}-BA${r})*(1+Assumptions_RealReturn)` };
  row.getCell(54).numFmt = FMT.currency;

  // BC (55): Spouse TFSA Balance (EOY)
  row.getCell(55).value = { formula: `MAX(0,${prevSpTfsa})*(1+Assumptions_TfsaReturn)` };
  row.getCell(55).numFmt = FMT.currency;
}

/** Spouse column dictionary entries. */
export const SPOUSE_DICT_ENTRIES = [
  ['Spouse Age',           'Spouse\'s age in this projection year'],
  ['Spouse Employment',    'Spouse gross salary, inflation-adjusted. Drops to $0 at spouse retirement age'],
  ['Spouse CPP',           'Spouse Canada Pension Plan income, adjusted for early/late start age'],
  ['Spouse OAS Gross',     'Spouse Old Age Security before clawback, adjusted for deferral bonus'],
  ['Spouse Pension',       'Spouse defined-benefit pension income (if applicable)'],
  ['Spouse RRIF Min',      'Mandatory minimum spouse RRSP/RRIF withdrawal after age 71 (CRA rates)'],
  ['Spouse OAS Net',       'Spouse OAS after per-person clawback on spouse\'s own income'],
  ['Spouse RRSP Wd',       'Spouse total RRSP withdrawal (= RRIF min; shortfall covered by primary cascade)'],
  ['Spouse RRSP Bal',      'End-of-year spouse RRSP balance after withdrawals + investment returns'],
  ['Spouse TFSA Bal',      'End-of-year spouse TFSA balance (grows at TFSA return; not drawn for shortfall in Excel — known simplification)'],
];

/** Base column dictionary entries (always included). */
export function buildBaseDictEntries(isCouple) {
  return [
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
    ['Taxable Before Grossup', isCouple
      ? 'Sum of all taxable income (primary + spouse) before extra RRSP withdrawals'
      : 'Sum of all taxable income sources before extra RRSP withdrawals'],
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
    ['Total Taxable',     isCouple
      ? 'All taxable income (primary + spouse) including RRSP withdrawals and capital gains. Note: couple tax is computed on combined income (known simplification \u2014 engine does per-person tax which is lower).'
      : 'All taxable income including RRSP withdrawals and capital gains'],
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
    ['Total Portfolio',   isCouple
      ? 'RRSP + TFSA + NonReg + Other + Spouse RRSP + Spouse TFSA (all investment accounts)'
      : 'RRSP + TFSA + NonReg + Other (all investment accounts)'],
    ['Net Worth',         'Total portfolio + real estate - mortgage balance'],
    ['NonReg Cost Basis', 'Tracks what you originally paid into non-reg accounts, adjusted for withdrawals/deposits. Used to calculate capital gains tax.'],
  ];
}
