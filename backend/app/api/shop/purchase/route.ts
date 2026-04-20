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

    const { data: item, error: itemErr } = await getSupabaseAdmin()
      .from('shop_items')
      .select('id, cost, name')
      .eq('id', item_id)
      .eq('active', true)
      .single()
    if (itemErr || !item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    const { data: existing } = await getSupabaseAdmin()
      .from('user_items')
      .select('item_id')
      .eq('user_id', userId)
      .eq('item_id', item_id)
      .maybeSingle()
    if (existing) {
      return NextResponse.json({ error: 'Already owned' }, { status: 400 })
    }

    await deductPoints(userId, item.cost)

    const { error: insertErr } = await getSupabaseAdmin()
      .from('user_items')
      .insert({ user_id: userId, item_id })
    if (insertErr) throw new Error(insertErr.message)

    const { data: user } = await getSupabaseAdmin()
      .from('canvas_users')
      .select('reward_points')
      .eq('id', userId)
      .single()

    return NextResponse.json({
      ok: true,
      item_name: item.name,
      reward_points: user?.reward_points ?? 0,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    const status =
      message.includes('JWT') || message.includes('Authorization') ? 401
      : message.includes('Insufficient') ? 400
      : 400
    return NextResponse.json({ error: message }, { status })
  }
}
