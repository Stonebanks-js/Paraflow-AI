import { getSupabaseClient, isSupabaseConfigured } from './supabase'

export { isSupabaseConfigured }
import type { User as AppUser } from '@/types'

export interface AuthResponse {
  user: AppUser | null
  error: string | null
}

const DEFAULT_REDIRECT_URL = typeof window !== 'undefined'
  ? `${window.location.origin}/auth/callback`
  : ''

export async function signUpWithEmail(
  email: string,
  password: string,
  fullName?: string
): Promise<AuthResponse> {
  if (!isSupabaseConfigured) {
    return { user: null, error: 'Authentication service is not configured.' }
  }
  try {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName || '' },
        emailRedirectTo: DEFAULT_REDIRECT_URL,
      },
    })
    if (error) {
      if (error.message.toLowerCase().includes('already registered')) {
        return { user: null, error: 'An account with this email already exists.' }
      }
      return { user: null, error: error.message }
    }
    if (!data.user) {
      return { user: null, error: 'Registration failed. Please try again.' }
    }
    const user: AppUser = {
      id: data.user.id,
      email: data.user.email || email,
      full_name: fullName || null,
      role: 'free',
      onboarding_done: false,
      created_at: data.user.created_at || new Date().toISOString(),
    }
    return { user, error: null }
  } catch (err) {
    return { user: null, error: err instanceof Error ? err.message : 'Registration failed' }
  }
}

export async function signInWithEmail(
  email: string,
  password: string
): Promise<AuthResponse> {
  if (!isSupabaseConfigured) {
    return { user: null, error: 'Authentication service is not configured.' }
  }
  try {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) {
      if (error.message.toLowerCase().includes('invalid login credentials')) {
        return { user: null, error: 'Invalid email or password.' }
      }
      if (error.message.toLowerCase().includes('email not confirmed')) {
        return { user: null, error: 'Please verify your email before signing in.' }
      }
      return { user: null, error: error.message }
    }
    if (!data.user) {
      return { user: null, error: 'Login failed. Please try again.' }
    }
    const user: AppUser = {
      id: data.user.id,
      email: data.user.email || email,
      full_name: (data.user.user_metadata?.full_name as string) || null,
      role: 'free',
      onboarding_done: false,
      created_at: data.user.created_at || new Date().toISOString(),
    }
    return { user, error: null }
  } catch (err) {
    return { user: null, error: err instanceof Error ? err.message : 'Login failed' }
  }
}

export async function signInWithGoogle(): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured) {
    return { error: 'Authentication service is not configured.' }
  }
  try {
    const supabase = getSupabaseClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: DEFAULT_REDIRECT_URL },
    })
    if (error) return { error: error.message }
    return { error: null }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Google sign-in failed' }
  }
}

export async function signInWithGithub(): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured) {
    return { error: 'Authentication service is not configured.' }
  }
  try {
    const supabase = getSupabaseClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: DEFAULT_REDIRECT_URL },
    })
    if (error) return { error: error.message }
    return { error: null }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'GitHub sign-in failed' }
  }
}

export async function signOut(): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured) {
    return { error: null }
  }
  try {
    const supabase = getSupabaseClient()
    const { error } = await supabase.auth.signOut()
    if (error) return { error: error.message }
    return { error: null }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Sign-out failed' }
  }
}

export async function getSession() {
  if (!isSupabaseConfigured) return null
  try {
    const supabase = getSupabaseClient()
    const { data } = await supabase.auth.getSession()
    return data.session
  } catch {
    return null
  }
}

export async function getAccessToken(): Promise<string | null> {
  const session = await getSession()
  return session?.access_token ?? null
}

export function onAuthStateChange(
  callback: (event: string, session: unknown) => void
) {
  if (!isSupabaseConfigured) {
    return { data: { subscription: { unsubscribe: () => {} } } }
  }
  const supabase = getSupabaseClient()
  return supabase.auth.onAuthStateChange(callback)
}

export function mapSupabaseUserToAppUser(
  supaUser: { id: string; email?: string | null; user_metadata?: Record<string, unknown>; created_at?: string } | null
): AppUser | null {
  if (!supaUser) return null
  return {
    id: supaUser.id,
    email: supaUser.email || '',
    full_name: (supaUser.user_metadata?.full_name as string) || null,
    role: 'free',
    onboarding_done: false,
    created_at: supaUser.created_at || new Date().toISOString(),
  }
}
