'use client'

import React from 'react'
import { motion } from 'framer-motion'
import {
  ShieldAlert, AlertTriangle, CheckCircle2, XCircle,
  Eye, MessageSquare, DollarSign, Users, Package, Clock
} from 'lucide-react'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { getSupabaseBrowserClient } from '@/lib/supabase'

interface Stats {
  activeRentals: number
  openDisputes: number
  totalUsers: number
  revenueUsd: number
}

interface DisputedRental {
  id: string
  status: string
  dispute_reason: string | null
  dispute_resolution: string | null
  dispute_opened_at: string | null
  total_price_etb: number
  security_deposit_etb: number
  exchange_rate: number
  item: { title: string } | null
  provider: { full_name: string } | null
  consumer: { full_name: string } | null
}

export default function AdminDashboard() {
  const [stats, setStats] = React.useState<Stats | null>(null)
  const [disputes, setDisputes] = React.useState<DisputedRental[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    async function loadData() {
      const supabase = getSupabaseBrowserClient()

      // Fetch stats in parallel
      const [
        { count: activeRentals },
        { count: openDisputes },
        { count: totalUsers },
        { data: revenueData },
      ] = await Promise.all([
        supabase.from('rentals').select('id', { count: 'exact', head: true }).not('status', 'in', '(completed,cancelled)'),
        supabase.from('rentals').select('id', { count: 'exact', head: true }).eq('status', 'disputed'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('rentals').select('platform_fee_usd').eq('status', 'completed'),
      ])

      const revenueUsd = (revenueData ?? []).reduce((sum: number, r: any) => sum + (r.platform_fee_usd ?? 0), 0)

      setStats({
        activeRentals: activeRentals ?? 0,
        openDisputes: openDisputes ?? 0,
        totalUsers: totalUsers ?? 0,
        revenueUsd,
      })

      // Fetch disputed rentals
      const { data: disputeRows } = await supabase
        .from('rentals')
        .select(`
          id,
          status,
          dispute_reason,
          dispute_resolution,
          dispute_opened_at,
          total_price_etb,
          security_deposit_etb,
          exchange_rate,
          item:item_id ( title ),
          provider:provider_id ( full_name ),
          consumer:consumer_id ( full_name )
        `)
        .eq('status', 'disputed')
        .order('dispute_opened_at', { ascending: false })

      const formattedDisputes: DisputedRental[] = (disputeRows ?? []).map((r: any) => ({
        id: r.id,
        status: r.status,
        dispute_reason: r.dispute_reason,
        dispute_resolution: r.dispute_resolution,
        dispute_opened_at: r.dispute_opened_at,
        total_price_etb: r.total_price_etb,
        security_deposit_etb: r.security_deposit_etb,
        exchange_rate: r.exchange_rate,
        item: Array.isArray(r.item) ? r.item[0] ?? null : r.item,
        provider: Array.isArray(r.provider) ? r.provider[0] ?? null : r.provider,
        consumer: Array.isArray(r.consumer) ? r.consumer[0] ?? null : r.consumer,
      }))
      setDisputes(formattedDisputes)
      setIsLoading(false)
    }
    loadData()
  }, [])

  const handleResolveDispute = async (rentalId: string, refundConsumer: boolean) => {
    const supabase = getSupabaseBrowserClient()
    const resolution = refundConsumer
      ? 'Full refund issued to consumer.'
      : 'Funds released to provider.'

    await supabase.from('rentals').update({
      status: 'cancelled',
      dispute_resolution: resolution,
      dispute_resolved_at: new Date().toISOString(),
    }).eq('id', rentalId)

    setDisputes(prev => prev.filter(d => d.id !== rentalId))
    setStats(prev => prev ? { ...prev, openDisputes: Math.max(0, prev.openDisputes - 1) } : prev)
  }

  const STAT_CARDS = stats
    ? [
        { label: 'Active Rentals', value: stats.activeRentals, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'Open Disputes', value: stats.openDisputes, icon: ShieldAlert, color: 'text-red-600', bg: 'bg-red-50' },
        { label: 'Total Users', value: stats.totalUsers.toLocaleString(), icon: Users, color: 'text-green-600', bg: 'bg-green-50' },
        { label: 'Revenue (USD)', value: `$${stats.revenueUsd.toFixed(0)}`, icon: DollarSign, color: 'text-purple-600', bg: 'bg-purple-50' },
      ]
    : []

  if (isLoading) {
    return (
      <div className="page-container py-20 text-center">
        <div className="w-8 h-8 border-4 border-brand-black border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-brand-gray500 mt-4">Loading dashboard...</p>
      </div>
    )
  }

  return (
    <div className="page-container py-8">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-brand-black rounded-xl flex items-center justify-center">
            <ShieldAlert className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
            <p className="text-sm text-brand-gray500">Platform management & dispute resolution</p>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {STAT_CARDS.map((stat, i) => (
          <motion.div key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="card p-5"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-brand-gray500 uppercase tracking-wide">{stat.label}</p>
                <p className="text-2xl font-bold mt-1">{stat.value}</p>
              </div>
              <div className={`w-10 h-10 ${stat.bg} rounded-xl flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Disputes Table */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-brand-gray200 flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" /> Dispute Queue
          </h3>
          <Badge variant="danger" dot>
            {disputes.length} open
          </Badge>
        </div>

        {disputes.length === 0 && (
          <div className="px-6 py-10 text-center">
            <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-2" />
            <p className="text-sm text-brand-gray500">No open disputes — all clear!</p>
          </div>
        )}

        <div className="divide-y divide-brand-gray100">
          {disputes.map(dispute => {
            const totalHeldUsd = ((dispute.total_price_etb + dispute.security_deposit_etb) * (dispute.exchange_rate ?? 0.018))
            const depositUsd = dispute.security_deposit_etb * (dispute.exchange_rate ?? 0.018)

            return (
              <div key={dispute.id} className="px-6 py-5 hover:bg-brand-gray50/50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-sm">{dispute.item?.title ?? 'Unknown Item'}</h4>
                      <Badge variant="danger" dot>disputed</Badge>
                    </div>

                    <div className="flex items-center gap-4 mt-1 text-xs text-brand-gray500">
                      <span>Consumer: <strong>{dispute.consumer?.full_name ?? '—'}</strong></span>
                      <span>Provider: <strong>{dispute.provider?.full_name ?? '—'}</strong></span>
                      {dispute.dispute_opened_at && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(dispute.dispute_opened_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    {dispute.dispute_reason && (
                      <p className="mt-2 text-sm text-brand-gray600">{dispute.dispute_reason}</p>
                    )}

                    <div className="flex items-center gap-4 mt-3 text-xs">
                      <span className="text-brand-gray500">
                        Total held: <strong className="text-brand-black">${totalHeldUsd.toFixed(2)}</strong>
                      </span>
                      <span className="text-brand-gray500">
                        Deposit: <strong className="text-brand-black">${depositUsd.toFixed(2)}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 ml-4">
                    <a href={`/rentals/${dispute.id}`} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="primary">
                        <Eye className="w-3.5 h-3.5" /> Review
                      </Button>
                    </a>
                    <Button size="sm" variant="secondary" onClick={() => handleResolveDispute(dispute.id, true)}>
                      <CheckCircle2 className="w-3.5 h-3.5" /> Refund Consumer
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleResolveDispute(dispute.id, false)}>
                      <XCircle className="w-3.5 h-3.5" /> Release to Provider
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </motion.div>
    </div>
  )
}
