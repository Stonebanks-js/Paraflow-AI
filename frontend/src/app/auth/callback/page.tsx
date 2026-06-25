'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase'
import { useUserStore } from '@/stores'
import { mapSupabaseUserToAppUser } from '@/lib/auth-service'

export default function AuthCallbackPage() {
  const router = useRouter()
  const { setUser, setToken, logout } = useUserStore()

  useEffect(() => {
    let cancelled = false

    async function handle() {
      if (!isSupabaseConfigured) {
        router.replace('/login?error=auth_not_configured')
        return
      }
      try {
        const supabase = getSupabaseClient()
        const { data, error } = await supabase.auth.getSession()
        if (cancelled) return

        if (error) {
          router.replace(`/login?error=${encodeURIComponent(error.message)}`)
          return
        }

        if (data.session?.user) {
          const appUser = mapSupabaseUserToAppUser(data.session.user)
          if (appUser) {
            setUser(appUser)
            setToken(data.session.access_token)
            router.replace('/dashboard')
            return
          }
        }
        logout()
        router.replace('/login?error=oauth_failed')
      } catch (err) {
        router.replace(`/login?error=${encodeURIComponent(err instanceof Error ? err.message : 'OAuth callback failed')}`)
      }
    }

    handle()
    return () => {
      cancelled = true
    }
  }, [router, setUser, setToken, logout])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Completing sign-in…</p>
      </div>
    </div>
  )
}
