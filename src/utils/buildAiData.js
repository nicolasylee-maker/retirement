import { calcSustainableWithdrawal } from '../engines/withdrawalCalc';
import { calcDebtSchedule } from './debtCalc';
import { projectScenario } from '../engines/projectionEngine';
import { calcEstateImpact } from '../engines/estateEngine';

export function buildDashboardAiData(scenario, projectionData) {
  const retirementRow = projectionData.find(r => r.age === scenario.retirementAge);
  const lastRow = projectionData[projectionData.length - 1];
  const { sustainableMonthly } = calcSustainableWithdrawal(scenario);

  return {
    currentAge: scenario.currentAge,
    retirementAge: scenario.retirementAge,
    lifeExpectancy: scenario.lifeExpectancy,
    monthlyExpenses: scenario.monthlyExpenses,
    netWorthAtRetirement: retirementRow?.netWorth || 0,
    annualIncome: retirementRow?.totalIncome || 0,
    annualTax: retirementRow?.totalTax || 0,
    sustainableMonthly,
    portfolioAtEnd: lastRow?.totalPortfolio || 0,
    rrspBalance: scenario.rrspBalance,
    tfsaBalance: scenario.tfsaBalance,
    nonRegBalance: scenario.nonRegInvestments,
    cppMonthly: scenario.cppMonthly,
    cppStartAge: scenario.cppStartAge,
    oasMonthly: scenario.oasMonthly,
    oasStartAge: scenario.oasStartAge,
    pensionIncome: scenario.pensionType === 'db' ? scenario.dbPensionAnnual : 0,
  };
}

export function buildDebtAiData(scenario, projectionData) {
  const consumerPayoffAge = scenario.consumerDebtPayoffAge || (scenario.currentAge + 10);
  const mortgagePayoffAge = scenario.currentAge + (scenario.mortgageYearsLeft || 0);

  const consumerSchedule = calcDebtSchedule(
    scenario.consumerDebt, scenario.consumerDebtRate || 0.08,
    consumerPayoffAge, scenario.currentAge, 'Consumer',
  );
  const mortgageSchedule = calcDebtSchedule(
    scenario.mortgageBalance, scenario.mortgageRate || 0.05,
    mortgagePayoffAge, scenario.currentAge, 'Mortgage',
  );

  const totalDebt = (scenario.consumerDebt || 0) + (scenario.mortgageBalance || 0) + (scenario.otherDebt || 0);
  const totalConsumerInterest = consumerSchedule.length > 0 ? consumerSchedule[consumerSchedule.length - 1]?.totalInterest || 0 : 0;
  const totalMortgageInterest = mortgageSchedule.length > 0 ? mortgageSchedule[mortgageSchedule.length - 1]?.totalInterest || 0 : 0;
  const totalInterest = totalConsumerInterest + totalMortgageInterest;
  const debtFreeAge = Math.max(consumerPayoffAge, mortgagePayoffAge);

  // Merge schedules to compute monthly payments
  const firstConsumerPayment = consumerSchedule[1]?.payment || 0;
  const firstMortgagePayment = mortgageSchedule[1]?.payment || 0;
  const monthlyPayments = firstConsumerPayment / 12 + firstMortgagePayment / 12;

  const debtFreeRow = projectionData.find(r => r.age > scenario.currentAge && r.debtPayments === 0);
  const projectedDebtFreeAge = debtFreeRow?.age || debtFreeAge;

  return {
    totalDebt, totalInterest, debtFreeAge: projectedDebtFreeAge,
    consumerDebt: scenario.consumerDebt, consumerRate: scenario.consumerDebtRate,
    mortgageBalance: scenario.mortgageBalance, mortgageRate: scenario.mortgageRate,
    retirementAge: scenario.retirementAge, currentAge: scenario.currentAge,
    monthlyPayments,
  };
}

export function buildCompareAiData(selectedScenarios) {
  if (!selectedScenarios || selectedScenarios.length < 2) return null;

  return {
    scenarios: selectedScenarios.map(s => {
      const proj = projectScenario(s);
      const retRow = proj?.find(r => r.age === s.retirementAge);
      const lastRow = proj?.[proj.length - 1];
      const sw = calcSustainableWithdrawal(s);
      return {
        name: s.name || 'Unnamed',
        netWorthAtRetirement: retRow?.netWorth || 0,
        sustainableMonthly: sw.sustainableMonthly,
        annualTax: retRow?.totalTax || 0,
        portfolioAtEnd: lastRow?.totalPortfolio || 0,
        lifeExpectancy: s.lifeExpectancy,
      };
    }),
  };
}

export function buildEstateAiData(scenario, projectionData, ageAtDeath) {
  const effectiveAge = ageAtDeath ?? Math.min(scenario.lifeExpectancy ?? 90, 85);
  const estateResult = calcEstateImpact(scenario, projectionData, effectiveAge);

  return {
    ageAtDeath: effectiveAge,
    grossEstate: estateResult.grossEstate,
    totalTax: estateResult.totalEstateTax,
    netToHeirs: estateResult.netToHeirs,
    hasWill: scenario.hasWill ?? true,
    primaryBeneficiary: scenario.primaryBeneficiary,
    rrspBalance: estateResult.rrspRrifDeemed || 0,
    spouseRollover: scenario.primaryBeneficiary === 'spouse',
  };
}

export function buildOptimizeAiData(optimizationResult, scenario) {
  const { recommendations, alreadyOptimal, baselineDepletion, lifeExpectancy, currentAge } = optimizationResult
  const totalMonthlyGain = recommendations.reduce((s, r) => s + (r.impact.monthlyImpact || 0), 0)
  return {
    planDepletes: baselineDepletion !== null,
    depletionAge: baselineDepletion,
    lifeExpectancy,
    currentAge,
    monthlyExpenses: scenario?.monthlyExpenses || 0,
    recommendationCount: recommendations.length,
    totalMonthlyGain,
    recommendations: recommendations.map(r => ({
      dimension: r.dimension,
      title: r.title,
      monthlyImpact: r.impact.monthlyImpact || 0,
      reasoning: r.reasoning,
    })),
    alreadyOptimal: alreadyOptimal.map(o => o.label),
  }
}
