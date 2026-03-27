/*
 * canvas-snapshot — NOT CURRENTLY IN USE
 *
 * What this file does:
 *   This route was designed as a backend relay between the Chrome extension panel and the web app.
 *   When the user clicked "Open Web App" in the extension panel, the panel would POST the Canvas
 *   assignments and announcements it had already fetched (using the browser's Canvas session cookie)
 *   to this endpoint. The backend would hold the data in memory with a 10-minute TTL and delete it
 *   on first read. The web app would then GET it on load to populate its dashboard.
 *
 *   This is purely a data relay — it has nothing to do with Canvas Access Token authentication.
 *   It does not make any Canvas API calls; it just temporarily stores and returns JSON that the
 *   extension already fetched.
 *
 * Why it is not being used:
 *   The GET endpoint caused 400 errors in the webapp because getCanvasUserIdForAuthUser throws
 *   when the authenticated web app user has not yet had their canvas_user_id written to the
 *   database — which happens the first time the extension pushes data, creating a race condition
 *   on initial setup.
 *
 *   The approach was replaced by passing Canvas data directly through chrome.storage.session:
 *   the extension content script writes fetched data to chrome.storage.session via the background
 *   service worker, then bridges it to the web app on localhost via window.postMessage
 *   (CP_CANVAS_DATA). This avoids the backend entirely for the data relay path and has no
 *   authentication dependency at the point of data transfer.
 *
 * To re-enable:
 *   Uncomment this file and restore the GET call in webapp/pages/Dashboard.tsx. The POST call
 *   in extension/panel/hooks/usePanelData.ts (handleConnectApp) still fires but is currently
 *   writing data that nobody reads — that call can be removed or re-wired when this is revived.
 *   Also note the in-memory store is incompatible with serverless/Edge deployments.
 */

// import { NextRequest, NextResponse } from 'next/server'
// import { z } from 'zod'
// import { verifyJwt } from '../../lib/verifyJwt'
// import { getCanvasUserIdForAuthUser } from '../../services/authService'
//
// const store = new Map<string, { items: unknown[]; announcements: unknown[]; exp: number }>()
//
// const SnapshotBodySchema = z.object({
//   items: z.array(z.unknown()),
//   announcements: z.array(z.unknown()),
// })
//
// export async function OPTIONS() {
//   return new NextResponse(null, { status: 204 })
// }
//
// // POST /api/canvas-snapshot — stores a Canvas data snapshot for the authenticated user.
// // The snapshot expires after 10 minutes and is consumed (deleted) on first GET.
// export async function POST(req: NextRequest) {
//   try {
//     const { userId } = await verifyJwt(req.headers.get('Authorization'))
//     const canvasUserId = await getCanvasUserIdForAuthUser(userId)
//     const body: unknown = await req.json()
//     const { items, announcements } = SnapshotBodySchema.parse(body)
//     store.set(canvasUserId, { items, announcements, exp: Date.now() + 10 * 60 * 1000 })
//     return NextResponse.json({ ok: true }, { status: 200 })
//   } catch (err) {
//     const message = err instanceof Error ? err.message : 'Unknown error'
//     const status = message.includes('JWT') || message.includes('Authorization') ? 401 : 400
//     return NextResponse.json({ error: message }, { status })
//   }
// }
//
// // GET /api/canvas-snapshot — retrieves and immediately deletes the stored snapshot.
// // Returns empty arrays if the snapshot is missing or expired.
// export async function GET(req: NextRequest) {
//   try {
//     const { userId } = await verifyJwt(req.headers.get('Authorization'))
//     const canvasUserId = await getCanvasUserIdForAuthUser(userId)
//     const entry = store.get(canvasUserId)
//     store.delete(canvasUserId)
//     if (!entry || entry.exp < Date.now()) {
//       return NextResponse.json({ items: [], announcements: [] }, { status: 200 })
//     }
//     return NextResponse.json({ items: entry.items, announcements: entry.announcements }, { status: 200 })
//   } catch (err) {
//     const message = err instanceof Error ? err.message : 'Unknown error'
//     const status = message.includes('JWT') || message.includes('Authorization') ? 401 : 400
//     return NextResponse.json({ error: message }, { status })
//   }
// }
