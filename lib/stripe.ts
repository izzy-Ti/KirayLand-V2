import { loadStripe, Stripe } from '@stripe/stripe-js'

// ── Browser-side Stripe instance (singleton) ───────────────
let stripePromise: Promise<Stripe | null> | null = null

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    stripePromise = loadStripe(
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
    )
  }
  return stripePromise
}

// ── Redirect to Stripe Checkout ────────────────────────────
export async function redirectToCheckout(sessionId: string) {
  const stripe = await getStripe()
  if (!stripe) throw new Error('Stripe failed to load')
  
  const { error } = await stripe.redirectToCheckout({ sessionId })
  if (error) {
    throw new Error(error.message)
  }
}

// ── Format currency display ────────────────────────────────
export function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

export function formatETB(amount: number): string {
  return new Intl.NumberFormat('en-ET', {
    style: 'currency',
    currency: 'ETB',
    minimumFractionDigits: 2,
  }).format(amount)
}
