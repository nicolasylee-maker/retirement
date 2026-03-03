import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const ALLOWED_KEYS = [
  'gemini_model',
  'temperature',
  'max_output_tokens',
  'prompt_base',
  'prompt_dashboard',
  'prompt_compare',
  'prompt_estate',
  'prompt_debt',
]

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

    const body = await req.json()

    // ---------- READ ----------
    if (body.action === 'read') {
      const { data } = await supabaseAdmin
        .from('admin_config')
        .select('config_key, config_value')

      const config = Object.fromEntries(
        (data || []).map((r: { config_key: string; config_value: string }) => [r.config_key, r.config_value])
      )

      return jsonResponse({ config })
    }

    // ---------- UPDATE ----------
    if (body.updates && typeof body.updates === 'object') {
      const updates = body.updates as Record<string, string>
      const rows = Object.entries(updates)
        .filter(([k]) => ALLOWED_KEYS.includes(k))
        .map(([config_key, config_value]) => ({
          config_key,
          config_value,
          updated_at: new Date().toISOString(),
        }))

      if (rows.length === 0) {
        return jsonResponse({ success: true, updated: [] })
      }

      const { error } = await supabaseAdmin
        .from('admin_config')
        .upsert(rows, { onConflict: 'config_key' })

      if (error) {
        return errorResponse(error.message, 500)
      }

      return jsonResponse({ success: true, updated: rows.map(r => r.config_key) })
    }

    return errorResponse('Invalid request: provide action or updates', 400)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return errorResponse(message, 500)
  }
})
