import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { leadsQueue } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const lead = await db.query.leadsQueue.findFirst({
    where: and(eq(leadsQueue.id, id), eq(leadsQueue.profile_id, session.user.id)),
  })

  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  return NextResponse.json(lead)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  try {
    await db
      .delete(leadsQueue)
      .where(and(eq(leadsQueue.id, id), eq(leadsQueue.profile_id, session.user.id)))
    return NextResponse.json({ deleted: true })
  } catch (err) {
    console.error('[leads/[id]] delete lead error:', err)
    return NextResponse.json({ error: 'Failed to delete lead' }, { status: 500 })
  }
}
