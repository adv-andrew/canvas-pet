import { getSupabaseAdmin } from '../lib/supabaseAdmin'

export async function updateStreakOnCompletion(
  supabaseUserId: string,
  canvasUserId: string,
  institutionUrl: string,
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

  // Only increment once per calendar day. Count how many on-time completions
  // exist for this user today — the current one is already saved, so count > 1
  // means another assignment was already completed today.
  const dayStart = completedAt.slice(0, 10) + 'T00:00:00.000Z'
  const dayEnd   = completedAt.slice(0, 10) + 'T23:59:59.999Z'

  const { count } = await getSupabaseAdmin()
    .from('saved_assignments')
    .select('*', { count: 'exact', head: true })
    .eq('canvas_user_id', canvasUserId)
    .eq('institution_url', institutionUrl)
    .not('completed_at', 'is', null)
    .gte('completed_at', dayStart)
    .lte('completed_at', dayEnd)

  const { data } = await getSupabaseAdmin()
    .from('canvas_users')
    .select('streak')
    .eq('id', supabaseUserId)
    .single()

  if ((count ?? 0) > 1) {
    return data?.streak ?? 0
  }

  const newStreak = (data?.streak ?? 0) + 1
  await getSupabaseAdmin()
    .from('canvas_users')
    .update({ streak: newStreak })
    .eq('id', supabaseUserId)

  return newStreak
}
