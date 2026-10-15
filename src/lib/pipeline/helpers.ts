import { db } from '@/lib/db'
import { leadsQueue, competitorTargets, profiles, billingLedger } from '@/lib/db/schema'
import { and, eq, inArray, sql } from 'drizzle-orm'
import {
  updateLeadAfterPipeline,
  consumeCycleCredit,
  getProfile,
  insertLeads,
} from '@/lib/server-data'
import { scrapeX, scrapeInstagram } from '@/lib/scraper'
import { fuzzyPreFilter } from '@/lib/fud-keywords'
import { runGate1 } from '@/lib/pipeline/gate1'
import { runGate2 } from '@/lib/pipeline/gate2'
import type { Platform, Competitor } from '@/lib/types'
import { mapWithConcurrency, CONCURRENCY_SCRAPE_TARGETS } from './concurrency'

export interface ScrapeTargetResult {
  competitor_name: string
  platform: Platform
  scraped: number
  fuzzy_filtered: number
  inserted: number
  duplicates: number
  error?: string
}

/**
 * Scrape a single competitor target: scrape, fuzzy-filter, deduplicate, insert.
 * Gate 1 is NOT run here — it runs later when the user clicks "Generate Draft".
 * All posts that pass fuzzy pre-filter are inserted as PENDING with gate_1_passed=false.
 */
