'use client'

import React from 'react'
import { motion } from 'framer-motion'
import {
  CreditCard, Truck, RotateCcw, CheckCircle2,
  AlertTriangle, Clock, ArrowRight, Shield,
  Banknote, HandshakeIcon
} from 'lucide-react'
import Badge from '@/components/ui/Badge'
import type { RentalStatus } from '@/types/database'

interface EscrowTimelineProps {
  currentStatus: RentalStatus
  rentalId: string
  totalPriceEtb: number
  totalPriceUsd: number
  depositEtb: number
  depositUsd: number
  platformFeeUsd: number
  providerPayoutUsd: number
  checkinVerifiedAt?: string | null
  checkoutVerifiedAt?: string | null
  disputeReason?: string | null
}

interface TimelineStep {
  id: RentalStatus
  label: string
  sublabel: string
  icon: React.ElementType
  color: string
  bgColor: string
}

const TIMELINE_STEPS: TimelineStep[] = [
  {
    id: 'pending',
    label: 'Payment Initiated',
    sublabel: 'Checkout session created',
    icon: CreditCard,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 border-amber-200',
  },
  {
    id: 'active_escrow',
    label: 'Funds Escrowed',
    sublabel: 'Payment captured & held securely',
    icon: Shield,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 border-blue-200',
  },
  {
    id: 'item_delivered',
    label: 'Item Delivered',
    sublabel: 'Handshake verified — item with consumer',
    icon: Truck,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 border-purple-200',
  },
  {
    id: 'returned_pending_review',
    label: 'Return Pending Review',
    sublabel: 'Item returned — awaiting provider confirmation',
    icon: RotateCcw,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50 border-cyan-200',
  },
  {
    id: 'completed',
    label: 'Funds Settled',
    sublabel: 'Deposit refunded • Provider paid',
    icon: CheckCircle2,
    color: 'text-green-600',
    bgColor: 'bg-green-50 border-green-200',
  },
]

const STATUS_ORDER: RentalStatus[] = [
  'pending',
  'active_escrow',
  'item_delivered',
  'returned_pending_review',
  'completed',
]

