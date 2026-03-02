import React, { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../services/supabaseClient'
import InviteForm from './InviteForm'
import OverrideList from './OverrideList'

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL

export default function AdminView() {
  const { user, session } = useAuth()
  const [overrideUsers, setOverrideUsers] = useState([])
  const [loading, setLoading] = useState(true)

  const isAdmin = user?.email === ADMIN_EMAIL

  const fetchOverrideUsers = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('users')
      .select('id, email, subscription_override, created_at')
      .not('subscription_override', 'is', null)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setOverrideUsers(data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (isAdmin) fetchOverrideUsers()
  }, [isAdmin, fetchOverrideUsers])

  if (!isAdmin) return null

  const handleRevoked = (userId) => {
    setOverrideUsers((prev) => prev.filter((u) => u.id !== userId))
  }

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-8 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Admin</h1>

      <InviteForm session={session} onInvited={fetchOverrideUsers} />

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500">Loading override users…</p>
        </div>
      ) : (
        <OverrideList users={overrideUsers} session={session} onRevoked={handleRevoked} />
      )}
    </div>
  )
}
