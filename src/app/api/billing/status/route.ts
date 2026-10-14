import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getBillingStatus } from '@/lib/server-data'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const status = await getBillingStatus(session.user.id)
  if (!status) return NextResponse.json({ error: 'Failed to fetch billing status' }, { status: 500 })

  return NextResponse.json(status)
}
