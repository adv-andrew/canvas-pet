import { supabaseAdmin } from '../lib/supabaseAdmin'
import type { RegisterCanvasUserInput } from '../schemas/auth'

// Upserts a canvas_users row keyed on the Supabase Auth user ID.
// Called after the client signs in anonymously and reports their Canvas identity.
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
