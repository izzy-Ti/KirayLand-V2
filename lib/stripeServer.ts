import Stripe from 'stripe'

const stripeSecretKey = process.env.STRIPE_SECRET_KEY

if (!stripeSecretKey) {
  console.warn('WARNING: STRIPE_SECRET_KEY is not defined in environment variables. Stripe server client might fail to initialize.')
}

export const stripe = new Stripe(stripeSecretKey || '', {
  apiVersion: '2024-06-20' as any, // Cast to any to avoid strict version mismatch if Stripe SDK updates
  typescript: true,
})
