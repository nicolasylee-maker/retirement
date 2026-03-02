import React, { useState } from 'react'
import { supabase } from '../../services/supabaseClient'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

export default function OverrideList({ users, session, onRevoked }) {
  const [revoking, setRevoking] = useState(null) // userId being revoked

  const handleRevoke = async (userId) => {
    setRevoking(userId)
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/revoke-override`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ userId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Unknown error')
      onRevoked(userId)
    } catch (err) {
      alert(`Revoke failed: ${err.message}`)
    } finally {
      setRevoking(null)
    }
  }

  if (users.length === 0) {
    return (
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Override Users</h2>
        <p className="text-sm text-gray-500">No users with subscription overrides.</p>
      </section>
    )
  }

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Override Users</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-gray-100">
              <th className="pb-2 font-medium text-gray-600 pr-4">Email</th>
              <th className="pb-2 font-medium text-gray-600 pr-4">Tier</th>
              <th className="pb-2 font-medium text-gray-600 pr-4">Since</th>
              <th className="pb-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="py-2.5 pr-4 text-gray-800 truncate max-w-[240px]">{u.email}</td>
                <td className="py-2.5 pr-4">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                    u.subscription_override === 'lifetime'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {u.subscription_override}
                  </span>
                </td>
                <td className="py-2.5 pr-4 text-gray-500">
                  {u.created_at ? new Date(u.created_at).toLocaleDateString('en-CA') : '—'}
                </td>
                <td className="py-2.5 text-right">
                  <button
                    type="button"
                    disabled={revoking === u.id}
                    onClick={() => handleRevoke(u.id)}
                    className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50
                               disabled:cursor-not-allowed transition-colors"
                  >
                    {revoking === u.id ? 'Revoking…' : 'Revoke'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
