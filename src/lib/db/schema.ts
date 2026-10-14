/**
 * schema.ts
 * Drizzle ORM schema for Undercut — Neon Postgres.
 * Mirrors the Supabase SQL schema 1:1 (types, constraints, defaults).
 */
import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  decimal,
  timestamp,
  jsonb,
  check,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

// ─── profiles ────────────────────────────────────────────────────────────────

export const profiles = pgTable('profiles', {
  id: varchar('id', { length: 255 }).primaryKey(), // sub from Google JWT (not UUID)
  email: varchar('email', { length: 255 }).notNull().unique(),

  // App Profile (filled during onboarding, used as Gate 2 context)
  app_name: varchar('app_name', { length: 100 }).notNull().default(''),
  app_description: text('app_description'),
  app_url: text('app_url'),
  app_category: varchar('app_category', { length: 100 }),
  target_audience: text('target_audience'),
  tone_of_voice: varchar('tone_of_voice', { length: 20 })
    .notNull()
    .default('friendly'),
  onboarding_completed: boolean('onboarding_completed').notNull().default(false),
  differentiators: jsonb('differentiators').notNull().default({
    differentiator_1: '',
    differentiator_2: '',
    differentiator_3: '',
  }),
  image_placeholder_url: text('image_placeholder_url').default(
    'https://via.placeholder.com/400x600.png?text=App+UI+Preview',
  ),
  company_name: varchar('company_name', { length: 150 }),

  // Wallet & Free Demo Credits
  credit_balance: decimal('credit_balance', { precision: 10, scale: 4 })
    .notNull()
    .default('0.0000'),
  free_demo_credits_remaining: integer('free_demo_credits_remaining')
    .notNull()
    .default(5),
  free_demo_reset_at: timestamp('free_demo_reset_at', { withTimezone: true })
    .notNull()
    .default(sql`NOW() + INTERVAL '7 days'`),
  payment_gateway_customer_id: varchar('payment_gateway_customer_id', { length: 100 }),
  x_plan: varchar('x_plan', { length: 20 }).notNull().default('free'),

  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .default(sql`NOW()`),
})

// ─── competitor_targets ───────────────────────────────────────────────────────

export const competitorTargets = pgTable('competitor_targets', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  profile_id: varchar('profile_id', { length: 255 })
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  competitor_name: varchar('competitor_name', { length: 100 }).notNull(),
  platform: varchar('platform', { length: 20 }).notNull(),
  search_query: varchar('search_query', { length: 255 }).notNull(),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .default(sql`NOW()`),
})

// ─── leads_queue ─────────────────────────────────────────────────────────────

export const leadsQueue = pgTable('leads_queue', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  profile_id: varchar('profile_id', { length: 255 })
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  competitor_target_id: uuid('competitor_target_id').references(
    () => competitorTargets.id,
    { onDelete: 'set null' },
  ),
  platform: varchar('platform', { length: 20 }).notNull(),
  external_post_id: varchar('external_post_id', { length: 100 }).notNull().unique(),
  author_username: varchar('author_username', { length: 100 }).notNull(),
  author_avatar_url: text('author_avatar_url'),
  raw_content: text('raw_content').notNull(),
  post_url: text('post_url').notNull(),
  gate_1_passed: boolean('gate_1_passed').notNull().default(false),
  gate_1_model_used: varchar('gate_1_model_used', { length: 100 }),
  gate_2_generated_reply: text('gate_2_generated_reply'),
  gate_2_model_used: varchar('gate_2_model_used', { length: 100 }),
  status: varchar('status', { length: 20 }).notNull().default('PENDING'),
  processing_time_ms: integer('processing_time_ms'),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .default(sql`NOW()`),
})

// ─── billing_ledger ───────────────────────────────────────────────────────────

export const billingLedger = pgTable('billing_ledger', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  profile_id: varchar('profile_id', { length: 255 })
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  lead_id: uuid('lead_id').references(() => leadsQueue.id, { onDelete: 'set null' }),
  amount_usd: decimal('amount_usd', { precision: 10, scale: 4 })
    .notNull()
    .default('-0.1000'),
  transaction_type: varchar('transaction_type', { length: 50 })
    .notNull()
    .default('GATE_2_GENERATION_FEE'),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .default(sql`NOW()`),
})

// ─── payment_transactions ─────────────────────────────────────────────────────

export const paymentTransactions = pgTable('payment_transactions', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  profile_id: varchar('profile_id', { length: 255 })
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  gateway: varchar('gateway', { length: 20 }).notNull().default('stripe'),
  gateway_order_id: varchar('gateway_order_id', { length: 100 }).notNull().unique(),
  top_up_amount_usd: decimal('top_up_amount_usd', { precision: 10, scale: 4 }).notNull(),
  credit_granted_usd: decimal('credit_granted_usd', { precision: 10, scale: 4 }).notNull(),
  amount_idr: integer('amount_idr').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('PENDING'),
  paid_at: timestamp('paid_at', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .default(sql`NOW()`),
})

// ─── webhook_events ───────────────────────────────────────────────────────────

export const webhookEvents = pgTable('webhook_events', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  gateway: varchar('gateway', { length: 20 }).notNull(),
  event_id: varchar('event_id', { length: 150 }).notNull().unique(),
  raw_payload: jsonb('raw_payload'),
  processed_at: timestamp('processed_at', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .default(sql`NOW()`),
})

// ─── Type exports (for use in API routes & components) ───────────────────────

export type Profile = typeof profiles.$inferSelect
export type NewProfile = typeof profiles.$inferInsert

export type CompetitorTarget = typeof competitorTargets.$inferSelect
export type NewCompetitorTarget = typeof competitorTargets.$inferInsert

export type LeadQueue = typeof leadsQueue.$inferSelect
export type NewLeadQueue = typeof leadsQueue.$inferInsert

export type BillingLedger = typeof billingLedger.$inferSelect
export type NewBillingLedger = typeof billingLedger.$inferInsert

export type PaymentTransaction = typeof paymentTransactions.$inferSelect
export type NewPaymentTransaction = typeof paymentTransactions.$inferInsert
