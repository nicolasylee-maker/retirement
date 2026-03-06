import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const QUOTA_PER_MONTH = 30
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') ?? ''
const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL') ?? ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function buildPrompt(type: string, context: Record<string, unknown>, config: Record<string, string>): string {
  const base = config['prompt_base'] ?? ''
  const templateKey = `prompt_${type}`
  let template = config[templateKey] ?? ''

  if (type === 'dashboard') {
    const pensionLine = context['pensionIncome']
      ? `- Pension: $${context['pensionIncome']}/yr`
      : '- No employer pension'
    template = template.replace('{pensionLine}', pensionLine)
  }

  if (type === 'compare') {
    const scenarios = (context['scenarios'] as Array<Record<string, unknown>>) || []
    const scenarioLines = scenarios.map((s, i) =>
      `Scenario ${i + 1} "${s['name']}": Net worth $${s['netWorthAtRetirement']}, ` +
      `Sustainable monthly $${s['sustainableMonthly']}, Tax $${s['annualTax']}, ` +
      `Portfolio at ${s['lifeExpectancy']}: $${s['portfolioAtEnd']}`
    ).join('\n')
    template = template.replace('{scenarioLines}', scenarioLines)

    const diffs = (context['diffs'] as Array<Record<string, unknown>>) || []
    const diffLines = diffs.length
      ? diffs.map(d => `- ${d['label']}: ${d['fmtA']} → ${d['fmtB']}`).join('\n')
      : 'No input differences'
    template = template.replace('{diffLines}', diffLines)

    const phaseSummaries = (context['phaseSummaries'] as Array<Array<Record<string, unknown>>>) || []
    const phaseLines = scenarios.map((s, i) => {
      const phases = phaseSummaries[i] || []
      return `Scenario ${i + 1} "${s['name']}":\n` + phases.map(p =>
        `  ${p['phase']} (${p['ages']}): Portfolio $${Math.round(p['portfolioStart'] as number)} → $${Math.round(p['portfolioEnd'] as number)}, Status: ${p['status']}${(p['events'] as string[])?.length ? ', Events: ' + (p['events'] as string[]).join('; ') : ''}`
      ).join('\n')
    }).join('\n')
    template = template.replace('{phaseLines}', phaseLines)

    const monthlySnapshots = (context['monthlySnapshots'] as Array<Record<string, unknown>>) || []
    const monthlyLines = monthlySnapshots.map(ms => {
      const snaps = (ms['snapshots'] as Array<Record<string, number>>) || []
      return `${ms['name']}:\n` + snaps.map(snap =>
        `  Age ${snap['age']}: Income $${snap['monthlyIncome']}/mo, Expenses $${snap['monthlyExpenses']}/mo, ${snap['monthlySurplus'] >= 0 ? 'Surplus' : 'Shortfall'} $${Math.abs(snap['monthlySurplus'])}/mo, Portfolio $${snap['portfolioBalance']}`
      ).join('\n')
    }).join('\n')
    template = template.replace('{monthlyLines}', monthlyLines)
  }

  if (type === 'estate') {
    context = { ...context, hasWill: context['hasWill'] ? 'Yes' : 'No', spouseRollover: context['spouseRollover'] ? 'Yes' : 'No' }
  }

  if (type === 'debt') {
    context = {
      ...context,
      consumerDebt: context['consumerDebt'] ?? 0,
      consumerRatePct: (((context['consumerRate'] as number) || 0.08) * 100).toFixed(1),
      mortgageBalance: context['mortgageBalance'] ?? 0,
      mortgageRatePct: (((context['mortgageRate'] as number) || 0.05) * 100).toFixed(1),
      monthlyPayments: Math.round((context['monthlyPayments'] as number) || 0),
    }
  }

  if (type === 'optimize') {
    const recs = (context['recommendations'] as Array<Record<string, unknown>>) || []
    const recommendationLines = recs.length
      ? recs.map((r, i) => `${i + 1}. ${r['title']} — +$${r['monthlyImpact']}/mo`).join('\n')
      : 'None found — plan is already well-optimized.'
    template = template.replace('{recommendationLines}', recommendationLines)
    const optimal = (context['alreadyOptimal'] as string[]) || []
    template = template.replace('{alreadyOptimalLines}', optimal.length ? optimal.join(', ') : 'None')
    context = {
      ...context,
      planStatus: context['planDepletes']
        ? `depletes at age ${context['depletionAge']}`
        : `outlasts life expectancy (age ${context['lifeExpectancy']})`,
    }
  }

  const body = template.replace(/\{(\w+)\}/g, (_, key: string) => String(context[key] ?? ''))
  return `${base}\n\n${body}`
}

