import { NextRequest, NextResponse } from 'next/server'
import { verifyJwt } from '../../../lib/verifyJwt'
import { LinkCanvasSchema } from '../../../schemas/auth'
import { linkCanvasUser } from '../../../services/authService'
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin'

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}

// POST /api/auth/link-canvas — requires Bearer JWT of the web app user.
// Associates the authenticated web user with the given canvas_user_id,
// enabling the extension to display the web account info on next open.
export async function POST(req: NextRequest) {
  try {
    const { userId } = await verifyJwt(req.headers.get('Authorization'))
    const body: unknown = await req.json()
    const input = LinkCanvasSchema.parse(body)

    // Fetch web user's display info from Supabase Auth
    const {
      data: { user },
    } = await getSupabaseAdmin().auth.admin.getUserById(userId)
    const displayName =
      (user?.user_metadata?.full_name as string | undefined) ??
      (user?.user_metadata?.name as string | undefined) ??
      null
    const email = user?.email ?? null

    await linkCanvasUser(userId, displayName, email, input)
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    const status = message.includes('JWT') || message.includes('Authorization') ? 401 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
