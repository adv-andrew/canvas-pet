import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '../../../lib/requireAdmin'
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin'

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req.headers.get('Authorization'))
    const { data, error } = await getSupabaseAdmin()
      .from('canvas_users')
      .select('id, canvas_user_id, display_name, email, role, happiness_score, streak, reward_points, created_at')
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return NextResponse.json({ data }, { headers: { 'Cache-Control': 'private, max-age=10' } })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    const status =
      message.includes('JWT') || message.includes('Authorization') ? 401
      : message.includes('Admin') ? 403
      : 400
    return NextResponse.json({ error: message }, { status })
  }
}
