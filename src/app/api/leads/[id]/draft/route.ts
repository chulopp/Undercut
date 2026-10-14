import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { updateLeadDraft } from '@/lib/server-data'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { draft: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (typeof body.draft !== 'string') {
    return NextResponse.json({ error: 'Missing "draft" field' }, { status: 400 })
  }

  const { id } = await params
  const success = await updateLeadDraft(session.user.id, id, body.draft)
  if (!success) return NextResponse.json({ error: 'Failed to update draft' }, { status: 500 })

  return NextResponse.json({ updated: true })
}
