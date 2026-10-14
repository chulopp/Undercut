import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { listLedger, listTransactions } from '@/lib/server-data'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [ledger, transactions] = await Promise.all([
    listLedger(session.user.id),
    listTransactions(session.user.id),
  ])

  return NextResponse.json({ ledger, transactions })
}
