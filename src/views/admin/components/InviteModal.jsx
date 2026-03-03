import React, { useState } from 'react'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

export default function InviteModal({ session, onClose, onInvited }) {
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
      onInvited?.()
    } catch (err) {
      setStatus('error')
      setMessage(err.message)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">Invite User</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
            <input
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="someone@example.com"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
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
                  <input type="radio" name="override" checked={override === value}
                    onChange={() => setOverride(value)} className="accent-purple-600" />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="flex items-center gap-3 pt-2">
            <button type="submit" disabled={status === 'loading'}
              className="flex-1 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors">
              {status === 'loading' ? 'Sending...' : 'Send Invite'}
            </button>
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>
          {message && (
            <p className={`text-sm ${status === 'error' ? 'text-red-600' : 'text-green-600'}`}>{message}</p>
          )}
        </form>
      </div>
    </div>
  )
}
