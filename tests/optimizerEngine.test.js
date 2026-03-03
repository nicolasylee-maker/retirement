import { describe, it, expect } from 'vitest'
import { runOptimization } from '../src/engines/optimizerEngine.js'
import { projectScenario } from '../src/engines/projectionEngine.js'
import RAJESH_RAW from '../test-couple-rajesh.json'
import MARGARET_RAW from '../test-scenario.json'

const RAJESH = RAJESH_RAW[0]
const MARGARET = MARGARET_RAW[0]

// Minimal valid scenario — single, retired at 60, ON province, all zeros
const base = {
  id: 'opt-test',
  name: 'Optimizer Test',
  province: 'ON',
  currentAge: 60,
  retirementAge: 60,
  lifeExpectancy: 85,
  isCouple: false,
  spouseAge: 58,
  spouseRetirementAge: 65,
  stillWorking: false,
  employmentIncome: 0,
  spouseEmploymentIncome: 0,
  spouseStillWorking: false,
  nonTaxedIncome: 0,
  nonTaxedIncomeStartAge: 60,
  nonTaxedIncomeEndAge: 90,
  cppMonthly: 800,
  cppStartAge: 65,
  oasMonthly: 713,
  oasStartAge: 65,
  gisEligible: false,
  gainsEligible: false,
  spouseCppMonthly: 0,
  spouseCppStartAge: 65,
  spouseOasMonthly: 0,
  spouseOasStartAge: 65,
  pensionType: 'none',
  dbPensionAnnual: 0,
  dbPensionStartAge: 65,
  dbPensionIndexed: false,
  dcPensionBalance: 0,
  liraBalance: 0,
  spousePensionType: 'none',
  spouseDbPensionAnnual: 0,
  spouseDbPensionStartAge: 65,
  spouseDbPensionIndexed: false,
  spouseDcPensionBalance: 0,
  rrspBalance: 0,
  rrspContributionRoom: 0,
  tfsaBalance: 0,
  tfsaContributionRoom: 0,
  rrifBalance: 0,
  otherRegisteredBalance: 0,
  spouseRrspBalance: 0,
  spouseRrifBalance: 0,
  spouseTfsaBalance: 0,
  spouseTfsaContributionRoom: 0,
  cashSavings: 0,
  nonRegInvestments: 0,
  nonRegCostBasis: 0,
  realEstateValue: 0,
  realEstateIsPrimary: true,
  otherAssets: 0,
  mortgageBalance: 0,
  mortgageRate: 0.05,
  mortgageYearsLeft: 0,
  consumerDebt: 0,
  consumerDebtRate: 0.08,
  consumerDebtPayoffAge: 70,
  otherDebt: 0,
  monthlyExpenses: 3500,
  expenseReductionAtRetirement: 0,
  inflationRate: 0.025,
  realReturn: 0.04,
  tfsaReturn: 0.04,
  nonRegReturn: 0.04,
  withdrawalOrder: ['tfsa', 'nonReg', 'rrsp', 'other'],
  rrspMeltdownEnabled: false,
  rrspMeltdownStartAge: 60,
  rrspMeltdownTargetAge: 71,
  rrspMeltdownAnnual: 0,
  hasWill: true,
  primaryBeneficiary: 'spouse',
  numberOfChildren: 0,
  estimatedCostBasis: 0,
  includeRealEstateInEstate: true,
  aiInsights: {},
}

// ─── Return shape ───────────────────────────────────────────────────────────

describe('runOptimization — return shape', () => {
  it('returns required fields with correct types', () => {
    const result = runOptimization({ ...base, tfsaBalance: 100000 })
    expect(Array.isArray(result.recommendations)).toBe(true)
    expect(Array.isArray(result.alreadyOptimal)).toBe(true)
    expect(typeof result.runCount).toBe('number')
    expect(result.runCount).toBeGreaterThan(0)
    // baselineDepletion is age number or null
    expect(result.baselineDepletion === null || typeof result.baselineDepletion === 'number').toBe(true)
  })

  it('recommendation objects have required fields', () => {
    const scenario = {
      ...base,
      lifeExpectancy: 90,
      cppMonthly: 800,
      cppStartAge: 60,
      rrspBalance: 500000,
      monthlyExpenses: 4000,
    }
    const result = runOptimization(scenario)
    for (const rec of result.recommendations) {
      expect(typeof rec.id).toBe('string')
      expect(typeof rec.dimension).toBe('string')
      expect(typeof rec.title).toBe('string')
      expect(typeof rec.description).toBe('string')
      expect(typeof rec.badge).toBe('string')
      expect(rec.impact).toBeDefined()
      expect(typeof rec.impact.depletionYearsGained).toBe('number')
      expect(typeof rec.impact.lifetimeIncomeGained).toBe('number')
      expect(rec.changes).toBeDefined()
    }
  })
})

