import { NextRequest, NextResponse } from 'next/server'
import { verifyJwt } from '../../../lib/verifyJwt'
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin'

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await verifyJwt(req.headers.get('Authorization'))

    const { data: canvasUser, error: userErr } = await getSupabaseAdmin()
      .from('canvas_users')
      .select('id')
      .or(`id.eq.${userId},web_user_id.eq.${userId}`)
      .maybeSingle()
    if (userErr) throw new Error(userErr.message)
    if (!canvasUser) return NextResponse.json({ data: [] })

    const { data, error } = await getSupabaseAdmin()
      .from('user_items')
      .select('item_id, unlocked_at, shop_items(id, name, description, image_url)')
      .eq('user_id', canvasUser.id)
    if (error) throw new Error(error.message)
    return NextResponse.json({ data }, { headers: { 'Cache-Control': 'private, max-age=10' } })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    const status = message.includes('JWT') || message.includes('Authorization') ? 401 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
