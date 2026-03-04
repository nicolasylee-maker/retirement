/**
 * Client-side port of buildPrompt() from supabase/functions/gemini-proxy/index.ts.
 * Produces the fully-resolved prompt string (base + body with all {variables} substituted)
 * exactly as the server would build it.
 *
 * @param {string} type - 'dashboard' | 'debt' | 'estate' | 'compare' | 'optimize'
 * @param {Record<string, unknown>} context - context object returned by buildAiData helpers
 * @param {Record<string, string>} config - admin_config flat key/value object
 * @returns {string} resolved prompt
 */
export function buildAiPrompt(type, context, config) {
  const base = config['prompt_base'] ?? ''
  const templateKey = `prompt_${type}`
  let template = config[templateKey] ?? ''
  let ctx = { ...context }

  if (type === 'dashboard') {
    const pensionLine = ctx['pensionIncome']
      ? `- Pension: $${ctx['pensionIncome']}/yr`
      : '- No employer pension'
    template = template.replace('{pensionLine}', pensionLine)
  }

  if (type === 'compare') {
    const scenarios = ctx['scenarios'] || []
    const scenarioLines = scenarios
      .map((s, i) =>
        `Scenario ${i + 1} "${s['name']}": Net worth $${s['netWorthAtRetirement']}, ` +
        `Sustainable monthly $${s['sustainableMonthly']}, Tax $${s['annualTax']}, ` +
        `Portfolio at ${s['lifeExpectancy']}: $${s['portfolioAtEnd']}`
      )
      .join('\n')
    template = template.replace('{scenarioLines}', scenarioLines)
  }

  if (type === 'estate') {
    ctx = {
      ...ctx,
      hasWill: ctx['hasWill'] ? 'Yes' : 'No',
      spouseRollover: ctx['spouseRollover'] ? 'Yes' : 'No',
    }
  }

  if (type === 'debt') {
    ctx = {
      ...ctx,
      consumerDebt: ctx['consumerDebt'] ?? 0,
      consumerRatePct: (((ctx['consumerRate']) || 0.08) * 100).toFixed(1),
      mortgageBalance: ctx['mortgageBalance'] ?? 0,
      mortgageRatePct: (((ctx['mortgageRate']) || 0.05) * 100).toFixed(1),
      monthlyPayments: Math.round(ctx['monthlyPayments'] || 0),
    }
  }

  if (type === 'optimize') {
    const recs = ctx['recommendations'] || []
    const recommendationLines = recs.length
      ? recs.map((r, i) =>
          `${i + 1}. ${r['title']} — +$${r['monthlyImpact']}/mo`
        ).join('\n')
      : 'None found — plan is already well-optimized.'
    template = template.replace('{recommendationLines}', recommendationLines)

    const optimal = ctx['alreadyOptimal'] || []
    const alreadyOptimalLines = optimal.length ? optimal.join(', ') : 'None'
    template = template.replace('{alreadyOptimalLines}', alreadyOptimalLines)

    ctx = {
      ...ctx,
      planStatus: ctx['planDepletes']
        ? `depletes at age ${ctx['depletionAge']}`
        : `outlasts life expectancy (age ${ctx['lifeExpectancy']})`,
    }
  }

  // Substitute remaining {variableName} placeholders
  const body = template.replace(/\{(\w+)\}/g, (_, key) => String(ctx[key] ?? ''))

  return `${base}\n\n${body}`
}
