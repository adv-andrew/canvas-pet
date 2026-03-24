import { NextRequest, NextResponse } from 'next/server'
import { verifyJwt } from '../../../src/lib/verifyJwt'
import { RegisterCanvasUserSchema } from '../../../src/schemas/auth'
import { upsertCanvasUser } from '../../../src/services/authService'

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}

// POST /api/auth
// Registers or updates the Canvas user identity for the authenticated Supabase account.
// Must be called once after the extension receives Canvas data from the content script.
export async function POST(req: NextRequest) {
  try {
    const { userId } = await verifyJwt(req.headers.get('Authorization'))
    const body: unknown = await req.json()
    const input = RegisterCanvasUserSchema.parse(body)
    await upsertCanvasUser(userId, input)
    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    const status =
      message.includes('JWT') || message.includes('Authorization') ? 401 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
