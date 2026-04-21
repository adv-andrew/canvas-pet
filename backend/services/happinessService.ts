import { getSupabaseAdmin } from '../lib/supabaseAdmin'

const MIN_HAPPINESS = 0
const MAX_HAPPINESS = 100

/**
 * Calculate happiness delta based on submission timing.
 * Early submissions boost happiness, late submissions reduce it.
 */
export function calculateHappinessDelta(
  completedAt: Date | string,
  dueDate: Date | string,
): number {
  const completed = new Date(completedAt).getTime()
  const due = new Date(dueDate).getTime()
  const hoursEarly = (due - completed) / (1000 * 60 * 60)

  if (hoursEarly >= 48) return 15      // 2+ days early
  if (hoursEarly >= 24) return 10      // 1+ day early
  if (hoursEarly >= 0) return 5        // on time
  if (hoursEarly >= -24) return -5     // up to 1 day late
  if (hoursEarly >= -72) return -10    // up to 3 days late
  return -15                           // more than 3 days late
}

/**
 * Apply happiness change to a user's pet.
 */
export async function applyHappiness(
  userId: string,
  completedAt: Date | string,
  dueDate: Date | string,
): Promise<number> {
  const delta = calculateHappinessDelta(completedAt, dueDate)
  const supabase = getSupabaseAdmin()

  const { data: user } = await supabase
    .from('canvas_users')
    .select('happiness_score')
    .eq('id', userId)
    .single()

  const current = user?.happiness_score ?? 50
  const newScore = Math.max(MIN_HAPPINESS, Math.min(MAX_HAPPINESS, current + delta))

  await supabase
    .from('canvas_users')
    .update({ happiness_score: newScore })
    .eq('id', userId)

  return newScore
}

/**
 * Decay happiness for users with overdue assignments.
 * Called by scheduled cron job.
 */
export async function decayHappinessForOverdue(): Promise<number> {
  const supabase = getSupabaseAdmin()
  const now = new Date().toISOString()

  // Find users with incomplete overdue assignments
  const { data: overdueUsers } = await supabase
    .from('tracked_assignments')
    .select('canvas_user_id')
    .is('completed_at', null)
    .lt('due_date', now)

  if (!overdueUsers || overdueUsers.length === 0) return 0

  const userIds = [...new Set(overdueUsers.map((r) => r.canvas_user_id))]
  const decayAmount = 2

  for (const canvasUserId of userIds) {
    // Get auth user id from canvas_users
    const { data: user } = await supabase
      .from('canvas_users')
      .select('id, happiness_score')
      .eq('canvas_user_id', canvasUserId)
      .single()

    if (user) {
      const newScore = Math.max(MIN_HAPPINESS, user.happiness_score - decayAmount)
      await supabase
        .from('canvas_users')
        .update({ happiness_score: newScore })
        .eq('id', user.id)
    }
  }

  return userIds.length
}
