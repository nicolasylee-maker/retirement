import {
  CPP_PARAMS, OAS_PARAMS, GIS_PARAMS, GAINS_PARAMS, CAPITAL_GAINS,
  TFSA_PARAMS,
} from '../constants/taxTables.js';
import { calcTotalTax, calcOasClawback, calcRrifMinimum } from './taxEngine.js';

/** Tiered capital gains inclusion: 50% on first $250K, 66.7% above. */
function calcTaxableCapitalGain(gain) {
  if (gain <= 0) return 0;
  if (gain <= CAPITAL_GAINS.enhancedThreshold) {
    return gain * CAPITAL_GAINS.inclusionRate;
  }
  const base = CAPITAL_GAINS.enhancedThreshold * CAPITAL_GAINS.inclusionRate;
  const excess = (gain - CAPITAL_GAINS.enhancedThreshold) * CAPITAL_GAINS.enhancedRate;
  return base + excess;
}

/** CPP annual benefit adjusted for start age vs 65. */
function calcCppBenefit(monthlyAt65, startAge, currentAge) {
  if (currentAge < startAge) return 0;
  const monthsDiff = (startAge - 65) * 12;
  let adjustment;
  if (monthsDiff < 0) {
    // Early: reduce by 0.6% per month
    adjustment = 1 + monthsDiff * CPP_PARAMS.earlyReduction;
  } else {
    // Late: increase by 0.7% per month
    adjustment = 1 + monthsDiff * CPP_PARAMS.lateIncrease;
  }
  return monthlyAt65 * 12 * Math.max(0, adjustment);
}

/** OAS annual benefit adjusted for deferral past 65. */
function calcOasBenefit(monthlyAt65, startAge, currentAge) {
  if (currentAge < startAge) return 0;
  const yearsDeferred = Math.min(startAge, OAS_PARAMS.maxDeferAge) - OAS_PARAMS.startAge;
  const monthsDeferred = Math.max(0, yearsDeferred) * 12;
  const deferralBonus = monthsDeferred * OAS_PARAMS.deferralBonus;
  return monthlyAt65 * 12 * (1 + deferralBonus);
}

/** GIS benefit: income-tested, only if receiving OAS. */
function calcGisBenefit(receivingOas, otherIncome) {
  if (!receivingOas) return 0;
  if (otherIncome >= GIS_PARAMS.incomeThreshold) return 0;
  const reduction = otherIncome * GIS_PARAMS.clawbackRate;
  return Math.max(0, GIS_PARAMS.maxAnnual - reduction);
}

/** Ontario GAINS benefit. */
function calcGainsBenefit(age, privateIncome) {
  if (age < GAINS_PARAMS.minAge) return 0;
  const reduction = Math.max(0, privateIncome - GAINS_PARAMS.singleIncomeThreshold);
  return Math.max(0, GAINS_PARAMS.maxAnnual - reduction * GAINS_PARAMS.clawbackRate);
}

