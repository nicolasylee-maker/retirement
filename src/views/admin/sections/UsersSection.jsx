import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../../../contexts/AuthContext'
import { adminApi } from '../../../services/adminService'
import InviteModal from '../components/InviteModal'
import UserScenariosPanel from '../components/UserScenariosPanel'

const PAGE_SIZE = 25
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

function ResendInviteButton({ user, session }) {
  const [state, setState] = useState(null) // null | 'sending' | 'sent' | 'error'

  const handleClick = async () => {
    setState('sending')
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ email: user.email, override: user.subscription_override ?? null }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Failed')
      }
      setState('sent')
      setTimeout(() => setState(null), 3000)
    } catch (err) {
      alert(`Failed to send invite: ${err.message}`)
      setState(null)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={state === 'sending'}
      className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-40 transition-colors whitespace-nowrap"
    >
      {state === 'sending' ? 'Sending…' : state === 'sent' ? '✓ Sent' : 'Resend Invite'}
    </button>
  )
}

function OverrideSelect({ user, session, onChanged }) {
  const [saving, setSaving] = useState(false)

  const handleChange = async (e) => {
    const val = e.target.value === 'null' ? null : e.target.value
    setSaving(true)
    try {
      await adminApi.setOverride(user.email, val, session.access_token)
      onChanged()
    } catch (err) {
      alert(`Failed: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <select
      value={user.subscription_override ?? 'null'}
      onChange={handleChange}
      disabled={saving}
      className="text-xs border border-gray-300 rounded-md px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-purple-400 disabled:opacity-50"
    >
      <option value="null">free</option>
      <option value="beta">beta</option>
      <option value="lifetime">lifetime</option>
    </select>
  )
}

export default function UsersSection() {
  const { session } = useAuth()
  const [users, setUsers] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [scenariosUser, setScenariosUser] = useState(null) // { id, email }
  const searchTimer = useRef(null)

  const load = useCallback((p, s) => {
    setLoading(true)
    adminApi.listUsers(p, PAGE_SIZE, s)
      .then(d => {
        setUsers(d.users || [])
        setTotal(d.total || 0)
        setLoading(false)
      })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  useEffect(() => { load(1, '') }, [load])

  const handleSearchChange = (e) => {
    const val = e.target.value
    setSearch(val)
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      setPage(1)
      load(1, val)
    }, 300)
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const handlePageChange = (p) => {
    setPage(p)
    load(p, search)
  }

  if (error) return <p className="text-sm text-red-600">{error}</p>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-gray-900">Users</h2>
        <button onClick={() => setInviteOpen(true)}
          className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium">
          + Invite User
        </button>
      </div>

      <input
        type="search" value={search} onChange={handleSearchChange}
        placeholder="Search by email..."
        className="w-full max-w-sm border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
      />

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Plan</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Signup</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">AI/mo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Scenarios</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-800 truncate max-w-[200px]">{u.email}</td>
                    <td className="px-4 py-3">
                      <OverrideSelect user={u} session={session} onChanged={() => load(page, search)} />
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString('en-CA') : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{u.ai_usage_this_month ?? 0}</td>
                    <td className="px-4 py-3 text-gray-600">{u.scenario_count ?? 0}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <ResendInviteButton user={u} session={session} />
                        <button
                          onClick={() => setScenariosUser({ id: u.id, email: u.email })}
                          className="text-xs text-purple-600 hover:text-purple-800 transition-colors"
                        >
                          Scenarios
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-2 text-sm">
          <button onClick={() => handlePageChange(page - 1)} disabled={page === 1}
            className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors">
            &larr;
          </button>
          <span className="text-gray-600">{page} / {totalPages}</span>
          <button onClick={() => handlePageChange(page + 1)} disabled={page === totalPages}
            className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors">
            &rarr;
          </button>
          <span className="text-gray-400 text-xs">{total} total</span>
        </div>
      )}

      {inviteOpen && (
        <InviteModal session={session} onClose={() => setInviteOpen(false)}
          onInvited={() => { setInviteOpen(false); load(page, search) }} />
      )}
      {scenariosUser && (
        <UserScenariosPanel
          userId={scenariosUser.id} userEmail={scenariosUser.email}
          onClose={() => setScenariosUser(null)}
        />
      )}
    </div>
  )
}
