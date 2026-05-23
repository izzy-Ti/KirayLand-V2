'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Package, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import Badge from '@/components/ui/Badge'
import { getSupabaseBrowserClient } from '@/lib/supabase'
import type { RentalStatus } from '@/types/database'
import { useLanguage } from '@/lib/context/LanguageContext'

interface RentalRow {
  id: string
  status: RentalStatus
  start_date: string
  end_date: string
  total_price_etb: number
  provider_id: string
  consumer_id: string
  item: { title: string; cover_image_url: string | null } | null
  provider: { full_name: string } | null
  consumer: { full_name: string } | null
}

export default function RentalsPage() {
  const { t } = useLanguage()
  const [rentals, setRentals] = React.useState<RentalRow[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [tab, setTab] = React.useState<'all' | 'as_consumer' | 'as_provider'>('all')
  const [userId, setUserId] = React.useState<string | null>(null)

  // Build STATUS_BADGE dynamically so labels are translated
  const STATUS_BADGE: Record<RentalStatus, { variant: 'warning' | 'info' | 'success' | 'danger' | 'neutral'; label: string }> = {
    pending:                 { variant: 'warning', label: t('rentals.statusPending') },
    active_escrow:           { variant: 'info',    label: t('rentals.statusEscrow') },
    item_delivered:          { variant: 'info',    label: t('rentals.statusDelivered') },
    returned_pending_review: { variant: 'warning', label: t('rentals.statusReturnPending') },
    completed:               { variant: 'success', label: t('rentals.statusCompleted') },
    disputed:                { variant: 'danger',  label: t('rentals.statusDisputed') },
    cancelled:               { variant: 'neutral', label: t('rentals.statusCancelled') },
  }

  React.useEffect(() => {
    async function loadRentals() {
      const supabase = getSupabaseBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = '/login'
        return
      }
      setUserId(user.id)

      const { data } = await supabase
        .from('rentals')
        .select(`
          id, status, start_date, end_date, total_price_etb, provider_id, consumer_id,
          item:item_id ( title, cover_image_url ),
          provider:provider_id ( full_name ),
          consumer:consumer_id ( full_name )
        `)
        .or(`provider_id.eq.${user.id},consumer_id.eq.${user.id}`)
        .order('created_at', { ascending: false })

      const formatted: RentalRow[] = (data ?? []).map((r: any) => {
        const itemSingle = Array.isArray(r.item) ? r.item[0] : r.item
        const providerSingle = Array.isArray(r.provider) ? r.provider[0] : r.provider
        const consumerSingle = Array.isArray(r.consumer) ? r.consumer[0] : r.consumer
        return {
          id: r.id,
          status: r.status,
          start_date: r.start_date,
          end_date: r.end_date,
          total_price_etb: r.total_price_etb,
          provider_id: r.provider_id,
          consumer_id: r.consumer_id,
          item: itemSingle || null,
          provider: providerSingle || null,
          consumer: consumerSingle || null,
        }
      })
      setRentals(formatted)
      setIsLoading(false)
    }
    loadRentals()
  }, [])

  const filtered = React.useMemo(() => {
    if (tab === 'all') return rentals
    if (tab === 'as_consumer') return rentals.filter(r => r.consumer_id === userId)
    if (tab === 'as_provider') return rentals.filter(r => r.provider_id === userId)
    return rentals
  }, [rentals, tab, userId])

  if (isLoading) {
    return (
      <div className="page-container py-20 text-center">
        <div className="w-8 h-8 border-4 border-brand-black border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-brand-gray500 mt-4">{t('rentals.loading')}</p>
      </div>
    )
  }

  return (
    <div className="page-container py-8 max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold tracking-tight">{t('rentals.title')}</h1>
        <p className="text-sm text-brand-gray500 mt-1">{t('rentals.subtitle')}</p>
      </motion.div>

      {rentals.length > 0 && (
        <div className="flex border-b border-brand-gray200 mt-6">
          {[
            { key: 'all',         label: t('rentals.allRentals') },
            { key: 'as_consumer', label: t('rentals.rentedByMe') },
            { key: 'as_provider', label: t('rentals.myItemsRented') },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key as any)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px ${
                tab === key
                  ? 'border-brand-black text-brand-black font-semibold'
                  : 'border-transparent text-brand-gray500 hover:text-brand-black'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          className="mt-12 text-center py-10 bg-brand-gray50 border border-brand-gray200 rounded-card">
          <Package className="w-12 h-12 text-brand-gray300 mx-auto mb-3" />
          <h3 className="font-semibold text-brand-gray600">{t('rentals.noRentalsFound')}</h3>
          <p className="text-sm text-brand-gray400 mt-1 mb-4">
            {tab === 'all'
              ? t('rentals.browseItemsMsg')
              : tab === 'as_consumer'
              ? t('rentals.notRentedYet')
              : t('rentals.noItemsRented')}
          </p>
          {tab === 'all' && (
            <Link href="/" className="btn-primary inline-flex items-center gap-2 text-sm">
              {t('rentals.browseItems')} <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </motion.div>
      ) : (
        <div className="mt-6 space-y-3">
          {filtered.map((rental, i) => {
            const badge = STATUS_BADGE[rental.status] ?? { variant: 'neutral', label: rental.status }
            return (
              <motion.div
                key={rental.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Link href={`/rentals/${rental.id}`}
                  className="flex items-center gap-4 p-4 card hover:shadow-card-xl transition-all group">
                  {/* Cover image */}
                  <div className="w-16 h-16 bg-brand-gray100 rounded-lg overflow-hidden flex-shrink-0">
                    {rental.item?.cover_image_url ? (
                      <img src={rental.item.cover_image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-6 h-6 text-brand-gray300" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate group-hover:text-brand-gray700 transition-colors">
                      {rental.item?.title ?? t('rentals.unknownItem')}
                    </p>
                    <p className="text-xs text-brand-gray500 mt-0.5">
                      {rental.start_date} → {rental.end_date}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-brand-gray600 font-semibold">
                        ETB {rental.total_price_etb.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-brand-gray400">
                        {rental.consumer_id === userId
                          ? `${t('rentals.owner')}: ${rental.provider?.full_name ?? '—'}`
                          : `${t('rentals.renter')}: ${rental.consumer?.full_name ?? '—'}`}
                      </span>
                    </div>
                  </div>

                  {/* Badge + arrow */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <Badge variant={badge.variant as any} dot>{badge.label}</Badge>
                    <ArrowRight className="w-4 h-4 text-brand-gray400 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
