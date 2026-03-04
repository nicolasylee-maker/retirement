import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') ?? ''
const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL') ?? ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// ─── Run: call external AI and return { text } ───────────────────────────────

async function runCompletion(provider: string, model: string, apiKey: string | null, prompt: string): Promise<string> {
  if (provider === 'gemini') {
    const key = GEMINI_API_KEY
    if (!key) throw new Error('Server GEMINI_API_KEY not configured')
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
      }),
    })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Gemini error ${res.status}: ${err.slice(0, 200)}`)
    }
    const data = await res.json()
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  }

  // OpenAI-compatible providers
  const openAiCompatible = ['openai', 'openrouter', 'xai', 'kimi']
  const baseUrls: Record<string, string> = {
    openai: 'https://api.openai.com/v1/chat/completions',
    openrouter: 'https://openrouter.ai/api/v1/chat/completions',
    xai: 'https://api.x.ai/v1/chat/completions',
    kimi: 'https://api.moonshot.cn/v1/chat/completions',
  }

  if (openAiCompatible.includes(provider)) {
    if (!apiKey) throw new Error(`API key required for ${provider}`)
    const url = baseUrls[provider]
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 4096,
      }),
    })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`${provider} error ${res.status}: ${err.slice(0, 200)}`)
    }
    const data = await res.json()
    return data.choices?.[0]?.message?.content ?? ''
  }

  if (provider === 'anthropic') {
    if (!apiKey) throw new Error('API key required for anthropic')
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Anthropic error ${res.status}: ${err.slice(0, 200)}`)
    }
    const data = await res.json()
    return data.content?.[0]?.text ?? ''
  }

  throw new Error(`Unknown provider: ${provider}`)
}

// ─── List models from provider's /models endpoint ───────────────────────────

async function listModels(provider: string, apiKey: string | null): Promise<string[]> {
  if (provider === 'gemini') {
    // Static list — no API call needed
    return [
      'gemini-2.5-pro-preview-05-06',
      'gemini-2.0-flash',
      'gemini-2.0-flash-lite',
      'gemini-1.5-pro',
      'gemini-1.5-flash',
    ]
  }

  const modelsEndpoints: Record<string, string> = {
    openai: 'https://api.openai.com/v1/models',
    openrouter: 'https://openrouter.ai/api/v1/models',
    xai: 'https://api.x.ai/v1/models',
    kimi: 'https://api.moonshot.cn/v1/models',
    anthropic: 'https://api.anthropic.com/v1/models',
  }

  const url = modelsEndpoints[provider]
  if (!url) throw new Error(`No models endpoint for provider: ${provider}`)
  if (!apiKey) throw new Error(`API key required to fetch ${provider} models`)

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (provider === 'anthropic') {
    headers['x-api-key'] = apiKey
    headers['anthropic-version'] = '2023-06-01'
  } else {
    headers['Authorization'] = `Bearer ${apiKey}`
  }

  const res = await fetch(url, { headers })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`${provider} models error ${res.status}: ${err.slice(0, 200)}`)
  }
  const data = await res.json()
  const items = data.data ?? data.models ?? []
  return items.map((m: { id: string }) => m.id).filter(Boolean).sort()
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // 1. Verify JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return jsonResponse({ error: 'Unauthorized' }, 401)

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: authError } = await callerClient.auth.getUser()
    if (authError || !user) return jsonResponse({ error: 'Unauthorized' }, 401)

    // 2. Admin-only gate
    if (!ADMIN_EMAIL || user.email !== ADMIN_EMAIL) {
      return jsonResponse({ error: 'Forbidden — admin only' }, 403)
    }

    // 3. Parse body
    const body = await req.json().catch(() => ({}))
    const { action, provider, model, apiKey, prompt } = body

    if (action === 'run') {
      if (!provider || !model || !prompt) {
        return jsonResponse({ error: 'Missing provider, model, or prompt' }, 400)
      }
      // apiKey is null for Gemini (uses server key)
      const text = await runCompletion(provider, model, apiKey ?? null, prompt)
      return jsonResponse({ text })
    }

    if (action === 'list-models') {
      if (!provider) return jsonResponse({ error: 'Missing provider' }, 400)
      const models = await listModels(provider, apiKey ?? null)
      return jsonResponse({ models })
    }

    return jsonResponse({ error: `Unknown action: ${action}` }, 400)

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return jsonResponse({ error: msg }, 502)
  }
})
