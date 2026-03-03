import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import SummaryCards from './dashboard/SummaryCards'
import PortfolioChart from './dashboard/PortfolioChart'
import { DEMO_SCENARIO, DEMO_PROJECTION } from '../constants/demoScenario'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}

export function LandingPage({ onTryAnonymous }) {
  const { signInWithGoogle, signInWithMagicLink } = useAuth()
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleMagicLink(e) {
    e.preventDefault()
    if (!email.trim()) return
    setSending(true)
    setError('')
    try {
      await signInWithMagicLink(email.trim())
      setSent(true)
    } catch (err) {
      setError(err.message || 'Failed to send link. Try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row">

      {/* ── LEFT 60%: Live Dashboard Demo ─────────────────────── */}
      <div className="order-2 lg:order-1 lg:w-3/5 flex flex-col px-8 py-10 lg:px-10 lg:py-10 overflow-y-auto">

        <div className="text-xl font-bold text-orange-500 tracking-tight mb-6">
          RetirePlanner.ca
        </div>

        <h1 className="text-3xl lg:text-4xl font-black text-gray-900 leading-tight mb-2">
          Know exactly when<br />your money runs out.
        </h1>
        <p className="text-base text-gray-600 mb-6">
          Tax-accurate retirement projections for Canadians.
        </p>

        {/* ── Live demo label ── */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-bold uppercase tracking-widest text-orange-500">
            Live Demo
          </span>
          <span className="text-xs text-gray-400">·</span>
          <span className="text-xs text-gray-500 font-medium">Sophie Martin · Age 64, Ontario</span>
        </div>

        {/* ── Summary cards — real engine output ── */}
        <div className="mb-4">
          <SummaryCards projectionData={DEMO_PROJECTION} scenario={DEMO_SCENARIO} />
        </div>

        {/* ── Portfolio chart — interactive, balance view only ── */}
        <PortfolioChart
          projectionData={DEMO_PROJECTION}
          scenario={DEMO_SCENARIO}
          forceView="balance"
        />

        <p className="text-xs text-gray-400 mt-4">
          Tax data: 2025 federal &amp; provincial budgets · 9 provinces supported (QC &amp; territories coming soon) · Not financial advice
        </p>
        <p className="text-[11px] text-gray-400 mt-1">
          Last updated: March 2026 · Questions?{' '}
          <a href="mailto:hello@retireplanner.ca" className="hover:underline">hello@retireplanner.ca</a>
        </p>
      </div>

      {/* ── RIGHT 40%: Sign-in ─────────────────────────────────── */}
      <div className="order-1 lg:order-2 lg:w-2/5 flex items-center justify-center px-8 py-12 bg-white lg:border-l border-b lg:border-b-0 border-gray-200">
        <div className="w-full max-w-sm">

          <h2 className="text-3xl font-black text-gray-900 mb-2">Start your free plan</h2>
          <p className="text-base text-gray-600 mb-8">Save it. Access it from any device.</p>

          {/* Google */}
          <button
            type="button"
            onClick={signInWithGoogle}
            className="w-full flex items-center justify-center gap-3 border-2 border-gray-300 rounded-xl py-3.5 px-4 text-sm font-semibold text-gray-800 bg-white hover:bg-gray-50 hover:border-gray-400 transition-colors mb-4"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-sm text-gray-500 font-medium">or</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {sent ? (
            <div className="text-center py-6 bg-green-50 rounded-xl border border-green-200">
              <div className="text-3xl mb-2">✓</div>
              <div className="text-base font-bold text-gray-800">Check your inbox</div>
              <div className="text-sm text-gray-600 mt-1">Login link sent to {email}</div>
            </div>
          ) : (
            <form onSubmit={handleMagicLink} className="flex flex-col gap-3">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
              />
              {error && <p className="text-sm text-red-600 font-medium">{error}</p>}
              <button
                type="submit"
                disabled={sending}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-bold rounded-xl py-3.5 text-sm transition-colors"
              >
                {sending ? 'Sending…' : 'Send me a login link'}
              </button>
            </form>
          )}

          {/* Skip */}
          <div className="mt-6 pt-6 border-t border-gray-200 text-center">
            <button
              type="button"
              onClick={onTryAnonymous}
              className="text-sm font-semibold text-gray-600 hover:text-orange-500 underline underline-offset-2 transition-colors"
            >
              Skip for now — just try it
            </button>
          </div>

        </div>
      </div>

    </div>
  )
}
