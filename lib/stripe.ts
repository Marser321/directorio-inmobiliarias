import Stripe from 'stripe'

// Initialize Stripe with secret key (server-side only)
// For simulation mode, we check if the key exists
const stripeSecretKey = process.env.STRIPE_SECRET_KEY

export const stripe = stripeSecretKey
    ? new Stripe(stripeSecretKey, {
        apiVersion: '2026-01-28.clover',
        typescript: true,
    })
    : null

// Check if Stripe is configured
export const isStripeConfigured = (): boolean => {
    return !!stripeSecretKey
}

// Product configuration
export const FEATURED_PRODUCT = {
    name: 'Destacar Propiedad - 30 Días',
    description: 'Tu propiedad aparecerá en la sección destacada por 30 días',
    priceUsd: 4900, // $49.00 in cents
    durationDays: 30,
}
