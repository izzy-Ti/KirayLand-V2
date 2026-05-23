'use client'

import React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Mail, ArrowRight, ArrowLeft } from 'lucide-react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { useLanguage } from '@/lib/context/LanguageContext'

export default function ResetPasswordPage() {
  const { t } = useLanguage()
  const [email, setEmail] = React.useState('')
  const [newPassword, setNewPassword] = React.useState('')
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState('')
  const [isResetMode, setIsResetMode] = React.useState(false)

  // Check for recovery token or OTP-verified redirection
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash
      const searchParams = new URLSearchParams(window.location.search)
      if (hash.includes('type=recovery') || searchParams.get('verified') === 'true') {
        setIsResetMode(true)
      }
      
      const emailParam = searchParams.get('email')
      if (emailParam) {
        setEmail(emailParam)
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
      
      // Redirect to code verification page
      window.location.href = `/verify?email=${encodeURIComponent(email)}&type=recovery`
    } catch (err: any) {
      setError(err?.message || t('resetPassword.checkEmailSubtitle'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (newPassword.length < 8) {
      setError(t('auth.passwordMinChar'))
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
        <h2 className="text-2xl font-bold tracking-tight">{t('resetPassword.setTitle')}</h2>
        <p className="text-sm text-brand-gray500 mt-1">{t('resetPassword.setSubtitle')}</p>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-input text-sm text-red-700">{error}</div>
        )}

        <form onSubmit={handleUpdatePassword} className="mt-6 space-y-4">
          <Input label={t('resetPassword.newPasswordLabel')} type="password" placeholder={t('auth.passwordMinChar')}
            value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
          <Button type="submit" className="w-full" isLoading={isLoading}>
            {t('resetPassword.updateBtn')} <ArrowRight className="w-4 h-4" />
          </Button>
        </form>
      </motion.div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <Link href="/login"
        className="inline-flex items-center gap-1 text-sm text-brand-gray500 hover:text-brand-black mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> {t('common.back')}
      </Link>

      <h2 className="text-2xl font-bold tracking-tight">{t('resetPassword.requestTitle')}</h2>
      <p className="text-sm text-brand-gray500 mt-1">
        {t('resetPassword.requestSubtitle')}
      </p>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-input text-sm text-red-700">{error}</div>
      )}

      <form onSubmit={handleRequestReset} className="mt-6 space-y-4">
        <Input label={t('auth.email')} type="email" placeholder="you@example.com"
          value={email} onChange={e => setEmail(e.target.value)}
          icon={<Mail className="w-4 h-4" />} required />
        <Button type="submit" className="w-full" isLoading={isLoading}>
          {t('resetPassword.sendBtn')} <ArrowRight className="w-4 h-4" />
        </Button>
      </form>
    </motion.div>
  )
}
