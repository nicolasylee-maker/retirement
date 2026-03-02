import React, { useState } from 'react'
import { supabase } from '../../services/supabaseClient'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

export default function InviteForm({ session, onInvited }) {
  const [email, setEmail] = useState('')
  const [override, setOverride] = useState('beta')
  const [status, setStatus] = useState(null) // null | 'loading' | 'success' | 'error'
  const [message, setMessage] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('loading')
    setMessage('')

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ email: email.trim(), override: override || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Unknown error')
      setStatus('success')
      setMessage(`Invite sent to ${email.trim()}.`)
      setEmail('')
      onInvited()
    } catch (err) {
      setStatus('error')
      setMessage(err.message)
    }
  }

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Invite a User</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="invite-email" className="block text-sm font-medium text-gray-700 mb-1">
            Email address
          </label>
          <input
            id="invite-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="someone@example.com"
            className="w-full max-w-sm border border-gray-300 rounded-lg px-3 py-2 text-sm
                       focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
        </div>

        <fieldset>
          <legend className="block text-sm font-medium text-gray-700 mb-2">Access tier</legend>
          <div className="space-y-1.5">
            {[
              { value: null, label: 'No override (free tier)' },
              { value: 'beta', label: 'Beta access' },
              { value: 'lifetime', label: 'Lifetime access' },
            ].map(({ value, label }) => (
              <label key={String(value)} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="radio"
                  name="override"
                  value={String(value)}
                  checked={override === value}
                  onChange={() => setOverride(value)}
                  className="accent-purple-600"
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        <button
          type="submit"
          disabled={status === 'loading'}
          className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg
                     hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed
                     transition-colors"
        >
          {status === 'loading' ? 'Sending…' : 'Send Invite'}
        </button>

        {message && (
          <p className={`text-sm mt-1 ${status === 'error' ? 'text-red-600' : 'text-green-600'}`}>
            {message}
          </p>
        )}
      </form>
    </section>
  )
}
