import { NextRequest, NextResponse } from 'next/server'
import { decayHappinessForOverdue } from '../../../services/happinessService'

const CRON_SECRET = process.env.CRON_SECRET

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const affected = await decayHappinessForOverdue()
    return NextResponse.json({ ok: true, users_affected: affected })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
