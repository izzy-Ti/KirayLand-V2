import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabaseServer'
import { stripe } from '@/lib/stripeServer'
import Stripe from 'stripe'

export async function POST(request: Request) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature') || ''
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not configured')
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`)
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
  }

  // 1. Process Event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const rentalId = session.metadata?.rental_id

    if (!rentalId) {
      console.warn('Webhook received checkout.session.completed without rental_id in metadata')
      return NextResponse.json({ received: true })
    }

    const supabaseAdmin = createAdminSupabaseClient()

    // 2. Fetch the current rental details to verify and avoid redundant actions
    const { data: rental, error: fetchError } = await supabaseAdmin
      .from('rentals')
      .select('*')
      .eq('id', rentalId)
      .single()

    if (fetchError || !rental) {
      console.error(`Rental ${rentalId} not found in database:`, fetchError)
      return NextResponse.json({ error: 'Rental not found' }, { status: 404 })
    }

    // Only update if rental is still pending to support idempotency (Stripe may retry webhooks)
    if (rental.status === 'pending') {
      const paymentIntentId = typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id || null

      // 3. Update the rental status and Stripe payment references
      const { error: updateError } = await supabaseAdmin
        .from('rentals')
        .update({
          status: 'active_escrow',
          stripe_payment_intent_id: paymentIntentId,
          stripe_deposit_payment_intent_id: paymentIntentId, // Since we charge both in a single session
          updated_at: new Date().toISOString()
        })
        .eq('id', rentalId)

      if (updateError) {
        console.error(`Failed to update rental status for ${rentalId}:`, updateError)
        return NextResponse.json({ error: 'Failed to update rental status' }, { status: 500 })
      }

      // 4. Record Escrow Ledger Entries
      // Entry A: Charge Captured for Rental Price
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
        console.error(`Failed to write rental charge to escrow ledger for ${rentalId}:`, ledgerError1)
      }

      // Entry B: Deposit Held for Security Deposit (if deposit is greater than 0)
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
          console.error(`Failed to write deposit hold to escrow ledger for ${rentalId}:`, ledgerError2)
        }
      }

      // 5. Send message inside the rental chat to notify parties of payment confirmation
      const systemMessage = `Payment confirmed. USD ${rental.total_price_usd.toFixed(2)} (Rental) and USD ${rental.security_deposit_usd.toFixed(2)} (Deposit) are now securely escrowed.`
      await supabaseAdmin
        .from('messages')
        .insert({
          rental_id: rentalId,
          sender_id: rental.consumer_id, // Let's attribute the system message to consumer/system
          content: systemMessage,
          message_type: 'system'
        })

      console.log(`Successfully completed escrow payment setup for rental ${rentalId}`)
    } else {
      console.log(`Rental ${rentalId} is already in status: ${rental.status}. Skipping duplicate update.`)
    }
  }

  return NextResponse.json({ received: true })
}
