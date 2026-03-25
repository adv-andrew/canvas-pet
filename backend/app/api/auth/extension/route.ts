import { NextRequest, NextResponse } from 'next/server'
import { ExtensionAuthSchema } from '../../../../src/schemas/auth'
import { signInExtensionUser } from '../../../../src/services/authService'

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}

// POST /api/auth/extension — no JWT required, this IS the auth step.
// Creates or finds the Supabase Auth user for the given Canvas identity,
// upserts the canvas_users row atomically, and returns session tokens
// for the extension to store via supabaseAuth.setSession().
export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json()
    const input = ExtensionAuthSchema.parse(body)
    const session = await signInExtensionUser(input)
    return NextResponse.json(
      {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_in: session.expires_in,
        token_type: session.token_type,
      },
      { status: 200 },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
