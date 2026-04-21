import { NextRequest, NextResponse } from 'next/server'
import { verifyJwt } from '../../../../lib/verifyJwt'
import { completeAssignment } from '../../../../services/assignmentService'
import { updateStreakOnCompletion } from '../../../../services/streakService'
import { calculateAward, awardPoints } from '../../../../services/rewardPointsService'
import { applyHappiness } from '../../../../services/happinessService'
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin'

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await verifyJwt(req.headers.get('Authorization'))
    const { id } = await params
    const assignmentId = parseInt(id, 10)
    if (isNaN(assignmentId)) {
      return NextResponse.json({ error: 'Invalid assignment id' }, { status: 400 })
    }
    const institutionUrl = req.nextUrl.searchParams.get('institution_url')
    if (!institutionUrl) {
      return NextResponse.json({ error: 'institution_url query param is required' }, { status: 400 })
    }

    const dueDate = req.nextUrl.searchParams.get('due_date') ?? undefined

    // Resolve canvas_users.id (PK) and canvas_user_id in one query.
    // Extension users: canvas_users.id = their auth UUID.
    // Web-linked users: canvas_users.web_user_id = their auth UUID; id is the extension UUID.
    const { data: cuRow } = await getSupabaseAdmin()
      .from('canvas_users')
      .select('id, canvas_user_id')
      .or(`id.eq.${userId},web_user_id.eq.${userId}`)
      .maybeSingle()
    if (!cuRow) throw new Error('Canvas user not found — call POST /api/auth first')
    const canvasUsersPk = cuRow.id as string
    const canvasUserId = cuRow.canvas_user_id as string

    const row = await completeAssignment(canvasUserId, institutionUrl, assignmentId, dueDate)

    // Always apply happiness: use the assignment due date when known, otherwise
    // treat the completion time as the due date (hoursEarly = 0 → +5 delta).
    const happinessDueDate = row.due_date ?? dueDate ?? row.completed_at
    await applyHappiness(canvasUsersPk, row.completed_at, happinessDueDate)

    const newStreak = await updateStreakOnCompletion(canvasUsersPk, canvasUserId, institutionUrl, row.completed_at, row.due_date)
    const pointsEarned = calculateAward(row.completed_at, row.due_date, newStreak)
    await awardPoints(canvasUsersPk, pointsEarned)

    const { data: user } = await getSupabaseAdmin()
      .from('canvas_users')
      .select('happiness_score, streak, reward_points')
      .eq('id', canvasUsersPk)
      .single()

    return NextResponse.json({
      ok: true,
      completed_at: row.completed_at,
      happiness_score: user?.happiness_score ?? 50,
      streak: user?.streak ?? 0,
      reward_points: user?.reward_points ?? 0,
      points_earned: pointsEarned,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    const status =
      message.includes('JWT') || message.includes('Authorization') ? 401
      : message.includes('not found') ? 404
      : 400
    return NextResponse.json({ error: message }, { status })
  }
}
