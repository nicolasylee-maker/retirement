import { projectScenario } from './projectionEngine.js'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function findDepletionAge(rows) { return rows.find(r => r.totalPortfolio <= 0)?.age ?? null }
function sumAfterTaxIncome(rows) { return rows.reduce((s, r) => s + r.afterTaxIncome, 0) }
function scoreRows(rows) {
  return {
    depletion: findDepletionAge(rows),
    income: sumAfterTaxIncome(rows),
    tax: rows.reduce((s, r) => s + (r.totalTax || 0), 0),
  }
}

function isBetter(cand, base) {
  if (base.depletion !== null && cand.depletion === null) return true
  if (base.depletion === null && cand.depletion === null) return cand.income > base.income
  if (base.depletion !== null && cand.depletion !== null) {
    if (cand.depletion !== base.depletion) return cand.depletion > base.depletion
    return cand.income > base.income
  }
  return false
}

function calcImpact(base, best, lifeExpectancy) {
  return {
    depletionYearsGained: base.depletion !== null ? Math.max(0, (best.depletion ?? lifeExpectancy) - base.depletion) : 0,
    lifetimeIncomeGained: Math.round(best.income - base.income),
    lifetimeTaxSaved: Math.round(Math.max(0, base.tax - best.tax)),
    oasClawbackAvoided: 0,
  }
}

function mkBefore(label, base) { return { label, depletionAge: base.depletion, lifetimeIncome: Math.round(base.income) } }
function mkAfter(label, best) { return { label, depletionAge: best.depletion, lifetimeIncome: Math.round(best.income) } }

// ─── CPP timing (primary + spouse) ───────────────────────────────────────────

function testCppTiming(s, base, isSpouse) {
  const ageKey = isSpouse ? 'spouseCppStartAge' : 'cppStartAge'
  const dim = isSpouse ? 'spouseCpp' : 'cpp'
  const cur = s[ageKey] || 65
  let best = null, bestAge = null, runs = 0
  for (let age = 60; age <= 70; age++) {
    if (age === cur) continue
    runs++
    const r = scoreRows(projectScenario({ ...s, [ageKey]: age }))
    if (!best || isBetter(r, best)) { best = r; bestAge = age }
  }
  if (!best || !isBetter(best, base)) return { rec: null, runs }
  const impact = calcImpact(base, best, s.lifeExpectancy)
  const prefix = isSpouse ? 'Have your spouse ' : ''
  const d = bestAge > cur
  return {
    rec: {
      id: `${dim}-${bestAge}`, dimension: dim, category: isSpouse ? 'couple' : 'plan',
      title: `${prefix}${d ? 'Defer' : 'Start'} CPP at ${bestAge} (currently ${cur})`,
      description: d ? `${prefix}Deferring CPP to ${bestAge} permanently increases the benefit and reduces portfolio drawdowns during bridge years.` : `${prefix}Starting CPP earlier at ${bestAge} provides income sooner, reducing strain on a thin portfolio.`,
      reasoning: d ? 'The portfolio can bridge the income gap, making the permanent benefit increase worthwhile.' : 'The portfolio is thin — earlier CPP income reduces depletion risk.',
      badge: impact.depletionYearsGained > 2 ? 'Biggest Impact' : 'Extends Plan', badgeColor: 'green', impact,
      before: mkBefore(`CPP at ${cur}`, base), after: mkAfter(`CPP at ${bestAge}`, best), changes: { [ageKey]: bestAge },
    }, runs,
  }
}

// ─── OAS timing (primary + spouse) ───────────────────────────────────────────

