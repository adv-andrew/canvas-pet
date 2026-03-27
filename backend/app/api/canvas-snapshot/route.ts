// NOTE: In-memory store requires a persistent server process. Not compatible with serverless/Edge deployments.
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyJwt } from '../../../src/lib/verifyJwt'
import { getCanvasUserIdForAuthUser } from '../../../src/services/authService'

const store = new Map<string, { items: unknown[]; announcements: unknown[]; exp: number }>()

const SnapshotBodySchema = z.object({
  items: z.array(z.unknown()),
  announcements: z.array(z.unknown()),
})

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}

// POST /api/canvas-snapshot — stores a Canvas data snapshot for the authenticated user.
// The snapshot expires after 10 minutes and is consumed (deleted) on first GET.
export async function POST(req: NextRequest) {
  try {
    const { userId } = await verifyJwt(req.headers.get('Authorization'))
    const canvasUserId = await getCanvasUserIdForAuthUser(userId)
    const body: unknown = await req.json()
    const { items, announcements } = SnapshotBodySchema.parse(body)
    store.set(canvasUserId, { items, announcements, exp: Date.now() + 10 * 60 * 1000 })
    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    const status = message.includes('JWT') || message.includes('Authorization') ? 401 : 400
    return NextResponse.json({ error: message }, { status })
  }
}

// GET /api/canvas-snapshot — retrieves and immediately deletes the stored snapshot.
// Returns empty arrays if the snapshot is missing or expired.
export async function GET(req: NextRequest) {
  try {
    const { userId } = await verifyJwt(req.headers.get('Authorization'))
    const canvasUserId = await getCanvasUserIdForAuthUser(userId)
    const entry = store.get(canvasUserId)
    store.delete(canvasUserId)
    if (!entry || entry.exp < Date.now()) {
      return NextResponse.json({ items: [], announcements: [] }, { status: 200 })
    }
    return NextResponse.json({ items: entry.items, announcements: entry.announcements }, { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    const status = message.includes('JWT') || message.includes('Authorization') ? 401 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
