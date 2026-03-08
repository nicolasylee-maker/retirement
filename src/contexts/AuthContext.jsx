import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../services/supabaseClient'
import { GA } from '../utils/analytics'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [avatarUrl, setAvatarUrl] = useState(null)

  async function resolveAvatar(u) {
    if (!u) { setAvatarUrl(null); return }
    const fromMeta = u.user_metadata?.avatar_url
    if (fromMeta) { setAvatarUrl(fromMeta); return }
    const { data } = await supabase.from('users').select('avatar_url').eq('id', u.id).maybeSingle()
    setAvatarUrl(data?.avatar_url ?? null)
  }

  useEffect(() => {
    // Dev-only: handle ?token_hash= from magic link generated via CLI
    if (import.meta.env.DEV) {
      const params = new URLSearchParams(window.location.search)
      const tokenHash = params.get('token_hash')
      const tokenType = params.get('type') || 'magiclink'
      if (tokenHash) {
        window.history.replaceState({}, '', window.location.pathname)
        supabase.auth.verifyOtp({ token_hash: tokenHash, type: tokenType }).then(({ data, error }) => {
          if (error) { console.error('Token login failed:', error.message); }
        })
      }
    }

    // getSession reads from localStorage (no network call).
    // If a session exists, validate it against the server via getUser() so that
    // deleted accounts are caught and signed out immediately on refresh.
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      if (s) {
        const { error } = await supabase.auth.getUser()
        if (error) {
          await supabase.auth.signOut()
          setSession(null)
          setUser(null)
          resolveAvatar(null)
          setIsLoading(false)
          return
        }
      }
      setSession(s)
      setUser(s?.user ?? null)
      resolveAvatar(s?.user ?? null)
      setIsLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      if (_event === 'SIGNED_IN' && s?.user) {
        const created = new Date(s.user.created_at).getTime()
        const now = Date.now()
        if (now - created < 30000) GA.signUp()
      }
      setSession(s)
      // Skip setUser for TOKEN_REFRESHED to avoid re-triggering the cloud-sync
      // fetch+create flow. INITIAL_SESSION and SIGNED_IN still update user.
      if (_event !== 'TOKEN_REFRESHED') {
        setUser(s?.user ?? null)
        resolveAvatar(s?.user ?? null)
      }
      setIsLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: { prompt: 'select_account' },
      },
    })
  }

  const signInWithMagicLink = async (email) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })
    if (error) throw error
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, session, avatarUrl, isLoading, signInWithGoogle, signInWithMagicLink, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