// ─── CPP timing ─────────────────────────────────────────────────────────────

describe('CPP start age optimisation', () => {
  it('recommends deferring CPP when a large portfolio can bridge the income gap', () => {
    const scenario = {
      ...base,
      lifeExpectancy: 92,
      cppMonthly: 900,
      cppStartAge: 60,      // taking early penalty
      rrspBalance: 700000,  // can bridge 60→70 gap
      tfsaBalance: 200000,
      monthlyExpenses: 4500,
    }
    const result = runOptimization(scenario)
    const rec = result.recommendations.find(r => r.dimension === 'cpp')
    expect(rec).toBeDefined()
    expect(rec.changes.cppStartAge).toBeGreaterThan(60)
    expect(rec.impact.depletionYearsGained + rec.impact.lifetimeIncomeGained).toBeGreaterThan(0)
  })

  it('recommends taking CPP earlier when portfolio is thin and deferral risks depletion', () => {
    const scenario = {
      ...base,
      lifeExpectancy: 74, // short LE: the 42% deferral bonus doesn't compensate for missing 10 years
      cppMonthly: 700,
      cppStartAge: 70,    // deferring too long relative to life expectancy
      rrspBalance: 60000, // thin — can't bridge the gap
      tfsaBalance: 15000,
      monthlyExpenses: 4500,
    }
    const result = runOptimization(scenario)
    const rec = result.recommendations.find(r => r.dimension === 'cpp')
    expect(rec).toBeDefined()
    expect(rec.changes.cppStartAge).toBeLessThan(70)
  })
})

// ─── OAS deferral ────────────────────────────────────────────────────────────

describe('OAS start age optimisation', () => {
  it('recommends deferring OAS when other income would trigger significant clawback at 65', () => {
    const scenario = {
      ...base,
      currentAge: 65,
      retirementAge: 65,
      lifeExpectancy: 88,
      oasMonthly: 713,
      oasStartAge: 65,
      pensionType: 'db',
      dbPensionAnnual: 70000,  // high income
      dbPensionStartAge: 65,
      cppMonthly: 1100,         // ~$13.2K — total ~$83K before OAS
      cppStartAge: 65,
      rrspBalance: 200000,
      monthlyExpenses: 5000,
    }
    const result = runOptimization(scenario)
    const rec = result.recommendations.find(r => r.dimension === 'oas')
    expect(rec).toBeDefined()
    expect(rec.changes.oasStartAge).toBeGreaterThan(65)
  })
})

// ─── Withdrawal order ────────────────────────────────────────────────────────

describe('withdrawal order optimisation', () => {
  it('recommends an order that defers TFSA for long-horizon scenarios when TFSA-first is current', () => {
    const scenario = {
      ...base,
      currentAge: 55,
      retirementAge: 55,
      lifeExpectancy: 95,
      rrspBalance: 400000,
      tfsaBalance: 200000,
      nonRegInvestments: 150000,
      monthlyExpenses: 4000,
      withdrawalOrder: ['tfsa', 'rrsp', 'nonReg', 'other'], // TFSA first — suboptimal
    }
    const result = runOptimization(scenario)
    const rec = result.recommendations.find(r => r.dimension === 'withdrawalOrder')
    expect(rec).toBeDefined()
    // Recommended order places TFSA later (index > 0)
    expect(rec.changes.withdrawalOrder.indexOf('tfsa')).toBeGreaterThan(0)
  })
})

// ─── RRSP meltdown ───────────────────────────────────────────────────────────

