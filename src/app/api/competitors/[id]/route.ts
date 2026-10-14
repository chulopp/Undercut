import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { deleteCompetitor, toggleCompetitor } from '@/lib/server-data'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const success = await deleteCompetitor(session.user.id, id)
  if (!success) return NextResponse.json({ error: 'Failed to delete competitor' }, { status: 500 })

  return NextResponse.json({ deleted: true })
}

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const updated = await toggleCompetitor(session.user.id, id)
  if (!updated) return NextResponse.json({ error: 'Failed to toggle competitor' }, { status: 500 })

  return NextResponse.json(updated)
}
