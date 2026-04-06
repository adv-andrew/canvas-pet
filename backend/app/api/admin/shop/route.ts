import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '../../../lib/requireAdmin'
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin'
import { CreateShopItemSchema } from '../../../schemas/shop'

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req.headers.get('Authorization'))
    const { data, error } = await getSupabaseAdmin()
      .from('shop_items')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return NextResponse.json({ data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    const status =
      message.includes('JWT') || message.includes('Authorization') ? 401
      : message.includes('Admin') ? 403
      : 400
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req.headers.get('Authorization'))
    const body: unknown = await req.json()
    const input = CreateShopItemSchema.parse(body)
    const { data, error } = await getSupabaseAdmin()
      .from('shop_items')
      .insert(input)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    const status =
      message.includes('JWT') || message.includes('Authorization') ? 401
      : message.includes('Admin') ? 403
      : 400
    return NextResponse.json({ error: message }, { status })
  }
}
