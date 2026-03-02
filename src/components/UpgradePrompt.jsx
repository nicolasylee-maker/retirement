import React, { useState } from 'react'
import { useSubscription } from '../contexts/SubscriptionContext'
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
  'What-If analysis with live sliders',
  'AI-powered retirement insights',
]

export default function UpgradePrompt({ variant = 'full', featureName, modal = false }) {
  const { isLoading } = useSubscription()
  const [billingPlan, setBillingPlan] = useState('yearly')
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [checkoutError, setCheckoutError] = useState('')
  const [authOpen, setAuthOpen] = useState(false)

  if (isLoading) return null

  async function handleCheckout() {
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

  if (variant === 'compact') {
    return (
      <div className="card-base p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-gray-500 min-w-0">
          <LockIcon className="w-4 h-4 flex-shrink-0 text-purple-400" />
          <span className="text-sm font-medium truncate">Upgrade to unlock {featureName}</span>
        </div>
        <button
          type="button"
          onClick={handleCheckout}
          disabled={checkoutLoading}
          className="flex-shrink-0 px-3 py-1.5 text-sm font-semibold text-white rounded-lg
                     bg-gradient-to-r from-purple-600 to-indigo-600
                     hover:from-purple-700 hover:to-indigo-700
                     disabled:opacity-50 transition-all whitespace-nowrap"
        >
          {checkoutLoading ? 'Loading...' : 'Start trial'}
        </button>
        {checkoutError && <p className="text-xs text-red-600">{checkoutError}</p>}
      </div>
    )
  }

  // variant === 'full'
  const cardInner = (
    <div className="max-w-lg w-full bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center">
      <div className="w-14 h-14 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-4">
        <LockIcon className="w-7 h-7 text-purple-600" />
      </div>

      <h2 className="text-2xl font-bold text-gray-900 mb-2">Unlock {featureName}</h2>
      <p className="text-gray-500 mb-5">
        Start your 7-day free trial — no credit card required.
      </p>

      <ul className="text-left space-y-2 mb-5">
        {FEATURES.map((f) => (
          <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
            <CheckIcon />
            {f}
          </li>
        ))}
      </ul>

      {/* Plan toggle */}
      <div className="flex rounded-xl border border-gray-200 overflow-hidden mb-4">
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

      <button
        type="button"
        onClick={() => setAuthOpen(true)}
        className="text-sm text-gray-500 hover:text-gray-700 underline"
      >
        Already subscribed? Sign in
      </button>
    </div>
  )

  const authModal = authOpen && (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
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
