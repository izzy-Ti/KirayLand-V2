import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer'
import { stripe } from '@/lib/stripeServer'
import { creditWalletTopupFromSession } from '@/lib/walletTopup'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sessionId } = await request.json()
    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.metadata?.user_id !== user.id) {
      return NextResponse.json({ error: 'Session does not belong to this user' }, { status: 403 })
    }

    const supabaseAdmin = createAdminSupabaseClient()
    const result = await creditWalletTopupFromSession(supabaseAdmin, session)

    return NextResponse.json({
      success: true,
      credited: result.credited,
      amountEtb: result.amountEtb,
      balance: result.newBalance,
    })
  } catch (error: any) {
    console.error('Confirm deposit error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
