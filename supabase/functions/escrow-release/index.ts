// ═══════════════════════════════════════════════════════════
// ኪራይLand — Escrow Release Edge Function
// Handles deposit refund + provider payout on successful return
// ═══════════════════════════════════════════════════════════

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'
import Stripe from 'https://esm.sh/stripe@16.12.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2024-06-20',
    })

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Authenticate the user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing authorization header')

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) throw new Error('Unauthorized')

    const { rental_id, action } = await req.json()
    if (!rental_id) throw new Error('rental_id is required')

    // Fetch the rental
    const { data: rental, error: rentalError } = await supabase
      .from('rentals')
      .select(`
        *,
        provider:profiles!rentals_provider_id_fkey(stripe_connect_id)
      `)
      .eq('id', rental_id)
      .single()

    if (rentalError || !rental) throw new Error('Rental not found')

    // ── ACTION: Provider confirms return (no damage) ───────
    if (action === 'confirm_return') {
      // Only provider can confirm return
      if (user.id !== rental.provider_id) {
        throw new Error('Only the provider can confirm return')
      }

      if (rental.status !== 'returned_pending_review') {
        throw new Error('Rental is not in returned_pending_review status')
      }

      // 1. Refund security deposit to consumer
      if (rental.security_deposit_usd > 0 && rental.stripe_payment_intent_id) {
        const refund = await stripe.refunds.create({
          payment_intent: rental.stripe_payment_intent_id,
          amount: Math.round(rental.security_deposit_usd * 100), // cents
          reason: 'requested_by_customer',
          metadata: {
            rental_id: rental.id,
            type: 'security_deposit_refund',
          },
        })

        // Log deposit release
        await supabase.from('escrow_ledger').insert({
          rental_id: rental.id,
          action: 'deposit_released',
          amount_usd: rental.security_deposit_usd,
          amount_etb: rental.security_deposit_etb,
          exchange_rate: rental.exchange_rate,
          stripe_refund_id: refund.id,
          performed_by: user.id,
          notes: 'Security deposit refunded to consumer',
        })
      }

      // 2. Transfer provider payout via Stripe Connect
      if (rental.provider?.stripe_connect_id && rental.provider_payout_usd > 0) {
        const transfer = await stripe.transfers.create({
          amount: Math.round(rental.provider_payout_usd * 100),
          currency: 'usd',
          destination: rental.provider.stripe_connect_id,
          metadata: {
            rental_id: rental.id,
            type: 'provider_payout',
          },
        })

        // Log provider payout
        await supabase.from('escrow_ledger').insert({
          rental_id: rental.id,
          action: 'provider_payout_sent',
          amount_usd: rental.provider_payout_usd,
          amount_etb: rental.total_price_etb * 0.95,
          exchange_rate: rental.exchange_rate,
          stripe_transfer_id: transfer.id,
          performed_by: user.id,
          notes: `Provider payout sent. Transfer: ${transfer.id}`,
        })
      }

      // 3. Update rental status to completed
      await supabase
        .from('rentals')
        .update({
          status: 'completed',
          actual_return_date: new Date().toISOString().split('T')[0],
        })
        .eq('id', rental.id)

      return new Response(
        JSON.stringify({ success: true, status: 'completed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── ACTION: Open dispute ───────────────────────────────
    if (action === 'open_dispute') {
      const { reason } = await req.json()

      // Freeze escrow
      await supabase.from('escrow_ledger').insert({
        rental_id: rental.id,
        action: 'dispute_freeze',
        amount_usd: rental.total_price_usd + rental.security_deposit_usd,
        amount_etb: rental.total_price_etb + rental.security_deposit_etb,
        exchange_rate: rental.exchange_rate,
        performed_by: user.id,
        notes: `Dispute opened: ${reason || 'No reason provided'}`,
      })

      await supabase
        .from('rentals')
        .update({
          status: 'disputed',
          dispute_reason: reason || 'Item reported damaged or unreturned',
          dispute_opened_at: new Date().toISOString(),
        })
        .eq('id', rental.id)

      return new Response(
        JSON.stringify({ success: true, status: 'disputed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    throw new Error('Invalid action. Use "confirm_return" or "open_dispute"')
  } catch (error) {
    console.error('Escrow release error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
