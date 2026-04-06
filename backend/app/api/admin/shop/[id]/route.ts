import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '../../../../lib/requireAdmin'
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin'
import { UpdateShopItemSchema } from '../../../../schemas/shop'

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin(req.headers.get('Authorization'))
    const { id } = await params
    const body: unknown = await req.json()
    const input = UpdateShopItemSchema.parse(body)
    const { data, error } = await getSupabaseAdmin()
      .from('shop_items')
      .update(input)
      .eq('id', id)
      .select()
      .single()
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
