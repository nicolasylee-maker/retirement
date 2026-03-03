import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const QUOTA_PER_MONTH = 30
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL') ?? ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    const { prompt, context } = body

    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Missing prompt' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 6. Call Gemini API
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
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
