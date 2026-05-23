'use client'

import React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Mail, ArrowRight, ArrowLeft } from 'lucide-react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

export default function ResetPasswordPage() {
  const [email, setEmail] = React.useState('')
  const [newPassword, setNewPassword] = React.useState('')
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState('')
  const [sent, setSent] = React.useState(false)
  const [isResetMode, setIsResetMode] = React.useState(false)

  // Check for token in URL (redirect from email)
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash
      if (hash.includes('type=recovery')) {
        setIsResetMode(true)
      }
    }
  }, [])

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      const { requestPasswordReset } = await import('@/lib/auth/supabase-auth')
      await requestPasswordReset(email)
      setSent(true)
    } catch (err: any) {
      setError(err?.message || 'Failed to send reset email')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    setIsLoading(true)
    try {
      const { updatePassword } = await import('@/lib/auth/supabase-auth')
      await updatePassword(newPassword)
      window.location.href = '/login?reset=success'
    } catch (err: any) {
      setError(err?.message || 'Failed to update password')
    } finally {
      setIsLoading(false)
    }
  }

  if (isResetMode) {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-2xl font-bold tracking-tight">Set new password</h2>
        <p className="text-sm text-brand-gray500 mt-1">Enter your new password below</p>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-input text-sm text-red-700">{error}</div>
        )}

        <form onSubmit={handleUpdatePassword} className="mt-6 space-y-4">
          <Input label="New Password" type="password" placeholder="Min. 8 characters"
            value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
          <Button type="submit" className="w-full" isLoading={isLoading}>
            Update Password <ArrowRight className="w-4 h-4" />
          </Button>
        </form>
      </motion.div>
    )
  }

  if (sent) {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <Mail className="w-7 h-7 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold">Check your email</h2>
        <p className="text-sm text-brand-gray500 mt-2 max-w-sm mx-auto">
          We sent a password reset link to <strong className="text-brand-black">{email}</strong>.
        </p>
        <Link href="/login" className="btn-secondary inline-flex mt-6">
          <ArrowLeft className="w-4 h-4" /> Back to Login
        </Link>
      </motion.div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <Link href="/login"
        className="inline-flex items-center gap-1 text-sm text-brand-gray500 hover:text-brand-black mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to login
      </Link>

      <h2 className="text-2xl font-bold tracking-tight">Reset password</h2>
      <p className="text-sm text-brand-gray500 mt-1">
        Enter your email and we&apos;ll send a reset link
      </p>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-input text-sm text-red-700">{error}</div>
      )}

      <form onSubmit={handleRequestReset} className="mt-6 space-y-4">
        <Input label="Email" type="email" placeholder="you@example.com"
          value={email} onChange={e => setEmail(e.target.value)}
          icon={<Mail className="w-4 h-4" />} required />
        <Button type="submit" className="w-full" isLoading={isLoading}>
          Send Reset Link <ArrowRight className="w-4 h-4" />
        </Button>
      </form>
    </motion.div>
  )
}
