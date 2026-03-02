import React, { useEffect, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import AuthPanel from './AuthPanel'

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL

export default function AccountMenu({ onAdmin, open, onOpenChange }) {
  const { user, isLoading, signOut } = useAuth()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [panelOpenInternal, setPanelOpenInternal] = useState(false)
  const dropdownRef = useRef(null)

  // Support controlled mode (open/onOpenChange) or internal uncontrolled mode
  const panelOpen = open !== undefined ? open : panelOpenInternal
  const setPanelOpen = onOpenChange !== undefined ? onOpenChange : setPanelOpenInternal

  useEffect(() => {
    if (!dropdownOpen) return
    const close = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [dropdownOpen])

  if (isLoading) {
    return <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
  }

  if (!user) {
    return (
      <>
        <button
          type="button"
          onClick={() => setPanelOpen(true)}
          className="text-sm font-medium text-purple-700 border border-purple-300
                     rounded-lg px-3 py-1.5 hover:bg-purple-50 transition-colors"
        >
          Sign in
        </button>

        {panelOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            onMouseDown={(e) => { if (e.target === e.currentTarget) setPanelOpen(false) }}
          >
            <div className="bg-white rounded-2xl shadow-2xl relative">
              <button
                type="button"
                onClick={() => setPanelOpen(false)}
                className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-xl leading-none"
                aria-label="Close"
              >
                &times;
              </button>
              <AuthPanel onClose={() => setPanelOpen(false)} />
            </div>
          </div>
        )}
      </>
    )
  }

  const avatarUrl = user.user_metadata?.avatar_url
  const email = user.email ?? ''
  const initial = email.charAt(0).toUpperCase()

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setDropdownOpen((v) => !v)}
        className="flex items-center justify-center w-8 h-8 rounded-full overflow-hidden
                   focus:outline-none focus:ring-2 focus:ring-purple-400"
        aria-label="Account menu"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
        ) : (
          <span className="w-full h-full flex items-center justify-center bg-purple-600 text-white text-sm font-semibold">
            {initial}
          </span>
        )}
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-56 bg-white rounded-xl shadow-xl
                        border border-gray-200 py-1.5 z-50">
          <p className="px-4 py-2 text-xs text-gray-500 truncate">Signed in as</p>
          <p className="px-4 pb-2 text-sm font-medium text-gray-800 truncate">{email}</p>
          <div className="border-t border-gray-100 my-1" />
          {user?.email === ADMIN_EMAIL && onAdmin && (
            <button
              type="button"
              onClick={() => { setDropdownOpen(false); onAdmin() }}
              className="w-full text-left px-4 py-2 text-sm text-purple-700 hover:bg-purple-50 transition-colors"
            >
              Admin
            </button>
          )}
          <button
            type="button"
            onClick={() => { setDropdownOpen(false); signOut() }}
            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
