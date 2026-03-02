import React from 'react'
import { useSubscription } from '../contexts/SubscriptionContext'

export function GatedButton({ children, onClick, featureName, className = '' }) {
  const { isPaid } = useSubscription()

  if (isPaid) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {children}
      </button>
    )
  }

  return (
    <div className="relative group inline-block">
      <button type="button" disabled className={`${className} opacity-50 cursor-not-allowed`}>
        {children}
      </button>
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1
                      bg-gray-900 text-white text-xs rounded whitespace-nowrap
                      opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
        Upgrade to unlock {featureName}
      </div>
    </div>
  )
}
