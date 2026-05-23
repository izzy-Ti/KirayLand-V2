import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabaseServer'
import { stripe } from '@/lib/stripeServer'
import Stripe from 'stripe'

// IMPORTANT: Force dynamic so Next.js never caches or pre-processes this route
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const sig = request.headers.get('stripe-signature') || ''
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    console.error('[Stripe Webhook] STRIPE_WEBHOOK_SECRET is not set in environment variables')
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  if (!sig) {
    console.error('[Stripe Webhook] Missing stripe-signature header')
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  // Read raw body as ArrayBuffer then convert to Buffer.
  // This avoids any encoding transformations that break Stripe signature verification.
  const rawBody = await request.arrayBuffer()
  const body = Buffer.from(rawBody)

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err: any) {
    console.error(`[Stripe Webhook] Signature verification failed: ${err.message}`)
    console.error(`[Stripe Webhook] Secret prefix: ${webhookSecret.substring(0, 12)}...`)
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
  }

  console.log(`[Stripe Webhook] Received event: ${event.type} (id: ${event.id})`)

  // Handle checkout.session.completed
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const rentalId = session.metadata?.rental_id

    if (!rentalId) {
      console.warn('[Stripe Webhook] checkout.session.completed received without rental_id in metadata')
      return NextResponse.json({ received: true })
    }

    console.log(`[Stripe Webhook] Processing payment for rental: ${rentalId}`)

    const supabaseAdmin = createAdminSupabaseClient()

    // Fetch the current rental to verify state
    const { data: rental, error: fetchError } = await supabaseAdmin
      .from('rentals')
      .select('*')
      .eq('id', rentalId)
      .single()

    if (fetchError || !rental) {
      console.error(`[Stripe Webhook] Rental ${rentalId} not found:`, fetchError)
      return NextResponse.json({ error: 'Rental not found' }, { status: 404 })
    }

    // Idempotency guard — only update if still pending
    if (rental.status !== 'pending') {
      console.log(`[Stripe Webhook] Rental ${rentalId} already in status "${rental.status}" — skipping`)
      return NextResponse.json({ received: true })
    }

    const paymentIntentId = typeof session.payment_intent === 'string'
      ? session.payment_intent
      : (session.payment_intent as Stripe.PaymentIntent)?.id || null

    // Update rental to active_escrow
    const { error: updateError } = await supabaseAdmin
      .from('rentals')
      .update({
        status: 'active_escrow',
        stripe_payment_intent_id: paymentIntentId,
        stripe_deposit_payment_intent_id: paymentIntentId,
        updated_at: new Date().toISOString()
      })
      .eq('id', rentalId)

    if (updateError) {
      console.error(`[Stripe Webhook] Failed to update rental ${rentalId}:`, updateError)
      return NextResponse.json({ error: 'Failed to update rental status' }, { status: 500 })
    }

    console.log(`[Stripe Webhook] Rental ${rentalId} → active_escrow ✓`)

    // Escrow ledger: Rental charge captured
    const { error: ledgerError1 } = await supabaseAdmin
      .from('escrow_ledger')
      .insert({
        rental_id: rentalId,
        action: 'charge_captured',
        amount_usd: rental.total_price_usd,
        amount_etb: rental.total_price_etb,
        exchange_rate: rental.exchange_rate,
        notes: 'Rental fee captured and escrowed via Stripe checkout session.'
      })

    if (ledgerError1) {
      console.error(`[Stripe Webhook] Ledger (charge_captured) failed for ${rentalId}:`, ledgerError1)
    } else {
      console.log(`[Stripe Webhook] Ledger charge_captured written for ${rentalId} ✓`)
    }

    // Escrow ledger: Security deposit held (only if > 0)
    if (rental.security_deposit_usd > 0) {
      const { error: ledgerError2 } = await supabaseAdmin
        .from('escrow_ledger')
        .insert({
          rental_id: rentalId,
          action: 'deposit_held',
          amount_usd: rental.security_deposit_usd,
          amount_etb: rental.security_deposit_etb,
          exchange_rate: rental.exchange_rate,
          notes: 'Refundable security deposit held in escrow via Stripe checkout session.'
        })

      if (ledgerError2) {
        console.error(`[Stripe Webhook] Ledger (deposit_held) failed for ${rentalId}:`, ledgerError2)
      } else {
        console.log(`[Stripe Webhook] Ledger deposit_held written for ${rentalId} ✓`)
      }
    }

    // System message in rental chat (in ETB)
    const etbTotal = `ETB ${rental.total_price_etb.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
    const etbDeposit = `ETB ${rental.security_deposit_etb.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
    const systemMessage = `✅ Payment confirmed! ${etbTotal} (Rental) and ${etbDeposit} (Deposit) are now securely held in escrow. The item can now be delivered.`

    await supabaseAdmin
      .from('messages')
      .insert({
        rental_id: rentalId,
        sender_id: rental.consumer_id,
        content: systemMessage,
        message_type: 'system'
      })

    console.log(`[Stripe Webhook] Successfully processed rental ${rentalId} ✓`)
  }

  return NextResponse.json({ received: true })
}
