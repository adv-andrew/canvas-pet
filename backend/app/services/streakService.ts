import { getSupabaseAdmin } from '../lib/supabaseAdmin'

export async function updateStreakOnCompletion(
  supabaseUserId: string,
  completedAt: string,
  dueDate: string | null,
): Promise<number> {
  const isLate = dueDate !== null && new Date(completedAt) > new Date(dueDate)

  if (isLate) {
    await getSupabaseAdmin()
      .from('canvas_users')
      .update({ streak: 0 })
      .eq('id', supabaseUserId)
    return 0
  }

  // Increment. Supabase JS doesn't support relative increment directly,
  // so read-then-write. Acceptable for single-user sequential actions.
  const { data } = await getSupabaseAdmin()
    .from('canvas_users')
    .select('streak')
    .eq('id', supabaseUserId)
    .single()

  const newStreak = (data?.streak ?? 0) + 1

  await getSupabaseAdmin()
    .from('canvas_users')
    .update({ streak: newStreak })
    .eq('id', supabaseUserId)

  return newStreak
}
