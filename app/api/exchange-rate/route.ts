import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Check cache from Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (supabaseUrl && supabaseKey) {
      const cacheRes = await fetch(
        `${supabaseUrl}/rest/v1/exchange_rate_cache?base_currency=eq.ETB&target_currency=eq.USD&expires_at=gt.${new Date().toISOString()}&order=fetched_at.desc&limit=1`,
        {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        }
      )

      const cacheData = await cacheRes.json()
      if (cacheData?.length > 0) {
        return NextResponse.json({
          rate: cacheData[0].rate,
          source: cacheData[0].source,
          fetched_at: cacheData[0].fetched_at,
          is_cached: true,
        })
      }
    }

    // Fetch fresh rate
    const apiKey = process.env.EXCHANGE_RATE_API_KEY
    if (!apiKey) {
      // Return a reasonable fallback for dev
      return NextResponse.json({
        rate: 0.0167,
        source: 'fallback',
        fetched_at: new Date().toISOString(),
        is_cached: false,
      })
    }

    const rateRes = await fetch(
      `https://v6.exchangerate-api.com/v6/${apiKey}/pair/ETB/USD`
    )

    if (!rateRes.ok) {
      throw new Error(`Exchange rate API error: ${rateRes.status}`)
    }

    const rateData = await rateRes.json()
    const rate = rateData.conversion_rate

    // Cache in Supabase
    if (supabaseUrl && supabaseKey) {
      await fetch(`${supabaseUrl}/rest/v1/exchange_rate_cache`, {
        method: 'POST',
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          base_currency: 'ETB',
          target_currency: 'USD',
          rate,
          source: 'exchangerate-api',
          fetched_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 3600000).toISOString(),
        }),
      })
    }

    return NextResponse.json({
      rate,
      source: 'exchangerate-api',
      fetched_at: new Date().toISOString(),
      is_cached: false,
    })
  } catch (error: any) {
    console.error('Exchange rate error:', error)
    return NextResponse.json(
      { rate: 0.0167, source: 'fallback', fetched_at: new Date().toISOString(), is_cached: false },
      { status: 200 }
    )
  }
}
