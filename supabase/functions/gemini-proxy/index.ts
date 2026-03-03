import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const QUOTA_PER_MONTH = 30
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL') ?? ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function buildPrompt(type: string, context: Record<string, unknown>, config: Record<string, string>): string {
  const base = config['prompt_base'] ?? ''
  const templateKey = `prompt_${type}`
  let template = config[templateKey] ?? ''

  // Pre-build special multi-line strings
  if (type === 'dashboard') {
    const pensionLine = context['pensionIncome']
      ? `- Pension: $${context['pensionIncome']}/yr`
      : '- No employer pension'
    template = template.replace('{pensionLine}', pensionLine)
  }

  if (type === 'compare') {
    const scenarios = (context['scenarios'] as Array<Record<string, unknown>>) || []
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
    context = {
      ...context,
      hasWill: context['hasWill'] ? 'Yes' : 'No',
      spouseRollover: context['spouseRollover'] ? 'Yes' : 'No',
    }
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

  // Substitute {variableName} placeholders
  const body = template.replace(/\{(\w+)\}/g, (_, key: string) => String(context[key] ?? ''))

  return `${base}\n\n${body}`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // 1. Verify JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

    // Verify JWT using anon key client with user's token
    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Service role client for reading subscription data and writing ai_usage (bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    // Load config from DB
    const { data: configRows } = await supabaseAdmin
      .from('admin_config')
      .select('config_key, config_value')
    const config: Record<string, string> = Object.fromEntries(
      (configRows || []).map(r => [r.config_key, r.config_value])
    )
    const geminiModel = config['gemini_model'] ?? 'gemini-3-flash-preview'
    const temperature = parseFloat(config['temperature'] ?? '0.7')
    const maxOutputTokens = parseInt(config['max_output_tokens'] ?? '4096', 10)

    // 2. Check subscription (user must be paid)
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('subscription_override')
      .eq('id', user.id)
      .single()

    const { data: subData } = await supabaseAdmin
      .from('subscriptions')
      .select('status')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const isPaid = userData?.subscription_override != null ||
      subData?.status === 'active' ||
      subData?.status === 'trialing' ||
      (!!ADMIN_EMAIL && user.email === ADMIN_EMAIL)

    if (!isPaid) {
      return new Response(JSON.stringify({ error: 'subscription_required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3. Check quota (read first, reject before incrementing if at limit)
    const period = new Date().toISOString().slice(0, 7) // 'YYYY-MM'

    const { data: usage } = await supabaseAdmin
      .from('ai_usage')
      .select('count')
      .eq('user_id', user.id)
      .eq('period', period)
      .single()

    const currentCount = usage?.count ?? 0
    if (currentCount >= QUOTA_PER_MONTH) {
      const resetAt = new Date(new Date().toISOString().slice(0, 7) + '-01')
      resetAt.setMonth(resetAt.getMonth() + 1)
      return new Response(
        JSON.stringify({
          error: 'quota_exceeded',
          used: currentCount,
          limit: QUOTA_PER_MONTH,
          resetAt: resetAt.toISOString().slice(0, 10),
        }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // 4. Atomically increment usage count before calling Gemini
    await supabaseAdmin.from('ai_usage').upsert(
      {
        user_id: user.id,
        period,
        count: currentCount + 1,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,period' },
    )

    // 5. Parse request body
    const body = await req.json().catch(() => ({}))
    const { type, context } = body

    if (!type) {
      return new Response(JSON.stringify({ error: 'Missing type' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 6. Call Gemini API
    const prompt = buildPrompt(type, (context as Record<string, unknown>) ?? {}, config)
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature, maxOutputTokens },
        }),
      },
    )

    if (!geminiRes.ok) {
      // Gemini failed — decrement usage count so the failed attempt doesn't count
      await supabaseAdmin.from('ai_usage').upsert(
        {
          user_id: user.id,
          period,
          count: currentCount,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,period' },
      )
      return new Response(JSON.stringify({ error: 'gemini_error' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const geminiData = await geminiRes.json()
    const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

    return new Response(
      JSON.stringify({ text, used: currentCount + 1, limit: QUOTA_PER_MONTH }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
