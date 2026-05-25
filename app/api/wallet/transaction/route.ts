import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer'

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

    // Use admin client to query and update balance securely
    const supabaseAdmin = createAdminSupabaseClient()

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('wallet_balance_etb')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    const currentBalance = Number(profile.wallet_balance_etb || 0)
    let newBalance = currentBalance

    if (action === 'deposit') {
      newBalance = currentBalance + amount
    } else {
      if (currentBalance < amount) {
        return NextResponse.json({ error: 'Insufficient balance to withdraw' }, { status: 400 })
      }
      newBalance = currentBalance - amount
    }

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

  } catch (error: any) {
    console.error('Wallet transaction error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
