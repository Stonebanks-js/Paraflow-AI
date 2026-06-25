'use client'

import { useEffect } from 'react'
import { useUserStore } from '@/stores'
import { onAuthStateChange, isSupabaseConfigured, getAccessToken } from '@/lib/auth-service'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setToken, logout } = useUserStore()

  useEffect(() => {
    if (!isSupabaseConfigured) return

    let mounted = true

    const { data: subscription } = onAuthStateChange(async (_event, session) => {
      if (!mounted) return
      if (session && (session as { access_token?: string }).access_token) {
        const s = session as { access_token: string; user?: { id: string; email?: string; user_metadata?: Record<string, unknown>; created_at?: string } }
        setToken(s.access_token)
        if (s.user) {
          setUser({
            id: s.user.id,
            email: s.user.email || '',
            full_name: (s.user.user_metadata?.full_name as string) || null,
            role: 'free',
            onboarding_done: false,
            created_at: s.user.created_at || new Date().toISOString(),
          })
        }
      } else {
        setToken(null)
        setUser(null)
      }
    })

    getAccessToken()
      .then((token) => {
        if (mounted && token) setToken(token)
      })
      .catch(() => {})

    return () => {
      mounted = false
      subscription.subscription.unsubscribe()
    }
  }, [setUser, setToken, logout])

  return <>{children}</>
}