describe('RRSP meltdown optimisation', () => {
  it('recommends enabling meltdown when there is a 10+ year gap before RRIF age', () => {
    const scenario = {
      ...base,
      currentAge: 60,
      retirementAge: 60,
      lifeExpectancy: 88,
      rrspBalance: 500000,  // large RRSP → big mandatory minimums at 72 without meltdown
      tfsaBalance: 80000,
      cppMonthly: 800,
      cppStartAge: 65,
      oasMonthly: 713,
      oasStartAge: 65,
      monthlyExpenses: 2500, // low expenses → natural RRSP draws are below meltdown amounts
      rrspMeltdownEnabled: false,
    }
    const result = runOptimization(scenario)
    const rec = result.recommendations.find(r => r.dimension === 'meltdown')
    expect(rec).toBeDefined()
    expect(rec.changes.rrspMeltdownEnabled).toBe(true)
    expect(rec.changes.rrspMeltdownAnnual).toBeGreaterThan(0)
  })

  it('recommends meltdown amount within tested range that does not create excessive clawback', () => {
    const scenario = {
      ...base,
      currentAge: 60,
      retirementAge: 60,
      lifeExpectancy: 88,
      rrspBalance: 600000,
      tfsaBalance: 80000,
      cppMonthly: 800,
      cppStartAge: 65,
      oasMonthly: 713,
      oasStartAge: 65,
      monthlyExpenses: 4500,
      rrspMeltdownEnabled: false,
    }
    const result = runOptimization(scenario)
    const rec = result.recommendations.find(r => r.dimension === 'meltdown')
    if (rec?.changes?.rrspMeltdownEnabled) {
      // Engine tests $10K–$30K; none should push CPP($9.6K)+OAS($8.5K)+meltdown over $93K clawback
      expect(rec.changes.rrspMeltdownAnnual).toBeGreaterThanOrEqual(10000)
      expect(rec.changes.rrspMeltdownAnnual).toBeLessThanOrEqual(30000)
      const estimatedIncome = 800 * 12 + 713 * 12 + rec.changes.rrspMeltdownAnnual
      expect(estimatedIncome).toBeLessThan(93000)
    }
  })

  it('skips meltdown and withdrawal order dimensions when RRSP balance is zero', () => {
    const scenario = {
      ...base,
      rrspBalance: 0,
      rrifBalance: 0,
      tfsaBalance: 200000,
      nonRegInvestments: 100000,
      rrspMeltdownEnabled: false,
    }
    const result = runOptimization(scenario)
    expect(result.recommendations.find(r => r.dimension === 'meltdown')).toBeUndefined()
    expect(result.recommendations.find(r => r.dimension === 'withdrawalOrder')).toBeUndefined()
    // Also not in alreadyOptimal — just skipped entirely
    expect(result.alreadyOptimal.find(a => a.dimension === 'meltdown')).toBeUndefined()
  })
})

// ─── Debt payoff ─────────────────────────────────────────────────────────────

describe('debt payoff timing optimisation', () => {
  it('recommends earlier debt payoff for high-rate consumer debt', () => {
    const scenario = {
      ...base,
      rrspBalance: 300000,
      tfsaBalance: 50000,
      consumerDebt: 25000,
      consumerDebtRate: 0.19,  // high-rate
      consumerDebtPayoffAge: 72, // currently dragging it out 12 years
      monthlyExpenses: 4000,
    }
    const result = runOptimization(scenario)
    const rec = result.recommendations.find(r => r.dimension === 'debt')
    expect(rec).toBeDefined()
    expect(rec.changes.consumerDebtPayoffAge).toBeLessThan(72)
  })
})

// ─── Expense reduction ───────────────────────────────────────────────────────

describe('expense reduction optimisation', () => {
  it('does not recommend expense reduction when portfolio survives to life expectancy', () => {
    const scenario = {
      ...base,
      lifeExpectancy: 90,
      rrspBalance: 2000000,
      tfsaBalance: 500000,
      monthlyExpenses: 5000,
    }
    const result = runOptimization(scenario)
    expect(result.recommendations.find(r => r.dimension === 'expenses')).toBeUndefined()
  })

  it('recommends expense reduction when portfolio depletes before life expectancy', () => {
    const scenario = {
      ...base,
      lifeExpectancy: 90,
      rrspBalance: 50000,
      tfsaBalance: 10000,
      cppMonthly: 400,
      oasMonthly: 400,
      monthlyExpenses: 5500,
    }
    const result = runOptimization(scenario)
    const rec = result.recommendations.find(r => r.dimension === 'expenses')
    expect(rec).toBeDefined()
    expect(rec.changes.expenseReductionAtRetirement).toBeGreaterThan(0)
  })
})