function testOasTiming(s, base, isSpouse) {
  const ageKey = isSpouse ? 'spouseOasStartAge' : 'oasStartAge'
  const dim = isSpouse ? 'spouseOas' : 'oas'
  const cur = s[ageKey] || 65
  let best = null, bestAge = null, runs = 0
  for (let age = 65; age <= 70; age++) {
    if (age === cur) continue
    runs++
    const r = scoreRows(projectScenario({ ...s, [ageKey]: age }))
    if (!best || isBetter(r, best)) { best = r; bestAge = age }
  }
  if (!best || !isBetter(best, base)) return { rec: null, runs }
  const impact = calcImpact(base, best, s.lifeExpectancy)
  const prefix = isSpouse ? 'Have your spouse ' : ''
  const d = bestAge > cur
  return {
    rec: {
      id: `${dim}-${bestAge}`, dimension: dim, category: isSpouse ? 'couple' : 'tax',
      title: `${prefix}${d ? 'Defer' : 'Take'} OAS at ${bestAge} (currently ${cur})`,
      description: d ? `${prefix}Deferring OAS to ${bestAge} increases the benefit by ${Math.round((bestAge - 65) * 7.2)}% and avoids clawback when income is high.` : `${prefix}Taking OAS earlier at ${bestAge} provides additional household income.`,
      reasoning: d ? 'Income from pension or registered withdrawals may push income above the OAS clawback threshold at 65 — deferring avoids this.' : 'Income is low enough that earlier OAS adds cash flow with minimal clawback impact.',
      badge: 'Tax Saver', badgeColor: 'amber', impact,
      before: mkBefore(`OAS at ${cur}`, base), after: mkAfter(`OAS at ${bestAge}`, best), changes: { [ageKey]: bestAge },
    }, runs,
  }
}

// ─── Withdrawal order ─────────────────────────────────────────────────────────

const WITHDRAWAL_PERMS = [
  ['rrsp', 'tfsa', 'nonReg', 'other'], ['rrsp', 'nonReg', 'tfsa', 'other'],
  ['tfsa', 'rrsp', 'nonReg', 'other'], ['tfsa', 'nonReg', 'rrsp', 'other'],
  ['nonReg', 'rrsp', 'tfsa', 'other'], ['nonReg', 'tfsa', 'rrsp', 'other'],
]

function testWithdrawalOrder(s, base) {
  const curKey = (s.withdrawalOrder || []).slice(0, 3).join(',')
  let best = null, bestOrder = null, runs = 0
  for (const order of WITHDRAWAL_PERMS) {
    if (order.slice(0, 3).join(',') === curKey) continue
    runs++
    const r = scoreRows(projectScenario({ ...s, withdrawalOrder: order }))
    if (!best || isBetter(r, best)) { best = r; bestOrder = order }
  }
  if (!best || !isBetter(best, base)) return { rec: null, runs }
  const impact = calcImpact(base, best, s.lifeExpectancy)
  const curLabel = (s.withdrawalOrder || []).slice(0, 3).join(' → ')
  const bestLabel = bestOrder.slice(0, 3).join(' → ')
  return {
    rec: {
      id: `withdrawal-${bestOrder.slice(0, 3).join('-')}`, dimension: 'withdrawalOrder', category: 'tax',
      title: `Switch to ${bestLabel} withdrawal order`,
      description: 'Drawing from accounts in the optimal order minimizes lifetime taxes by deferring tax-advantaged growth as long as possible.',
      reasoning: 'TFSA withdrawals are tax-free — keeping them last lets the balance compound longer. Non-reg gains are taxed more favourably than RRSP income.',
      badge: 'Tax Saver', badgeColor: 'amber', impact,
      before: mkBefore(curLabel, base), after: mkAfter(bestLabel, best), changes: { withdrawalOrder: bestOrder },
    }, runs,
  }
}

// ─── RRSP meltdown ────────────────────────────────────────────────────────────

