import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { listLeads } from '@/lib/server-data'
import { db } from '@/lib/db'
import { leadsQueue } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import type { Platform } from '@/lib/types'

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const platform = searchParams.get('platform') as Platform | null
  const filter = (searchParams.get('filter') ?? 'PENDING') as 'PENDING' | 'ALL'

  const leads = await listLeads(session.user.id, platform ?? undefined, filter)
  return NextResponse.json(leads)
}

export async function DELETE(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const platform = searchParams.get('platform') as Platform | null
  if (!platform) return NextResponse.json({ error: 'Missing platform' }, { status: 400 })

  try {
    await db
      .delete(leadsQueue)
      .where(and(eq(leadsQueue.profile_id, session.user.id), eq(leadsQueue.platform, platform)))
    return NextResponse.json({ cleared: true })
  } catch (err) {
    console.error('[leads] clear leads error:', err)
    return NextResponse.json({ error: 'Failed to clear leads' }, { status: 500 })
  }
}
