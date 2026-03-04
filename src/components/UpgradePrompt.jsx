import React, { useState } from 'react'
import { useSubscription } from '../contexts/SubscriptionContext'
import { useAuth } from '../contexts/AuthContext'
import { startCheckout } from '../services/stripeService'
import AuthPanel from './AuthPanel'

const MONTHLY_PRICE_ID = import.meta.env.VITE_STRIPE_PRICE_MONTHLY
const YEARLY_PRICE_ID = import.meta.env.VITE_STRIPE_PRICE_YEARLY

function LockIcon({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  )
}

const FEATURES = [
  'Compare multiple scenarios side-by-side',
  'Estate planning & heir distribution',
  'Optimize My Plan — 8 ranked strategies',
  'AI-powered retirement insights',
]

const PRO_FEATURES = [
  {
    name: 'Compare Scenarios',
    desc: 'Test retire-at-60 vs retire-at-65 side-by-side',
    bg: '#ede9fe',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9333ea" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  },
  {
    name: 'Estate Planning',
    desc: 'See what heirs receive after taxes & probate',
    bg: '#ccfbf1',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12L12 3l9 9"/><path d="M9 21V12h6v9"/></svg>,
  },
  {
    name: 'Optimize My Plan',
    desc: '8 AI-ranked strategies to maximize your outcome',
    bg: '#fef3c7',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>,
  },
  {
    name: 'AI Insights',
    desc: 'Plain-English strategy powered by Gemini AI',
    bg: '#e0e7ff',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5z"/><path d="M18 14l.75 2.25L21 17l-2.25.75L18 20l-.75-2.25L15 17l2.25-.75z"/></svg>,
  },
  {
    name: 'Multiple Plans',
    desc: 'Save and switch between unlimited scenarios',
    bg: '#f0fdf4',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="8" width="14" height="12" rx="2"/><path d="M6 6V4h12a2 2 0 012 2v12" strokeDasharray="2 2"/></svg>,
  },
  {
    name: 'PDF Report',
    desc: 'Export a printable professional retirement plan',
    bg: '#fff1f2',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e11d48" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/></svg>,
  },
]

export default function UpgradePrompt({ variant = 'full', featureName, modal = false, onUpgrade }) {
  const { isLoading } = useSubscription()
  const { user } = useAuth()
  const [billingPlan, setBillingPlan] = useState('yearly')
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [checkoutError, setCheckoutError] = useState('')
  const [authOpen, setAuthOpen] = useState(false)

  if (isLoading) return null

  async function handleCheckout() {
    if (!user) { setAuthOpen(true); return }
    setCheckoutLoading(true)
    setCheckoutError('')
    const priceId = billingPlan === 'yearly' ? YEARLY_PRICE_ID : MONTHLY_PRICE_ID
    try {
      await startCheckout(priceId)
    } catch (e) {
      setCheckoutError(e.message || 'Could not start checkout. Please try again.')
      setCheckoutLoading(false)
    }
  }

  const authModal = authOpen && (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40"
      onMouseDown={(e) => { if (e.target === e.currentTarget) setAuthOpen(false) }}
    >
      <div className="bg-white rounded-2xl shadow-2xl relative">
        <button
          type="button"
          onClick={() => setAuthOpen(false)}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-xl leading-none"
          aria-label="Close"
        >
          &times;
        </button>
        <AuthPanel onClose={() => setAuthOpen(false)} />
      </div>
    </div>
  )

  if (variant === 'compact') {
    return (
      <>
        <div className="card-base p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-gray-500 min-w-0">
            <LockIcon className="w-4 h-4 flex-shrink-0 text-purple-400" />
            <span className="text-sm font-medium truncate">Upgrade to unlock {featureName}</span>
          </div>
          <button
            type="button"
            onClick={onUpgrade ?? handleCheckout}
            disabled={!onUpgrade && checkoutLoading}
            className="flex-shrink-0 px-3 py-1.5 text-sm font-semibold text-white rounded-lg
                       bg-gradient-to-r from-purple-600 to-indigo-600
                       hover:from-purple-700 hover:to-indigo-700
                       disabled:opacity-50 transition-all whitespace-nowrap"
          >
            {(!onUpgrade && checkoutLoading) ? 'Loading...' : 'Start trial'}
          </button>
          {checkoutError && <p className="text-xs text-red-600">{checkoutError}</p>}
        </div>
        {authModal}
      </>
    )
  }

  // variant === 'full'
  const cardInner = (
    <div className="flex flex-col sm:flex-row max-w-[900px] w-full bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      {/* Left column — pricing & CTA */}
      <div className="w-full sm:w-[360px] flex-shrink-0 p-8 text-center flex flex-col items-center border-b border-gray-100 sm:border-b-0 sm:border-r">
        <div className="w-14 h-14 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-4">
          <LockIcon className="w-7 h-7 text-purple-600" />
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-2">Unlock RetirePlanner Pro</h2>
        <p className="text-gray-500 mb-5">
          Start your 7-day free trial — no credit card required.
        </p>

        <ul className="text-left space-y-2 mb-5 w-full">
          {FEATURES.map((f) => (
            <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
              <CheckIcon />
              {f}
            </li>
          ))}
        </ul>

        {/* Plan toggle */}
        <div className="flex rounded-xl border border-gray-200 overflow-hidden mb-4 w-full">
          <button
            type="button"
            onClick={() => setBillingPlan('monthly')}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              billingPlan === 'monthly'
                ? 'bg-purple-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Monthly<br />
            <span className={`text-xs font-normal ${billingPlan === 'monthly' ? 'text-purple-200' : 'text-gray-400'}`}>
              $5 CAD / month
            </span>
          </button>
          <button
            type="button"
            onClick={() => setBillingPlan('yearly')}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors relative ${
              billingPlan === 'yearly'
                ? 'bg-purple-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Annual
            <span className={`ml-1.5 text-xs font-semibold px-1.5 py-0.5 rounded-full ${
              billingPlan === 'yearly' ? 'bg-white/20 text-white' : 'bg-green-100 text-green-700'
            }`}>
              Save 27%
            </span>
            <br />
            <span className={`text-xs font-normal ${billingPlan === 'yearly' ? 'text-purple-200' : 'text-gray-400'}`}>
              $44 CAD / year
            </span>
          </button>
        </div>

        {checkoutError && <p className="text-sm text-red-600 mb-3">{checkoutError}</p>}

        <button
          type="button"
          onClick={handleCheckout}
          disabled={checkoutLoading}
          className="w-full py-3 text-sm font-semibold text-white rounded-xl
                     bg-gradient-to-r from-purple-600 to-indigo-600
                     hover:from-purple-700 hover:to-indigo-700
                     disabled:opacity-50 transition-all mb-4"
        >
          {checkoutLoading ? 'Loading...' : 'Start free trial'}
        </button>

        {!user && (
          <button
            type="button"
            onClick={() => setAuthOpen(true)}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Already subscribed? Sign in
          </button>
        )}
      </div>

      {/* Right column — Pro feature grid (desktop only) */}
      <div className="hidden sm:flex flex-col flex-1 bg-gradient-to-br from-violet-50 to-indigo-50 p-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-violet-700 mb-3">
          Everything in Pro
        </p>
        <div className="grid grid-cols-2 gap-2.5 flex-1">
          {PRO_FEATURES.map(f => (
            <div
              key={f.name}
              className="bg-white rounded-xl p-3.5 border border-violet-100/60 shadow-sm
                         hover:shadow-md hover:-translate-y-0.5 transition-all cursor-default"
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2.5"
                   style={{ background: f.bg }}>
                {f.icon}
              </div>
              <p className="text-[11px] font-semibold text-gray-900 mb-0.5">{f.name}</p>
              <p className="text-[10px] text-gray-500 leading-snug">{f.desc}</p>
            </div>
          ))}
        </div>
        <p className="text-center text-[10px] text-violet-600 font-medium mt-3">
          All features · $3.67/mo billed annually
        </p>
      </div>
    </div>
  )

  if (modal) {
    return <>{cardInner}{authModal}</>
  }

  return (
    <div className="flex items-center justify-center py-16 px-4">
      {cardInner}
      {authModal}
    </div>
  )
}
