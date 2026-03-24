import { NextRequest, NextResponse } from 'next/server'
import { verifyJwt } from '../../../src/lib/verifyJwt'
import { getCanvasUserIdForAuthUser } from '../../../src/services/authService'
import { fetchSavedAssignments, saveAssignment } from '../../../src/services/assignmentService'
import { SaveAssignmentSchema } from '../../../src/schemas/assignments'

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}

// GET /api/assignments?institution_url=<url>
// Returns all saved assignments for the authenticated user at the given institution.
export async function GET(req: NextRequest) {
  try {
    const { userId } = await verifyJwt(req.headers.get('Authorization'))
    const institutionUrl = req.nextUrl.searchParams.get('institution_url')
    if (!institutionUrl) {
      return NextResponse.json({ error: 'institution_url query param is required' }, { status: 400 })
    }
    const canvasUserId = await getCanvasUserIdForAuthUser(userId)
    const data = await fetchSavedAssignments(canvasUserId, institutionUrl)
    return NextResponse.json({ data }, { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    const status =
      message.includes('JWT') || message.includes('Authorization') ? 401 : 400
    return NextResponse.json({ error: message }, { status })
  }
}

// POST /api/assignments
// Saves an assignment for the authenticated user.
// The canvas_user_id in the request body is verified against the server-resolved
// identity — clients cannot save assignments on behalf of other Canvas accounts.
export async function POST(req: NextRequest) {
  try {
    const { userId } = await verifyJwt(req.headers.get('Authorization'))
    const body: unknown = await req.json()
    const input = SaveAssignmentSchema.parse(body)

    const storedCanvasUserId = await getCanvasUserIdForAuthUser(userId)
    if (storedCanvasUserId !== input.canvas_user_id) {
      return NextResponse.json({ error: 'canvas_user_id mismatch' }, { status: 403 })
    }

    await saveAssignment(input)
    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    const status =
      message.includes('JWT') || message.includes('Authorization') ? 401
      : message.includes('mismatch') ? 403
      : 400
    return NextResponse.json({ error: message }, { status })
  }
}
