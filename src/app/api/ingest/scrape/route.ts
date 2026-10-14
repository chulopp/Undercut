import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { listCompetitors, getLastScrapeTime } from '@/lib/server-data'
import { mapWithConcurrency, CONCURRENCY_SCRAPE_TARGETS } from '@/lib/pipeline/concurrency'
import { processScrapeTarget } from '@/lib/pipeline/helpers'
import type { Platform } from '@/lib/types'

// Auto-scrape throttle: 10 times per day = once per 2.4 hours
// Manual "Scrape More" button bypasses this if force=true
const AUTO_SCRAPE_INTERVAL_MS = (24 * 60 * 60 * 1000) / 10 // 2.4 hours

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id

  let body: {
    competitor_target_id?: string
    platform?: Platform
    force?: boolean // if true, skip throttle check (manual "Scrape More")
  } = {}
  try {
    body = await request.json().catch(() => ({}))
  } catch { /* ignore */ }

  const { competitor_target_id, platform, force = false } = body

  // Fetch active competitors to scrape
  const allCompetitors = await listCompetitors(userId, platform)
  const targets = competitor_target_id
    ? allCompetitors.filter((c) => c.id === competitor_target_id)
    : allCompetitors.filter((c) => c.is_active)

  if (targets.length === 0) {
    return NextResponse.json({
      message: 'No active competitor targets found.',
      scraped: 0,
      filtered: 0,
      inserted: 0,
      duplicates: 0,
      targets: [],
    })
  }

  // Throttle check: for auto-scrape, check when we last scraped this platform
  if (!force && targets.length > 0) {
    const checkPlatform = platform ?? targets[0].platform as Platform
    const lastScrape = await getLastScrapeTime(userId, checkPlatform)
    if (lastScrape) {
      const msSinceLast = Date.now() - lastScrape.getTime()
      if (msSinceLast < AUTO_SCRAPE_INTERVAL_MS) {
        const nextScrapeIn = Math.ceil((AUTO_SCRAPE_INTERVAL_MS - msSinceLast) / 60000)
        return NextResponse.json({
          message: `Auto-scrape throttled. Next scrape available in ~${nextScrapeIn} minutes. Use force=true to scrape manually.`,
          throttled: true,
          next_scrape_in_minutes: nextScrapeIn,
        })
      }
    }
  }

  // Process scrape targets concurrently using concurrency helper (default limit: 2)
  const targetResults = await mapWithConcurrency(
    targets,
    CONCURRENCY_SCRAPE_TARGETS,
    (target) => processScrapeTarget(userId, target)
  )

  let totalScraped = 0
  let totalFiltered = 0
  let totalInsertedPending = 0
  let totalDuplicates = 0
  const errors: string[] = []

  for (const r of targetResults) {
    totalScraped += r.scraped
    totalFiltered += r.fuzzy_filtered
    totalInsertedPending += r.inserted
    totalDuplicates += r.duplicates
    if (r.error) {
      errors.push(`${r.competitor_name}: ${r.error}`)
    }
  }

  return NextResponse.json({
    message: `Scrape complete.`,
    scraped: totalScraped,
    fuzzy_filtered: totalFiltered,
    inserted: totalInsertedPending,
    duplicates: totalDuplicates,
    targets_processed: targets.length,
    targets: targetResults,
    error: errors.length > 0 ? errors.join('; ') : undefined,
  })
}
