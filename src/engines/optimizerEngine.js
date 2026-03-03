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

function calcImpact(base, best, lifeExpectancy, benefitStartAge) {
  const lifetimeIncomeGained = Math.round(best.income - base.income)
  const months = Math.max(1, (lifeExpectancy - benefitStartAge) * 12)
  return {
    depletionYearsGained: base.depletion !== null ? Math.max(0, (best.depletion ?? lifeExpectancy) - base.depletion) : 0,
    lifetimeIncomeGained,
    lifetimeTaxSaved: Math.round(Math.max(0, base.tax - best.tax)),
    oasClawbackAvoided: 0,
    monthlyImpact: lifetimeIncomeGained > 0 ? Math.round(lifetimeIncomeGained / months) : 0,
  }
}

function mkBefore(label, base, le, ra) {
  const months = Math.max(1, (le - (ra || 60)) * 12)
  return { label, depletionAge: base.depletion, lifetimeIncome: Math.round(base.income),
           monthlyAvgIncome: Math.round(base.income / months) }
}
function mkAfter(label, best, le, ra) {
  const months = Math.max(1, (le - (ra || 60)) * 12)
  return { label, depletionAge: best.depletion, lifetimeIncome: Math.round(best.income),
           monthlyAvgIncome: Math.round(best.income / months) }
}

// ─── CPP timing (primary + spouse) ───────────────────────────────────────────

function testCppTiming(s, base, isSpouse) {
  const ageKey = isSpouse ? 'spouseCppStartAge' : 'cppStartAge'
  const monthlyKey = isSpouse ? 'spouseCppMonthly' : 'cppMonthly'
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
  const impact = calcImpact(base, best, s.lifeExpectancy, bestAge)
  const d = bestAge > cur
  const cppAdjust = (age) => Math.round((s[monthlyKey] || 0) * (1 + (age - 65) * 0.072))
  const curMonthly = cppAdjust(cur)
  const newMonthly = cppAdjust(bestAge)
  const diff = newMonthly - curMonthly
  const ra = s.retirementAge || s.currentAge
  return {
    rec: {
      id: `${dim}-${bestAge}`, dimension: dim, category: isSpouse ? 'couple' : 'plan',
      title: d ? `Wait until ${bestAge} to start CPP` : `Start CPP earlier at ${bestAge}`,
      description: d
        ? `Your monthly CPP goes from $${curMonthly} to $${newMonthly}. That's $${diff}/mo more for the rest of your life.`
        : `Starting CPP at ${bestAge} gives you $${newMonthly}/mo sooner and reduces pressure on your savings.`,
      reasoning: d
        ? 'You have enough savings to cover expenses while you wait. The bigger monthly cheque is worth the wait.'
        : 'Your portfolio is thin — earlier CPP income reduces depletion risk.',
      badge: 'Bigger Cheques', badgeColor: 'green', impact,
      before: mkBefore(`CPP at ${cur}`, base, s.lifeExpectancy, ra),
      after: mkAfter(`CPP at ${bestAge}`, best, s.lifeExpectancy, ra),
      changes: { [ageKey]: bestAge },
    }, runs,
  }
}

// ─── OAS timing (primary + spouse) ───────────────────────────────────────────

function testOasTiming(s, base, isSpouse) {
  const ageKey = isSpouse ? 'spouseOasStartAge' : 'oasStartAge'
  const monthlyKey = isSpouse ? 'spouseOasMonthly' : 'oasMonthly'
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
  const impact = calcImpact(base, best, s.lifeExpectancy, bestAge)
  const d = bestAge > cur
  const oasAdjust = (age) => Math.round((s[monthlyKey] || 0) * (1 + Math.max(0, age - 65) * 0.072))
  const curOas = oasAdjust(cur)
  const newOas = oasAdjust(bestAge)
  const ra = s.retirementAge || s.currentAge
  return {
    rec: {
      id: `${dim}-${bestAge}`, dimension: dim, category: isSpouse ? 'couple' : 'tax',
      title: d ? `Wait until ${bestAge} to start OAS` : `Take OAS earlier at ${bestAge}`,
      description: d
        ? `Your monthly OAS goes from $${curOas} to $${newOas}. Plus, waiting means the government won't claw any of it back.`
        : `Taking OAS earlier at ${bestAge} provides additional household income.`,
      reasoning: d
        ? "Right now your income is high enough that the government would take back some of your OAS. Waiting until your income drops means you keep all of it."
        : 'Income is low enough that earlier OAS adds cash flow with minimal clawback impact.',
      badge: 'Keep More Money', badgeColor: 'amber', impact,
      before: mkBefore(`OAS at ${cur}`, base, s.lifeExpectancy, ra),
      after: mkAfter(`OAS at ${bestAge}`, best, s.lifeExpectancy, ra),
      changes: { [ageKey]: bestAge },
    }, runs,
  }
}

// ─── Withdrawal order ─────────────────────────────────────────────────────────

const WITHDRAWAL_PERMS = [
  ['rrsp', 'tfsa', 'nonReg', 'other'], ['rrsp', 'nonReg', 'tfsa', 'other'],
  ['tfsa', 'rrsp', 'nonReg', 'other'], ['tfsa', 'nonReg', 'rrsp', 'other'],
  ['nonReg', 'rrsp', 'tfsa', 'other'], ['nonReg', 'tfsa', 'rrsp', 'other'],
]

