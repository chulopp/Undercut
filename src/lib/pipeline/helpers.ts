import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { updateLeadAfterPipeline } from '@/lib/server-data'
import { scrapeX, scrapeInstagram } from '@/lib/scraper'
import { fuzzyPreFilter } from '@/lib/fud-keywords'
import { runGate1 } from '@/lib/pipeline/gate1'
import { runGate2 } from '@/lib/pipeline/gate2'
import type { Platform, Competitor } from '@/lib/types'
import { mapWithConcurrency, CONCURRENCY_SCRAPE_TARGETS } from './concurrency'
import { insertLeads } from '@/lib/server-data'

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

    // 3. Deduplicate (scoped by profile_id)
    const ids = fuzzyPassed.map((p) => p.external_post_id)
    const admin = createServiceRoleClient()
    const { data: existing } = await admin
      .from('leads_queue')
      .select('external_post_id')
      .eq('profile_id', userId)
      .in('external_post_id', ids)

    const existingIds = new Set((existing ?? []).map((e) => e.external_post_id))
    const deduplicated = fuzzyPassed.filter((p) => !existingIds.has(p.external_post_id))
    result.duplicates = existingIds.size

    if (deduplicated.length === 0) {
      return result
    }

    // 4. Insert all posts as PENDING (gate_1_passed=false — Gate 1 runs on "Generate Draft")
    const postsToInsert = deduplicated.map((p) => ({
      ...p,
      gate_1_passed: false,
      status: 'PENDING' as const,
    }))

    const { inserted } = await insertLeads(
      userId,
      target.id,
      target.platform,
      postsToInsert
    )

    result.inserted = inserted
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
 * 2. Consume credit
 * 3. Run Gate 2 to generate personalized reply draft
 * 4. Save result to DB
 */
export async function processLeadPipeline(
  userId: string,
  leadId: string
): Promise<ProcessLeadResult> {
  const pipelineStart = Date.now()

  // 1. Fetch lead (ensure owner check)
  const admin = createServiceRoleClient()
  const { data: lead, error: leadErr } = await admin
    .from('leads_queue')
    .select('*')
    .eq('id', leadId)
    .eq('profile_id', userId)
    .single()

  if (leadErr || !lead) {
    throw new Error('Lead not found or access denied')
  }

  // 2. Run Gate 1 relevance check if not yet verified
  if (!lead.gate_1_passed) {
    const { data: competitor } = await admin
      .from('competitor_targets')
      .select('competitor_name')
      .eq('id', lead.competitor_target_id)
      .single()

    const competitorName = competitor?.competitor_name || 'Competitor'
    const classification = await runGate1(lead.raw_content, competitorName, 15000)

    if (!classification.passed) {
      // Delete the lead from leads_queue immediately if rejected by AI Gate 1
      await admin.from('leads_queue').delete().eq('id', leadId)

      return {
        result: 'REJECTED',
        processing_time_ms: Date.now() - pipelineStart,
      }
    }

    // Mark Gate 1 passed before billing check
    await admin
      .from('leads_queue')
      .update({
        gate_1_passed: true,
        gate_1_model_used: classification.model_used,
      })
      .eq('id', leadId)

    lead.gate_1_passed = true
    lead.gate_1_model_used = classification.model_used
  }

  // 3. Billing Check & Balance Consumption
  const { data: creditResult, error: creditErr } = await admin
    .rpc('consume_cycle_credit', {
      p_profile_id: userId,
      p_lead_id: leadId,
    })

  if (creditErr) {
    throw new Error(`Credit check failed: ${creditErr.message}`)
  }

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
  const { data: profile, error: profileErr } = await admin
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (profileErr || !profile) {
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
      lead.platform,
      profile,
      gate2TimeoutMs
    )
  } catch (err) {
    console.error('[pipeline] Gate 2 reply generation failed:', err)
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
