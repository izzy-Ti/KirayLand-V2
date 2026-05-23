import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabaseServer'
import { stripe } from '@/lib/stripeServer'

export async function POST(request: Request) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { itemId, startDate, endDate } = body

    if (!itemId || !startDate || !endDate) {
      return NextResponse.json({ error: 'Missing required booking details' }, { status: 400 })
    }

    // 1. Fetch item details
    const { data: item, error: itemError } = await supabase
      .from('items')
      .select('*')
      .eq('id', itemId)
      .single()

    if (itemError || !item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    if (item.provider_id === user.id) {
      return NextResponse.json({ error: 'You cannot rent your own item' }, { status: 400 })
    }

    // 2. Calculate duration
    const start = new Date(startDate)
    const end = new Date(endDate)
    const rentalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))

    if (rentalDays <= 0) {
      return NextResponse.json({ error: 'Invalid rental date range' }, { status: 400 })
    }

    if (rentalDays < item.min_rental_days) {
      return NextResponse.json({ error: `Minimum rental days is ${item.min_rental_days}` }, { status: 400 })
    }

    if (item.max_rental_days && rentalDays > item.max_rental_days) {
      return NextResponse.json({ error: `Maximum rental days is ${item.max_rental_days}` }, { status: 400 })
    }

    // 3. Fetch exchange rate (with local fallback)
    let exchangeRate = 0.0167
    const { data: cachedRate } = await supabase
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
      // Fetch fresh rate if cached is not available
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

    // 4. Calculate prices
    const priceEtb = rentalDays * item.price_per_day_etb
    const depositEtb = item.security_deposit_etb
    const totalEtb = priceEtb + depositEtb

    const priceUsd = Math.round(priceEtb * exchangeRate * 100) / 100
    const depositUsd = Math.round(depositEtb * exchangeRate * 100) / 100
    const platformFeeUsd = Math.round(priceUsd * 0.05 * 100) / 100 // 5% fee
    const providerPayoutUsd = Math.round((priceUsd - platformFeeUsd) * 100) / 100
    const totalChargeUsd = Math.round((priceUsd + depositUsd) * 100) / 100

    // 5. Generate validation handshake codes
    const checkinCode = Math.floor(100000 + Math.random() * 900000).toString()
    const checkoutCode = Math.floor(100000 + Math.random() * 900000).toString()

    // 6. Insert rental record as pending
    const { data: rental, error: rentalError } = await supabase
      .from('rentals')
      .insert({
        item_id: item.id,
        consumer_id: user.id,
        provider_id: item.provider_id,
        start_date: startDate,
        end_date: endDate,
        status: 'pending',
        total_price_etb: priceEtb,
        security_deposit_etb: depositEtb,
        exchange_rate: exchangeRate,
        total_price_usd: priceUsd,
        security_deposit_usd: depositUsd,
        platform_fee_usd: platformFeeUsd,
        provider_payout_usd: providerPayoutUsd,
        checkin_code: checkinCode,
        checkout_code: checkoutCode,
      })
      .select()
      .single()

    if (rentalError || !rental) {
      console.error('Rental creation failed:', rentalError)
      return NextResponse.json({ error: 'Failed to create rental record' }, { status: 500 })
    }

    // 7. Add reservation to bookings calendar
    const { error: calendarError } = await supabase
      .from('bookings_calendar')
      .insert({
        item_id: item.id,
        rental_id: rental.id,
        booked_range: `[${new Date(startDate).toISOString()}, ${new Date(endDate).toISOString()}]`
      })

    if (calendarError) {
      console.error('Calendar blocking failed:', calendarError)
      // Attempt to clean up rental
      await supabase.from('rentals').delete().eq('id', rental.id)
      return NextResponse.json({ error: 'Dates are already booked' }, { status: 409 })
    }

    // 8. Create Stripe Checkout Session
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Rental: ${item.title}`,
              description: `Rental from ${startDate} to ${endDate} (${rentalDays} days)`,
            },
            unit_amount: Math.round(priceUsd * 100),
          },
          quantity: 1,
        },
        ...(depositUsd > 0 ? [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Refundable Security Deposit',
              description: 'Released back to your card upon safe return of the rented item.',
            },
            unit_amount: Math.round(depositUsd * 100),
          },
          quantity: 1,
        }] : []),
      ],
      mode: 'payment',
      success_url: `${appUrl}/rentals/${rental.id}?success=true`,
      cancel_url: `${appUrl}/rentals/${rental.id}?cancelled=true`,
      metadata: {
        rental_id: rental.id,
      },
    })

    // 9. Save session ID to rental record
    await supabase
      .from('rentals')
      .update({ stripe_checkout_session_id: session.id })
      .eq('id', rental.id)

    return NextResponse.json({
      session_id: session.id,
      session_url: session.url,
      rental_id: rental.id,
      amount_usd: totalChargeUsd,
      exchange_rate: exchangeRate
    })

  } catch (error: any) {
    console.error('Checkout API error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
