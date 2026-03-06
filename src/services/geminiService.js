import { supabase } from './supabaseClient'

export class QuotaExceededError extends Error {
  constructor(used, limit, resetAt) {
    super(`Monthly AI quota reached (${used}/${limit})`)
    this.name = 'QuotaExceededError'
    this.used = used
    this.limit = limit
    this.resetAt = resetAt
  }
}

// Simple in-memory cache keyed by type+hash
const cache = new Map()

function hashData(obj) {
  return JSON.stringify(obj).slice(0, 200)
}

export async function getAiRecommendation(type, data, forceRefresh = false) {
  const cacheKey = `${type}:${hashData(data)}`
  if (!forceRefresh && cache.has(cacheKey)) return cache.get(cacheKey)
  if (forceRefresh) cache.delete(cacheKey)

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Must be signed in to use AI features')

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-proxy`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type, context: data }),
    },
  )

  if (res.status === 429) {
    const body = await res.json()
    throw new QuotaExceededError(body.used, body.limit, body.resetAt)
  }
  if (res.status === 403) throw new Error('subscription_required')
  if (!res.ok) throw new Error('AI request failed')

  const { text } = await res.json()
  cache.set(cacheKey, text)
  return text
}
