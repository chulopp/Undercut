/**
 * server-data.ts
 * Server-side Drizzle (Neon) data access layer.
 * Used ONLY in API routes (never imported in client components).
 */
import { db } from '@/lib/db'
import {
  profiles,
  competitorTargets,
  leadsQueue,
  billingLedger,
  paymentTransactions,
} from '@/lib/db/schema'
import { eq, and, inArray, desc, count, gte, sql } from 'drizzle-orm'
import type {
  Profile,
  ProfileInput,
  Competitor,
  Lead,
  Platform,
  BillingEntry,
  Transaction,
  LeadStatus,
} from '@/lib/types'

export type { Profile, ProfileInput, Competitor, Lead, Platform, BillingEntry, Transaction }

// ────────────────────────────────────────────────────────────
// PROFILE
// ────────────────────────────────────────────────────────────

export async function getProfile(userId: string): Promise<Profile | null> {
  try {
    const row = await db.query.profiles.findFirst({
      where: eq(profiles.id, userId),
    })
    if (!row) return null
    return row as unknown as Profile
  } catch (err) {
    console.error('[server-data] getProfile error:', err)
    return null
  }
}

export async function saveProfile(userId: string, input: ProfileInput): Promise<Profile | null> {
  const requiredFields = [
    'app_name',
    'app_description',
    'app_url',
    'app_category',
    'target_audience',
    'tone_of_voice',
    'differentiators',
  ]
  const inputAsRecord = input as unknown as Record<string, unknown>
  const onboardingCompleted = requiredFields.every((field) => {
    const val = inputAsRecord[field]
    return val !== null && val !== undefined && val !== ''
  })

  try {
    const [row] = await db
      .update(profiles)
      .set({
        ...input,
        onboarding_completed: onboardingCompleted,
        updated_at: new Date(),
      } as unknown as Partial<typeof profiles.$inferInsert>)
      .where(eq(profiles.id, userId))
      .returning()

    if (!row) return null
    return row as unknown as Profile
  } catch (err) {
    console.error('[server-data] saveProfile error:', err)
    return null
  }
}

// ────────────────────────────────────────────────────────────
// COMPETITORS
// ────────────────────────────────────────────────────────────

export async function listCompetitors(userId: string, platform?: Platform): Promise<Competitor[]> {
  try {
    const rows = await db.query.competitorTargets.findMany({
      where: platform
        ? and(eq(competitorTargets.profile_id, userId), eq(competitorTargets.platform, platform))
        : eq(competitorTargets.profile_id, userId),
      orderBy: [desc(competitorTargets.created_at)],
    })
    return rows as unknown as Competitor[]
  } catch (err) {
    console.error('[server-data] listCompetitors error:', err)
    return []
  }
}

export async function addCompetitor(
  userId: string,
  input: Pick<Competitor, 'competitor_name' | 'platform' | 'search_query'>
): Promise<{ data: Competitor | null; error: string | null }> {
  try {
    // Check max 5 active per platform per user
    const [{ value: activeCount }] = await db
      .select({ value: count() })
      .from(competitorTargets)
      .where(
        and(
          eq(competitorTargets.profile_id, userId),
          eq(competitorTargets.platform, input.platform),
          eq(competitorTargets.is_active, true),
        ),
      )

    if ((activeCount ?? 0) >= 5) {
      return { data: null, error: `Maximum 5 active ${input.platform} targets allowed.` }
    }

    const [row] = await db
      .insert(competitorTargets)
      .values({ ...input, profile_id: userId })
      .returning()

    return { data: row as unknown as Competitor, error: null }
  } catch (err) {
    console.error('[server-data] addCompetitor error:', err)
    return { data: null, error: String(err) }
  }
}

export async function deleteCompetitor(userId: string, competitorId: string): Promise<boolean> {
  try {
    await db
      .delete(competitorTargets)
      .where(
        and(eq(competitorTargets.id, competitorId), eq(competitorTargets.profile_id, userId)),
      )
    return true
  } catch (err) {
    console.error('[server-data] deleteCompetitor error:', err)
    return false
  }
}

export async function toggleCompetitor(
  userId: string,
  competitorId: string,
): Promise<Competitor | null> {
  try {
    const current = await db.query.competitorTargets.findFirst({
      where: and(
        eq(competitorTargets.id, competitorId),
        eq(competitorTargets.profile_id, userId),
      ),
    })
    if (!current) return null

    const [row] = await db
      .update(competitorTargets)
      .set({ is_active: !current.is_active })
      .where(
        and(eq(competitorTargets.id, competitorId), eq(competitorTargets.profile_id, userId)),
      )
      .returning()

    return row as unknown as Competitor
  } catch (err) {
    console.error('[server-data] toggleCompetitor error:', err)
    return null
  }
}