function testMeltdown(s, base) {
  const variations = []
  const startAge = s.retirementAge || s.currentAge
  if (!s.rrspMeltdownEnabled) {
    for (const amount of [10000, 15000, 20000, 25000, 30000]) {
      for (const endAge of [71, 75, 80]) {
        if (endAge > startAge) variations.push({ rrspMeltdownEnabled: true, rrspMeltdownStartAge: startAge, rrspMeltdownTargetAge: endAge, rrspMeltdownAnnual: amount })
      }
    }
  } else {
    const cur = s.rrspMeltdownAnnual || 20000
    for (const amt of [cur - 10000, cur - 5000, cur + 5000, cur + 10000].filter(a => a > 0)) variations.push({ rrspMeltdownAnnual: amt })
    for (const endAge of [71, 75, 80, 85]) { if (endAge !== s.rrspMeltdownTargetAge) variations.push({ rrspMeltdownTargetAge: endAge }) }
    variations.push({ rrspMeltdownEnabled: false })
  }
  let best = null, bestChanges = null, runs = 0
  for (const changes of variations) {
    runs++
    const r = scoreRows(projectScenario({ ...s, ...changes }))
    if (!best || isBetter(r, best)) { best = r; bestChanges = changes }
  }
  if (!best || !isBetter(best, base)) return { rec: null, runs }
  const impact = calcImpact(base, best, s.lifeExpectancy)
  const enabling = !s.rrspMeltdownEnabled && bestChanges.rrspMeltdownEnabled
  const amount = bestChanges.rrspMeltdownAnnual ?? s.rrspMeltdownAnnual ?? 0
  const endAge = bestChanges.rrspMeltdownTargetAge ?? s.rrspMeltdownTargetAge ?? 71
  const fmtK = v => `$${Math.round(v / 1000)}K`
  return {
    rec: {
      id: `meltdown-${enabling ? 'enable' : 'adjust'}`, dimension: 'meltdown', category: 'tax',
      title: enabling ? `Enable RRSP meltdown: ${fmtK(amount)}/yr until ${endAge}` : `Adjust meltdown to ${fmtK(amount)}/yr`,
      description: enabling ? `Withdrawing ${fmtK(amount)}/yr from your RRSP before age 72 smooths your tax burden and reduces forced RRIF minimums.` : 'Fine-tuning your meltdown amount better fits the available tax room in these years.',
      reasoning: 'Withdrawing from RRSP in lower-income years locks in a lower tax rate and shrinks future mandatory RRIF minimums.',
      badge: 'Tax Saver', badgeColor: 'amber', impact,
      before: mkBefore(s.rrspMeltdownEnabled ? `${fmtK(s.rrspMeltdownAnnual ?? 0)}/yr meltdown` : 'No meltdown', base),
      after: mkAfter(bestChanges.rrspMeltdownEnabled === false ? 'No meltdown' : `${fmtK(amount)}/yr until ${endAge}`, best),
      changes: bestChanges,
    }, runs,
  }
}

// ─── Debt payoff timing ───────────────────────────────────────────────────────

function testDebt(s, base) {
  const curPayoff = s.consumerDebtPayoffAge || (s.currentAge + 10)
  const ages = [2, 3, 4, 5, 7, 10].map(o => s.currentAge + o).filter(age => age !== curPayoff && age <= s.lifeExpectancy)
  let best = null, bestAge = null, runs = 0
  for (const age of ages) {
    runs++
    const r = scoreRows(projectScenario({ ...s, consumerDebtPayoffAge: age }))
    if (!best || isBetter(r, best)) { best = r; bestAge = age }
  }
  if (!best || !isBetter(best, base)) return { rec: null, runs }
  const impact = calcImpact(base, best, s.lifeExpectancy)
  return {
    rec: {
      id: `debt-${bestAge}`, dimension: 'debt', category: 'plan',
      title: `Pay off debt by ${bestAge} (currently ${curPayoff})`,
      description: `Eliminating ${Math.round((s.consumerDebtRate || 0.08) * 100)}% consumer debt by age ${bestAge} frees cash flow and reduces total interest paid.`,
      reasoning: 'High-rate debt costs more than most investment returns. Paying it off sooner is often the highest guaranteed return available.',
      badge: 'Quick Win', badgeColor: 'blue', impact,
      before: mkBefore(`Debt-free at ${curPayoff}`, base), after: mkAfter(`Debt-free at ${bestAge}`, best),
      changes: { consumerDebtPayoffAge: bestAge },
    }, runs,
  }
}

// ─── Expense reduction ────────────────────────────────────────────────────────

