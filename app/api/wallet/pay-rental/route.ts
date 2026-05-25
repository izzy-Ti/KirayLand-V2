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
      .select('*, item:item_id(title)')
      .eq('id', rentalId)
      .single()

    if (rentalError || !rental) {
      return NextResponse.json({ error: 'Rental booking not found' }, { status: 404 })
    }

    // 2. Validate participant and state
    if (rental.consumer_id !== user.id) {
      return NextResponse.json({ error: 'You are not authorized to pay for this rental' }, { status: 403 })
    }

    if (rental.status !== 'pending') {
      return NextResponse.json({ error: 'This rental booking is not in a pending payment state' }, { status: 400 })
    }

    // 3. Check renter's balance
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('wallet_balance_etb')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    const price = Number(rental.total_price_etb || 0)
    const deposit = Number(rental.security_deposit_etb || 0)
    const totalRequired = price + deposit

    const currentBalance = Number(profile.wallet_balance_etb || 0)

    if (currentBalance < totalRequired) {
      return NextResponse.json({ error: 'Insufficient wallet balance' }, { status: 400 })
    }

    // 4. Deduct balance
    const { error: deductError } = await supabaseAdmin
      .from('profiles')
      .update({ wallet_balance_etb: currentBalance - totalRequired })
      .eq('id', user.id)

    if (deductError) {
      console.error('Wallet deduction failed:', deductError)
      return NextResponse.json({ error: 'Failed to process wallet payment' }, { status: 500 })
    }

    // 5. Update rental status
    const { error: updateError } = await supabaseAdmin
      .from('rentals')
      .update({
        status: 'active_escrow',
        updated_at: new Date().toISOString()
      })
      .eq('id', rentalId)

    if (updateError) {
      console.error('Rental status update failed:', updateError)
      // Attempt rollback balance
      await supabaseAdmin.from('profiles').update({ wallet_balance_etb: currentBalance }).eq('id', user.id)
      return NextResponse.json({ error: 'Failed to update rental status' }, { status: 500 })
    }

    // 6. Log to Escrow Ledger
    // Charge captured (Rental Fee)
    await supabaseAdmin
      .from('escrow_ledger')
      .insert({
        rental_id: rentalId,
        action: 'charge_captured',
        amount_usd: rental.total_price_usd,
        amount_etb: price,
        exchange_rate: rental.exchange_rate,
        performed_by: user.id,
        notes: `Paid ${price} ETB rental fee from virtual wallet.`
      })

    // Deposit held (if > 0)
    if (deposit > 0) {
      await supabaseAdmin
        .from('escrow_ledger')
        .insert({
          rental_id: rentalId,
          action: 'deposit_held',
          amount_usd: rental.security_deposit_usd,
          amount_etb: deposit,
          exchange_rate: rental.exchange_rate,
          performed_by: user.id,
          notes: `Paid ${deposit} ETB refundable security deposit from virtual wallet.`
        })
    }

    // 7. System Chat message
    const formattedPrice = `ETB ${price.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
    const formattedDeposit = `ETB ${deposit.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
    const sysMsg = `✅ Wallet payment confirmed! ${formattedPrice} (Rental Fee) and ${formattedDeposit} (Security Deposit) are paid from your Wallet and securely held in escrow. The item can now be delivered.`

    await supabaseAdmin
      .from('messages')
      .insert({
        rental_id: rentalId,
        sender_id: rental.consumer_id,
        content: sysMsg,
        message_type: 'system'
      })

    return NextResponse.json({
      success: true,
      status: 'active_escrow',
      newBalance: currentBalance - totalRequired
    })

  } catch (error: any) {
    console.error('Wallet checkout error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