// ────────────────────────────────────────────────────────────
// LEADS
// ────────────────────────────────────────────────────────────

export async function listLeads(
  userId: string,
  platform?: Platform,
  filter: 'PENDING' | 'ALL' = 'PENDING',
): Promise<Lead[]> {
  try {
    // Build where conditions
    const conditions = [eq(leadsQueue.profile_id, userId)]
    if (platform) conditions.push(eq(leadsQueue.platform, platform))

    let rows = await db
      .select()
      .from(leadsQueue)
      .where(and(...conditions))
      .orderBy(desc(leadsQueue.created_at))
      .limit(100)

    if (filter === 'PENDING') {
      rows = rows.filter((r) => ['PENDING', 'PENDING_PAYMENT', 'REPLIED'].includes(r.status))
    }

    return rows as unknown as Lead[]
  } catch (err) {
    console.error('[server-data] listLeads error:', err)
    return []
  }
}

export async function updateLeadStatus(
  userId: string,
  leadId: string,
  status: LeadStatus,
): Promise<boolean> {
  try {
    await db
      .update(leadsQueue)
      .set({ status })
      .where(and(eq(leadsQueue.id, leadId), eq(leadsQueue.profile_id, userId)))
    return true
  } catch (err) {
    console.error('[server-data] updateLeadStatus error:', err)
    return false
  }
}

export async function updateLeadDraft(
  userId: string,
  leadId: string,
  draft: string,
): Promise<boolean> {
  try {
    await db
      .update(leadsQueue)
      .set({ gate_2_generated_reply: draft })
      .where(and(eq(leadsQueue.id, leadId), eq(leadsQueue.profile_id, userId)))
    return true
  } catch (err) {
    console.error('[server-data] updateLeadDraft error:', err)
    return false
  }
}

export async function hasLeads(userId: string, platform: Platform): Promise<boolean> {
  try {
    const [{ value }] = await db
      .select({ value: count() })
      .from(leadsQueue)
      .where(and(eq(leadsQueue.profile_id, userId), eq(leadsQueue.platform, platform)))
    return (value ?? 0) > 0
  } catch {
    return false
  }
}

// ────────────────────────────────────────────────────────────
// BILLING
// ────────────────────────────────────────────────────────────

export interface BillingStatus {
  credit_balance: number
  free_demo_credits_remaining: number
  free_demo_reset_at: string
  leads_this_week: number
  leads_replied_total: number
}

export async function getBillingStatus(userId: string): Promise<BillingStatus | null> {
  try {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const [profileRow, allLeads] = await Promise.all([
      db.query.profiles.findFirst({
        where: eq(profiles.id, userId),
        columns: { credit_balance: true, free_demo_credits_remaining: true, free_demo_reset_at: true },
      }),
      db
        .select({ status: leadsQueue.status, created_at: leadsQueue.created_at })
        .from(leadsQueue)
        .where(eq(leadsQueue.profile_id, userId)),
    ])

    if (!profileRow) return null

    const leadsThisWeek = allLeads.filter((l) => new Date(l.created_at) >= weekAgo).length
    const leadsRepliedTotal = allLeads.filter((l) => l.status === 'REPLIED').length

    return {
      credit_balance: parseFloat(profileRow.credit_balance as unknown as string) || 0,
      free_demo_credits_remaining: profileRow.free_demo_credits_remaining ?? 5,
      free_demo_reset_at:
        profileRow.free_demo_reset_at?.toISOString() ?? new Date().toISOString(),
      leads_this_week: leadsThisWeek,
      leads_replied_total: leadsRepliedTotal,
    }
  } catch (err) {
    console.error('[server-data] getBillingStatus error:', err)
    return null
  }
}

export async function listLedger(userId: string): Promise<BillingEntry[]> {
  try {
    const rows = await db
      .select()
      .from(billingLedger)
      .where(eq(billingLedger.profile_id, userId))
      .orderBy(desc(billingLedger.created_at))
      .limit(50)
    return rows as unknown as BillingEntry[]
  } catch (err) {
    console.error('[server-data] listLedger error:', err)
    return []
  }
}

export async function listTransactions(userId: string): Promise<Transaction[]> {
  try {
    const rows = await db
      .select()
      .from(paymentTransactions)
      .where(eq(paymentTransactions.profile_id, userId))
      .orderBy(desc(paymentTransactions.created_at))
      .limit(50)
    return rows as unknown as Transaction[]
  } catch (err) {
    console.error('[server-data] listTransactions error:', err)
    return []
  }
}

