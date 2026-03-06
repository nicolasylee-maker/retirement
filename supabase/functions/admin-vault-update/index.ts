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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return jsonResponse({ error: 'Missing authorization header' }, 401)

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const adminEmail = Deno.env.get('ADMIN_EMAIL') ?? ''
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

    const callerClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } })
    const { data: { user: caller }, error: authError } = await callerClient.auth.getUser()
    if (authError || !caller) return jsonResponse({ error: 'Invalid token' }, 401)
    if (caller.email !== adminEmail) return jsonResponse({ error: 'Forbidden' }, 403)

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
    const body = await req.json()

    if (body.action === 'set-key') {
      const { provider, apiKey } = body
      if (!provider || !apiKey) return jsonResponse({ error: 'Missing provider or apiKey' }, 400)
      const validProviders = ['openrouter', 'openai', 'anthropic', 'xai', 'kimi']
      if (!validProviders.includes(provider)) return jsonResponse({ error: `Unknown provider: ${provider}` }, 400)

      const { error } = await supabaseAdmin.rpc('admin_upsert_ai_secret', {
        p_name: `${provider}_api_key`,
        p_secret: apiKey,
      })
      if (error) {
        console.error('[admin-vault-update] upsert error', error)
        return jsonResponse({ error: 'Failed to store key' }, 500)
      }
      return jsonResponse({ success: true })
    }

    if (body.action === 'key-status') {
      const { data, error } = await supabaseAdmin.rpc('admin_ai_key_status')
      if (error) {
        console.error('[admin-vault-update] key-status error', error)
        return jsonResponse({ error: 'Failed to check key status' }, 500)
      }
      return jsonResponse({ status: data })
    }

    return jsonResponse({ error: 'Unknown action' }, 400)
  } catch (err) {
    console.error('[admin-vault-update]', err)
    return jsonResponse({ error: 'Internal server error' }, 500)
  }
})
