import { NextRequest, NextResponse } from 'next/server'
import { verifyJwt } from '../../../lib/verifyJwt'
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin'
import { deductPoints } from '../../../services/rewardPointsService'
import { z } from 'zod'

const PurchaseSchema = z.object({
  item_id: z.string().uuid(),
})

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await verifyJwt(req.headers.get('Authorization'))
    const body: unknown = await req.json()
    const { item_id } = PurchaseSchema.parse(body)
    console.log('[purchase] auth userId:', userId, 'item_id:', item_id)

    // Resolve canvas_users row via auth UID (web users link via web_user_id, not id)
    const { data: canvasUser, error: userErr } = await getSupabaseAdmin()
      .from('canvas_users')
      .select('id, reward_points')
      .or(`id.eq.${userId},web_user_id.eq.${userId}`)
      .maybeSingle()
    if (userErr) throw new Error(userErr.message)
    if (!canvasUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    console.log('[purchase] canvas_users.id:', canvasUser.id, '| RP:', canvasUser.reward_points)

    const { data: item, error: itemErr } = await getSupabaseAdmin()
      .from('shop_items')
      .select('id, cost, name')
      .eq('id', item_id)
      .eq('active', true)
      .single()
    if (itemErr || !item) {
      console.log('[purchase] item lookup failed:', itemErr?.message)
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }
    console.log('[purchase] item:', item.name, '| cost:', item.cost)

    const { data: existing, error: existingErr } = await getSupabaseAdmin()
      .from('user_items')
      .select('item_id')
      .eq('user_id', canvasUser.id)
      .eq('item_id', item_id)
      .maybeSingle()
    if (existingErr) {
      console.log('[purchase] ownership check error:', existingErr.message)
      throw new Error(existingErr.message)
    }
    if (existing) {
      console.log('[purchase] already owned')
      return NextResponse.json({ error: 'Already owned' }, { status: 400 })
    }

    await deductPoints(canvasUser.id, item.cost)
    console.log('[purchase] points deducted successfully')

    const { error: insertErr } = await getSupabaseAdmin()
      .from('user_items')
      .insert({ user_id: canvasUser.id, item_id })
    if (insertErr) {
      console.log('[purchase] insert error:', insertErr.message)
      throw new Error(insertErr.message)
    }
    console.log('[purchase] user_items insert ok')

    const { data: userAfter } = await getSupabaseAdmin()
      .from('canvas_users')
      .select('reward_points')
      .eq('id', canvasUser.id)
      .single()
    console.log('[purchase] RP after purchase:', userAfter?.reward_points)

    return NextResponse.json({
      ok: true,
      item_name: item.name,
      reward_points: userAfter?.reward_points ?? 0,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.log('[purchase] caught error:', message)
    const status = message.includes('JWT') || message.includes('Authorization') ? 401 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
