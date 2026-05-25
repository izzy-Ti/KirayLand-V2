import type Stripe from 'stripe'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Credits a user's wallet from a completed Stripe Checkout session (wallet_topup).
 * Idempotent per stripe_session_id via wallet_topups table.
 */
export async function creditWalletTopupFromSession(
  supabaseAdmin: SupabaseClient,
  session: Stripe.Checkout.Session
): Promise<{ credited: boolean; amountEtb?: number; newBalance?: number }> {
  if (session.payment_status !== 'paid') {
    return { credited: false }
  }

  const metadata = session.metadata || {}
  if (metadata.type !== 'wallet_topup') {
    return { credited: false }
  }

  const userId = metadata.user_id
  const amountEtb = Number(metadata.amount_etb || 0)
  const sessionId = session.id

  if (!userId || !amountEtb || amountEtb <= 0 || !sessionId) {
    throw new Error('Invalid wallet top-up session metadata')
  }

  const { data: existing } = await supabaseAdmin
    .from('wallet_topups')
    .select('id')
    .eq('stripe_session_id', sessionId)
    .maybeSingle()

  if (existing) {
    return { credited: false }
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('wallet_balance_etb')
    .eq('id', userId)
    .single()

  if (profileError || !profile) {
    throw new Error('Profile not found')
  }

  const currentBalance = Number(profile.wallet_balance_etb || 0)
  const newBalance = currentBalance + amountEtb

  const { error: topupInsertError } = await supabaseAdmin
    .from('wallet_topups')
    .insert({
      user_id: userId,
      amount_etb: amountEtb,
      stripe_session_id: sessionId,
    })

  if (topupInsertError) {
    if (topupInsertError.code === '23505') {
      return { credited: false }
    }
    throw topupInsertError
  }

  const { error: updateError } = await supabaseAdmin
    .from('profiles')
    .update({ wallet_balance_etb: newBalance })
    .eq('id', userId)

  if (updateError) {
    throw updateError
  }

  return { credited: true, amountEtb, newBalance }
}
