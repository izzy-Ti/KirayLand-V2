// ═══════════════════════════════════════════════════════════
// ኪራይLand — ETB ↔ USD Dual-Currency Conversion Engine
// ═══════════════════════════════════════════════════════════

import { getSupabaseBrowserClient } from './supabase'
import type { ExchangeRateResponse } from '@/types/database'

// Platform commission rate (5%)
export const PLATFORM_COMMISSION_RATE = 0.05

// ── Fetch current exchange rate (with DB cache) ────────────
export async function getExchangeRate(): Promise<ExchangeRateResponse> {
  const supabase = getSupabaseBrowserClient()

  // Check cache first
  const { data: cached } = await supabase
    .from('exchange_rate_cache')
    .select('*')
    .eq('base_currency', 'ETB')
    .eq('target_currency', 'USD')
    .gt('expires_at', new Date().toISOString())
    .order('fetched_at', { ascending: false })
    .limit(1)
    .single()

  if (cached) {
    return {
      rate: cached.rate,
      source: cached.source,
      fetched_at: cached.fetched_at,
      is_cached: true,
    }
  }

  // Fetch fresh rate via API route
  const response = await fetch('/api/exchange-rate')
  if (!response.ok) {
    throw new Error('Failed to fetch exchange rate')
  }

  return response.json()
}

// ── Convert ETB to USD ─────────────────────────────────────
export function etbToUsd(amountEtb: number, rate: number): number {
  return Math.round(amountEtb * rate * 100) / 100
}

// ── Convert USD to ETB ─────────────────────────────────────
export function usdToEtb(amountUsd: number, rate: number): number {
  return Math.round((amountUsd / rate) * 100) / 100
}

// ── Calculate checkout breakdown ───────────────────────────
export interface CheckoutBreakdown {
  priceEtb: number
  depositEtb: number
  totalEtb: number
  exchangeRate: number
  priceUsd: number
  depositUsd: number
  platformFeeUsd: number
  providerPayoutUsd: number
  totalChargeUsd: number
}

export function calculateCheckout(
  priceEtb: number,
  depositEtb: number,
  exchangeRate: number
): CheckoutBreakdown {
  const totalEtb = priceEtb + depositEtb
  const priceUsd = etbToUsd(priceEtb, exchangeRate)
  const depositUsd = etbToUsd(depositEtb, exchangeRate)
  const platformFeeUsd = Math.round(priceUsd * PLATFORM_COMMISSION_RATE * 100) / 100
  const providerPayoutUsd = Math.round((priceUsd - platformFeeUsd) * 100) / 100
  const totalChargeUsd = Math.round((priceUsd + depositUsd) * 100) / 100

  return {
    priceEtb,
    depositEtb,
    totalEtb,
    exchangeRate,
    priceUsd,
    depositUsd,
    platformFeeUsd,
    providerPayoutUsd,
    totalChargeUsd,
  }
}

// ── Format display strings ─────────────────────────────────
export function formatETB(amount: number): string {
  return `ETB ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatUSD(amount: number): string {
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
