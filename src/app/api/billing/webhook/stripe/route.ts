import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { db } from '@/lib/db'
import { webhookEvents, paymentTransactions } from '@/lib/db/schema'
import { settlePaymentTransaction, getTransactionByGatewayOrderId } from '@/lib/server-data'
import { eq } from 'drizzle-orm'
import Stripe from 'stripe'

export async function POST(request: Request) {
  let body: string
  try {
    body = await request.text()
  } catch {
    return NextResponse.json({ error: 'Failed to read request body' }, { status: 400 })
  }

  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET environment variable is missing')
    }

    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Unknown error'
    console.error(`Stripe webhook signature verification failed: ${errMsg}`)
    return NextResponse.json({ error: `Webhook Error: ${errMsg}` }, { status: 400 })
  }

  // Handle the event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const eventId = `stripe-session-${session.id}`

    // Parse metadata
    const metadata = session.metadata || {}
    const userId = metadata.userId
    const gatewayOrderId = metadata.gatewayOrderId
    const creditGrantedUsd = parseFloat(metadata.creditGrantedUsd || '0')

    if (!userId || !gatewayOrderId || isNaN(creditGrantedUsd)) {
      console.warn('Stripe checkout session completed but missing required metadata:', metadata)
      return NextResponse.json({ status: 'ignored', message: 'Missing metadata' })
    }

    // 1. Idempotency Check: Verify if event was already processed
    const existingEvent = await db.query.webhookEvents.findFirst({
      where: eq(webhookEvents.event_id, eventId),
    })

    if (existingEvent) {
      return NextResponse.json({ status: 'ignored', message: 'Event already processed' })
    }

    // 2. Fetch the pending transaction from database
    const transaction = await getTransactionByGatewayOrderId(gatewayOrderId)

    if (!transaction) {
      console.error(`Transaction with order ID ${gatewayOrderId} not found in database.`)
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    // 3. Lock the event first (Idempotency Guard)
    try {
      await db.insert(webhookEvents).values({
        gateway: 'stripe',
        event_id: eventId,
        raw_payload: event as unknown as Record<string, unknown>,
        processed_at: new Date(),
      })
    } catch {
      console.warn('Concurrently processing event or event insertion failed')
      return NextResponse.json({ status: 'ignored', message: 'Event already processing or processed' })
    }

    // 4. Settle transaction + update balance + log ledger (via server-data helper)
    if (transaction.status !== 'SETTLED') {
      const settled = await settlePaymentTransaction(gatewayOrderId, userId, creditGrantedUsd)

      if (!settled) {
        throw new Error(`Failed to settle transaction ${gatewayOrderId}`)
      }

      console.log(`Successfully settled Stripe transaction ${gatewayOrderId}. Credited $${creditGrantedUsd} to profile ${userId}.`)
    }
  }

  return NextResponse.json({ received: true })
}
