'use client'

import React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, User, ArrowRight } from 'lucide-react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { useLanguage } from '@/lib/context/LanguageContext'

export default function RegisterPage() {
  const { t } = useLanguage()
  const [fullName, setFullName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [confirmPassword, setConfirmPassword] = React.useState('')
  const [showPassword, setShowPassword] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = React.useState(false)
  const [error, setError] = React.useState('')

  const passwordStrength = React.useMemo(() => {
    if (!password) return { level: 0, label: '' }
    let score = 0
    if (password.length >= 8) score++
    if (/[A-Z]/.test(password)) score++
    if (/[0-9]/.test(password)) score++
    if (/[^A-Za-z0-9]/.test(password)) score++
    const labels = ['', 'Weak', 'Fair', 'Good', 'Strong']
    return { level: score, label: labels[score] }
  }, [password])

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError(t('auth.passwordMismatch'))
      return
    }
    if (password.length < 8) {
      setError(t('auth.passwordMinChar'))
      return
    }

    setIsLoading(true)
    try {
      const { signUpWithEmail } = await import('@/lib/auth/supabase-auth')
      await signUpWithEmail(email, password, fullName)
      // Redirect to the dynamic 6-digit OTP verification page
      window.location.href = `/verify?email=${encodeURIComponent(email)}&type=signup`
    } catch (err: any) {
      setError(err?.message || 'Registration failed')
      setIsLoading(false)
    }
  }

  const handleGoogleSignUp = async () => {
    setIsGoogleLoading(true)
    try {
      const { signInWithGoogle } = await import('@/lib/auth/supabase-auth')
      await signInWithGoogle()
    } catch (err: any) {
      setError(err?.message || 'Google sign-up failed')
      setIsGoogleLoading(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div className="lg:hidden flex items-center gap-2 mb-8">
        <div className="w-10 h-10 bg-brand-black rounded-xl flex items-center justify-center">
          <span className="text-white font-bold text-lg">ኪ</span>
        </div>
        <span className="font-bold text-xl tracking-tight">ኪራይLand</span>
      </div>

      <h2 className="text-2xl font-bold tracking-tight">{t('auth.signUpTitle')}</h2>
      <p className="text-sm text-brand-gray500 mt-1">{t('auth.signUpSubtitle')}</p>

      {error && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
          className="mt-4 p-3 bg-red-50 border border-red-200 rounded-input text-sm text-red-700">
          {error}
        </motion.div>
      )}

      <div className="mt-6">
        <Button variant="secondary" className="w-full" onClick={handleGoogleSignUp}
          isLoading={isGoogleLoading} disabled={isLoading}>
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          {t('auth.googleAuth')}
        </Button>
      </div>

      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 h-px bg-brand-gray200" />
        <span className="text-xs text-brand-gray400 font-medium">{t('auth.or')}</span>
        <div className="flex-1 h-px bg-brand-gray200" />
      </div>

      <form onSubmit={handleRegister} className="space-y-4">
        <Input label={t('auth.fullName')} type="text" placeholder="John Doe" value={fullName}
          onChange={e => setFullName(e.target.value)} icon={<User className="w-4 h-4" />} required />

        <Input label={t('auth.email')} type="email" placeholder="you@example.com" value={email}
          onChange={e => setEmail(e.target.value)} icon={<Mail className="w-4 h-4" />} required />

        <div className="relative">
          <Input label={t('auth.password')} type={showPassword ? 'text' : 'password'} placeholder={t('auth.passwordMinChar')}
            value={password} onChange={e => setPassword(e.target.value)}
            icon={<Lock className="w-4 h-4" />} required />
          <button type="button" onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-[38px] text-brand-gray400 hover:text-brand-black transition-colors">
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
          {/* Password strength indicator */}
          {password && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 flex gap-1">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                    i <= passwordStrength.level
                      ? passwordStrength.level <= 1 ? 'bg-red-400'
                        : passwordStrength.level <= 2 ? 'bg-amber-400'
                        : passwordStrength.level <= 3 ? 'bg-blue-400'
                        : 'bg-green-400'
                      : 'bg-brand-gray200'
                  }`} />
                ))}
              </div>
              <span className={`text-xs font-medium ${
                passwordStrength.level <= 1 ? 'text-red-500'
                : passwordStrength.level <= 2 ? 'text-amber-500'
                : passwordStrength.level <= 3 ? 'text-blue-500'
                : 'text-green-500'
              }`}>
                {passwordStrength.label}
              </span>
            </div>
          )}
        </div>

        <Input label={t('auth.confirmPassword')} type="password" placeholder="Re-enter password"
          value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
          icon={<Lock className="w-4 h-4" />}
          error={confirmPassword && password !== confirmPassword ? t('auth.passwordMismatch') : undefined}
          required />

        <div className="pt-1">
          <label className="flex items-start gap-2 cursor-pointer">
            <input type="checkbox" required
              className="w-4 h-4 mt-0.5 rounded border-brand-gray300 text-brand-black focus:ring-brand-black" />
            <span className="text-xs text-brand-gray500">
              {t('auth.agreeTerms')}
            </span>
          </label>
        </div>

        <Button type="submit" className="w-full" isLoading={isLoading} disabled={isGoogleLoading}>
          {t('auth.registerBtn')} <ArrowRight className="w-4 h-4" />
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-brand-gray500">
        {t('auth.alreadyHaveAccount')}{' '}
        <Link href="/login" className="font-semibold text-brand-black hover:text-brand-gray600 transition-colors">
          {t('nav.logIn')}
        </Link>
      </p>
    </motion.div>
  )
}
