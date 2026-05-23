'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { QrCode, Copy, Check, ShieldAlert } from 'lucide-react'
import Button from '@/components/ui/Button'

interface HandshakeVerifierProps {
  code: string
  type: 'checkin' | 'checkout'
  isVerified: boolean
  verifiedAt?: string | null
  onVerify?: (inputCode: string) => void
  isProvider: boolean
}

export default function HandshakeVerifier({
  code,
  type,
  isVerified,
  verifiedAt,
  onVerify,
  isProvider,
}: HandshakeVerifierProps) {
  const [inputCode, setInputCode] = React.useState('')
  const [copied, setCopied] = React.useState(false)
  const [error, setError] = React.useState('')

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleVerify = () => {
    if (inputCode.toUpperCase() === code.toUpperCase()) {
      setError('')
      onVerify?.(inputCode)
    } else {
      setError('Code does not match. Please try again.')
    }
  }

  const label = type === 'checkin' ? 'Check-In' : 'Check-Out'

  if (isVerified) {
    return (
      <div className="p-4 bg-green-50 border border-green-200 rounded-card">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
            <Check className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-green-800">{label} Verified</p>
            {verifiedAt && (
              <p className="text-xs text-green-600">{new Date(verifiedAt).toLocaleString()}</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-5 border border-brand-gray200 rounded-card">
      <div className="flex items-center gap-2 mb-4">
        <ShieldAlert className="w-5 h-5 text-brand-gray500" />
        <h4 className="font-semibold text-sm">{label} Handshake</h4>
      </div>

      {isProvider ? (
        /* Provider sees the code to show consumer */
        <div>
          <p className="text-xs text-brand-gray500 mb-3">
            Show this code to the {type === 'checkin' ? 'consumer' : 'provider'} to verify the handoff
          </p>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-brand-gray50 border border-brand-gray200 rounded-input px-4 py-3
              text-center text-2xl font-mono font-bold tracking-[0.3em] select-all">
              {code}
            </div>
            <button onClick={handleCopy}
              className="p-3 border border-brand-gray200 rounded-input hover:bg-brand-gray50 transition-all">
              {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5 text-brand-gray500" />}
            </button>
          </div>
        </div>
      ) : (
        /* Consumer enters the code */
        <div>
          <p className="text-xs text-brand-gray500 mb-3">
            Enter the 6-character code shown by the {type === 'checkin' ? 'provider' : 'consumer'}
          </p>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={inputCode}
              onChange={e => setInputCode(e.target.value.toUpperCase())}
              maxLength={6}
              placeholder="XXXXXX"
              className="flex-1 input-base text-center text-xl font-mono tracking-[0.3em] uppercase"
            />
            <Button onClick={handleVerify} disabled={inputCode.length !== 6}>
              Verify
            </Button>
          </div>
          {error && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="text-xs text-danger mt-2">{error}</motion.p>
          )}
        </div>
      )}
    </div>
  )
}
