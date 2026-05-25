import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer'

export async function POST(request: Request) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { rentalId } = await request.json()

    if (!rentalId) {
      return NextResponse.json({ error: 'Rental ID is required' }, { status: 400 })
    }

    const supabaseAdmin = createAdminSupabaseClient()

    // 1. Fetch the rental
    const { data: rental, error: rentalError } = await supabaseAdmin
      .from('rentals')
      .select('*')
      .eq('id', rentalId)
      .single()

    if (rentalError || !rental) {
      return NextResponse.json({ error: 'Rental booking not found' }, { status: 404 })
    }

    // 2. Validate participant and state
    if (rental.provider_id !== user.id) {
      return NextResponse.json({ error: 'Only the provider can confirm the return and release escrow' }, { status: 403 })
    }

    if (rental.status !== 'returned_pending_review' && rental.status !== 'item_delivered' && rental.status !== 'active_escrow') {
      return NextResponse.json({ error: 'This rental is not in a completion-ready status' }, { status: 400 })
    }

    const price = Number(rental.total_price_etb || 0)
    const deposit = Number(rental.security_deposit_etb || 0)
    const platformFee = Math.round(price * 0.05 * 100) / 100
    const providerPayout = Math.round((price - platformFee) * 100) / 100

    // 3. Update Consumer (Renter) Wallet — Refund security deposit (if any)
    if (deposit > 0) {
      const { data: consumerProfile, error: consumerError } = await supabaseAdmin
        .from('profiles')
        .select('wallet_balance_etb')
        .eq('id', rental.consumer_id)
        .single()

      if (!consumerError && consumerProfile) {
        const renterBalance = Number(consumerProfile.wallet_balance_etb || 0)
        await supabaseAdmin
          .from('profiles')
          .update({ wallet_balance_etb: renterBalance + deposit })
          .eq('id', rental.consumer_id)
      }
    }

    // 4. Update Provider Wallet — Payout rental fee (minus platform fee)
    const { data: providerProfile, error: providerError } = await supabaseAdmin
      .from('profiles')
      .select('wallet_balance_etb')
      .eq('id', rental.provider_id)
      .single()

    if (providerError || !providerProfile) {
      return NextResponse.json({ error: 'Provider profile not found' }, { status: 404 })
    }

    const providerBalance = Number(providerProfile.wallet_balance_etb || 0)
    await supabaseAdmin
      .from('profiles')
      .update({ wallet_balance_etb: providerBalance + providerPayout })
      .eq('id', rental.provider_id)

    // 5. Update rental status
    const { error: updateError } = await supabaseAdmin
      .from('rentals')
      .update({
        status: 'completed',
        actual_return_date: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString()
      })
      .eq('id', rentalId)

    if (updateError) {
      console.error('Failed to complete rental status:', updateError)
      return NextResponse.json({ error: 'Failed to update rental status' }, { status: 500 })
    }

    // 6. Log to Escrow Ledger
    // Deposit released
    if (deposit > 0) {
      await supabaseAdmin
        .from('escrow_ledger')
        .insert({
          rental_id: rentalId,
          action: 'deposit_released',
          amount_usd: rental.security_deposit_usd,
          amount_etb: deposit,
          exchange_rate: rental.exchange_rate,
          performed_by: user.id,
          notes: `Refunded ${deposit} ETB security deposit to consumer wallet.`
        })
    }

    // Provider payout sent
    await supabaseAdmin
      .from('escrow_ledger')
      .insert({
        rental_id: rentalId,
        action: 'provider_payout_sent',
        amount_usd: rental.provider_payout_usd,
        amount_etb: providerPayout,
        exchange_rate: rental.exchange_rate,
        performed_by: user.id,
        notes: `Released ${providerPayout} ETB (95% rental fee after platform fee) to provider wallet.`
      })

    // 7. System Chat message
    const formattedDeposit = `ETB ${deposit.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
    const formattedPayout = `ETB ${providerPayout.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
    const sysMsg = `🎉 Escrow settled! Renter's refundable security deposit of ${formattedDeposit} has been returned to their Wallet. Provider's payout of ${formattedPayout} (rental fee minus 5% platform fee) has been credited to their Wallet.`

    await supabaseAdmin
      .from('messages')
      .insert({
        rental_id: rentalId,
        sender_id: rental.provider_id,
        content: sysMsg,
        message_type: 'system'
      })

    return NextResponse.json({
      success: true,
      status: 'completed',
      renterRefund: deposit,
      providerPayout: providerPayout
    })

  } catch (error: any) {
    console.error('Wallet release escrow error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
