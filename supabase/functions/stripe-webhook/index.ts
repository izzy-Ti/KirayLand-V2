// ═══════════════════════════════════════════════════════════
// ኪራይLand — Stripe Webhook Edge Function
// Handles payment events and updates rental/escrow state
// ═══════════════════════════════════════════════════════════

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'
import Stripe from 'https://esm.sh/stripe@16.12.0?target=deno'

serve(async (req) => {
  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2024-06-20',
    })

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Verify webhook signature
    const body = await req.text()
    const sig = req.headers.get('stripe-signature')!
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message)
      return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 400 })
    }

    // ── Handle Events ──────────────────────────────────────
    switch (event.type) {
      // ── Payment Completed ────────────────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const metadata = session.metadata || {}
        const rentalId = metadata.rental_id

        if (!rentalId) {
          console.error('No rental_id in session metadata')
          break
        }

        // Update rental to active_escrow
        await supabase
          .from('rentals')
          .update({
            status: 'active_escrow',
            stripe_payment_intent_id: session.payment_intent as string,
            // Generate handshake codes
            checkin_code: generateSecureCode(),
            checkout_code: generateSecureCode(),
          })
          .eq('id', rentalId)

        // Log escrow entries
        const exchangeRate = parseFloat(metadata.exchange_rate || '0')
        const totalPriceEtb = parseFloat(metadata.total_price_etb || '0')
        const depositEtb = parseFloat(metadata.deposit_etb || '0')
        const platformFeeUsd = parseFloat(metadata.platform_fee_usd || '0')
        const providerPayoutUsd = parseFloat(metadata.provider_payout_usd || '0')
        const amountTotal = (session.amount_total || 0) / 100

        // Charge captured entry
        await supabase.from('escrow_ledger').insert({
          rental_id: rentalId,
          action: 'charge_captured',
          amount_etb: totalPriceEtb + depositEtb,
          amount_usd: amountTotal,
          exchange_rate: exchangeRate,
          notes: `Stripe Checkout completed. Session: ${session.id}`,
        })

        // Deposit held entry (if any)
        if (depositEtb > 0) {
          const depositUsd = parseFloat(metadata.deposit_etb || '0') * exchangeRate
          await supabase.from('escrow_ledger').insert({
            rental_id: rentalId,
            action: 'deposit_held',
            amount_etb: depositEtb,
            amount_usd: Math.round(depositUsd * 100) / 100,
            exchange_rate: exchangeRate,
            notes: 'Security deposit held in escrow',
          })
        }

        // Commission collected entry
        await supabase.from('escrow_ledger').insert({
          rental_id: rentalId,
          action: 'commission_collected',
          amount_etb: totalPriceEtb * 0.05,
          amount_usd: platformFeeUsd,
          exchange_rate: exchangeRate,
          notes: '5% platform commission',
        })

        // Provider payout pending entry
        await supabase.from('escrow_ledger').insert({
          rental_id: rentalId,
          action: 'provider_payout_pending',
          amount_etb: totalPriceEtb * 0.95,
          amount_usd: providerPayoutUsd,
          exchange_rate: exchangeRate,
          notes: 'Provider payout pending item return confirmation',
        })

        console.log(`Rental ${rentalId} moved to active_escrow`)
        break
      }

      // ── Payment Failed ───────────────────────────────────
      case 'payment_intent.payment_failed': {
        const intent = event.data.object as Stripe.PaymentIntent
        const rentalId = intent.metadata?.rental_id

        if (rentalId) {
          await supabase
            .from('rentals')
            .update({ status: 'cancelled' })
            .eq('id', rentalId)
            .eq('status', 'pending')

          console.log(`Rental ${rentalId} cancelled due to payment failure`)
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return new Response(
      JSON.stringify({ error: 'Webhook handler failed' }),
      { status: 500 }
    )
  }
})

// ── Generate 6-character secure handshake code ─────────────
function generateSecureCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // No 0, O, 1, I
  let code = ''
  const array = new Uint8Array(6)
  crypto.getRandomValues(array)
  for (let i = 0; i < 6; i++) {
    code += chars[array[i] % chars.length]
  }
  return code
}
