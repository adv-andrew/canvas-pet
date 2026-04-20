import { NextRequest, NextResponse } from 'next/server'
import { verifyJwt } from '../../../lib/verifyJwt'
import { getCanvasUserIdForAuthUser } from '../../../services/authService'
import { fetchPinnedIds, setPinnedAssignments } from '../../../services/assignmentService'

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}

// GET /api/assignments/pinned?institution_url=<url>
export async function GET(req: NextRequest) {
  try {
    const { userId } = await verifyJwt(req.headers.get('Authorization'))
    const institutionUrl = req.nextUrl.searchParams.get('institution_url')
    if (!institutionUrl) {
      return NextResponse.json({ error: 'institution_url query param is required' }, { status: 400 })
    }
    const canvasUserId = await getCanvasUserIdForAuthUser(userId)
    const ids = await fetchPinnedIds(canvasUserId, institutionUrl)
    return NextResponse.json({ data: ids }, { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    const status = message.includes('JWT') || message.includes('Authorization') ? 401 : 400
    return NextResponse.json({ error: message }, { status })
  }
}

// PUT /api/assignments/pinned — replaces the full pinned set for this user+institution
// Body: { ids: number[], institution_url: string }
export async function PUT(req: NextRequest) {
  try {
    const { userId } = await verifyJwt(req.headers.get('Authorization'))
    const body = (await req.json()) as { ids: number[]; institution_url: string }
    if (!body.institution_url) {
      return NextResponse.json({ error: 'institution_url is required' }, { status: 400 })
    }
    const canvasUserId = await getCanvasUserIdForAuthUser(userId)
    await setPinnedAssignments(canvasUserId, body.institution_url, body.ids ?? [])
    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    const status = message.includes('JWT') || message.includes('Authorization') ? 401 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
