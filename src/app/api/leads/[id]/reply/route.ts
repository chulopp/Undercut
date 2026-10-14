import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { updateLeadStatus } from '@/lib/server-data'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const success = await updateLeadStatus(session.user.id, id, 'REPLIED')
  if (!success) return NextResponse.json({ error: 'Failed to mark lead as replied' }, { status: 500 })

  return NextResponse.json({ status: 'REPLIED' })
}
