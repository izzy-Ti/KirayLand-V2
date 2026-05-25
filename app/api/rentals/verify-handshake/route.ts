import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer'

export async function POST(request: Request) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { rentalId, code, type } = await request.json()

    if (!rentalId || !code || !type) {
      return NextResponse.json({ error: 'rentalId, code, and type are required' }, { status: 400 })
    }

    if (type !== 'checkin' && type !== 'checkout') {
      return NextResponse.json({ error: 'type must be checkin or checkout' }, { status: 400 })
    }

    const normalizedCode = String(code).trim().toUpperCase()
    if (normalizedCode.length !== 6) {
      return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 })
    }

    const supabaseAdmin = createAdminSupabaseClient()

    const { data: rental, error: rentalError } = await supabaseAdmin
      .from('rentals')
      .select('*')
      .eq('id', rentalId)
      .single()

    if (rentalError || !rental) {
      return NextResponse.json({ error: 'Rental not found' }, { status: 404 })
    }

    if (type === 'checkin') {
      if (rental.consumer_id !== user.id) {
        return NextResponse.json({ error: 'Only the consumer can verify item receipt' }, { status: 403 })
      }

      if (rental.status !== 'active_escrow') {
        return NextResponse.json({ error: 'Rental is not awaiting delivery verification' }, { status: 400 })
      }

      if (rental.checkin_verified_at) {
        return NextResponse.json({ success: true, status: rental.status, alreadyVerified: true })
      }

      const expectedCode = String(rental.checkin_code || '').trim().toUpperCase()
      if (!expectedCode || normalizedCode !== expectedCode) {
        return NextResponse.json({ error: 'Verification code does not match' }, { status: 400 })
      }

      const price = Number(rental.total_price_etb || 0)
      const platformFee = Math.round(price * 0.05 * 100) / 100
      const providerPayout = Math.round((price - platformFee) * 100) / 100

      const { count: payoutCount } = await supabaseAdmin
        .from('escrow_ledger')
        .select('id', { count: 'exact', head: true })
        .eq('rental_id', rentalId)
        .eq('action', 'provider_payout_sent')

      if (!payoutCount || payoutCount === 0) {
        const { data: providerProfile, error: providerError } = await supabaseAdmin
          .from('profiles')
          .select('wallet_balance_etb')
          .eq('id', rental.provider_id)
          .single()

        if (providerError || !providerProfile) {
          return NextResponse.json({ error: 'Provider profile not found' }, { status: 404 })
        }

        const providerBalance = Number(providerProfile.wallet_balance_etb || 0)
        const { error: creditError } = await supabaseAdmin
          .from('profiles')
          .update({ wallet_balance_etb: providerBalance + providerPayout })
          .eq('id', rental.provider_id)

        if (creditError) {
          console.error('Provider payout failed:', creditError)
          return NextResponse.json({ error: 'Failed to credit provider wallet' }, { status: 500 })
        }

        await supabaseAdmin.from('escrow_ledger').insert({
          rental_id: rentalId,
          action: 'provider_payout_sent',
          amount_usd: rental.provider_payout_usd,
          amount_etb: providerPayout,
          exchange_rate: rental.exchange_rate,
          performed_by: user.id,
          notes: `Provider credited ${providerPayout} ETB after consumer verified item receipt (check-in code).`,
        })
      }

      const { error: updateError } = await supabaseAdmin
        .from('rentals')
        .update({
          status: 'item_delivered',
          checkin_verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', rentalId)

      if (updateError) {
        return NextResponse.json({ error: 'Failed to update rental status' }, { status: 500 })
      }

      const formattedPayout = `ETB ${providerPayout.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
      await supabaseAdmin.from('messages').insert({
        rental_id: rentalId,
        sender_id: rental.consumer_id,
        content: `✅ Item receipt confirmed! Provider payout of ${formattedPayout} (rental fee minus 5% platform fee) has been credited to the provider wallet. Security deposit remains held until return.`,
        message_type: 'system',
      })

      return NextResponse.json({
        success: true,
        status: 'item_delivered',
        providerPayout,
      })
    }

    // checkout — consumer verifies return handoff; deposit released on provider confirm
    if (rental.consumer_id !== user.id) {
      return NextResponse.json({ error: 'Only the consumer can verify item return' }, { status: 403 })
    }

    if (rental.status !== 'item_delivered') {
      return NextResponse.json({ error: 'Rental is not awaiting return verification' }, { status: 400 })
    }

    if (rental.checkout_verified_at) {
      return NextResponse.json({ success: true, status: rental.status, alreadyVerified: true })
    }

    const expectedCheckout = String(rental.checkout_code || '').trim().toUpperCase()
    if (!expectedCheckout || normalizedCode !== expectedCheckout) {
      return NextResponse.json({ error: 'Verification code does not match' }, { status: 400 })
    }

    const { error: checkoutUpdateError } = await supabaseAdmin
      .from('rentals')
      .update({
        status: 'returned_pending_review',
        checkout_verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', rentalId)

    if (checkoutUpdateError) {
      return NextResponse.json({ error: 'Failed to update rental status' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      status: 'returned_pending_review',
    })
  } catch (error: any) {
    console.error('Verify handshake error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
