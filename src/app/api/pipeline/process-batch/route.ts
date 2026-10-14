import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { mapWithConcurrency, CONCURRENCY_GATE2_BATCH } from '@/lib/pipeline/concurrency'
import { processLeadPipeline } from '@/lib/pipeline/helpers'

interface BatchItemResult {
  lead_id: string
  status: 'success' | 'failed' | 'pending_payment' | 'rejected'
  reply?: string
  credit_type?: string
  error?: string
  processing_time_ms?: number
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { lead_ids: string[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { lead_ids } = body
  if (!Array.isArray(lead_ids) || lead_ids.length === 0) {
    return NextResponse.json({ error: 'lead_ids must be a non-empty array' }, { status: 400 })
  }
  if (lead_ids.length > 20) {
    return NextResponse.json({ error: 'Maximum 20 leads per batch' }, { status: 400 })
  }

  const userId = session.user.id

  // Process a single lead via the internal pipeline helper
  async function processOne(lead_id: string): Promise<BatchItemResult> {
    try {
      const data = await processLeadPipeline(userId, lead_id)

      if (data.result === 'REJECTED') {
        return { lead_id, status: 'rejected', processing_time_ms: data.processing_time_ms }
      }
      if (data.result === 'PENDING_PAYMENT') {
        return { lead_id, status: 'pending_payment', error: data.reason, processing_time_ms: data.processing_time_ms }
      }
      if (data.result === 'SUCCESS') {
        return {
          lead_id,
          status: 'success',
          reply: data.reply,
          credit_type: data.credit_type,
          processing_time_ms: data.processing_time_ms,
        }
      }

      return { lead_id, status: 'failed', error: 'Unexpected pipeline result' }
    } catch (err) {
      return {
        lead_id,
        status: 'failed',
        error: err instanceof Error ? err.message : String(err),
      }
    }
  }

  // Process batch concurrently using concurrency helper (default limit: 4)
  const allResults = await mapWithConcurrency(
    lead_ids,
    CONCURRENCY_GATE2_BATCH,
    (id) => processOne(id)
  )

  const summary = {
    total: allResults.length,
    success: allResults.filter((r) => r.status === 'success').length,
    rejected: allResults.filter((r) => r.status === 'rejected').length,
    pending_payment: allResults.filter((r) => r.status === 'pending_payment').length,
    failed: allResults.filter((r) => r.status === 'failed').length,
  }

  return NextResponse.json({
    summary,
    results: allResults,
  })
}
