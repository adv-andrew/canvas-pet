import { NextRequest, NextResponse } from 'next/server'
import { verifyJwt } from '../../../../lib/verifyJwt'
import { getCanvasUserIdForAuthUser } from '../../../../services/authService'
import { pinAssignment, unpinAssignment } from '../../../../services/assignmentService'

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}

// POST /api/assignments/[id]/pin?institution_url=<url>
export async function POST(
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
    await pinAssignment(canvasUserId, institutionUrl, assignmentId)
    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    const status = message.includes('JWT') || message.includes('Authorization') ? 401 : 400
    return NextResponse.json({ error: message }, { status })
  }
}

// DELETE /api/assignments/[id]/pin?institution_url=<url>
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
    await unpinAssignment(canvasUserId, institutionUrl, assignmentId)
    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    const status = message.includes('JWT') || message.includes('Authorization') ? 401 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
