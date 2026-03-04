import { calcSustainableWithdrawal } from '../engines/withdrawalCalc';
import { calcDebtSchedule } from './debtCalc';
import { projectScenario } from '../engines/projectionEngine';
import { calcEstateImpact } from '../engines/estateEngine';
import { computeDiffDrivers, getPhaseRanges, computePhaseSummary, computePhaseStatus, computeMonthlySnapshots } from './compareAnalysis';
import { toTodaysDollars } from './inflationHelper';

export function buildDashboardAiData(scenario, projectionData) {
  const retirementRow = projectionData.find(r => r.age === scenario.retirementAge);
  const lastRow = projectionData[projectionData.length - 1];
  const { sustainableMonthly } = calcSustainableWithdrawal(scenario);

  const yearsToRet = scenario.retirementAge - scenario.currentAge;
  const inf = scenario.inflationRate || 0;
  const tdMonthly = (futureAnnual) => Math.round(toTodaysDollars(futureAnnual, yearsToRet, inf) / 12);

  const expensesAtRet = retirementRow?.expenses || 0;
  const cppAtRet = retirementRow?.cppIncome || 0;
  const oasAtRet = retirementRow?.oasIncome || 0;
  const shortfall = (retirementRow?.rrspWithdrawal || 0) + (retirementRow?.tfsaWithdrawal || 0)
    + (retirementRow?.nonRegWithdrawal || 0) + (retirementRow?.otherWithdrawal || 0);

  // Bug 3: Portfolio (liquid) vs net worth (includes real estate)
  const portfolioAtRet = retirementRow?.totalPortfolio || 0;
  const depletionRow = projectionData.find(r => r.age > scenario.currentAge && r.totalPortfolio <= 0);
  const depletionAge = depletionRow ? depletionRow.age : null;
  const portfolioDepleted = depletionAge !== null && depletionAge < scenario.lifeExpectancy;
  const postDepIncome = depletionRow
    ? Math.round((depletionRow.cppIncome || 0) + (depletionRow.oasIncome || 0)
      + (depletionRow.gisIncome || 0) + (depletionRow.pensionIncome || 0))
    : null;
  const postDepExpenses = depletionRow ? Math.round(depletionRow.expenses) : null;

  // Bug 4: Working-years financial health
  const workingYears = projectionData.filter(r => r.age >= scenario.currentAge && r.age < scenario.retirementAge);
  const workingYearsWithWithdrawals = workingYears.filter(r =>
    (r.rrspWithdrawal || 0) + (r.tfsaWithdrawal || 0) + (r.nonRegWithdrawal || 0) + (r.otherWithdrawal || 0) > 0
  ).length;
  const tfsaDepletedWhileWorking = workingYears.some(r => (r.tfsaBalance ?? 1) <= 0);

  // Expense reduction context
  const expReductionPct = Math.round((scenario.expenseReductionAtRetirement || 0) * 100);

  return {
    currentAge: scenario.currentAge,
    retirementAge: scenario.retirementAge,
    lifeExpectancy: scenario.lifeExpectancy,
    inflationRatePct: (inf * 100).toFixed(1),
    monthlyExpenses: scenario.monthlyExpenses,
    expensesAtRetirement: expensesAtRet,
    expensesMonthlyToday: tdMonthly(expensesAtRet),
    portfolioAtRetirement: portfolioAtRet,
    netWorthAtRetirement: retirementRow?.netWorth || 0,
    annualIncome: retirementRow?.totalIncome || 0,
    annualTax: retirementRow?.totalTax || 0,
    annualShortfall: shortfall,
    shortfallMonthlyToday: tdMonthly(shortfall),
    sustainableMonthly,
    sustainableMonthlyToday: sustainableMonthly, // already today's dollars — no deflation
    portfolioAtEnd: lastRow?.totalPortfolio || 0,
    rrspBalance: scenario.rrspBalance,
    tfsaBalance: scenario.tfsaBalance,
    nonRegBalance: scenario.nonRegInvestments,
    cppMonthly: scenario.cppMonthly,
    cppStartAge: scenario.cppStartAge,
    cppAtRetirement: cppAtRet,
    cppMonthlyToday: tdMonthly(cppAtRet),
    oasMonthly: scenario.oasMonthly,
    oasStartAge: scenario.oasStartAge,
    oasAtRetirement: oasAtRet,
    oasMonthlyToday: tdMonthly(oasAtRet),
    pensionIncome: scenario.pensionType === 'db' ? scenario.dbPensionAnnual : 0,
    expReductionPct,
    // Depletion context (Bug 3)
    depletionAge: depletionAge || 'never',
    portfolioDepleted: portfolioDepleted ? 'Yes' : 'No',
    postDepletionIncome: postDepIncome,
    postDepletionExpenses: postDepExpenses,
    // Working-years health (Bug 4)
    yearsToRetirement: yearsToRet,
    workingYearsWithWithdrawals,
    tfsaDepletedWhileWorking: tfsaDepletedWhileWorking ? 'Yes' : 'No',
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

export function buildCompareAiData(selectedScenarios, projections) {
  if (!selectedScenarios || selectedScenarios.length < 2) return null;

  // Use passed-in projections instead of re-running projectScenario
  const projs = projections || selectedScenarios.map(s => projectScenario(s));

  const scenarioData = selectedScenarios.map((s, i) => {
    const proj = projs[i];
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
  });

  // Diff drivers (only for 2 scenarios, capped at 10)
  let diffs = [];
  if (selectedScenarios.length === 2) {
    const allDiffs = computeDiffDrivers(selectedScenarios[0], selectedScenarios[1]);
    diffs = allDiffs.slice(0, 10);
  }

  // Phase summaries per scenario
  const phaseSummaries = selectedScenarios.map((s, i) => {
    const phases = getPhaseRanges(s);
    return phases.map(phase => {
      const summary = computePhaseSummary(projs[i], phase);
      const status = computePhaseStatus(summary);
      return {
        phase: phase.label,
        ages: `${phase.startAge}–${phase.endAge}`,
        portfolioStart: summary?.portfolioStart ?? 0,
        portfolioEnd: summary?.portfolioEnd ?? 0,
        status,
        events: summary?.events?.map(e => `${e.label} @ ${e.age}`) || [],
      };
    });
  });

  // Monthly snapshots per scenario
  const monthlySnapshots = selectedScenarios.map((s, i) => ({
    name: s.name || 'Unnamed',
    snapshots: computeMonthlySnapshots(projs[i]),
  }));

  const inf0 = selectedScenarios[0]?.inflationRate || 0;
  return {
    inflationRatePct: (inf0 * 100).toFixed(1),
    scenarios: scenarioData,
    diffs,
    phaseSummaries,
    monthlySnapshots,
  };
}

export function buildEstateAiData(scenario, projectionData, ageAtDeath) {
  const effectiveAge = ageAtDeath ?? Math.min(scenario.lifeExpectancy ?? 90, 85);
  const estateResult = calcEstateImpact(scenario, projectionData, effectiveAge);

  const yearsToDeath = effectiveAge - scenario.currentAge;
  const inf = scenario.inflationRate || 0;
  const tdAnnual = (futureVal) => Math.round(toTodaysDollars(futureVal, yearsToDeath, inf));

  return {
    ageAtDeath: effectiveAge,
    inflationRatePct: (inf * 100).toFixed(1),
    yearsToDeath,
    grossEstate: estateResult.grossEstate,
    grossEstateToday: tdAnnual(estateResult.grossEstate),
    totalTax: estateResult.totalEstateTax,
    netToHeirs: estateResult.netToHeirs,
    netToHeirsToday: tdAnnual(estateResult.netToHeirs),
    hasWill: scenario.hasWill ?? true,
    primaryBeneficiary: scenario.primaryBeneficiary,
    rrspBalance: estateResult.rrspRrifDeemed || 0,
    rrspBalanceToday: tdAnnual(estateResult.rrspRrifDeemed || 0),
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
