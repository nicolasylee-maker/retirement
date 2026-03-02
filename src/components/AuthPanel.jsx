import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function AuthPanel({ onClose }) {
  const { signInWithGoogle, signInWithMagicLink } = useAuth()
  const [email, setEmail] = useState('')
  const [magicSending, setMagicSending] = useState(false)
  const [magicSent, setMagicSent] = useState(false)
  const [magicError, setMagicError] = useState(null)
  const [googleError, setGoogleError] = useState(null)

  const handleGoogle = async () => {
    setGoogleError(null)
    try {
      await signInWithGoogle()
    } catch {
      setGoogleError('Could not open Google sign-in. Please try again.')
    }
  }

  const handleMagicLink = async (e) => {
    e.preventDefault()
    if (!email.trim()) return
    setMagicSending(true)
    setMagicError(null)
    try {
      await signInWithMagicLink(email.trim())
      setMagicSent(true)
    } catch {
      setMagicError("Couldn't send email, please try again.")
    } finally {
      setMagicSending(false)
    }
  }

  return (
    <div className="p-6 space-y-4 w-full max-w-sm">
      <h2 className="text-lg font-semibold text-gray-900">Sign in</h2>

      <button
        type="button"
        onClick={handleGoogle}
        className="w-full flex items-center justify-center gap-3 border border-gray-300
                   rounded-lg px-4 py-2.5 text-sm font-medium text-gray-700
                   hover:bg-gray-50 transition-colors"
      >
        <GoogleIcon />
        Continue with Google
      </button>
      {googleError && <p className="text-xs text-red-600">{googleError}</p>}

      <div className="flex items-center gap-3">
        <div className="flex-1 border-t border-gray-200" />
        <span className="text-xs text-gray-400">or</span>
        <div className="flex-1 border-t border-gray-200" />
      </div>

      {magicSent ? (
        <p className="text-sm text-green-700 bg-green-50 rounded-lg px-4 py-3">
          Check your email — we sent a link to <strong>{email}</strong>
        </p>
      ) : (
        <form onSubmit={handleMagicLink} className="space-y-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                       focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
          <button
            type="submit"
            disabled={magicSending}
            className="w-full bg-purple-600 text-white rounded-lg px-4 py-2 text-sm
                       font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
          >
            {magicSending ? 'Sending...' : 'Send magic link'}
          </button>
          {magicError && <p className="text-xs text-red-600">{magicError}</p>}
        </form>
      )}
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z"/>
    </svg>
  )
}
