import { supabase } from './supabaseClient'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

async function callAdminFunction(name, body) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`)
  return data
}

export const adminApi = {
  getStats: () =>
    callAdminFunction('admin-users', { action: 'stats' }),
  listUsers: (page = 1, pageSize = 50, search = '') =>
    callAdminFunction('admin-users', { action: 'list', page, pageSize, search: search || undefined }),
  getUserScenarios: (userId) =>
    callAdminFunction('admin-users', { action: 'scenarios', userId }),
  getConfig: () =>
    callAdminFunction('admin-config-update', { action: 'read' }),
  updateConfig: (updates) =>
    callAdminFunction('admin-config-update', { updates }),
  listSubscriptions: (page = 1, pageSize = 50) =>
    callAdminFunction('admin-users', { action: 'subscriptions', page, pageSize }),
  setOverride: (email, override, accessToken) => {
    // Uses the existing send-invite edge function
    return fetch(`${SUPABASE_URL}/functions/v1/send-invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ email, override }),
    }).then(async res => {
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Override update failed')
      return data
    })
  },
}
