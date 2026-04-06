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
    else if (daysEarly >= 0) base = 5
    else return 0 // late
  }
  return base + Math.min(streak, 10)
}

export async function awardPoints(
  supabaseUserId: string,
  amount: number,
): Promise<void> {
  if (amount <= 0) return
  const { data } = await getSupabaseAdmin()
    .from('canvas_users')
    .select('reward_points')
    .eq('id', supabaseUserId)
    .single()
  const current = data?.reward_points ?? 0
  await getSupabaseAdmin()
    .from('canvas_users')
    .update({ reward_points: current + amount })
    .eq('id', supabaseUserId)
}

export async function deductPoints(
  supabaseUserId: string,
  amount: number,
): Promise<void> {
  const { data } = await getSupabaseAdmin()
    .from('canvas_users')
    .select('reward_points')
    .eq('id', supabaseUserId)
    .single()
  const current = data?.reward_points ?? 0
  if (current < amount) throw new Error('Insufficient points')
  const { error } = await getSupabaseAdmin()
    .from('canvas_users')
    .update({ reward_points: current - amount })
    .eq('id', supabaseUserId)
  if (error) throw new Error('Insufficient points')
}
