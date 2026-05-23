// ═══════════════════════════════════════════════════════════
// ኪራይLand — Supabase Auth Helper Wrappers
// ═══════════════════════════════════════════════════════════

import { getSupabaseBrowserClient } from '@/lib/supabase'
import type { Profile } from '@/types/database'

const supabase = getSupabaseBrowserClient()

// ── Sign Up with Email + Password ──────────────────────────
export async function signUpWithEmail(
  email: string,
  password: string,
  fullName: string
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  })

  if (error) throw error
  return data
}

// ── Sign In with Email + Password ──────────────────────────
export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) throw error
  return data
}

// ── Sign In with Google OAuth ──────────────────────────────
export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  })

  if (error) throw error
  return data
}

// ── Sign Out ───────────────────────────────────────────────
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

// ── Send OTP to Email ──────────────────────────────────────
export async function sendOtp(email: string) {
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
    },
  })

  if (error) throw error
  return data
}

import type { EmailOtpType } from '@supabase/supabase-js'

// ── Verify OTP ─────────────────────────────────────────────
export async function verifyOtp(email: string, token: string, type: EmailOtpType = 'email') {
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type,
  })

  if (error) throw error
  return data
}

// ── Reset Password Request ─────────────────────────────────
export async function requestPasswordReset(email: string) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  })

  if (error) throw error
  return data
}

// ── Update Password ────────────────────────────────────────
export async function updatePassword(newPassword: string) {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (error) throw error
  return data
}

// ── Get Current Session ────────────────────────────────────
export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error) throw error
  return session
}

// ── Get Current User ───────────────────────────────────────
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) throw error
  return user
}

// ── Get Profile for Current User ───────────────────────────
export async function getCurrentProfile(): Promise<Profile | null> {
  const user = await getCurrentUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) return null
  return data as Profile
}

// ── Update Profile ─────────────────────────────────────────
export async function updateProfile(
  updates: Partial<Pick<Profile, 'full_name' | 'phone' | 'bio' | 'avatar_url' | 'city'>>
) {
  const user = await getCurrentUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single()

  if (error) throw error
  return data as Profile
}
