import { NextRequest, NextResponse } from 'next/server'
import { verifyJwt } from '../../../../src/lib/verifyJwt'
import { supabaseAdmin } from '../../../../src/lib/supabaseAdmin'

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}

// GET /api/auth/me — requires Bearer JWT
// Returns the canvas_users record for the authenticated user, or { canvas_linked: false }
// if no Canvas identity has been linked to this account yet.
export async function GET(req: NextRequest) {
  try {
    const { userId } = await verifyJwt(req.headers.get('Authorization'))

    const { data: canvasUser } = await supabaseAdmin
      .from('canvas_users')
      .select('canvas_user_id, institution_url, display_name, email')
      .eq('id', userId)
      .maybeSingle()

    if (!canvasUser) {
      return NextResponse.json({ canvas_linked: false })
    }

    return NextResponse.json({ canvas_linked: true, ...canvasUser })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    const status = message.includes('JWT') || message.includes('Authorization') ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