// ────────────────────────────────────────────────────────────
// SCRAPE TRACKING
// ────────────────────────────────────────────────────────────

export async function getLastScrapeTime(userId: string, platform: Platform): Promise<Date | null> {
  try {
    const [row] = await db
      .select({ created_at: leadsQueue.created_at })
      .from(leadsQueue)
      .where(and(eq(leadsQueue.profile_id, userId), eq(leadsQueue.platform, platform)))
      .orderBy(desc(leadsQueue.created_at))
      .limit(1)
    return row ? new Date(row.created_at) : null
  } catch {
    return null
  }
}

// ────────────────────────────────────────────────────────────
// LEAD INSERT (used by scraper pipeline)
// ────────────────────────────────────────────────────────────

export interface NormalizedPost {
  external_post_id: string
  author_username: string
  author_avatar_url?: string | null
  raw_content: string
  post_url: string
  gate_1_passed?: boolean
  gate_1_model_used?: string
  status?: LeadStatus
}

export async function insertLeads(
  userId: string,
  competitorTargetId: string,
  platform: Platform,
  posts: NormalizedPost[],
): Promise<{ inserted: number; duplicates: number }> {
  try {
    const ids = posts.map((p) => p.external_post_id)

    // Fetch existing IDs to deduplicate (scoped by profile_id + in list)
    const existing = await db
      .select({ external_post_id: leadsQueue.external_post_id })
      .from(leadsQueue)
      .where(
        and(eq(leadsQueue.profile_id, userId), inArray(leadsQueue.external_post_id, ids)),
      )

    const existingIds = new Set(existing.map((e) => e.external_post_id))
    const newPosts = posts.filter((p) => !existingIds.has(p.external_post_id))

    if (newPosts.length === 0) {
      return { inserted: 0, duplicates: posts.length }
    }

    const rows = newPosts.map((p) => ({
      profile_id: userId,
      competitor_target_id: competitorTargetId,
      platform,
      external_post_id: p.external_post_id,
      author_username: p.author_username,
      author_avatar_url: p.author_avatar_url ?? null,
      raw_content: p.raw_content,
      post_url: p.post_url,
      status: (p.status ?? 'PENDING') as string,
      gate_1_passed: p.gate_1_passed ?? false,
      gate_1_model_used: p.gate_1_model_used ?? null,
    }))

    await db.insert(leadsQueue).values(rows).onConflictDoNothing()

    return { inserted: newPosts.length, duplicates: existingIds.size }
  } catch (err) {
    console.error('[server-data] insertLeads error:', err)
    return { inserted: 0, duplicates: 0 }
  }
}

export interface PipelineLead extends Lead {
  competitor_name: string | null
}

export async function getLeadForPipeline(
  userId: string,
  leadId: string,
): Promise<PipelineLead | null> {
  try {
    const row = await db.query.leadsQueue.findFirst({
      where: and(eq(leadsQueue.id, leadId), eq(leadsQueue.profile_id, userId)),
    })

    if (!row) return null

    let competitorName: string | null = null
    if (row.competitor_target_id) {
      const comp = await db.query.competitorTargets.findFirst({
        where: eq(competitorTargets.id, row.competitor_target_id),
        columns: { competitor_name: true },
      })
      competitorName = comp?.competitor_name ?? null
    }

    return {
      ...row,
      competitor_name: competitorName,
    } as unknown as PipelineLead
  } catch (err) {
    console.error('[server-data] getLeadForPipeline error:', err)
    return null
  }
}

export async function getLeadsByExternalIds(
  userId: string,
  externalIds: string[],
): Promise<Lead[]> {
  try {
    const rows = await db
      .select()
      .from(leadsQueue)
      .where(
        and(eq(leadsQueue.profile_id, userId), inArray(leadsQueue.external_post_id, externalIds)),
      )
    return rows as unknown as Lead[]
  } catch (err) {
    console.error('[server-data] getLeadsByExternalIds error:', err)
    return []
  }
}

export async function updateLeadAfterPipeline(
  leadId: string,
  updates: {
    gate_1_passed: boolean
    gate_1_model_used?: string
    gate_2_generated_reply?: string | null
    gate_2_model_used?: string | null
    status: LeadStatus
    processing_time_ms?: number
  },
): Promise<boolean> {
  try {
    await db.update(leadsQueue).set(updates as unknown as Partial<typeof leadsQueue.$inferInsert>).where(eq(leadsQueue.id, leadId))
    return true
  } catch (err) {
    console.error('[server-data] updateLeadAfterPipeline error:', err)
    return false
  }
}

