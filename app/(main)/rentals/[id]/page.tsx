'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Package, MessageSquare, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import EscrowTimeline from '@/components/escrow/EscrowTimeline'
import HandshakeVerifier from '@/components/escrow/HandshakeVerifier'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import type { RentalStatus } from '@/types/database'
import { getSupabaseBrowserClient } from '@/lib/supabase'

export default function RentalDetailPage({ params }: { params: { id: string } }) {
  const [rental, setRental] = React.useState<any>(null)
  const [isProvider, setIsProvider] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isCompletingPayment, setIsCompletingPayment] = React.useState(false)
  const [walletBalance, setWalletBalance] = React.useState<number | null>(null)
  const [isWalletPaying, setIsWalletPaying] = React.useState(false)

  React.useEffect(() => {
    async function loadData() {
      const supabase = getSupabaseBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()

      const { data, error } = await supabase
        .from('rentals')
        .select('*, item:item_id(title, cover_image_url), provider:provider_id(full_name), consumer:consumer_id(full_name)')
        .eq('id', params.id)
        .single()

      if (error || !data) {
        window.location.href = '/not-found'
        return
      }

      setRental(data)
      setIsProvider(user?.id === data.provider_id)

      // Load user wallet balance if the user is the consumer and the rental is pending
      if (user && user.id === data.consumer_id && data.status === 'pending') {
        const { data: profile } = await supabase
          .from('profiles')
          .select('wallet_balance_etb')
          .eq('id', user.id)
          .single()
        if (profile) {
          setWalletBalance(Number(profile.wallet_balance_etb || 0))
        }
      }

      setIsLoading(false)
    }
    loadData()
  }, [params.id])

  const reloadData = async () => {
    const supabase = getSupabaseBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('rentals')
      .select('*, item:item_id(title, cover_image_url), provider:provider_id(full_name), consumer:consumer_id(full_name)')
      .eq('id', params.id)
      .single()

    if (!error && data) {
      setRental(data)
      setIsProvider(user?.id === data.provider_id)

      if (user && user.id === data.consumer_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('wallet_balance_etb')
          .eq('id', user.id)
          .single()
        if (profile) {
          setWalletBalance(Number(profile.wallet_balance_etb || 0))
        }
      }
    }
  }

  const handleCheckinVerify = async (code: string) => {
    try {
      const response = await fetch('/api/rentals/verify-handshake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rentalId: rental.id, code, type: 'checkin' }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify check-in')
      }

      const payoutMsg = data.providerPayout
        ? ` Provider has been credited ETB ${Number(data.providerPayout).toLocaleString('en-US', { minimumFractionDigits: 2 })}.`
        : ''
      alert(`Item receipt confirmed!${payoutMsg}`)
      await reloadData()
    } catch (err: any) {
      alert('Failed to verify check-in: ' + err.message)
    }
  }

  const handleCheckoutVerify = async (code: string) => {
    try {
      const response = await fetch('/api/rentals/verify-handshake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rentalId: rental.id, code, type: 'checkout' }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify check-out')
      }

      alert('Return verified! Waiting for provider to confirm and release the security deposit.')
      await reloadData()
    } catch (err: any) {
      alert('Failed to verify check-out: ' + err.message)
    }
  }

  const handleConfirmReturn = async () => {
    if (!window.confirm("Are you sure you want to confirm the safe return of the item and release escrow funds?")) return
    setIsCompletingPayment(true)
    try {
      const response = await fetch('/api/wallet/release-escrow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rentalId: rental.id })
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to release escrow')
      }

      alert('Return confirmed! Escrow funds have been successfully released and security deposit refunded.')
      await reloadData()
    } catch (err: any) {
      alert('Failed to confirm return: ' + err.message)
    } finally {
      setIsCompletingPayment(false)
    }
  }

  const handleWalletPayment = async () => {
    const totalRequired = Number(rental.total_price_etb || 0) + Number(rental.security_deposit_etb || 0)

    if (walletBalance === null || walletBalance < totalRequired) {
      alert('Insufficient wallet balance to pay for this rental.')
      return
    }

    if (!window.confirm(`Are you sure you want to pay ETB ${totalRequired.toLocaleString('en-US', { minimumFractionDigits: 2 })} for this rental using your virtual wallet balance?`)) {
      return
    }

    setIsWalletPaying(true)
    try {
      const response = await fetch('/api/wallet/pay-rental', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rentalId: rental.id })
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to pay with wallet')
      }

      alert('Payment successful! Rental status updated to Escrow.')
      await reloadData()
    } catch (err: any) {
      alert('Failed to pay with wallet: ' + err.message)
    } finally {
      setIsWalletPaying(false)
    }
  }

  const handleOpenDispute = async () => {
    const reason = window.prompt("Please enter the reason for opening this dispute:")
    if (!reason || !reason.trim()) return

    try {
      const supabase = getSupabaseBrowserClient()
      const { error } = await supabase
        .from('rentals')
        .update({
          status: 'disputed',
          dispute_reason: reason.trim(),
          dispute_opened_at: new Date().toISOString()
        })
        .eq('id', rental.id)

      if (error) throw error
      await reloadData()
    } catch (err: any) {
      alert('Failed to open dispute: ' + err.message)
    }
  }

  const handleCompletePayment = async () => {
    setIsCompletingPayment(true)
    try {
      const response = await fetch('/api/checkout/resume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rentalId: rental.id }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to resume payment')
      }

      if (data.session_url) {
        window.location.href = data.session_url
      } else {
        throw new Error('Checkout URL was not returned')
      }
    } catch (err: any) {
      console.error(err)
      alert('Failed to complete payment: ' + err.message)
    } finally {
      setIsCompletingPayment(false)
    }
  }

  const statusBadge = {
    pending: { variant: 'warning' as const, label: 'Pending Payment' },
    active_escrow: { variant: 'info' as const, label: 'Funds Escrowed' },
    item_delivered: { variant: 'info' as const, label: 'Item Delivered' },
    returned_pending_review: { variant: 'warning' as const, label: 'Return Pending' },
    completed: { variant: 'success' as const, label: 'Completed' },
    disputed: { variant: 'danger' as const, label: 'Disputed' },
    cancelled: { variant: 'neutral' as const, label: 'Cancelled' },
  }

  const badge = statusBadge[rental?.status as RentalStatus] || { variant: 'neutral', label: 'Unknown' }

  if (isLoading) return <div className="page-container py-20 text-center"><div className="w-8 h-8 border-4 border-brand-black border-t-transparent rounded-full animate-spin mx-auto"></div></div>
  if (!rental) return null

  return (
    <div className="page-container py-6">
      <Link href="/rentals"
        className="inline-flex items-center gap-1 text-sm text-brand-gray500 hover:text-brand-black mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> My Rentals
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Escrow Timeline */}
        <div className="lg:col-span-2 space-y-6">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            {/* Rental header */}
            <div className="card p-6">
              <div className="flex items-center gap-4">
                <div className="w-20 h-15 bg-brand-gray100 rounded-lg overflow-hidden flex-shrink-0">
                  <img src={rental.item.cover_image_url} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-lg font-bold truncate">{rental.item.title}</h1>
                  <div className="flex items-center gap-3 mt-1 text-sm text-brand-gray500">
                    <span>{rental.start_date} → {rental.end_date}</span>
                    <Badge variant={badge.variant} dot>{badge.label}</Badge>
                  </div>
                </div>
                <Link href={`/messages/${rental.id}`}>
                  <Button variant="secondary" size="sm">
                    <MessageSquare className="w-4 h-4" /> Chat
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>

          {/* Escrow Timeline */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="card p-6">
            <EscrowTimeline
              currentStatus={rental.status}
              rentalId={rental.id}
              totalPriceEtb={rental.total_price_etb}
              totalPriceUsd={rental.total_price_usd}
              depositEtb={rental.security_deposit_etb}
              depositUsd={rental.security_deposit_usd}
              platformFeeUsd={rental.platform_fee_usd}
              providerPayoutUsd={rental.provider_payout_usd}
              checkinVerifiedAt={rental.checkin_verified_at}
              checkoutVerifiedAt={rental.checkout_verified_at}
              disputeReason={rental.dispute_reason}
            />
          </motion.div>

          {/* Handshake Verification */}
          {(rental.status === 'active_escrow' || rental.status === 'item_delivered') && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="space-y-4">
              <h3 className="text-lg font-semibold">Verification</h3>

              {rental.status === 'active_escrow' && (
                <HandshakeVerifier
                  code={rental.checkin_code}
                  type="checkin"
                  isVerified={!!rental.checkin_verified_at}
                  verifiedAt={rental.checkin_verified_at}
                  isProvider={isProvider}
                  onVerify={handleCheckinVerify}
                />
              )}

              {rental.status === 'item_delivered' && (
                <HandshakeVerifier
                  code={rental.checkout_code}
                  type="checkout"
                  isVerified={!!rental.checkout_verified_at}
                  verifiedAt={rental.checkout_verified_at}
                  isProvider={isProvider}
                  onVerify={handleCheckoutVerify}
                />
              )}
            </motion.div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-20 space-y-4">
            {/* Actions */}
            <div className="card p-5 space-y-3">
              <h4 className="font-semibold text-sm">Actions</h4>

              {rental.status === 'pending' && !isProvider && (
                <div className="space-y-3">
                  <Button
                    className="w-full py-2.5 justify-center text-sm font-semibold"
                    variant="primary"
                    onClick={handleWalletPayment}
                    isLoading={isWalletPaying}
                    disabled={walletBalance !== null && walletBalance < (Number(rental.total_price_etb) + Number(rental.security_deposit_etb))}
                  >
                    Pay with Virtual Wallet
                  </Button>

                  {walletBalance !== null && (
                    <div className="text-center p-2.5 bg-brand-gray50 rounded-lg border border-brand-gray200 text-xs">
                      <p className="text-brand-gray500">Your Wallet Balance: <span className="font-mono font-bold text-brand-black">ETB {walletBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></p>
                      {walletBalance < (Number(rental.total_price_etb) + Number(rental.security_deposit_etb)) ? (
                        <p className="text-danger font-semibold mt-1 flex items-center justify-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Insufficient balance. <Link href="/profile/wallet" className="underline text-blue-600 hover:text-blue-800">Top Up Wallet</Link>
                        </p>
                      ) : (
                        <p className="text-green-600 font-semibold mt-1">✓ Balance is sufficient</p>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-center gap-2 py-1">
                    <span className="h-px bg-brand-gray200 flex-1"></span>
                    <span className="text-[10px] uppercase font-bold text-brand-gray400 tracking-wider">or</span>
                    <span className="h-px bg-brand-gray200 flex-1"></span>
                  </div>

                  <Button className="w-full justify-center text-xs text-brand-gray600 hover:text-brand-black" variant="secondary" onClick={handleCompletePayment} isLoading={isCompletingPayment}>
                    Complete Payment (Pay with Stripe)
                  </Button>
                </div>
              )}

              {rental.status === 'returned_pending_review' && isProvider && (
                <Button className="w-full" variant="primary" onClick={handleConfirmReturn}>
                  Confirm Return & Release Funds
                </Button>
              )}

              {rental.status !== 'completed' && rental.status !== 'cancelled' && rental.status !== 'disputed' && (
                <Button className="w-full" variant="danger" onClick={handleOpenDispute}>
                  <AlertTriangle className="w-4 h-4" /> Open Dispute
                </Button>
              )}

              <Link href={`/messages/${rental.id}`}>
                <Button className="w-full" variant="secondary">
                  <MessageSquare className="w-4 h-4" /> Message {isProvider ? 'Consumer' : 'Provider'}
                </Button>
              </Link>
            </div>

            {/* Parties */}
            <div className="card p-5">
              <h4 className="font-semibold text-sm mb-3">Parties</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-brand-gray500">Provider</span>
                  <span className="font-medium">{rental.provider.full_name}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-brand-gray500">Consumer</span>
                  <span className="font-medium">{rental.consumer.full_name}</span>
                </div>
              </div>
            </div>

            {/* Rental Info */}
            <div className="card p-5">
              <h4 className="font-semibold text-sm mb-3">Rental Details</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-brand-gray500">Rental ID</span>
                  <span className="font-mono text-xs">{rental.id}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