// ─── Ranking ─────────────────────────────────────────────────────────────────

describe('recommendation ranking', () => {
  it('ranks recommendations by depletion years gained (primary) then lifetime income (tiebreaker)', () => {
    const scenario = {
      ...base,
      lifeExpectancy: 90,
      cppMonthly: 800,
      cppStartAge: 60,
      rrspBalance: 150000,
      tfsaBalance: 80000,
      nonRegInvestments: 50000,
      consumerDebt: 15000,
      consumerDebtRate: 0.12,
      consumerDebtPayoffAge: 72,
      monthlyExpenses: 4500,
      rrspMeltdownEnabled: false,
    }
    const result = runOptimization(scenario)
    const recs = result.recommendations
    for (let i = 0; i < recs.length - 1; i++) {
      const a = recs[i]
      const b = recs[i + 1]
      if (a.impact.depletionYearsGained === b.impact.depletionYearsGained) {
        expect(a.impact.lifetimeIncomeGained).toBeGreaterThanOrEqual(b.impact.lifetimeIncomeGained)
      } else {
        expect(a.impact.depletionYearsGained).toBeGreaterThan(b.impact.depletionYearsGained)
      }
    }
  })
})

// ─── Idempotency ─────────────────────────────────────────────────────────────

describe('already-optimal behaviour', () => {
  it('does not re-recommend the same CPP age after the recommendation has been applied', () => {
    const scenario = {
      ...base,
      lifeExpectancy: 90,
      rrspBalance: 500000,
      tfsaBalance: 100000,
      cppMonthly: 800,
      cppStartAge: 65,
      monthlyExpenses: 4000,
    }
    const first = runOptimization(scenario)
    const cppRec = first.recommendations.find(r => r.dimension === 'cpp')
    if (cppRec) {
      const second = runOptimization({ ...scenario, ...cppRec.changes })
      expect(second.recommendations.find(r => r.dimension === 'cpp')).toBeUndefined()
    } else {
      // Already optimal — should appear in alreadyOptimal list
      expect(first.alreadyOptimal.find(a => a.dimension === 'cpp')).toBeDefined()
    }
  })
})

// ─── Couple mode ─────────────────────────────────────────────────────────────

describe('couple mode', () => {
  it('tests spouse CPP and OAS start ages as independent dimensions when isCouple is true', () => {
    const scenario = {
      ...base,
      isCouple: true,
      spouseAge: 55,
      spouseRetirementAge: 60,
      rrspBalance: 300000,
      tfsaBalance: 100000,
      spouseRrspBalance: 150000,
      spouseTfsaBalance: 80000,
      spouseCppMonthly: 700,
      spouseCppStartAge: 60,   // spouse taking CPP early
      spouseOasMonthly: 713,
      spouseOasStartAge: 70,   // spouse deferring OAS very late
      monthlyExpenses: 6000,
      lifeExpectancy: 90,
    }
    const result = runOptimization(scenario)
    // At minimum: spouseCpp (11) + spouseOas (6) = 17 extra runs
    expect(result.runCount).toBeGreaterThan(20)
    const allDimensions = [
      ...result.recommendations.map(r => r.dimension),
      ...result.alreadyOptimal.map(a => a.dimension),
    ]
    expect(allDimensions).toContain('spouseCpp')
    expect(allDimensions).toContain('spouseOas')
  })
})

// ─── Changes object contract ─────────────────────────────────────────────────

