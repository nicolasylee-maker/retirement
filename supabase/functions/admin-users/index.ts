import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function errorResponse(msg: string, status: number) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405)
  }

  try {
    // 1. Check authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return errorResponse('Missing authorization header', 401)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const adminEmail = Deno.env.get('ADMIN_EMAIL') ?? ''
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

    // 2. Verify JWT
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user: caller }, error: authError } = await callerClient.auth.getUser()

    if (authError || !caller) {
      return errorResponse('Invalid token', 401)
    }

    // 3. Admin check
    if (caller.email !== adminEmail) {
      return errorResponse('Forbidden', 403)
    }

    // 4. Service role client
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    const { action, page = 1, pageSize = 50, search, userId } = await req.json()
    const currentPeriod = new Date().toISOString().slice(0, 7)

    // ---------- STATS ----------
    if (action === 'stats') {
      const firstOfMonth = currentPeriod + '-01'
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const thirtyDaysAgoStr = thirtyDaysAgo.toISOString()

      const [
        totalUsersRes,
        usersThisMonthRes,
        payingUsersRes,
        overrideUsersRes,
        aiUsageRes,
        totalScenariosRes,
        signupsRes,
      ] = await Promise.all([
        supabaseAdmin.from('users').select('*', { count: 'exact', head: true }),
        supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).gte('created_at', firstOfMonth),
        supabaseAdmin.from('subscriptions').select('user_id', { count: 'exact', head: true }).in('status', ['active', 'trialing']),
        supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).not('subscription_override', 'is', null),
        supabaseAdmin.from('ai_usage').select('count').eq('period', currentPeriod),
        supabaseAdmin.from('scenarios').select('*', { count: 'exact', head: true }),
        supabaseAdmin.from('users').select('created_at').gte('created_at', thirtyDaysAgoStr),
      ])

      const aiInsightsThisMonth = (aiUsageRes.data || []).reduce((sum: number, r: { count: number }) => sum + r.count, 0)

      // Group signups by day
      const byDay: Record<string, number> = {}
      ;(signupsRes.data || []).forEach((u: { created_at: string }) => {
        const date = u.created_at.slice(0, 10)
        byDay[date] = (byDay[date] || 0) + 1
      })
      const signupsByDay = []
      for (let i = 29; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const date = d.toISOString().slice(0, 10)
        signupsByDay.push({ date, count: byDay[date] || 0 })
      }

      return jsonResponse({
        totalUsers: totalUsersRes.count ?? 0,
        usersThisMonth: usersThisMonthRes.count ?? 0,
        payingUsers: payingUsersRes.count ?? 0,
        overrideUsers: overrideUsersRes.count ?? 0,
        aiInsightsThisMonth,
        totalScenarios: totalScenariosRes.count ?? 0,
        signupsByDay,
      })
    }

    // ---------- LIST ----------
    if (action === 'list') {
      let query = supabaseAdmin
        .from('users')
        .select('id, email, display_name, subscription_override, created_at')
      let countQuery = supabaseAdmin
        .from('users')
        .select('*', { count: 'exact', head: true })

      if (search) {
        query = query.ilike('email', `%${search}%`)
        countQuery = countQuery.ilike('email', `%${search}%`)
      }

      query = query
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1)

      const [usersRes, countRes] = await Promise.all([query, countQuery])
      const users = usersRes.data || []
      const total = countRes.count ?? 0

      if (users.length === 0) {
        return jsonResponse({ users: [], total, page })
      }

      const userIds = users.map((u: { id: string }) => u.id)

      // Batch-fetch related data
      const [aiUsageRes, scenariosRes, subsRes] = await Promise.all([
        supabaseAdmin.from('ai_usage').select('user_id, count').eq('period', currentPeriod).in('user_id', userIds),
        supabaseAdmin.from('scenarios').select('user_id').in('user_id', userIds),
        supabaseAdmin.from('subscriptions').select('user_id, status').in('user_id', userIds).order('created_at', { ascending: false }),
      ])

      // Index ai_usage by user_id
      const aiByUser: Record<string, number> = {}
      for (const r of aiUsageRes.data || []) {
        aiByUser[r.user_id] = r.count
      }

      // Count scenarios per user
      const scenariosByUser: Record<string, number> = {}
      for (const r of scenariosRes.data || []) {
        scenariosByUser[r.user_id] = (scenariosByUser[r.user_id] || 0) + 1
      }

      // First subscription per user (already ordered by created_at desc)
      const subByUser: Record<string, string> = {}
      for (const r of subsRes.data || []) {
        if (!subByUser[r.user_id]) {
          subByUser[r.user_id] = r.status
        }
      }

      const enriched = users.map((u: { id: string; email: string; display_name: string | null; subscription_override: string | null; created_at: string }) => ({
        id: u.id,
        email: u.email,
        display_name: u.display_name,
        subscription_override: u.subscription_override,
        created_at: u.created_at,
        stripe_status: subByUser[u.id] ?? null,
        ai_usage_this_month: aiByUser[u.id] ?? 0,
        scenario_count: scenariosByUser[u.id] ?? 0,
      }))

      return jsonResponse({ users: enriched, total, page })
    }

    // ---------- SCENARIOS ----------
    if (action === 'scenarios') {
      if (!userId) {
        return errorResponse('userId is required', 400)
      }

      const { data: scenarios, error } = await supabaseAdmin
        .from('scenarios')
        .select('id, name, data, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        return errorResponse(error.message, 500)
      }

      return jsonResponse({ scenarios })
    }

    // ---------- SUBSCRIPTIONS ----------
    if (action === 'subscriptions') {
      const subsQuery = supabaseAdmin
        .from('subscriptions')
        .select('id, user_id, status, current_period_start, current_period_end, trial_end, cancel_at_period_end, created_at')
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1)

      const countQuery = supabaseAdmin
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })

      const [subsRes, countRes] = await Promise.all([subsQuery, countQuery])
      const subscriptions = subsRes.data || []
      const total = countRes.count ?? 0

      if (subscriptions.length === 0) {
        return jsonResponse({ subscriptions: [], total, page })
      }

      // Batch-fetch emails
      const subUserIds = [...new Set(subscriptions.map((s: { user_id: string }) => s.user_id))]
      const { data: usersData } = await supabaseAdmin
        .from('users')
        .select('id, email')
        .in('id', subUserIds)

      const emailById: Record<string, string> = {}
      for (const u of usersData || []) {
        emailById[u.id] = u.email
      }

      const enriched = subscriptions.map((s: { id: string; user_id: string; status: string; current_period_start: string | null; current_period_end: string | null; trial_end: string | null; cancel_at_period_end: boolean; created_at: string }) => ({
        ...s,
        email: emailById[s.user_id] ?? null,
      }))

      return jsonResponse({ subscriptions: enriched, total, page })
    }

    return errorResponse('Unknown action', 400)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return errorResponse(message, 500)
  }
})