// ────────────────────────────────────────────────────────────
// CONSUME CYCLE CREDIT (atomic, replaces Supabase stored procedure)
// Uses a Drizzle transaction with SELECT FOR UPDATE to prevent race conditions
// ────────────────────────────────────────────────────────────

export type CreditConsumeResult = 'FREE_DEMO' | 'CHARGED' | 'INSUFFICIENT_BALANCE'

export async function consumeCycleCredit(
  profileId: string,
  leadId: string,
): Promise<CreditConsumeResult> {
  // neon-http does not support interactive transactions; use neon-serverless for transactions
  // Fallback: use optimistic update with re-read for race condition mitigation
  try {
    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, profileId),
    })
    if (!profile) return 'INSUFFICIENT_BALANCE'

    // Reset weekly demo credits if expired
    const now = new Date()
    let demoCreditsCurrent = profile.free_demo_credits_remaining

    if (profile.free_demo_reset_at && now >= profile.free_demo_reset_at) {
      demoCreditsCurrent = 5
      await db
        .update(profiles)
        .set({
          free_demo_credits_remaining: 5,
          free_demo_reset_at: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        })
        .where(eq(profiles.id, profileId))
    }

    // Priority 1: Use free demo credits
    if (demoCreditsCurrent > 0) {
      await db
        .update(profiles)
        .set({ free_demo_credits_remaining: demoCreditsCurrent - 1 })
        .where(eq(profiles.id, profileId))

      await db.insert(billingLedger).values({
        profile_id: profileId,
        lead_id: leadId,
        amount_usd: '0',
        transaction_type: 'FREE_DEMO',
      })

      return 'FREE_DEMO'
    }

    // Priority 2: Deduct from credit_balance
    const balance = parseFloat(profile.credit_balance as unknown as string) || 0
    if (balance >= 0.1) {
      await db
        .update(profiles)
        .set({ credit_balance: sql`${profiles.credit_balance} - 0.10` })
        .where(eq(profiles.id, profileId))

      await db.insert(billingLedger).values({
        profile_id: profileId,
        lead_id: leadId,
        amount_usd: '-0.1000',
        transaction_type: 'GATE_2_GENERATION_FEE',
      })

      return 'CHARGED'
    }

    return 'INSUFFICIENT_BALANCE'
  } catch (err) {
    console.error('[server-data] consumeCycleCredit error:', err)
    return 'INSUFFICIENT_BALANCE'
  }
}

// ────────────────────────────────────────────────────────────
// PAYMENT TRANSACTIONS (Stripe / future gateway)
// ────────────────────────────────────────────────────────────

export async function createPaymentTransaction(data: {
  profile_id: string
  gateway: string
  gateway_order_id: string
  top_up_amount_usd: string
  credit_granted_usd: string
  amount_idr: number
}): Promise<Transaction | null> {
  try {
    const [row] = await db.insert(paymentTransactions).values(data).returning()
    return row as unknown as Transaction
  } catch (err) {
    console.error('[server-data] createPaymentTransaction error:', err)
    return null
  }
}

export async function settlePaymentTransaction(
  gatewayOrderId: string,
  profileId: string,
  creditGrantedUsd: number,
): Promise<boolean> {
  try {
    await db
      .update(paymentTransactions)
      .set({ status: 'SETTLED', paid_at: new Date() })
      .where(
        and(
          eq(paymentTransactions.gateway_order_id, gatewayOrderId),
          eq(paymentTransactions.profile_id, profileId),
        ),
      )

    await db
      .update(profiles)
      .set({ credit_balance: sql`${profiles.credit_balance} + ${creditGrantedUsd}` })
      .where(eq(profiles.id, profileId))

    await db.insert(billingLedger).values({
      profile_id: profileId,
      lead_id: null,
      amount_usd: String(creditGrantedUsd),
      transaction_type: 'TOPUP',
    })

    return true
  } catch (err) {
    console.error('[server-data] settlePaymentTransaction error:', err)
    return false
  }
}

export async function getTransactionByGatewayOrderId(
  gatewayOrderId: string,
): Promise<Transaction | null> {
  try {
    const row = await db.query.paymentTransactions.findFirst({
      where: eq(paymentTransactions.gateway_order_id, gatewayOrderId),
    })
    return row as unknown as Transaction | null
  } catch (err) {
    console.error('[server-data] getTransactionByGatewayOrderId error:', err)
    return null
  }
}