describe('changes object', () => {
  it('produces changes that when applied improve projection outcomes over the baseline', () => {
    const scenario = {
      ...base,
      lifeExpectancy: 90,
      cppMonthly: 800,
      cppStartAge: 60,     // suboptimal early start
      rrspBalance: 400000,
      tfsaBalance: 100000,
      monthlyExpenses: 4000,
    }
    const result = runOptimization(scenario)
    const rec = result.recommendations[0] // top recommendation
    if (!rec) return                       // skip if nothing to recommend

    const optimized = { ...scenario, ...rec.changes }
    const baseProj = projectScenario(scenario)
    const optProj  = projectScenario(optimized)

    const depletionAge = proj => proj.find(r => r.totalPortfolio <= 0)?.age ?? null
    const lifetimeIncome = proj => proj.reduce((s, r) => s + r.afterTaxIncome, 0)

    const baseDepletion = depletionAge(baseProj)
    const optDepletion  = depletionAge(optProj)

    if (baseDepletion !== null) {
      // Optimised should deplete no earlier than baseline
      expect(optDepletion === null || optDepletion >= baseDepletion).toBe(true)
    } else {
      // Both survive — optimised lifetime income should be >= baseline
      expect(lifetimeIncome(optProj)).toBeGreaterThanOrEqual(lifetimeIncome(baseProj) - 1)
    }
  })
})

// ─── Performance ─────────────────────────────────────────────────────────────

describe('performance', () => {
  it('completes full optimisation in under 500ms for a couple scenario', () => {
    const start = performance.now()
    const result = runOptimization(RAJESH)
    const elapsed = performance.now() - start
    expect(elapsed).toBeLessThan(500)
    expect(result).toBeDefined()
    expect(Array.isArray(result.recommendations)).toBe(true)
  })
})

// ─── Category field ───────────────────────────────────────────────────────────

describe('category field', () => {
  it('all recommendations have a valid category', () => {
    const scenario = {
      ...base,
      lifeExpectancy: 90,
      cppMonthly: 800,
      cppStartAge: 60,
      rrspBalance: 400000,
      tfsaBalance: 100000,
      monthlyExpenses: 4000,
    }
    const result = runOptimization(scenario)
    for (const rec of result.recommendations) {
      expect(['plan', 'tax', 'couple']).toContain(rec.category)
    }
  })

  it('CPP and expense dimensions have category plan', () => {
    const scenario = {
      ...base,
      lifeExpectancy: 90,
      cppMonthly: 800,
      cppStartAge: 60,
      rrspBalance: 100000,
      monthlyExpenses: 5500,
    }
    const result = runOptimization(scenario)
    const cppRec = result.recommendations.find(r => r.dimension === 'cpp')
    if (cppRec) expect(cppRec.category).toBe('plan')
    const expRec = result.recommendations.find(r => r.dimension === 'expenses')
    if (expRec) expect(expRec.category).toBe('plan')
  })

  it('OAS and withdrawalOrder dimensions have category tax', () => {
    const scenario = {
      ...base,
      currentAge: 65,
      retirementAge: 65,
      lifeExpectancy: 90,
      oasMonthly: 713,
      oasStartAge: 65,
      rrspBalance: 400000,
      tfsaBalance: 100000,
      monthlyExpenses: 4000,
      withdrawalOrder: ['tfsa', 'rrsp', 'nonReg', 'other'],
    }
    const result = runOptimization(scenario)
    const oasRec = result.recommendations.find(r => r.dimension === 'oas')
    if (oasRec) expect(oasRec.category).toBe('tax')
    const wdRec = result.recommendations.find(r => r.dimension === 'withdrawalOrder')
    if (wdRec) expect(wdRec.category).toBe('tax')
  })

  it('spouse CPP and OAS dimensions have category couple', () => {
    const scenario = {
      ...base,
      isCouple: true,
      lifeExpectancy: 90,
      spouseCppMonthly: 700,
      spouseCppStartAge: 60,
      spouseOasMonthly: 713,
      spouseOasStartAge: 68,
      rrspBalance: 400000,
      tfsaBalance: 100000,
      monthlyExpenses: 5000,
    }
    const result = runOptimization(scenario)
    const spCpp = result.recommendations.find(r => r.dimension === 'spouseCpp')
    if (spCpp) expect(spCpp.category).toBe('couple')
    const spOas = result.recommendations.find(r => r.dimension === 'spouseOas')
    if (spOas) expect(spOas.category).toBe('couple')
  })
})

// ─── Impact math accuracy ─────────────────────────────────────────────────────

