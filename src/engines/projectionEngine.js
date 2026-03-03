import { TFSA_PARAMS } from '../constants/taxTables.js';
import { calcTotalTax, calcOasClawback, calcRrifMinimum } from './taxEngine.js';
import { calcCppBenefit, calcOasBenefit, calcGisBenefit, calcGainsBenefit, calcTaxableCapitalGain } from './incomeHelpers.js';

/** Project a full retirement scenario year-by-year. */
export function projectScenario(scenario, overrides = {}) {
  const s = { ...scenario, ...overrides };
  const results = [];
  const currentYear = new Date().getFullYear();

  let rrsp = (s.rrspBalance || 0) + (s.rrifBalance || 0) + (s.dcPensionBalance || 0) + (s.liraBalance || 0);
  let tfsa = s.tfsaBalance || 0;
  let nonReg = (s.nonRegInvestments || 0) + (s.cashSavings || 0);
  let other = s.otherAssets || 0;
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

  // Spouse account pools (only meaningful when isCouple)
  let spouseRrsp = s.isCouple ? (s.spouseRrspBalance || 0) + (s.spouseRrifBalance || 0) + (s.spouseDcPensionBalance || 0) : 0;
  let spouseTfsa = s.isCouple ? (s.spouseTfsaBalance || 0) : 0;
  let spouseRrifConverted = s.isCouple && (s.spouseAge || 0) >= 72;

  for (let age = s.currentAge; age <= s.lifeExpectancy; age++) {
    const year = currentYear + (age - s.currentAge);
    const yearsFromNow = age - s.currentAge;
    const retired = age >= s.retirementAge;
    const inflationFactor = Math.pow(1 + inflation, yearsFromNow);

    const spouseAgeThisYear = s.isCouple ? (s.spouseAge || 0) + (age - s.currentAge) : 0;
    const spouseRetired = s.isCouple && spouseAgeThisYear >= (s.spouseRetirementAge || 65);
    if (s.isCouple && spouseAgeThisYear >= 72 && !spouseRrifConverted) spouseRrifConverted = true;

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

    // Spouse employment income (pre-retirement only)
    let spouseEmploymentIncome = 0;
    if (s.isCouple && !spouseRetired && (s.spouseStillWorking ?? true) && (s.spouseEmploymentIncome || 0) > 0) {
      spouseEmploymentIncome = s.spouseEmploymentIncome * inflationFactor;
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

    // Spouse government benefits
    const spouseCppIncome = s.isCouple
      ? calcCppBenefit(s.spouseCppMonthly || 0, s.spouseCppStartAge || 65, spouseAgeThisYear) * inflationFactor
      : 0;
    const spouseOasGross = s.isCouple
      ? calcOasBenefit(s.spouseOasMonthly || 0, s.spouseOasStartAge || 65, spouseAgeThisYear) * inflationFactor
      : 0;

    // Spouse pension
    let spousePensionIncome = 0;
    if (s.isCouple && s.spousePensionType === 'db' && spouseAgeThisYear >= (s.spouseDbPensionStartAge || 65)) {
      spousePensionIncome = s.spouseDbPensionAnnual || 0;
      if (s.spouseDbPensionIndexed) spousePensionIncome *= inflationFactor;
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

    // Spouse RRIF minimum
    let spouseRrspWithdrawal = 0;
    if (s.isCouple && spouseRrifConverted && spouseRrsp > 0) {
      spouseRrspWithdrawal = Math.min(calcRrifMinimum(spouseRrsp, spouseAgeThisYear), spouseRrsp);
    }
    let spouseRrspAvail = s.isCouple ? Math.max(0, spouseRrsp - spouseRrspWithdrawal) : 0;

    // Spouse OAS clawback
    const spouseIncomeBeforeDrawdown = spouseCppIncome + spouseOasGross + spousePensionIncome + spouseRrspWithdrawal;
    const spouseOasIncome = s.isCouple
      ? Math.max(0, spouseOasGross - calcOasClawback(spouseIncomeBeforeDrawdown))
      : 0;

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
      gainsIncome = calcGainsBenefit(age, pensionIncome + rrspWithdrawal, s.province || 'ON');
    }

    const spouseKnownIncome = s.isCouple
      ? spouseEmploymentIncome + spouseCppIncome + spouseOasIncome + spousePensionIncome + spouseRrspWithdrawal
      : 0;
    const totalKnownIncome = employmentIncome + nonTaxedIncome + cppIncome + oasIncome + gisIncome + gainsIncome + pensionIncome + rrspWithdrawal + spouseKnownIncome;
    const totalNeed = expenses + debtPayments;
    const shortfall = Math.max(0, totalNeed - totalKnownIncome);

    let tfsaWithdrawal = 0;
    let spouseTfsaWithdrawal = 0;
    let nonRegWithdrawal = 0;
    let otherWithdrawal = 0;

    const withdrawalOrder = s.withdrawalOrder || ['tfsa', 'nonReg', 'rrsp', 'other'];
    let rrspAvail = Math.max(0, rrsp - rrspWithdrawal);
    let tfsaAvail = tfsa;
    let spouseTfsaAvail = s.isCouple ? spouseTfsa : 0;
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
            if (s.isCouple && remaining > 0) {
              const spouseDraw = Math.min(remaining, spouseTfsaAvail);
              spouseTfsaWithdrawal += spouseDraw;
              spouseTfsaAvail -= spouseDraw;
              remaining -= spouseDraw;
            }
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
            const primaryDraw = Math.min(remaining, rrspAvail);
            rrspWithdrawal += primaryDraw;
            rrspAvail -= primaryDraw;
            remaining -= primaryDraw;
            if (s.isCouple && remaining > 0) {
              const spouseDraw = Math.min(remaining, spouseRrspAvail);
              spouseRrspWithdrawal += spouseDraw;
              spouseRrspAvail -= spouseDraw;
              remaining -= spouseDraw;
            }
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

      const primaryHasPension = pensionIncome > 0 || (rrifConverted && rrspWithdrawal > 0);
      const primaryTaxable = employmentIncome + cppIncome + oasIncome + pensionIncome + rrspWithdrawal;
      nonRegTaxableGain = 0;
      if (nonRegWithdrawal > 0 && nonReg > 0) {
        const gainRatio = Math.max(0, (nonReg - nonRegCostBasis) / nonReg);
        nonRegTaxableGain = calcTaxableCapitalGain(nonRegWithdrawal * gainRatio);
      }
      if (s.isCouple) {
        const spouseHasPension = spousePensionIncome > 0 || (spouseRrifConverted && spouseRrspWithdrawal > 0);
        const spouseTaxable = spouseEmploymentIncome + spouseCppIncome + spouseOasIncome + spousePensionIncome + spouseRrspWithdrawal;
        totalTaxableIncome = primaryTaxable + nonRegTaxableGain + spouseTaxable;
        totalTax = calcTotalTax(primaryTaxable + nonRegTaxableGain, age, primaryHasPension, s.province || 'ON')
          + calcTotalTax(spouseTaxable, spouseAgeThisYear, spouseHasPension, s.province || 'ON');
      } else {
        totalTaxableIncome = primaryTaxable + nonRegTaxableGain;
        totalTax = calcTotalTax(totalTaxableIncome, age, primaryHasPension, s.province || 'ON');
      }
      grossIncome = employmentIncome + nonTaxedIncome + cppIncome + oasIncome + gisIncome + gainsIncome
        + pensionIncome + rrspWithdrawal + tfsaWithdrawal + nonRegWithdrawal + otherWithdrawal
        + spouseEmploymentIncome + spouseCppIncome + spouseOasIncome + spousePensionIncome + spouseRrspWithdrawal
        + spouseTfsaWithdrawal;
      afterTaxIncome = grossIncome - totalTax;
      surplus = afterTaxIncome - expenses - debtPayments;

      if (surplus >= -50) break;
      remaining = -surplus;
      if (rrspAvail <= 0 && tfsaAvail <= 0 && (!s.isCouple || spouseTfsaAvail <= 0) && nonRegAvail <= 0 && otherAvail <= 0) break;
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
    if (s.isCouple) {
      spouseRrsp = Math.max(0, spouseRrsp - spouseRrspWithdrawal);
      spouseTfsa = Math.max(0, spouseTfsa - spouseTfsaWithdrawal);
    }

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
    if (s.isCouple) {
      spouseRrsp *= (1 + realReturn);
      spouseTfsa *= (1 + tfsaReturn);
    }
    const totalPortfolio = rrsp + tfsa + nonReg + other
      + (s.isCouple ? spouseRrsp + spouseTfsa : 0);
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
      spouseCppIncome: s.isCouple ? Math.round(spouseCppIncome) : undefined,
      spouseOasIncome: s.isCouple ? Math.round(spouseOasIncome) : undefined,
      spouseEmploymentIncome: s.isCouple ? Math.round(spouseEmploymentIncome) : undefined,
      spousePensionIncome: s.isCouple ? Math.round(spousePensionIncome) : undefined,
      spouseRrspWithdrawal: s.isCouple ? Math.round(spouseRrspWithdrawal) : undefined,
      spouseRrspBalance: s.isCouple ? Math.round(spouseRrsp) : undefined,
      spouseTfsaWithdrawal: s.isCouple ? Math.round(spouseTfsaWithdrawal) : undefined,
      spouseTfsaBalance: s.isCouple ? Math.round(spouseTfsa) : undefined,
    });
  }

  return results;
}