export default function EscrowTimeline({
  currentStatus,
  totalPriceEtb,
  totalPriceUsd,
  depositEtb,
  depositUsd,
  platformFeeUsd,
  providerPayoutUsd,
  checkinVerifiedAt,
  checkoutVerifiedAt,
  disputeReason,
}: EscrowTimelineProps) {
  const currentIndex = STATUS_ORDER.indexOf(currentStatus)
  const isDisputed = currentStatus === 'disputed'
  const isCancelled = currentStatus === 'cancelled'

  const formatETB = (n: number) => `ETB ${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
  const formatUSD = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}`

  return (
    <div className="w-full">
      {/* ── Status Header ──────────────────────────────── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-lg font-bold">Escrow Pipeline</h3>
          <p className="text-sm text-brand-gray500 mt-0.5">
            Secure two-phase financial lifecycle
          </p>
        </div>
        {isDisputed ? (
          <Badge variant="danger" dot>Disputed</Badge>
        ) : isCancelled ? (
          <Badge variant="neutral" dot>Cancelled</Badge>
        ) : currentStatus === 'completed' ? (
          <Badge variant="success" dot>Completed</Badge>
        ) : (
          <Badge variant="info" dot>In Progress</Badge>
        )}
      </div>

      {/* ── Dispute Banner ─────────────────────────────── */}
      {isDisputed && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-red-50 border border-red-200 rounded-card flex items-start gap-3"
        >
          <AlertTriangle className="w-5 h-5 text-danger mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-800">Dispute Active — Funds Frozen</p>
            <p className="text-xs text-red-600 mt-1">
              {disputeReason || 'A dispute has been opened. All escrowed funds are frozen pending admin review.'}
            </p>
          </div>
        </motion.div>
      )}

      {/* ── Timeline Steps ─────────────────────────────── */}
      <div className="relative">
        {TIMELINE_STEPS.map((step, index) => {
          const isCompleted = !isDisputed && !isCancelled && index < currentIndex
          const isActive = !isDisputed && !isCancelled && index === currentIndex
          const isPending = index > currentIndex || isDisputed || isCancelled

          return (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1, duration: 0.4 }}
              className="relative flex gap-4 pb-8 last:pb-0"
            >
              {/* Connector line */}
              {index < TIMELINE_STEPS.length - 1 && (
                <div className="absolute left-5 top-12 bottom-0 w-0.5">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: '100%' }}
                    transition={{ delay: index * 0.15 + 0.3, duration: 0.5 }}
                    className={`h-full ${
                      isCompleted ? 'bg-brand-black' :
                      isActive ? 'bg-gradient-to-b from-brand-black to-brand-gray200' :
                      'bg-brand-gray200'
                    }`}
                  />
                </div>
              )}

              {/* Step icon */}
              <div className="relative z-10 flex-shrink-0">
                <motion.div
                  animate={isActive ? {
                    boxShadow: [
                      '0 0 0 0 rgba(10,10,10,0.15)',
                      '0 0 0 8px rgba(10,10,10,0)',
                    ],
                  } : {}}
                  transition={isActive ? {
                    duration: 1.5,
                    repeat: Infinity,
                    ease: 'easeOut',
                  } : {}}
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                    isCompleted
                      ? 'bg-brand-black border-brand-black'
                      : isActive
                        ? `${step.bgColor} border-current ${step.color}`
                        : 'bg-brand-gray50 border-brand-gray200'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5 text-white" />
                  ) : (
                    <step.icon className={`w-5 h-5 ${
                      isActive ? step.color : 'text-brand-gray400'
                    }`} />
                  )}
                </motion.div>
              </div>

              {/* Step content */}
              <div className={`flex-1 pt-1.5 ${isPending && !isActive ? 'opacity-40' : ''}`}>
                <div className="flex items-center gap-2">
                  <h4 className={`text-sm font-semibold ${
                    isCompleted ? 'text-brand-black' :
                    isActive ? 'text-brand-black' :
                    'text-brand-gray400'
                  }`}>
                    {step.label}
                  </h4>
                  {isActive && (
                    <motion.span
                      animate={{ opacity: [1, 0.5, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="flex items-center gap-1 text-xs text-brand-gray500"
                    >
                      <Clock className="w-3 h-3" /> Current
                    </motion.span>
                  )}
                </div>
                <p className="text-xs text-brand-gray500 mt-0.5">{step.sublabel}</p>

                {/* Contextual details for completed/active steps */}
                {step.id === 'active_escrow' && (isCompleted || isActive) && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-3 p-3 bg-brand-gray50 rounded-lg border border-brand-gray100"
                  >
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-brand-gray400">Total Held</span>
                        <p className="font-semibold mt-0.5">{formatUSD(totalPriceUsd + depositUsd)}</p>
                        <p className="text-brand-gray400">{formatETB(totalPriceEtb + depositEtb)}</p>
                      </div>
                      <div>
                        <span className="text-brand-gray400">Security Deposit</span>
                        <p className="font-semibold mt-0.5">{formatUSD(depositUsd)}</p>
                        <p className="text-brand-gray400">{formatETB(depositEtb)}</p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {step.id === 'item_delivered' && checkinVerifiedAt && (isCompleted || isActive) && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-green-600">
                    <HandshakeIcon className="w-3.5 h-3.5" />
                    Handshake verified at {new Date(checkinVerifiedAt).toLocaleString()}
                  </div>
                )}

                {step.id === 'completed' && isCompleted && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-3 p-3 bg-green-50 rounded-lg border border-green-100"
                  >
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-green-600/70">Provider Payout</span>
                        <p className="font-semibold text-green-800 mt-0.5">{formatUSD(providerPayoutUsd)}</p>
                      </div>
                      <div>
                        <span className="text-green-600/70">Platform Fee</span>
                        <p className="font-semibold text-green-800 mt-0.5">{formatUSD(platformFeeUsd)}</p>
                      </div>
                      <div>
                        <span className="text-green-600/70">Deposit Refunded</span>
                        <p className="font-semibold text-green-800 mt-0.5">{formatUSD(depositUsd)}</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* ── Financial Summary Card ─────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="mt-8 p-5 bg-brand-gray50 rounded-card border border-brand-gray200"
      >
        <h4 className="text-sm font-semibold flex items-center gap-2 mb-4">
          <Banknote className="w-4 h-4 text-brand-gray500" />
          Financial Breakdown
        </h4>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-brand-gray500">Rental Price</span>
            <div className="text-right">
              <span className="font-medium">{formatUSD(totalPriceUsd)}</span>
              <span className="text-xs text-brand-gray400 ml-2">({formatETB(totalPriceEtb)})</span>
            </div>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-brand-gray500">Security Deposit</span>
            <div className="text-right">
              <span className="font-medium">{formatUSD(depositUsd)}</span>
              <span className="text-xs text-brand-gray400 ml-2">({formatETB(depositEtb)})</span>
            </div>
          </div>
          <div className="divider my-2" />
          <div className="flex justify-between text-sm">
            <span className="text-brand-gray500">Platform Fee (5%)</span>
            <span className="font-medium text-brand-gray600">{formatUSD(platformFeeUsd)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-brand-gray500">Provider Receives (95%)</span>
            <span className="font-medium text-green-700">{formatUSD(providerPayoutUsd)}</span>
          </div>
          <div className="divider my-2" />
          <div className="flex justify-between text-sm font-bold">
            <span>Total Charged</span>
            <span>{formatUSD(totalPriceUsd + depositUsd)}</span>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
