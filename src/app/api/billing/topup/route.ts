import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { stripe } from '@/lib/stripe'
import { createPaymentTransaction } from '@/lib/server-data'

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Maintenance / Portfolio Mode guard
    if (process.env.ENABLE_LIVE_PAYMENTS !== 'true') {
      return NextResponse.json(
        { error: 'Fitur Top-up saat ini dalam pemeliharaan (Mode Portofolio Demo).' },
        { status: 503 }
      )
    }

    // Parse body
    const body = await request.json()
    const amountUsd = parseFloat(body.amount_usd)

    if (isNaN(amountUsd) || amountUsd < 2.0) {
      return NextResponse.json({ error: 'Minimum top-up amount is $2.00' }, { status: 400 })
    }

    // Configuration & Constants for Bonus calculation
    const tier1Threshold = parseFloat(process.env.TOPUP_BONUS_TIER_1_THRESHOLD || '50')
    const tier1Percent = parseFloat(process.env.TOPUP_BONUS_TIER_1_PERCENT || '3') / 100
    const tier2Threshold = parseFloat(process.env.TOPUP_BONUS_TIER_2_THRESHOLD || '100')
    const tier2Percent = parseFloat(process.env.TOPUP_BONUS_TIER_2_PERCENT || '5') / 100

    // Calculate credit granted (with bonus)
    let creditGrantedUsd = amountUsd
    if (amountUsd >= tier2Threshold) {
      creditGrantedUsd = amountUsd * (1 + tier2Percent)
    } else if (amountUsd >= tier1Threshold) {
      creditGrantedUsd = amountUsd * (1 + tier1Percent)
    }

    const gatewayOrderId = `undercut-topup-${session.user.id.substring(0, 8)}-${Date.now()}`

    // Save pending transaction in Neon via Drizzle
    const transaction = await createPaymentTransaction({
      profile_id: session.user.id,
      gateway: 'stripe',
      gateway_order_id: gatewayOrderId,
      top_up_amount_usd: amountUsd.toFixed(4),
      credit_granted_usd: creditGrantedUsd.toFixed(4),
      amount_idr: 0, // 0 since we're charging directly in USD
    })

    if (!transaction) {
      return NextResponse.json({ error: 'Failed to record transaction' }, { status: 500 })
    }

    // Create Stripe Checkout Session
    const requestUrl = new URL(request.url)
    const origin = request.headers.get('origin') || requestUrl.origin || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const stripeSession = await stripe.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Undercut Prepaid Credits ($${amountUsd.toFixed(2)})`,
              description: `Top-up wallet balance to receive AI social reply drafts. Credits granted: $${creditGrantedUsd.toFixed(2)}`,
            },
            unit_amount: Math.round(amountUsd * 100), // Stripe expects amount in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${origin}/dashboard/x?payment=success&order_id=${gatewayOrderId}&amount=${amountUsd}`,
      cancel_url: `${origin}/dashboard/x?payment=cancelled`,
      customer_email: session.user.email,
      metadata: {
        userId: session.user.id,
        amountUsd: amountUsd.toString(),
        creditGrantedUsd: creditGrantedUsd.toString(),
        gatewayOrderId: gatewayOrderId,
      },
    })

    return NextResponse.json({
      id: stripeSession.id,
      url: stripeSession.url,
      order_id: gatewayOrderId,
    })
  } catch (error: unknown) {
    console.error('Stripe payment token request failed:', error)
    const errMsg = error instanceof Error ? error.message : 'Payment initiation failed'
    return NextResponse.json({ error: errMsg }, { status: 500 })
  }
}