const ACCOUNT_LABELS = { rrsp: 'RRSP', tfsa: 'TFSA', nonReg: 'non-registered', other: 'other accounts' }

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
  const impact = calcImpact(base, best, s.lifeExpectancy, s.retirementAge || s.currentAge)
  const curLabel = (s.withdrawalOrder || []).slice(0, 3).join(' → ')
  const bestLabel = bestOrder.slice(0, 3).join(' → ')
  const ra = s.retirementAge || s.currentAge
  return {
    rec: {
      id: `withdrawal-${bestOrder.slice(0, 3).join('-')}`, dimension: 'withdrawalOrder', category: 'tax',
      title: `Draw from ${ACCOUNT_LABELS[bestOrder[0]] || bestOrder[0]} first, save ${ACCOUNT_LABELS[bestOrder[2]] || bestOrder[2]} for last`,
      description: `This order means less tax overall. Your ${ACCOUNT_LABELS[bestOrder[2]] || bestOrder[2]} keeps growing tax-free while you spend from ${ACCOUNT_LABELS[bestOrder[0]] || bestOrder[0]}.`,
      reasoning: 'Money in your TFSA grows tax-free forever. The longer you leave it alone, the more it\'s worth.',
      badge: 'Pay Less Tax', badgeColor: 'amber', impact,
      before: mkBefore(curLabel, base, s.lifeExpectancy, ra),
      after: mkAfter(bestLabel, best, s.lifeExpectancy, ra),
      changes: { withdrawalOrder: bestOrder },
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
  const impact = calcImpact(base, best, s.lifeExpectancy, s.retirementAge || s.currentAge)
  const enabling = !s.rrspMeltdownEnabled && bestChanges.rrspMeltdownEnabled
  const amount = bestChanges.rrspMeltdownAnnual ?? s.rrspMeltdownAnnual ?? 0
  const endAge = bestChanges.rrspMeltdownTargetAge ?? s.rrspMeltdownTargetAge ?? 71
  const fmtK = v => `$${Math.round(v / 1000)}K`
  const ra = s.retirementAge || s.currentAge
  return {
    rec: {
      id: `meltdown-${enabling ? 'enable' : 'adjust'}`, dimension: 'meltdown', category: 'tax',
      title: enabling
        ? `Gradually move ${fmtK(amount)}/yr from your RRSP`
        : `Shift ${fmtK(amount)}/yr from your RRSP until ${endAge}`,
      description: enabling
        ? "Moving money out of your RRSP while your income is low means you pay less tax on it. If you wait until 71, the government forces you to withdraw at higher tax rates."
        : "Fine-tuning how much you move each year better fits the tax room available in these years.",
      reasoning: 'Withdrawing from your RRSP in lower-income years locks in a lower tax rate and reduces future mandatory withdrawals.',
      badge: 'Pay Less Tax', badgeColor: 'amber', impact,
      before: mkBefore(s.rrspMeltdownEnabled ? `${fmtK(s.rrspMeltdownAnnual ?? 0)}/yr transfer` : 'No RRSP transfer', base, s.lifeExpectancy, ra),
      after: mkAfter(bestChanges.rrspMeltdownEnabled === false ? 'No RRSP transfer' : `${fmtK(amount)}/yr until ${endAge}`, best, s.lifeExpectancy, ra),
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
  const impact = calcImpact(base, best, s.lifeExpectancy, bestAge)
  const diff = curPayoff - bestAge
  const ra = s.retirementAge || s.currentAge
  return {
    rec: {
      id: `debt-${bestAge}`, dimension: 'debt', category: 'plan',
      title: `Pay off your debt by age ${bestAge}`,
      description: `Paying it off ${diff} year${diff !== 1 ? 's' : ''} sooner saves you roughly $${Math.round(impact.lifetimeIncomeGained / 1000)}K in interest and frees up cash flow.`,
      reasoning: 'High-rate debt costs more than most investment returns. Paying it off sooner is often the highest guaranteed return available.',
      badge: 'Save Money', badgeColor: 'blue', impact,
      before: mkBefore(`Debt-free at ${curPayoff}`, base, s.lifeExpectancy, ra),
      after: mkAfter(`Debt-free at ${bestAge}`, best, s.lifeExpectancy, ra),
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
  const impact = calcImpact(base, best, s.lifeExpectancy, s.retirementAge || s.currentAge)
  const monthly = Math.round((s.monthlyExpenses || 0) * bestAdd)
  const yearsGained = (best.depletion ?? s.lifeExpectancy) - base.depletion
  const ra = s.retirementAge || s.currentAge
  return {
    rec: {
      id: `expenses-${Math.round(bestAdd * 100)}pct`, dimension: 'expenses', category: 'plan',
      title: best.depletion
        ? `Spending $${monthly.toLocaleString()}/mo less makes your money last to age ${best.depletion}`
        : `Spending $${monthly.toLocaleString()}/mo less means your money outlasts you`,
      description: `Cutting from $${(s.monthlyExpenses||0).toLocaleString()}/mo to $${((s.monthlyExpenses||0)-monthly).toLocaleString()}/mo means your savings last ${yearsGained} more year${yearsGained !== 1 ? 's' : ''}.`,
      reasoning: 'Your portfolio is on track to run out before your target age. Reducing expenses is the most direct lever to close the gap.',
      badge: 'More Years', badgeColor: 'green', impact,
      before: mkBefore(`$${(s.monthlyExpenses || 0).toLocaleString()}/mo`, base, s.lifeExpectancy, ra),
      after: mkAfter(`$${((s.monthlyExpenses || 0) - monthly).toLocaleString()}/mo`, best, s.lifeExpectancy, ra),
      changes: { expenseReductionAtRetirement: curRed + bestAdd },
    }, runs,
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export const DIMENSION_LABELS = {
  cpp: 'CPP Timing', oas: 'OAS Timing', withdrawalOrder: 'Withdrawal Order',
  meltdown: 'Gradual RRSP Transfer', debt: 'Debt Payoff', expenses: 'Expense Level',
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
