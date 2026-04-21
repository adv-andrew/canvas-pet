import { NextRequest, NextResponse } from 'next/server'
import { verifyJwt } from '../../../../lib/verifyJwt'
import { getCanvasUserIdForAuthUser } from '../../../../services/authService'
import { completeAssignment } from '../../../../services/assignmentService'
import { updateStreakOnCompletion } from '../../../../services/streakService'
import { calculateAward, awardPoints } from '../../../../services/rewardPointsService'
import { applyHappiness } from '../../../services/happinessService'
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

    const canvasUserId = await getCanvasUserIdForAuthUser(userId)
    const row = await completeAssignment(canvasUserId, institutionUrl, assignmentId)

    await applyHappiness(userId, row.completed_at, row.due_date)

    const newStreak = await updateStreakOnCompletion(userId, row.completed_at, row.due_date)
    const pointsEarned = calculateAward(row.completed_at, row.due_date, newStreak)
    await awardPoints(userId, pointsEarned)

    const { data: user } = await getSupabaseAdmin()
      .from('canvas_users')
      .select('happiness_score, streak, reward_points')
      .eq('id', userId)
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
