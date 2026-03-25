import { createHmac } from 'crypto'
import { supabaseAdmin } from '../lib/supabaseAdmin'
import type { RegisterCanvasUserInput, ExtensionAuthInput } from '../schemas/auth'

// Creates or signs in the Supabase Auth user for a given Canvas identity, then
// upserts their canvas_users row atomically. No JWT required — this IS the auth step.
// The password is a keyed HMAC so external actors cannot forge credentials without
// knowing EXTENSION_SECRET.
export async function signInExtensionUser(input: ExtensionAuthInput) {
  const secret = process.env.EXTENSION_SECRET!
  const email = `canvas_${input.canvas_user_id}@canvaspet.internal`
  const password = createHmac('sha256', secret)
    .update(`${input.canvas_user_id}:${input.institution_url}`)
    .digest('hex')

  // Happy path: returning user — sign in and update canvas_users
  const { data: signInData, error: signInError } =
    await supabaseAdmin.auth.signInWithPassword({ email, password })

  if (!signInError && signInData.session) {
    await upsertCanvasUser(signInData.session.user.id, input)
    return signInData.session
  }

  // New user — create auth account, upsert canvas_users, then sign in
  const { data: created, error: createError } =
    await supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true })
  if (createError || !created.user) {
    throw new Error(`Failed to create extension user: ${createError?.message}`)
  }
  await upsertCanvasUser(created.user.id, input)

  const { data, error } = await supabaseAdmin.auth.signInWithPassword({ email, password })
  if (error || !data.session) throw new Error(`Extension auth failed: ${error?.message}`)
  return data.session
}

// Upserts a canvas_users row keyed on the Supabase Auth user ID.
// Called atomically inside signInExtensionUser (new users) and by POST /api/auth
// (subsequent sessions / web app token flow).
export async function upsertCanvasUser(
  supabaseAuthUserId: string,
  input: RegisterCanvasUserInput,
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('canvas_users')
    .upsert(
      {
        id: supabaseAuthUserId,
        canvas_user_id: input.canvas_user_id,
        institution_url: input.institution_url,
        email: input.email ?? null,
        display_name: input.display_name ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    )
  if (error) throw new Error(`Failed to upsert canvas user: ${error.message}`)
}

// Returns the Canvas user ID stored for a given Supabase Auth user.
// All write routes call this so the server resolves the Canvas identity from
// the JWT — the client never gets to claim a canvas_user_id directly.
export async function getCanvasUserIdForAuthUser(
  supabaseAuthUserId: string,
): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from('canvas_users')
    .select('canvas_user_id')
    .eq('id', supabaseAuthUserId)
    .single()
  if (error || !data) throw new Error('Canvas user not found — call POST /api/auth first')
  return data.canvas_user_id as string
}
