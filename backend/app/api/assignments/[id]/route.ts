import { NextRequest, NextResponse } from 'next/server'
import { verifyJwt } from '../../../../src/lib/verifyJwt'
import { getCanvasUserIdForAuthUser } from '../../../../src/services/authService'
import { unsaveAssignment } from '../../../../src/services/assignmentService'

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}

// DELETE /api/assignments/[id]?institution_url=<url>
// Unsaves an assignment. The canvas_user_id is resolved server-side from the JWT —
// the client cannot specify whose assignment to delete.
export async function DELETE(
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
    await unsaveAssignment(canvasUserId, institutionUrl, assignmentId)
    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    const status =
      message.includes('JWT') || message.includes('Authorization') ? 401 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