/** Project a full retirement scenario year-by-year. */
export function projectScenario(scenario, overrides = {}) {
  const s = { ...scenario, ...overrides };
  const results = [];
  const currentYear = new Date().getFullYear();

  let rrsp = (s.rrspBalance || 0) + (s.rrifBalance || 0) + (s.dcPensionBalance || 0) + (s.liraBalance || 0);
  let tfsa = s.tfsaBalance || 0;
  let nonReg = (s.nonRegInvestments || 0) + (s.cashSavings || 0);
  let other = s.otherAssets || 0;
  // Cost basis: use explicit value if provided, otherwise infer from initial deposit
  // (assumes entire non-reg balance is cost basis, i.e. no unrealized gains at start)
  let nonRegCostBasis = s.nonRegCostBasis || nonReg;
  let mortgage = s.mortgageBalance || 0;
  let consumer = s.consumerDebt || 0;
  let otherDebt = s.otherDebt || 0;
  let rrifConverted = s.currentAge >= 72;
  let tfsaContribRoom = s.tfsaContributionRoom || 0;
  const realReturn = s.realReturn || 0.04;
  const tfsaReturn = s.tfsaReturn || realReturn;
  const nonRegReturn = s.nonRegReturn || realReturn;
  const inflation = s.inflationRate || 0.025;

  for (let age = s.currentAge; age <= s.lifeExpectancy; age++) {
    const year = currentYear + (age - s.currentAge);
    const yearsFromNow = age - s.currentAge;
    const retired = age >= s.retirementAge;
    const inflationFactor = Math.pow(1 + inflation, yearsFromNow);

    if (age >= 72 && !rrifConverted) rrifConverted = true;

    let baseExpenses = (s.monthlyExpenses ?? 4000) * 12;
    if (retired) {
      baseExpenses *= (1 - (s.expenseReductionAtRetirement || 0));
    }
    const expenses = baseExpenses * inflationFactor;

    let debtPayments = 0;
    if (mortgage > 0 && s.mortgageYearsLeft > 0) {
      const mortgagePayment = mortgage / Math.max(1, s.mortgageYearsLeft - yearsFromNow);
      if (yearsFromNow < s.mortgageYearsLeft) {
        debtPayments += mortgagePayment + mortgage * (s.mortgageRate || 0.05);
        mortgage -= mortgagePayment;
      } else {
        mortgage = 0;
      }
    }
    if (consumer > 0) {
      const payoffAge = s.consumerDebtPayoffAge || (s.currentAge + 10);
      const yearsLeft = Math.max(1, payoffAge - s.currentAge - yearsFromNow);
      const rate = s.consumerDebtRate || 0.08;
      // Standard amortization: fixed annual payment to reach $0 by payoff age
      let annualPayment;
      if (rate === 0) {
        annualPayment = consumer / yearsLeft;
      } else {
        annualPayment = consumer * (rate * Math.pow(1 + rate, yearsLeft)) / (Math.pow(1 + rate, yearsLeft) - 1);
      }
      const interestThisYear = consumer * rate;
      const totalPayment = Math.min(consumer + interestThisYear, annualPayment);
      const principalPayment = totalPayment - interestThisYear;
      debtPayments += totalPayment;
      consumer = Math.max(0, consumer - principalPayment);
    }

    // Employment income (pre-retirement only)
    let employmentIncome = 0;
    if (!retired && (s.stillWorking ?? true) && s.employmentIncome > 0) {
      employmentIncome = s.employmentIncome * inflationFactor;
    }

    // Non-taxed income (cash / informal — not included in taxable income)
    let nonTaxedIncome = 0;
    if (s.nonTaxedIncome > 0) {
      const startAge = s.nonTaxedIncomeStartAge ?? s.currentAge;
      const endAge = s.nonTaxedIncomeEndAge ?? s.lifeExpectancy;
      if (age >= startAge && age <= endAge) {
        nonTaxedIncome = s.nonTaxedIncome * inflationFactor;
      }
    }

    const cppIncome = calcCppBenefit(s.cppMonthly || 0, s.cppStartAge || 65, age) * inflationFactor;
    const oasGross = calcOasBenefit(s.oasMonthly || 0, s.oasStartAge || 65, age) * inflationFactor;
    const receivingOas = oasGross > 0;
    let pensionIncome = 0;
    if (s.pensionType === 'db' && age >= (s.dbPensionStartAge || 65)) {
      pensionIncome = s.dbPensionAnnual || 0;
      if (s.dbPensionIndexed) {
        pensionIncome *= inflationFactor;
      }
    }

    let rrifMinimum = 0;
    if (rrifConverted && rrsp > 0) {
      rrifMinimum = calcRrifMinimum(rrsp, age);
    }

    let meltdownWithdrawal = 0;
    const meltdownStartAge = s.rrspMeltdownStartAge ?? s.retirementAge;
    if (s.rrspMeltdownEnabled && age >= meltdownStartAge && age < (s.rrspMeltdownTargetAge || 71) && rrsp > 0) {
      meltdownWithdrawal = Math.min(s.rrspMeltdownAnnual || 0, rrsp);
    }

    let rrspWithdrawal = Math.max(rrifMinimum, meltdownWithdrawal);
    rrspWithdrawal = Math.min(rrspWithdrawal, rrsp);

    const incomeBeforeDrawdown = cppIncome + oasGross + pensionIncome + rrspWithdrawal;
    const oasClawback = calcOasClawback(incomeBeforeDrawdown);
    const oasIncome = Math.max(0, oasGross - oasClawback);

    let gisIncome = 0;
    if (s.gisEligible && receivingOas) {
      const nonOasIncome = cppIncome + pensionIncome + rrspWithdrawal;
      gisIncome = calcGisBenefit(true, nonOasIncome);
    }

    let gainsIncome = 0;
    if (s.gainsEligible) {
      gainsIncome = calcGainsBenefit(age, pensionIncome + rrspWithdrawal);
    }

    const totalKnownIncome = employmentIncome + nonTaxedIncome + cppIncome + oasIncome + gisIncome + gainsIncome + pensionIncome + rrspWithdrawal;
    const totalNeed = expenses + debtPayments;
    const shortfall = Math.max(0, totalNeed - totalKnownIncome);

    let tfsaWithdrawal = 0;
    let nonRegWithdrawal = 0;
    let otherWithdrawal = 0;

    const withdrawalOrder = s.withdrawalOrder || ['tfsa', 'nonReg', 'rrsp', 'other'];
    let rrspAvail = Math.max(0, rrsp - rrspWithdrawal);
    let tfsaAvail = tfsa;
    let nonRegAvail = nonReg;
    let otherAvail = other;

    // Iterative gross-up: withdraw enough to cover expenses + debt + tax on withdrawals
    let totalTax = 0;
    let totalTaxableIncome = 0;
    let nonRegTaxableGain = 0;
    let grossIncome = 0;
    let afterTaxIncome = 0;
    let surplus = 0;
    let remaining = shortfall;

    for (let iter = 0; iter < 10; iter++) {
      for (const account of withdrawalOrder) {
        if (remaining <= 0) break;
        switch (account) {
          case 'tfsa': {
            const draw = Math.min(remaining, tfsaAvail);
            tfsaWithdrawal += draw;
            tfsaAvail -= draw;
            remaining -= draw;
            break;
          }
          case 'nonReg': {
            const draw = Math.min(remaining, nonRegAvail);
            nonRegWithdrawal += draw;
            nonRegAvail -= draw;
            remaining -= draw;
            break;
          }
          case 'rrsp': {
            const draw = Math.min(remaining, rrspAvail);
            rrspWithdrawal += draw;
            rrspAvail -= draw;
            remaining -= draw;
            break;
          }
          case 'other': {
            const draw = Math.min(remaining, otherAvail);
            otherWithdrawal += draw;
            otherAvail -= draw;
            remaining -= draw;
            break;
          }
        }
      }

      const hasPension = pensionIncome > 0 || (rrifConverted && rrspWithdrawal > 0);
      const taxable = employmentIncome + cppIncome + oasIncome + pensionIncome + rrspWithdrawal;
      nonRegTaxableGain = 0;
      if (nonRegWithdrawal > 0 && nonReg > 0) {
        const gainRatio = Math.max(0, (nonReg - nonRegCostBasis) / nonReg);
        nonRegTaxableGain = calcTaxableCapitalGain(nonRegWithdrawal * gainRatio);
      }
      totalTaxableIncome = taxable + nonRegTaxableGain;
      totalTax = calcTotalTax(totalTaxableIncome, age, hasPension);
      grossIncome = employmentIncome + nonTaxedIncome + cppIncome + oasIncome + gisIncome + gainsIncome
        + pensionIncome + rrspWithdrawal + tfsaWithdrawal + nonRegWithdrawal + otherWithdrawal;
      afterTaxIncome = grossIncome - totalTax;
      surplus = afterTaxIncome - expenses - debtPayments;

      if (surplus >= -50) break;
      remaining = -surplus;
      if (rrspAvail <= 0 && tfsaAvail <= 0 && nonRegAvail <= 0 && otherAvail <= 0) break;
    }

    // Update balances after convergence
    const preWithdrawalNonReg = nonReg;
    rrsp = Math.max(0, rrsp - rrspWithdrawal);
    tfsa = Math.max(0, tfsa - tfsaWithdrawal);
    if (nonRegWithdrawal > 0 && preWithdrawalNonReg > 0) {
      nonRegCostBasis *= (preWithdrawalNonReg - nonRegWithdrawal) / preWithdrawalNonReg;
    }
    nonReg = Math.max(0, nonReg - nonRegWithdrawal);
    other = Math.max(0, other - otherWithdrawal);

    // Accrue annual TFSA contribution room
    tfsaContribRoom += TFSA_PARAMS.annualLimit;

    // Deposit surplus into TFSA (then non-reg overflow)
    let tfsaDeposit = 0;
    let nonRegDeposit = 0;
    if (surplus > 0) {
      tfsaDeposit = Math.min(surplus, tfsaContribRoom);
      tfsa += tfsaDeposit;
      tfsaContribRoom -= tfsaDeposit;
      nonRegDeposit = surplus - tfsaDeposit;
      if (nonRegDeposit > 0) {
        nonReg += nonRegDeposit;
        nonRegCostBasis += nonRegDeposit;
      }
      surplus -= (tfsaDeposit + nonRegDeposit);
    }

    rrsp *= (1 + realReturn);
    tfsa *= (1 + tfsaReturn);
    nonReg *= (1 + nonRegReturn);
    other *= (1 + realReturn);
    const totalPortfolio = rrsp + tfsa + nonReg + other;
    const netWorth = totalPortfolio + (s.realEstateValue || 0) - mortgage - consumer - otherDebt;

    results.push({
      age,
      year,
      employmentIncome: Math.round(employmentIncome),
      nonTaxedIncome: Math.round(nonTaxedIncome),
      rrspBalance: Math.round(rrsp),
      tfsaBalance: Math.round(tfsa),
      nonRegBalance: Math.round(nonReg),
      otherBalance: Math.round(other),
      nonRegCostBasis: Math.round(nonRegCostBasis),
      totalPortfolio: Math.round(totalPortfolio),
      cppIncome: Math.round(cppIncome),
      oasIncome: Math.round(oasIncome),
      gisIncome: Math.round(gisIncome),
      gainsIncome: Math.round(gainsIncome),
      pensionIncome: Math.round(pensionIncome),
      rrspWithdrawal: Math.round(rrspWithdrawal),
      tfsaWithdrawal: Math.round(tfsaWithdrawal),
      nonRegWithdrawal: Math.round(nonRegWithdrawal),
      otherWithdrawal: Math.round(otherWithdrawal),
      totalIncome: Math.round(grossIncome),
      totalTaxableIncome: Math.round(totalTaxableIncome),
      totalTax: Math.round(totalTax),
      afterTaxIncome: Math.round(afterTaxIncome),
      expenses: Math.round(expenses),
      debtPayments: Math.round(debtPayments),
      surplus: Math.round(surplus),
      tfsaDeposit: Math.round(tfsaDeposit),
      nonRegDeposit: Math.round(nonRegDeposit),
      tfsaContributionRoom: Math.round(tfsaContribRoom),
      mortgageBalance: Math.round(mortgage),
      netWorth: Math.round(netWorth),
    });
  }

  return results;
}
