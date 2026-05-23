'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { ShieldCheck, ArrowRight } from 'lucide-react'
import Button from '@/components/ui/Button'

export default function VerifyPage() {
  const [code, setCode] = React.useState(['', '', '', '', '', ''])
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState('')
  const inputRefs = React.useRef<(HTMLInputElement | null)[]>([])

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1)
    if (!/^[0-9]*$/.test(value)) return

    const newCode = [...code]
    newCode[index] = value
    setCode(newCode)

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    const newCode = [...code]
    for (let i = 0; i < pasted.length; i++) {
      newCode[i] = pasted[i]
    }
    setCode(newCode)
    inputRefs.current[Math.min(pasted.length, 5)]?.focus()
  }

  const handleVerify = async () => {
    const fullCode = code.join('')
    if (fullCode.length !== 6) {
      setError('Please enter the full 6-digit code')
      return
    }
    setError('')
    setIsLoading(true)
    try {
      // Get email from URL params or session
      const params = new URLSearchParams(window.location.search)
      const email = params.get('email') || ''
      const { verifyOtp } = await import('@/lib/auth/supabase-auth')
      await verifyOtp(email, fullCode)
      window.location.href = '/?verified=true'
    } catch (err: any) {
      setError(err?.message || 'Invalid verification code')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center">
      <div className="w-16 h-16 bg-brand-gray100 rounded-full flex items-center justify-center mx-auto mb-6">
        <ShieldCheck className="w-7 h-7 text-brand-black" />
      </div>

      <h2 className="text-2xl font-bold tracking-tight">Verify your email</h2>
      <p className="text-sm text-brand-gray500 mt-1 max-w-sm mx-auto">
        Enter the 6-digit code we sent to your email address
      </p>

      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="mt-4 p-3 bg-red-50 border border-red-200 rounded-input text-sm text-red-700">
          {error}
        </motion.div>
      )}

      {/* OTP Code Input */}
      <div className="flex justify-center gap-3 mt-8" onPaste={handlePaste}>
        {code.map((digit, index) => (
          <motion.input
            key={index}
            ref={el => { inputRefs.current[index] = el }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={e => handleChange(index, e.target.value)}
            onKeyDown={e => handleKeyDown(index, e)}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`w-12 h-14 text-center text-xl font-bold border-2 rounded-input
              bg-brand-gray50 focus:bg-white
              transition-all duration-200
              focus:outline-none focus:border-brand-black focus:ring-2 focus:ring-brand-black/10
              ${digit ? 'border-brand-black' : 'border-brand-gray200'}
            `}
          />
        ))}
      </div>

      <div className="mt-8">
        <Button onClick={handleVerify} className="w-full max-w-xs mx-auto" isLoading={isLoading}>
          Verify Email <ArrowRight className="w-4 h-4" />
        </Button>
      </div>

      <p className="mt-4 text-xs text-brand-gray400">
        Didn&apos;t receive the code?{' '}
        <button className="text-brand-black font-medium hover:underline">Resend</button>
      </p>
    </motion.div>
  )
}
