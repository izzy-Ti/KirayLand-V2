// ═══════════════════════════════════════════════════════════
// ኪራይLand — Exchange Rate Edge Function
// Fetches ETB→USD rate with 1-hour DB caching
// ═══════════════════════════════════════════════════════════

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Check for cached rate (less than 1 hour old)
    const { data: cached } = await supabase
      .from('exchange_rate_cache')
      .select('*')
      .eq('base_currency', 'ETB')
      .eq('target_currency', 'USD')
      .gt('expires_at', new Date().toISOString())
      .order('fetched_at', { ascending: false })
      .limit(1)
      .single()

    if (cached) {
      return new Response(
        JSON.stringify({
          rate: cached.rate,
          source: cached.source,
          fetched_at: cached.fetched_at,
          is_cached: true,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch fresh rate from ExchangeRate-API
    const apiKey = Deno.env.get('EXCHANGE_RATE_API_KEY')!
    const response = await fetch(
      `https://v6.exchangerate-api.com/v6/${apiKey}/pair/ETB/USD`
    )

    if (!response.ok) {
      throw new Error(`Exchange rate API returned ${response.status}`)
    }

    const data = await response.json()
    const rate = data.conversion_rate

    if (!rate || typeof rate !== 'number') {
      throw new Error('Invalid exchange rate received')
    }

    // Cache the rate in DB
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 60 * 60 * 1000) // 1 hour

    await supabase.from('exchange_rate_cache').insert({
      base_currency: 'ETB',
      target_currency: 'USD',
      rate,
      source: 'exchangerate-api',
      fetched_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    })

    return new Response(
      JSON.stringify({
        rate,
        source: 'exchangerate-api',
        fetched_at: now.toISOString(),
        is_cached: false,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Exchange rate error:', error)

    // Fallback: return last known rate even if expired
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: fallback } = await supabase
      .from('exchange_rate_cache')
      .select('*')
      .eq('base_currency', 'ETB')
      .eq('target_currency', 'USD')
      .order('fetched_at', { ascending: false })
      .limit(1)
      .single()

    if (fallback) {
      return new Response(
        JSON.stringify({
          rate: fallback.rate,
          source: `${fallback.source} (stale fallback)`,
          fetched_at: fallback.fetched_at,
          is_cached: true,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Failed to fetch exchange rate' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
