import { NextRequest, NextResponse } from 'next/server'
import { verifyJwt } from '../../lib/verifyJwt'
import { getSupabaseAdmin } from '../../lib/supabaseAdmin'

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await verifyJwt(req.headers.get('Authorization'))
    const { data } = await getSupabaseAdmin()
      .from('canvas_users')
      .select('happiness_score, streak, reward_points')
      .or(`id.eq.${userId},web_user_id.eq.${userId}`)
      .maybeSingle()

    return NextResponse.json({
      happiness_score: data?.happiness_score ?? 50,
      streak: data?.streak ?? 0,
      reward_points: data?.reward_points ?? 0,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    const status = message.includes('JWT') || message.includes('Authorization') ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
