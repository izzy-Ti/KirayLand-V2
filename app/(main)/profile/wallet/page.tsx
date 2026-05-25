'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Wallet, PlusCircle, ArrowDownCircle, ArrowUpRight, ArrowDownLeft,
  History, AlertCircle, ArrowLeft, CheckCircle2, CreditCard,
  TrendingUp, RefreshCw
} from 'lucide-react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import { getSupabaseBrowserClient } from '@/lib/supabase'
import { useLanguage } from '@/lib/context/LanguageContext'

interface VirtualTransaction {
  id: string
  action: 'deposit' | 'withdraw'
  amount_etb: number
  created_at: string
  notes: string
}

export default function WalletPage() {
  const { t, language } = useLanguage()
  const searchParams = useSearchParams()
  const router = useRouter()

  const [profile, setProfile] = React.useState<any>(null)
  const [dbTransactions, setDbTransactions] = React.useState<any[]>([])
  const [localTransactions, setLocalTransactions] = React.useState<VirtualTransaction[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isRefreshing, setIsRefreshing] = React.useState(false)

  // Modals state
  const [isDepositOpen, setIsDepositOpen] = React.useState(false)
  const [isWithdrawOpen, setIsWithdrawOpen] = React.useState(false)
  const [amount, setAmount] = React.useState('')
  const [modalError, setModalError] = React.useState('')
  const [modalLoading, setModalLoading] = React.useState(false)
  const [depositSuccessMsg, setDepositSuccessMsg] = React.useState('')
  const depositConfirmRef = React.useRef<string | null>(null)

  // Load wallet details
  const loadWalletData = async (silent = false) => {
    if (!silent) setIsLoading(true)
    else setIsRefreshing(true)
    
    try {
      const supabase = getSupabaseBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = '/login'
        return
      }

      // 1. Load Profile (balance)
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileData) {
        setProfile({ ...profileData, email: user.email })
      }

      // 2. Load DB transactions (escrow ledger)
      const res = await fetch('/api/wallet/transactions')
      const data = await res.json()
      if (res.ok && data.transactions) {
        setDbTransactions(data.transactions)
      }

      // 3. Load Local Virtual Transactions (Top ups & Withdrawals)
      const stored = localStorage.getItem(`wallet_tx_${user.id}`)
      if (stored) {
        setLocalTransactions(JSON.parse(stored))
      }
    } catch (err) {
      console.error('Failed to load wallet data:', err)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  React.useEffect(() => {
    loadWalletData()
  }, [])

  // Confirm Stripe wallet deposit after checkout (server verifies payment)
  React.useEffect(() => {
    const sessionId = searchParams.get('session_id')
    if (!sessionId || depositConfirmRef.current === sessionId) return

    depositConfirmRef.current = sessionId
    router.replace('/profile/wallet')

    ;(async () => {
      try {
        const res = await fetch('/api/wallet/confirm-deposit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        })
        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.error || 'Failed to confirm deposit')
        }

        await loadWalletData(true)

        if (data.credited && data.amountEtb) {
          setDepositSuccessMsg(
            language === 'am'
              ? `እንኳን ደስ አለዎት! ብር ${Number(data.amountEtb).toLocaleString()} ዋሌትዎ ላይ ተጨምሯል።`
              : `Success! ETB ${Number(data.amountEtb).toLocaleString()} has been added to your wallet after Stripe payment.`
          )
        } else if (data.success) {
          setDepositSuccessMsg(
            language === 'am'
              ? 'የክፍያዎ ማረጋገጫ ተቀብሏል። ቀሪ ሂሳብዎ ተዘምኗል።'
              : 'Your payment was confirmed. Your wallet balance has been updated.'
          )
        }
      } catch (err: any) {
        setDepositSuccessMsg(
          language === 'am'
            ? 'ክፍያው ተቀብሏል። ቀሪ ሂሳብ ለማየት Refresh ይጫኑ።'
            : err.message || 'Payment received. Refresh to see your updated balance.'
        )
        await loadWalletData(true)
      }
    })()
  }, [searchParams, router, language])

  // Handle virtual top-up or withdrawal
  const handleWalletAction = async (action: 'deposit' | 'withdraw') => {
    setModalError('')
    const numAmount = parseFloat(amount)
    
    if (isNaN(numAmount) || numAmount <= 0) {
      setModalError(language === 'am' ? 'እባክዎ ትክክለኛ የብር መጠን ያስገቡ' : 'Please enter a valid positive amount.')
      return
    }

    setModalLoading(true)
    try {
      const res = await fetch('/api/wallet/transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: numAmount, action })
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Transaction failed')
      }

      if (action === 'deposit') {
        if (data.session_url) {
          // Redirect to Stripe checkout screen
          window.location.href = data.session_url
          return
        } else {
          throw new Error('Stripe checkout URL was not returned')
        }
      }

      // Withdraw: Save withdrawal to localStorage to persist logs locally for this user
      const supabase = getSupabaseBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const newTx: VirtualTransaction = {
          id: Math.random().toString(36).substring(2, 11),
          action: 'withdraw',
          amount_etb: numAmount,
          created_at: new Date().toISOString(),
          notes: language === 'am' ? 'ከዋሌት ወጪ ተደርጓል' : 'Virtual Wallet Direct Withdrawal'
        }
        const updatedLocal = [newTx, ...localTransactions]
        localStorage.setItem(`wallet_tx_${user.id}`, JSON.stringify(updatedLocal))
        setLocalTransactions(updatedLocal)
      }

      setAmount('')
      setIsWithdrawOpen(false)
      
      // Reload profile
      await loadWalletData(true)
    } catch (err: any) {
      setModalError(err.message || 'Transaction failed.')
    } finally {
      if (action !== 'deposit') setModalLoading(false)
    }
  }

  // Combine DB escrow transactions and local transaction logs
  const getCombinedTransactions = () => {
    const list: any[] = []
    
    // Process DB transactions
    dbTransactions.forEach(tx => {
      let title = t('wallet.escrowHold')
      let subtitle = tx.rental?.item?.title || 'Rental Item'
      let type: 'debit' | 'credit' = 'debit'
      let icon = ArrowUpRight
      let amount = tx.amount_etb

      const isConsumer = profile && profile.id === tx.rental?.consumer_id

      if (tx.action === 'charge_captured') {
        if (isConsumer) {
          title = t('wallet.escrowHold')
          type = 'debit'
          icon = ArrowUpRight
        } else {
          title = t('wallet.payout')
          subtitle = `${tx.rental?.item?.title} (Escrow Pending)`
          type = 'credit'
          icon = ArrowDownLeft
        }
      } else if (tx.action === 'deposit_held') {
        if (isConsumer) {
          title = t('wallet.escrowHold') + ' (Deposit)'
          type = 'debit'
          icon = ArrowUpRight
        } else {
          title = t('wallet.escrowHold') + ' (Deposit Held)'
          type = 'credit'
          icon = ArrowDownLeft
        }
      } else if (tx.action === 'deposit_released') {
        if (isConsumer) {
          title = t('wallet.refund')
          type = 'credit'
          icon = ArrowDownLeft
        } else {
          title = t('wallet.escrowReleasedText')
          type = 'debit'
          icon = ArrowUpRight
        }
      } else if (tx.action === 'provider_payout_sent') {
        if (isConsumer) {
          title = t('wallet.escrowPayoutText')
          type = 'debit'
          icon = ArrowUpRight
        } else {
          title = t('wallet.payout')
          type = 'credit'
          icon = ArrowDownLeft
        }
      }

      list.push({
        id: tx.id,
        title,
        subtitle,
        amount_etb: amount,
        created_at: tx.created_at,
        type,
        icon,
        isDb: true
      })
    })

    // Process local transactions (direct deposit/withdrawal)
    localTransactions.forEach(tx => {
      list.push({
        id: tx.id,
        title: tx.action === 'deposit' ? t('wallet.topUp') : t('wallet.withdrawal'),
        subtitle: tx.notes,
        amount_etb: tx.amount_etb,
        created_at: tx.created_at,
        type: tx.action === 'deposit' ? 'credit' : 'debit',
        icon: tx.action === 'deposit' ? ArrowDownLeft : ArrowUpRight,
        isDb: false
      })
    })

    // Sort combined list by date desc
    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }

  const combinedTransactions = getCombinedTransactions()

  if (isLoading) return (
    <div className="page-container py-20 text-center">
      <div className="w-8 h-8 border-4 border-brand-black border-t-transparent rounded-full animate-spin mx-auto" />
    </div>
  )

  if (!profile) return null

  return (
    <div className="page-container py-8 max-w-4xl mx-auto">
      <Link href="/profile"
        className="inline-flex items-center gap-1.5 text-sm text-brand-gray500 hover:text-brand-black mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> {t('common.back')} {t('nav.profile')}
      </Link>

      {depositSuccessMsg && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-card flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm font-semibold text-green-800">{depositSuccessMsg}</p>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-brand-black">{t('wallet.title')}</h1>
          <p className="text-sm text-brand-gray500 mt-1">{t('wallet.subtitle')}</p>
        </div>
        <button
          onClick={() => loadWalletData(true)}
          disabled={isRefreshing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-brand-gray100 hover:bg-brand-gray200 text-brand-gray600 rounded-pill transition-colors self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? t('common.loading') : 'Refresh'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left/Top: Wallet Balance Glass Card */}
        <div className="md:col-span-1 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative bg-gradient-to-br from-brand-black via-brand-gray900 to-brand-gray800 text-white rounded-card p-6 shadow-card-xl overflow-hidden aspect-[1.58/1]"
          >
            {/* Background design glow */}
            <div className="absolute right-0 bottom-0 w-32 h-32 bg-brand-gray700/10 blur-3xl rounded-full" />
            <div className="absolute top-0 left-0 w-24 h-24 bg-brand-white/5 blur-2xl rounded-full" />

            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-brand-gray400 font-bold">{t('wallet.balance')}</p>
                <h3 className="text-2xl font-black mt-1 tracking-tight font-mono">
                  ETB {Number(profile.wallet_balance_etb).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </h3>
              </div>
              <div className="w-10 h-10 bg-brand-white/10 rounded-xl flex items-center justify-center border border-brand-white/10">
                <Wallet className="w-5 h-5 text-white" />
              </div>
            </div>

            <div className="mt-8 flex items-end justify-between">
              <div>
                <p className="text-[9px] uppercase tracking-wider text-brand-gray400 font-medium">Cardholder</p>
                <p className="text-xs font-semibold tracking-wide text-brand-gray100 mt-0.5">{profile.full_name}</p>
              </div>
              <div className="text-right">
                <span className="inline-block px-2 py-0.5 bg-brand-white/10 rounded-pill text-[9px] font-bold text-white tracking-widest uppercase">
                  ኪራይLand
                </span>
              </div>
            </div>
          </motion.div>

          {/* Quick Actions */}
          <div className="card p-5 space-y-3 shadow-card">
            <h4 className="font-bold text-sm text-brand-black flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-brand-gray500" /> Actions
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="primary"
                onClick={() => {
                  setAmount('')
                  setModalError('')
                  setIsDepositOpen(true)
                }}
                className="w-full justify-center flex items-center gap-1 text-sm py-2.5"
              >
                <PlusCircle className="w-4 h-4" /> {t('wallet.addFunds')}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setAmount('')
                  setModalError('')
                  setIsWithdrawOpen(true)
                }}
                className="w-full justify-center flex items-center gap-1 text-sm py-2.5"
              >
                <ArrowDownCircle className="w-4 h-4" /> {t('wallet.withdraw')}
              </Button>
            </div>
          </div>
        </div>

        {/* Right/Bottom: Transaction History */}
        <div className="md:col-span-2">
          <div className="card p-6 shadow-card space-y-4">
            <h3 className="text-lg font-bold text-brand-black flex items-center gap-2">
              <History className="w-5 h-5 text-brand-gray500" /> {t('wallet.history')}
            </h3>

            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
              {combinedTransactions.length === 0 ? (
                <div className="text-center py-12 text-brand-gray400 space-y-2">
                  <AlertCircle className="w-8 h-8 mx-auto stroke-1" />
                  <p className="text-sm">{t('wallet.noTransactions')}</p>
                </div>
              ) : (
                combinedTransactions.map(tx => (
                  <motion.div
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={tx.id}
                    className="flex items-center justify-between p-3.5 bg-brand-gray50 hover:bg-brand-gray100/70 border border-brand-gray100 rounded-xl transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                        tx.type === 'credit'
                          ? 'bg-green-50 text-green-600 group-hover:bg-green-100'
                          : 'bg-brand-gray100 text-brand-gray600 group-hover:bg-brand-gray200'
                      }`}>
                        <tx.icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-brand-black">{tx.title}</p>
                        <p className="text-xs text-brand-gray500 mt-0.5 max-w-[250px] md:max-w-[350px] truncate">
                          {tx.subtitle}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-extrabold font-mono ${
                        tx.type === 'credit' ? 'text-green-600' : 'text-brand-black'
                      }`}>
                        {tx.type === 'credit' ? '+' : '-'} ETB {tx.amount_etb.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-[10px] text-brand-gray400 mt-0.5">
                        {new Date(tx.created_at).toLocaleDateString(language === 'am' ? 'am-ET' : 'en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Deposit Modal */}
      <Modal
        isOpen={isDepositOpen}
        onClose={() => setIsDepositOpen(false)}
        title={t('wallet.depositModalTitle')}
      >
        <div className="space-y-4">
          <p className="text-sm text-brand-gray500">{t('wallet.depositModalDesc')}</p>
          <Input
            label={t('wallet.amountLabel')}
            placeholder={t('wallet.amountPlaceholder')}
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            disabled={modalLoading}
            autoFocus
          />

          {modalError && (
            <div className="p-3 bg-red-50 text-danger text-xs font-semibold rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{modalError}</span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              className="flex-1 justify-center py-2.5"
              onClick={() => setIsDepositOpen(false)}
              disabled={modalLoading}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              className="flex-1 justify-center py-2.5"
              onClick={() => handleWalletAction('deposit')}
              isLoading={modalLoading}
            >
              {t('wallet.confirmAdd')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Withdraw Modal */}
      <Modal
        isOpen={isWithdrawOpen}
        onClose={() => setIsWithdrawOpen(false)}
        title={t('wallet.withdrawModalTitle')}
      >
        <div className="space-y-4">
          <p className="text-sm text-brand-gray500">{t('wallet.withdrawModalDesc')}</p>
          <Input
            label={t('wallet.amountLabel')}
            placeholder={t('wallet.amountPlaceholder')}
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            disabled={modalLoading}
            autoFocus
          />

          {modalError && (
            <div className="p-3 bg-red-50 text-danger text-xs font-semibold rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{modalError}</span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              className="flex-1 justify-center py-2.5"
              onClick={() => setIsWithdrawOpen(false)}
              disabled={modalLoading}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              className="flex-1 justify-center py-2.5"
              onClick={() => handleWalletAction('withdraw')}
              isLoading={modalLoading}
            >
              {t('wallet.confirmWithdraw')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
