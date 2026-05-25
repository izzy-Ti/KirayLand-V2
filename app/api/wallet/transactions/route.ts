import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabaseServer'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch escrow ledger entries where the user is either the consumer or the provider.
    const { data: transactions, error } = await supabase
      .from('escrow_ledger')
      .select(`
        id,
        action,
        amount_etb,
        amount_usd,
        exchange_rate,
        created_at,
        notes,
        rental:rental_id (
          id,
          consumer_id,
          provider_id,
          status,
          item:item_id (
            title,
            cover_image_url
          )
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching transactions:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ transactions })
  } catch (error: any) {
    console.error('Transactions API error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
