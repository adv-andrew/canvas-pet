import { NextRequest, NextResponse } from 'next/server'
import { verifyJwt } from '../../../../src/lib/verifyJwt'
import { getSupabaseAdmin } from '../../../../src/lib/supabaseAdmin'

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}

// GET /api/auth/profile — requires Bearer JWT
// Works for both canvas-keyed users and web app users:
// - Canvas-keyed user: returns canvas info + web link status
// - Web app user (Google/email): checks if linked to a canvas identity via web_user_id
// - Unlinked user: returns { canvas_linked: false }
export async function GET(req: NextRequest) {
  try {
    const { userId } = await verifyJwt(req.headers.get('Authorization'))

    const { data: canvasUser } = await getSupabaseAdmin()
      .from('canvas_users')
      .select('canvas_user_id, institution_url, display_name, email, web_user_id, web_display_name, web_email, canvas_token')
      .or(`id.eq.${userId},web_user_id.eq.${userId}`)
      .maybeSingle()

    if (!canvasUser) {
      return NextResponse.json({ canvas_linked: false })
    }

    return NextResponse.json({
      canvas_linked: true,
      canvas_user_id: canvasUser.canvas_user_id,
      institution_url: canvasUser.institution_url,
      display_name: canvasUser.display_name,
      email: canvasUser.email,
      web_linked: canvasUser.web_user_id !== null,
      web_display_name: canvasUser.web_display_name ?? null,
      web_email: canvasUser.web_email ?? null,
      // Whether a Canvas API token has been stored — used by the web app to show
      // a "connect via extension" prompt when no token is available yet.
      canvas_token_stored: canvasUser.canvas_token !== null,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    const status = message.includes('JWT') || message.includes('Authorization') ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
