import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { useSubscription } from '../contexts/SubscriptionContext'
import UpgradePrompt from './UpgradePrompt'

export function GatedButton({ children, onClick, featureName, className = '', bypass = false }) {
  const { isPaid } = useSubscription()
  const [upgradeOpen, setUpgradeOpen] = useState(false)

  // Admin bypass or subscribed: live button
  if (bypass || isPaid) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {children}
      </button>
    )
  }

  // Non-subscribed: clicking opens upgrade modal
  return (
    <>
      <button
        type="button"
        onClick={() => setUpgradeOpen(true)}
        className={`${className} opacity-50`}
      >
        {children}
      </button>

      {upgradeOpen && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setUpgradeOpen(false) }}
        >
          <div className="relative mx-4">
            <button
              type="button"
              onClick={() => setUpgradeOpen(false)}
              className="absolute top-3 right-3 z-10 text-gray-400 hover:text-gray-600 text-xl leading-none"
              aria-label="Close"
            >
              &times;
            </button>
            <UpgradePrompt variant="full" featureName={featureName} modal />
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
