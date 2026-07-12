import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { stripe } from '@/lib/stripe'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // 1. Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Parse body
    const body = await request.json()
    const amountUsd = parseFloat(body.amount_usd)

    if (isNaN(amountUsd) || amountUsd < 2.0) {
      return NextResponse.json({ error: 'Minimum top-up amount is $2.00' }, { status: 400 })
    }

    // 3. Configuration & Constants for Bonus calculation
    const tier1Threshold = parseFloat(process.env.TOPUP_BONUS_TIER_1_THRESHOLD || '50')
    const tier1Percent = parseFloat(process.env.TOPUP_BONUS_TIER_1_PERCENT || '3') / 100
    const tier2Threshold = parseFloat(process.env.TOPUP_BONUS_TIER_2_THRESHOLD || '100')
    const tier2Percent = parseFloat(process.env.TOPUP_BONUS_TIER_2_PERCENT || '5') / 100

    // 4. Calculate credit granted (with bonus)
    let creditGrantedUsd = amountUsd
    if (amountUsd >= tier2Threshold) {
      creditGrantedUsd = amountUsd * (1 + tier2Percent)
    } else if (amountUsd >= tier1Threshold) {
      creditGrantedUsd = amountUsd * (1 + tier1Percent)
    }

    const gatewayOrderId = `undercut-topup-${user.id.substring(0, 8)}-${Date.now()}`

    // 5. Save pending transaction in Supabase (use Service Role client to bypass RLS)
    const admin = createServiceRoleClient()
    const { error: dbError } = await admin
      .from('payment_transactions')
      .insert({
        profile_id: user.id,
        gateway: 'stripe',
        gateway_order_id: gatewayOrderId,
        top_up_amount_usd: amountUsd,
        credit_granted_usd: creditGrantedUsd,
        amount_idr: 0, // 0 since we're charging directly in USD
        status: 'PENDING',
      })

    if (dbError) {
      console.error('Database transaction insert error:', dbError)
      return NextResponse.json({ error: 'Failed to record transaction' }, { status: 500 })
    }

    // 6. Create Stripe Checkout Session
    // Dynamically retrieve origin to handle Vercel deployment and local dev correctly
    const requestUrl = new URL(request.url)
    const origin = request.headers.get('origin') || requestUrl.origin || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const session = await stripe.checkout.sessions.create({
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
      customer_email: user.email,
      metadata: {
        userId: user.id,
        amountUsd: amountUsd.toString(),
        creditGrantedUsd: creditGrantedUsd.toString(),
        gatewayOrderId: gatewayOrderId,
      },
    })

    // Return the session details to client
    return NextResponse.json({
      id: session.id,
      url: session.url,
      order_id: gatewayOrderId,
    })
  } catch (error: unknown) {
    console.error('Stripe payment token request failed:', error)
    const errMsg = error instanceof Error ? error.message : 'Payment initiation failed'
    return NextResponse.json({ error: errMsg }, { status: 500 })
  }
}
