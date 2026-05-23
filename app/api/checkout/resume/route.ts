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
    const { rentalId } = body

    if (!rentalId) {
      return NextResponse.json({ error: 'Missing rental ID' }, { status: 400 })
    }

    // 1. Fetch the rental
    const { data: rental, error: rentalError } = await supabase
      .from('rentals')
      .select('*, item:item_id(title)')
      .eq('id', rentalId)
      .single()

    if (rentalError || !rental) {
      return NextResponse.json({ error: 'Rental record not found' }, { status: 404 })
    }

    // 2. Validate ownership and status
    if (rental.consumer_id !== user.id) {
      return NextResponse.json({ error: 'You are not authorized to pay for this rental' }, { status: 403 })
    }

    if (rental.status !== 'pending') {
      return NextResponse.json({ error: `Rental is already in status: ${rental.status}` }, { status: 400 })
    }

    // Calculate rental days
    const start = new Date(rental.start_date)
    const end = new Date(rental.end_date)
    const rentalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))

    // 3. Create Stripe Checkout Session using rental snapshot prices
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Rental: ${rental.item.title}`,
              description: `Rental from ${rental.start_date} to ${rental.end_date} (${rentalDays} days)`,
            },
            unit_amount: Math.round(rental.total_price_usd * 100),
          },
          quantity: 1,
        },
        ...(rental.security_deposit_usd > 0 ? [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Refundable Security Deposit',
              description: 'Released back to your card upon safe return of the rented item.',
            },
            unit_amount: Math.round(rental.security_deposit_usd * 100),
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

    // 4. Update the checkout session ID in Database
    await supabase
      .from('rentals')
      .update({ stripe_checkout_session_id: session.id })
      .eq('id', rental.id)

    return NextResponse.json({
      session_id: session.id,
      session_url: session.url
    })

  } catch (error: any) {
    console.error('Resume Checkout API error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