export async function processScrapeTarget(
  userId: string,
  target: Competitor
): Promise<ScrapeTargetResult> {
  const result: ScrapeTargetResult = {
    competitor_name: target.competitor_name,
    platform: target.platform,
    scraped: 0,
    fuzzy_filtered: 0,
    inserted: 0,
    duplicates: 0,
  }

  try {
    // 1. Scrape raw posts (throws on API failure)
    let rawPosts = []
    if (target.platform === 'X') {
      rawPosts = await scrapeX(target.search_query, target.competitor_name)
    } else {
      rawPosts = await scrapeInstagram(target.search_query)
    }
    result.scraped = rawPosts.length

    if (rawPosts.length === 0) {
      return result
    }

    // 2. Fuzzy keyword pre-filter (fast, no LLM cost)
    const fuzzyPassed = rawPosts.filter((post) => {
      const match = fuzzyPreFilter(
        post.raw_content,
        target.competitor_name,
        post.author_username
      )
      return match.passes
    })
    result.fuzzy_filtered = rawPosts.length - fuzzyPassed.length

    if (fuzzyPassed.length === 0) {
      return result
    }

    // 3. Deduplicate (via insertLeads which handles this internally)
    const postsToInsert = fuzzyPassed.map((p) => ({
      ...p,
      gate_1_passed: false,
      status: 'PENDING' as const,
    }))

    const { inserted, duplicates } = await insertLeads(
      userId,
      target.id,
      target.platform,
      postsToInsert
    )

    result.inserted = inserted
    result.duplicates = duplicates
    return result
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[pipeline] Target ${target.id} failed:`, msg)
    result.error = msg
    return result
  }
}

export interface ProcessLeadResult {
  result: 'SUCCESS' | 'REJECTED' | 'PENDING_PAYMENT'
  reply?: string
  credit_type?: string
  processing_time_ms: number
  reason?: string
}

/**
 * Unified pipeline for processing a single lead (called when user clicks "Generate Draft").
 * 1. Run Gate 1 if not yet verified
 * 2. Consume credit (via consumeCycleCredit — TypeScript replacement for stored procedure)
 * 3. Run Gate 2 to generate personalized reply draft
 * 4. Save result to DB
 */
export async function processLeadPipeline(
  userId: string,
  leadId: string
): Promise<ProcessLeadResult> {
  const pipelineStart = Date.now()

  // 1. Fetch lead (ensure owner check)
  const lead = await db.query.leadsQueue.findFirst({
    where: and(eq(leadsQueue.id, leadId), eq(leadsQueue.profile_id, userId)),
  })

  if (!lead) {
    throw new Error('Lead not found or access denied')
  }

  // 2. Run Gate 1 relevance check if not yet verified
  if (!lead.gate_1_passed) {
    const competitorRow = lead.competitor_target_id
      ? await db.query.competitorTargets.findFirst({
          where: eq(competitorTargets.id, lead.competitor_target_id),
          columns: { competitor_name: true },
        })
      : null

    const competitorName = competitorRow?.competitor_name || 'Competitor'
    const classification = await runGate1(lead.raw_content, competitorName, 15000)

    if (!classification.passed) {
      // Delete the lead from leads_queue immediately if rejected by AI Gate 1
      await db.delete(leadsQueue).where(eq(leadsQueue.id, leadId))

      return {
        result: 'REJECTED',
        processing_time_ms: Date.now() - pipelineStart,
      }
    }

    // Mark Gate 1 passed before billing check
    await db
      .update(leadsQueue)
      .set({
        gate_1_passed: true,
        gate_1_model_used: classification.model_used,
      })
      .where(eq(leadsQueue.id, leadId))

    lead.gate_1_passed = true
    lead.gate_1_model_used = classification.model_used
  }

  // 3. Billing Check & Balance Consumption (atomic TypeScript transaction — replaces SQL stored procedure)
  const creditResult = await consumeCycleCredit(userId, leadId)

  if (creditResult === 'INSUFFICIENT_BALANCE') {
    await updateLeadAfterPipeline(leadId, {
      gate_1_passed: true,
      status: 'PENDING_PAYMENT',
      processing_time_ms: Date.now() - pipelineStart,
    })
    return {
      result: 'PENDING_PAYMENT',
      reason: 'Insufficient credits. Top up to continue.',
      processing_time_ms: Date.now() - pipelineStart,
    }
  }

  // 4. Generate reply via Gate 2
  const profile = await getProfile(userId)

  if (!profile) {
    throw new Error('Profile not found')
  }

  const elapsedMs = Date.now() - pipelineStart
  const PIPELINE_TIMEOUT_MS = 145_000
  const gate2TimeoutMs = Math.max(10_000, PIPELINE_TIMEOUT_MS - elapsedMs - 2_000)

  let gate2Result
  try {
    gate2Result = await runGate2(
      lead.raw_content,
      lead.author_username,
      lead.platform as Platform,
      profile,
      gate2TimeoutMs
    )
  } catch (err) {
    console.error('[pipeline] Gate 2 reply generation failed:', err)
    // Refund consumed credit if Gate 2 failed
    try {
      if (creditResult === 'FREE_DEMO') {
        await db
          .update(profiles)
          .set({ free_demo_credits_remaining: sql`${profiles.free_demo_credits_remaining} + 1` })
          .where(eq(profiles.id, userId))
      } else if (creditResult === 'CHARGED') {
        await db
          .update(profiles)
          .set({ credit_balance: sql`COALESCE(${profiles.credit_balance}, 0) + 0.10` })
          .where(eq(profiles.id, userId))

        await db.insert(billingLedger).values({
          profile_id: userId,
          lead_id: leadId,
          amount_usd: '0.1000',
          transaction_type: 'REFUND_FAILED_GENERATION',
        })
      }
    } catch (refundErr) {
      console.error('[pipeline] Failed to refund credit after Gate 2 error:', refundErr)
    }

    // Revert to PENDING so user can retry
    await updateLeadAfterPipeline(leadId, {
      gate_1_passed: true,
      status: 'PENDING',
      processing_time_ms: Date.now() - pipelineStart,
    })
    throw err
  }

  // 5. Save the generated draft reply and return success result
  const totalMs = Date.now() - pipelineStart
  await updateLeadAfterPipeline(leadId, {
    gate_1_passed: true,
    gate_1_model_used: lead.gate_1_model_used || 'pre-verified',
    gate_2_generated_reply: gate2Result.reply,
    gate_2_model_used: gate2Result.model_used,
    status: 'PENDING',
    processing_time_ms: totalMs,
  })

  return {
    result: 'SUCCESS',
    credit_type: creditResult,
    reply: gate2Result.reply,
    processing_time_ms: totalMs,
  }
}

// Expose mapWithConcurrency for batch route
export { mapWithConcurrency, CONCURRENCY_SCRAPE_TARGETS }
