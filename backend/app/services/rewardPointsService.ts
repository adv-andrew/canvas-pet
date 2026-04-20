import { getSupabaseAdmin } from '../lib/supabaseAdmin'

export function calculateAward(
  completedAt: string,
  dueDate: string | null,
  streak: number,
): number {
  let base = 5
  if (dueDate) {
    const due = new Date(dueDate).getTime()
    const done = new Date(completedAt).getTime()
    const msPerDay = 24 * 60 * 60 * 1000
    const daysEarly = (due - done) / msPerDay
    if (daysEarly >= 2) base = 15
    else if (daysEarly >= 1) base = 10
    else if (daysEarly < 0) return 0 // late
  }
  return base + Math.min(streak, 10)
}

// canvasUsersId must be canvas_users.id (the PK), not the Supabase Auth UID.
// Callers are responsible for resolving the PK first via .or('id.eq.X,web_user_id.eq.X').

export async function awardPoints(
  canvasUsersId: string,
  amount: number,
): Promise<void> {
  if (amount <= 0) return
  const { data } = await getSupabaseAdmin()
    .from('canvas_users')
    .select('reward_points')
    .eq('id', canvasUsersId)
    .single()
  const current = data?.reward_points ?? 0
  await getSupabaseAdmin()
    .from('canvas_users')
    .update({ reward_points: current + amount })
    .eq('id', canvasUsersId)
}

export async function deductPoints(
  canvasUsersId: string,
  amount: number,
): Promise<void> {
  const { data } = await getSupabaseAdmin()
    .from('canvas_users')
    .select('reward_points')
    .eq('id', canvasUsersId)
    .single()
  const current = data?.reward_points ?? 0
  if (current < amount) throw new Error('Insufficient points')
  const { error } = await getSupabaseAdmin()
    .from('canvas_users')
    .update({ reward_points: current - amount })
    .eq('id', canvasUsersId)
  if (error) throw new Error(error.message)
}