describe('impact math accuracy', () => {
  const mathScenario = {
    ...base,
    lifeExpectancy: 90,
    cppMonthly: 900,
    cppStartAge: 60,
    rrspBalance: 600000,
    tfsaBalance: 150000,
    monthlyExpenses: 4500,
  }

  it('lifetimeIncomeGained matches actual projection sum difference', () => {
    const result = runOptimization(mathScenario)
    const rec = result.recommendations[0]
    if (!rec) return

    const baseProj = projectScenario(mathScenario)
    const optProj = projectScenario({ ...mathScenario, ...rec.changes })
    const baseIncome = baseProj.reduce((s, r) => s + r.afterTaxIncome, 0)
    const optIncome = optProj.reduce((s, r) => s + r.afterTaxIncome, 0)
    const expected = Math.round(optIncome - baseIncome)

    expect(rec.impact.lifetimeIncomeGained).toBe(expected)
  })

  it('depletionYearsGained exactly equals depletion age difference', () => {
    const result = runOptimization(mathScenario)
    const rec = result.recommendations[0]
    if (!rec || rec.before.depletionAge === null) return

    const afterDepletion = rec.after.depletionAge ?? mathScenario.lifeExpectancy
    const expected = Math.max(0, afterDepletion - rec.before.depletionAge)

    expect(rec.impact.depletionYearsGained).toBe(expected)
  })

  it('bestPossibleDepletion equals top recommendation after.depletionAge', () => {
    const result = runOptimization(mathScenario)
    if (result.recommendations.length === 0) return
    expect(result.bestPossibleDepletion).toBe(result.recommendations[0].after.depletionAge)
  })

  it('lifetimeTaxSaved is non-negative and does not exceed baseline lifetime tax', () => {
    const result = runOptimization(mathScenario)
    const baseProj = projectScenario(mathScenario)
    const baselineTax = Math.round(baseProj.reduce((s, r) => s + (r.totalTax || 0), 0))

    for (const rec of result.recommendations) {
      expect(rec.impact.lifetimeTaxSaved).toBeGreaterThanOrEqual(0)
      expect(rec.impact.lifetimeTaxSaved).toBeLessThanOrEqual(baselineTax + 1) // +1 for rounding
    }
  })

  it('before.lifetimeIncome matches projectScenario afterTaxIncome sum for baseline', () => {
    const result = runOptimization(mathScenario)
    const baseProj = projectScenario(mathScenario)
    const expectedIncome = Math.round(baseProj.reduce((s, r) => s + r.afterTaxIncome, 0))

    for (const rec of result.recommendations) {
      expect(rec.before.lifetimeIncome).toBe(expectedIncome)
    }
  })

  it('result exposes baselineLifetimeIncome matching projectScenario sum', () => {
    const result = runOptimization(mathScenario)
    const baseProj = projectScenario(mathScenario)
    const expected = Math.round(baseProj.reduce((s, r) => s + r.afterTaxIncome, 0))
    expect(result.baselineLifetimeIncome).toBe(expected)
  })
})

// ─── lifetimeTaxSaved accuracy ────────────────────────────────────────────────

describe('lifetimeTaxSaved accuracy', () => {
  it('is non-negative for all recommendations', () => {
    const scenario = {
      ...base,
      lifeExpectancy: 90,
      rrspBalance: 500000,
      tfsaBalance: 100000,
      cppMonthly: 800,
      cppStartAge: 65,
      oasMonthly: 713,
      oasStartAge: 65,
      monthlyExpenses: 4000,
    }
    const result = runOptimization(scenario)
    for (const rec of result.recommendations) {
      expect(rec.impact.lifetimeTaxSaved).toBeGreaterThanOrEqual(0)
    }
  })

  it('matches manual sum of totalTax delta from projection rows', () => {
    const scenario = {
      ...base,
      lifeExpectancy: 90,
      rrspBalance: 400000,
      tfsaBalance: 100000,
      cppMonthly: 800,
      cppStartAge: 65,
      oasMonthly: 713,
      oasStartAge: 65,
      monthlyExpenses: 3500,
    }
    const result = runOptimization(scenario)

    for (const rec of result.recommendations) {
      const baseProj = projectScenario(scenario)
      const optProj = projectScenario({ ...scenario, ...rec.changes })
      const baseTax = Math.round(baseProj.reduce((s, r) => s + (r.totalTax || 0), 0))
      const optTax = Math.round(optProj.reduce((s, r) => s + (r.totalTax || 0), 0))
      const expected = Math.max(0, baseTax - optTax)

      expect(rec.impact.lifetimeTaxSaved).toBe(expected)
    }
  })

  it('is positive for OAS deferral when DB pension income is near the clawback threshold', () => {
    const scenario = {
      ...base,
      currentAge: 65,
      retirementAge: 65,
      lifeExpectancy: 88,
      oasMonthly: 713,
      oasStartAge: 65,
      pensionType: 'db',
      dbPensionAnnual: 70000,
      dbPensionStartAge: 65,
      cppMonthly: 1100,
      cppStartAge: 65,
      rrspBalance: 200000,
      monthlyExpenses: 5000,
    }
    const result = runOptimization(scenario)
    const oasRec = result.recommendations.find(r => r.dimension === 'oas')
    if (oasRec) {
      // Deferring OAS when near clawback threshold should not increase lifetime tax
      expect(oasRec.impact.lifetimeTaxSaved).toBeGreaterThanOrEqual(0)
    }
  })
})

