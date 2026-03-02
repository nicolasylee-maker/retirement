import { supabase } from './supabaseClient'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? ''

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  if (!token) throw new Error('Not authenticated')
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

/**
 * Calls the stripe-checkout Edge Function and redirects to the Stripe Checkout URL.
 * @param {string} priceId - Stripe price ID (monthly or annual)
 */
export async function startCheckout(priceId) {
  const headers = await getAuthHeaders()
  const res = await fetch(`${SUPABASE_URL}/functions/v1/stripe-checkout`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      priceId,
      successUrl: window.location.origin,
      cancelUrl: window.location.origin,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Checkout failed (${res.status})`)
  }

  const { url } = await res.json()
  if (!url) throw new Error('No checkout URL returned')
  window.location.href = url
}

/**
 * Calls the stripe-portal Edge Function and redirects to the Stripe Customer Portal.
 */
export async function openBillingPortal() {
  const headers = await getAuthHeaders()
  const res = await fetch(`${SUPABASE_URL}/functions/v1/stripe-portal`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ returnUrl: window.location.origin }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Portal failed (${res.status})`)
  }

  const { url } = await res.json()
  if (!url) throw new Error('No portal URL returned')
  window.location.href = url
}