async function callProvider(provider: string, model: string, apiKey: string, prompt: string, temperature: number, maxTokens: number): Promise<string> {
  if (provider === 'gemini') {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature, maxOutputTokens: maxTokens } }) }
    )
    if (!res.ok) throw new Error(`Gemini error ${res.status}`)
    const d = await res.json()
    return d.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  }

  if (provider === 'anthropic') {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model, max_tokens: maxTokens, messages: [{ role: 'user', content: prompt }] }),
    })
    if (!res.ok) throw new Error(`Anthropic error ${res.status}`)
    const d = await res.json()
    return d.content?.[0]?.text ?? ''
  }

  const baseUrls: Record<string, string> = {
    openrouter: 'https://openrouter.ai/api/v1/chat/completions',
    openai: 'https://api.openai.com/v1/chat/completions',
    xai: 'https://api.x.ai/v1/chat/completions',
    kimi: 'https://api.moonshot.cn/v1/chat/completions',
  }
  const url = baseUrls[provider]
  if (!url) throw new Error(`Unknown provider: ${provider}`)
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], max_tokens: maxTokens }),
  })
  if (!res.ok) throw new Error(`${provider} error ${res.status}`)
  const d = await res.json()
  return d.choices?.[0]?.message?.content ?? ''
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const respond = (data: unknown, status = 200, extra: Record<string, string> = {}) =>
    new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json', ...extra } })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return respond({ error: 'Unauthorized' }, 401)

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

    const callerClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } })
    const { data: { user }, error: authError } = await callerClient.auth.getUser()
    if (authError || !user) return respond({ error: 'Unauthorized' }, 401)

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    const { data: configRows } = await supabaseAdmin.from('admin_config').select('config_key, config_value')
    const config: Record<string, string> = Object.fromEntries((configRows || []).map(r => [r.config_key, r.config_value]))

    const provider = config['ai_provider'] ?? 'gemini'
    const model = config['ai_model'] ?? (provider === 'gemini' ? 'gemini-2.0-flash' : 'meta-llama/llama-3.3-70b-instruct')
    const temperature = parseFloat(config['temperature'] ?? '0.7')
    const maxOutputTokens = parseInt(config['max_output_tokens'] ?? '4096', 10)

    const { data: userData } = await supabaseAdmin.from('users').select('subscription_override').eq('id', user.id).single()
    const { data: subData } = await supabaseAdmin.from('subscriptions').select('status').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).single()
    const isPaid = userData?.subscription_override != null || subData?.status === 'active' || subData?.status === 'trialing' || (!!ADMIN_EMAIL && user.email === ADMIN_EMAIL)
    if (!isPaid) return respond({ error: 'subscription_required' }, 403)

    const period = new Date().toISOString().slice(0, 7)
    const { data: usage } = await supabaseAdmin.from('ai_usage').select('count').eq('user_id', user.id).eq('period', period).single()
    const currentCount = usage?.count ?? 0
    if (currentCount >= QUOTA_PER_MONTH) {
      const resetAt = new Date(new Date().toISOString().slice(0, 7) + '-01')
      resetAt.setMonth(resetAt.getMonth() + 1)
      return respond({ error: 'quota_exceeded', used: currentCount, limit: QUOTA_PER_MONTH, resetAt: resetAt.toISOString().slice(0, 10) }, 429)
    }

    await supabaseAdmin.from('ai_usage').upsert({ user_id: user.id, period, count: currentCount + 1, updated_at: new Date().toISOString() }, { onConflict: 'user_id,period' })

    const body = await req.json().catch(() => ({}))
    const { type, context } = body
    if (!type) return respond({ error: 'Missing type' }, 400)

    const prompt = buildPrompt(type, (context as Record<string, unknown>) ?? {}, config)

    // Resolve API key: gemini uses env var, others use vault
    let apiKey = ''
    if (provider === 'gemini') {
      apiKey = GEMINI_API_KEY
      if (!apiKey) return respond({ error: 'AI provider key not configured' }, 503)
    } else {
      const { data: vaultKey } = await supabaseAdmin.rpc('admin_read_ai_secret', { p_name: `${provider}_api_key` })
      if (!vaultKey) return respond({ error: 'AI provider key not configured' }, 503)
      apiKey = vaultKey
    }

    // Call primary provider
    let text: string
    let usedFallback = false
    try {
      text = await callProvider(provider, model, apiKey, prompt, temperature, maxOutputTokens)
    } catch (primaryErr) {
      // Fallback to Gemini if primary fails and Gemini key is available and provider isn't already Gemini
      if (provider !== 'gemini' && GEMINI_API_KEY) {
        console.warn(`[ai-proxy] ${provider} failed, falling back to Gemini:`, primaryErr)
        try {
          text = await callProvider('gemini', config['gemini_model'] ?? 'gemini-2.0-flash', GEMINI_API_KEY, prompt, temperature, maxOutputTokens)
          usedFallback = true
        } catch (fallbackErr) {
          // Both failed — decrement quota and return original error
          await supabaseAdmin.from('ai_usage').upsert({ user_id: user.id, period, count: currentCount, updated_at: new Date().toISOString() }, { onConflict: 'user_id,period' })
          console.error('[ai-proxy] Gemini fallback also failed:', fallbackErr)
          return respond({ error: 'ai_error' }, 502)
        }
      } else {
        await supabaseAdmin.from('ai_usage').upsert({ user_id: user.id, period, count: currentCount, updated_at: new Date().toISOString() }, { onConflict: 'user_id,period' })
        return respond({ error: 'ai_error' }, 502)
      }
    }

    return respond(
      { text, used: currentCount + 1, limit: QUOTA_PER_MONTH },
      200,
      usedFallback ? { 'x-ai-fallback': 'true' } : {}
    )
  } catch (err) {
    console.error('[ai-proxy]', err)
    return respond({ error: 'Internal server error' }, 500)
  }
})