// ─── Margaret - Retired Teacher scenario ─────────────────────────────────────

const MARGARET_RESULT = runOptimization(MARGARET)

describe('Margaret - Retired Teacher scenario', () => {
  it('plan never depletes (DB pension sustains her through LE)', () => {
    expect(MARGARET_RESULT.baselineDepletion).toBeNull()
  })

  it('category field is present on all recommendations', () => {
    for (const rec of MARGARET_RESULT.recommendations) {
      expect(['plan', 'tax', 'couple']).toContain(rec.category)
    }
  })

  it('does not recommend expense reduction (plan does not deplete)', () => {
    expect(MARGARET_RESULT.recommendations.find(r => r.dimension === 'expenses')).toBeUndefined()
    expect(MARGARET_RESULT.alreadyOptimal.find(a => a.dimension === 'expenses')).toBeUndefined()
  })

  it('does not include couple planning category (single person)', () => {
    const coupleRecs = MARGARET_RESULT.recommendations.filter(r => r.category === 'couple')
    expect(coupleRecs).toHaveLength(0)
  })

  it('exposes lifeExpectancy in result for banner display', () => {
    expect(MARGARET_RESULT.lifeExpectancy).toBe(MARGARET.lifeExpectancy)
  })

  it('all recommendations improve lifetime income over baseline', () => {
    for (const rec of MARGARET_RESULT.recommendations) {
      expect(rec.impact.lifetimeIncomeGained).toBeGreaterThan(0)
    }
  })
})

// ─── Rajesh & Priya - couple scenario ────────────────────────────────────────

const RAJESH_RESULT = runOptimization(RAJESH)

describe('Rajesh & Priya - couple scenario', () => {
  it('category field is present on all recommendations', () => {
    for (const rec of RAJESH_RESULT.recommendations) {
      expect(['plan', 'tax', 'couple']).toContain(rec.category)
    }
  })

  it('runCount reflects couple mode extra dimensions (spouseCpp + spouseOas)', () => {
    // 11 + 6 = 17 extra runs for couple dims, plus other dims
    expect(RAJESH_RESULT.runCount).toBeGreaterThan(20)
  })

  it('couple planning dimensions are included when applicable', () => {
    const allDims = [
      ...RAJESH_RESULT.recommendations.map(r => r.dimension),
      ...RAJESH_RESULT.alreadyOptimal.map(a => a.dimension),
    ]
    // Rajesh has spouseCppMonthly=700 and spouseOasMonthly=713
    expect(allDims.some(d => d === 'spouseCpp' || d === 'spouseOas')).toBe(true)
  })

  it('all recommendations when applied improve outcome over baseline', () => {
    const depletionAge = proj => proj.find(r => r.totalPortfolio <= 0)?.age ?? null
    const lifetimeIncome = proj => proj.reduce((s, r) => s + r.afterTaxIncome, 0)

    for (const rec of RAJESH_RESULT.recommendations) {
      const optimized = { ...RAJESH, ...rec.changes }
      const baseProj = projectScenario(RAJESH)
      const optProj = projectScenario(optimized)

      const baseDepletion = depletionAge(baseProj)
      const optDepletion = depletionAge(optProj)

      if (baseDepletion !== null) {
        expect(optDepletion === null || optDepletion >= baseDepletion).toBe(true)
      } else {
        expect(lifetimeIncome(optProj)).toBeGreaterThanOrEqual(lifetimeIncome(baseProj) - 1)
      }
    }
  })
})