function testExpenses(s, base) {
  const curRed = s.expenseReductionAtRetirement || 0
  let best = null, bestAdd = null, runs = 0
  for (const add of [0.05, 0.10, 0.15, 0.20, 0.25]) {
    runs++
    const r = scoreRows(projectScenario({ ...s, expenseReductionAtRetirement: curRed + add }))
    if (!best || isBetter(r, best)) { best = r; bestAdd = add }
  }
  if (!best || !isBetter(best, base)) return { rec: null, runs }
  const impact = calcImpact(base, best, s.lifeExpectancy)
  const monthly = Math.round((s.monthlyExpenses || 0) * bestAdd)
  return {
    rec: {
      id: `expenses-${Math.round(bestAdd * 100)}pct`, dimension: 'expenses', category: 'plan',
      title: `Reduce spending by $${monthly.toLocaleString()}/mo`,
      description: `A ${Math.round(bestAdd * 100)}% spending reduction ($${monthly.toLocaleString()}/mo) ${best.depletion ? `extends your plan to age ${best.depletion}` : 'covers you through your target age'}.`,
      reasoning: 'Your portfolio is on track to run out before your target age. Reducing expenses is the most direct lever to close the gap.',
      badge: 'Extends Plan', badgeColor: 'green', impact,
      before: mkBefore(`$${(s.monthlyExpenses || 0).toLocaleString()}/mo`, base),
      after: mkAfter(`$${((s.monthlyExpenses || 0) - monthly).toLocaleString()}/mo`, best),
      changes: { expenseReductionAtRetirement: curRed + bestAdd },
    }, runs,
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export const DIMENSION_LABELS = {
  cpp: 'CPP Timing', oas: 'OAS Timing', withdrawalOrder: 'Withdrawal Order',
  meltdown: 'RRSP Meltdown', debt: 'Debt Payoff', expenses: 'Expense Level',
  spouseCpp: 'Spouse CPP Timing', spouseOas: 'Spouse OAS Timing',
}

export function runOptimization(scenario) {
  const s = scenario
  const base = scoreRows(projectScenario(s))
  const hasRrsp = (s.rrspBalance || 0) + (s.rrifBalance || 0) > 0

  const dims = [
    { key: 'cpp',           skip: !s.cppMonthly,                       run: () => testCppTiming(s, base, false) },
    { key: 'oas',           skip: !s.oasMonthly,                       run: () => testOasTiming(s, base, false) },
    { key: 'withdrawalOrder', skip: !hasRrsp,                          run: () => testWithdrawalOrder(s, base) },
    { key: 'meltdown',      skip: !hasRrsp,                            run: () => testMeltdown(s, base) },
    { key: 'debt',          skip: !(s.consumerDebt > 0),               run: () => testDebt(s, base) },
    { key: 'expenses',      skip: base.depletion === null,             run: () => testExpenses(s, base) },
    { key: 'spouseCpp',     skip: !s.isCouple || !s.spouseCppMonthly, run: () => testCppTiming(s, base, true) },
    { key: 'spouseOas',     skip: !s.isCouple || !s.spouseOasMonthly, run: () => testOasTiming(s, base, true) },
  ]

  const recommendations = [], alreadyOptimal = []
  let runCount = 1

  for (const { key, skip, run } of dims) {
    if (skip) continue
    const { rec, runs } = run()
    runCount += runs
    if (rec) { recommendations.push(rec) } else { alreadyOptimal.push({ dimension: key, label: DIMENSION_LABELS[key] }) }
  }

  recommendations.sort((a, b) => {
    const dy = b.impact.depletionYearsGained - a.impact.depletionYearsGained
    return dy !== 0 ? dy : b.impact.lifetimeIncomeGained - a.impact.lifetimeIncomeGained
  })

  return {
    recommendations, alreadyOptimal, runCount,
    baselineDepletion: base.depletion,
    baselineLifetimeIncome: Math.round(base.income),
    lifeExpectancy: s.lifeExpectancy,
    currentAge: s.currentAge,
    bestPossibleDepletion: recommendations.length > 0
      ? Math.max(...recommendations.map(r => r.after.depletionAge ?? s.lifeExpectancy))
      : base.depletion,
  }
}
