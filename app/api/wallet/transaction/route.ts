import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer'
import { stripe } from '@/lib/stripeServer'

export async function POST(request: Request) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { amount, action } = await request.json()

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'Invalid transaction amount' }, { status: 400 })
    }

    if (action !== 'deposit' && action !== 'withdraw') {
      return NextResponse.json({ error: 'Invalid action. Must be deposit or withdraw' }, { status: 400 })
    }

    const supabaseAdmin = createAdminSupabaseClient()

    if (action === 'deposit') {
      // 1. Fetch exchange rate (with local fallback)
      let exchangeRate = 0.0167
      const { data: cachedRate } = await supabaseAdmin
        .from('exchange_rate_cache')
        .select('rate')
        .eq('base_currency', 'ETB')
        .eq('target_currency', 'USD')
        .gt('expires_at', new Date().toISOString())
        .order('fetched_at', { ascending: false })
        .limit(1)
        .single()

      if (cachedRate) {
        exchangeRate = cachedRate.rate
      } else {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        try {
          const rateRes = await fetch(`${appUrl}/api/exchange-rate`)
          if (rateRes.ok) {
            const rateData = await rateRes.json()
            exchangeRate = rateData.rate
          }
        } catch (e) {
          console.error('Failed to fetch fresh exchange rate, using fallback', e)
        }
      }

      // 2. Calculate prices
      const amountUsd = Math.round(amount * exchangeRate * 100) / 100

      // 3. Create Stripe Checkout Session for Deposit
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'Virtual Wallet Deposit',
                description: `Add virtual funds to your KirayLand wallet balance. (ETB ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })})`,
              },
              unit_amount: Math.round(amountUsd * 100),
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${appUrl}/profile/wallet?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/profile/wallet?cancelled=true`,
        metadata: {
          type: 'wallet_topup',
          user_id: user.id,
          amount_etb: amount.toString(),
        },
      })

      return NextResponse.json({
        success: true,
        session_url: session.url
      })
    } else {
      // Withdrawal: Virtual deduction securely
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('wallet_balance_etb')
        .eq('id', user.id)
        .single()

      if (profileError || !profile) {
        return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
      }

      const currentBalance = Number(profile.wallet_balance_etb || 0)
      if (currentBalance < amount) {
        return NextResponse.json({ error: 'Insufficient balance to withdraw' }, { status: 400 })
      }

      const newBalance = currentBalance - amount
      const { data: updatedProfile, error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ wallet_balance_etb: newBalance })
        .eq('id', user.id)
        .select('wallet_balance_etb')
        .single()

      if (updateError) {
        console.error('Balance update failed:', updateError)
        return NextResponse.json({ error: 'Failed to update balance' }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        balance: updatedProfile.wallet_balance_etb
      })
    }

  } catch (error: any) {
    console.error('Wallet transaction error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
