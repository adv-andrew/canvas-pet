import { NextRequest, NextResponse } from 'next/server'
import { verifyJwt } from '../../lib/verifyJwt'
import { getSupabaseAdmin } from '../../lib/supabaseAdmin'

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}

export async function GET(req: NextRequest) {
  try {
    await verifyJwt(req.headers.get('Authorization'))
    const { data, error } = await getSupabaseAdmin()
      .from('shop_items')
      .select('id, name, description, cost, image_url')
      .eq('active', true)
      .order('cost', { ascending: true })
    if (error) throw new Error(error.message)
    return NextResponse.json({ data }, { headers: { 'Cache-Control': 'private, max-age=10' } })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    const status = message.includes('JWT') || message.includes('Authorization') ? 401 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
