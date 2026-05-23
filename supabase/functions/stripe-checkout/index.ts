// ═══════════════════════════════════════════════════════════
// ኪራይLand — Stripe Checkout Edge Function
// Creates a Stripe Checkout Session with ETB→USD conversion
// ═══════════════════════════════════════════════════════════

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'
import Stripe from 'https://esm.sh/stripe@16.12.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PLATFORM_COMMISSION = 0.05 // 5%

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
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) throw new Error('Unauthorized')

    // Parse request body
    const { rental_id } = await req.json()
    if (!rental_id) throw new Error('rental_id is required')

    // Fetch the rental with item details
    const { data: rental, error: rentalError } = await supabase
      .from('rentals')
      .select(`
        *,
        item:items(title, cover_image_url, price_per_day_etb, security_deposit_etb, provider_id),
        consumer:profiles!rentals_consumer_id_fkey(email, full_name, stripe_customer_id)
      `)
      .eq('id', rental_id)
      .eq('consumer_id', user.id)
      .eq('status', 'pending')
      .single()

    if (rentalError || !rental) {
      throw new Error('Rental not found or not in pending status')
    }

    // Fetch exchange rate
    const { data: rateData } = await supabase
      .from('exchange_rate_cache')
      .select('rate')
      .eq('base_currency', 'ETB')
      .eq('target_currency', 'USD')
      .gt('expires_at', new Date().toISOString())
      .order('fetched_at', { ascending: false })
      .limit(1)
      .single()

    let exchangeRate: number

    if (rateData) {
      exchangeRate = rateData.rate
    } else {
      // Fetch fresh rate
      const apiKey = Deno.env.get('EXCHANGE_RATE_API_KEY')!
      const rateResponse = await fetch(
        `https://v6.exchangerate-api.com/v6/${apiKey}/pair/ETB/USD`
      )
      const rateJson = await rateResponse.json()
      exchangeRate = rateJson.conversion_rate

      // Cache it
      await supabase.from('exchange_rate_cache').insert({
        base_currency: 'ETB',
        target_currency: 'USD',
        rate: exchangeRate,
        source: 'exchangerate-api',
        expires_at: new Date(Date.now() + 3600000).toISOString(),
      })
    }

    // Calculate amounts
    const totalPriceUsd = Math.round(rental.total_price_etb * exchangeRate * 100) / 100
    const depositUsd = Math.round(rental.security_deposit_etb * exchangeRate * 100) / 100
    const platformFeeUsd = Math.round(totalPriceUsd * PLATFORM_COMMISSION * 100) / 100
    const providerPayoutUsd = Math.round((totalPriceUsd - platformFeeUsd) * 100) / 100
    const totalChargeUsd = totalPriceUsd + depositUsd

    // Ensure customer exists in Stripe
    let stripeCustomerId = rental.consumer?.stripe_customer_id

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: rental.consumer?.email,
        name: rental.consumer?.full_name,
        metadata: { supabase_user_id: user.id },
      })
      stripeCustomerId = customer.id

      // Save Stripe customer ID
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customer.id })
        .eq('id', user.id)
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: Math.round(totalPriceUsd * 100), // cents
            product_data: {
              name: `Rental: ${rental.item?.title}`,
              description: `${rental.start_date} to ${rental.end_date}`,
              images: rental.item?.cover_image_url ? [rental.item.cover_image_url] : [],
            },
          },
          quantity: 1,
        },
        ...(depositUsd > 0
          ? [
              {
                price_data: {
                  currency: 'usd',
                  unit_amount: Math.round(depositUsd * 100),
                  product_data: {
                    name: 'Security Deposit (Refundable)',
                    description: 'Refunded upon safe return of item',
                  },
                },
                quantity: 1,
              },
            ]
          : []),
      ],
      metadata: {
        rental_id: rental.id,
        item_id: rental.item_id,
        consumer_id: user.id,
        provider_id: rental.provider_id,
        exchange_rate: exchangeRate.toString(),
        total_price_etb: rental.total_price_etb.toString(),
        deposit_etb: rental.security_deposit_etb.toString(),
        platform_fee_usd: platformFeeUsd.toString(),
        provider_payout_usd: providerPayoutUsd.toString(),
        escrow_mode: 'full_capture',
      },
      payment_intent_data: {
        metadata: {
          rental_id: rental.id,
          escrow_mode: 'full_capture',
        },
      },
      success_url: `${Deno.env.get('APP_URL')}/rentals/${rental.id}?checkout=success`,
      cancel_url: `${Deno.env.get('APP_URL')}/items/${rental.item_id}?checkout=cancelled`,
    })

    // Update rental with Stripe session info and pricing snapshot
    await supabase
      .from('rentals')
      .update({
        stripe_checkout_session_id: session.id,
        exchange_rate: exchangeRate,
        total_price_usd: totalPriceUsd,
        security_deposit_usd: depositUsd,
        platform_fee_usd: platformFeeUsd,
        provider_payout_usd: providerPayoutUsd,
      })
      .eq('id', rental.id)

    return new Response(
      JSON.stringify({
        session_id: session.id,
        session_url: session.url,
        rental_id: rental.id,
        amount_usd: totalChargeUsd,
        exchange_rate: exchangeRate,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Stripe checkout error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
