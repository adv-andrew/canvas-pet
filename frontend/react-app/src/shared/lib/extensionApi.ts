import { supabaseExtAuth } from './supabaseExtAuth'
import type { CanvasPlannerItem, CanvasAnnouncement } from '../types/canvas'
import {
  apiClientExtensionAuth,
  apiClientRegisterCanvasUser,
  apiClientFetchSavedIds,
  apiClientFetchPinnedIds,
  apiClientSaveAssignment,
  apiClientUnsaveAssignment,
  apiClientCompleteAssignment,
  apiClientSavePins,
  apiClientStoreCanvasToken,
  apiClientPushCanvasSnapshot,
  type CompleteAssignmentResponse,
} from './apiClient'

async function getToken(): Promise<string> {
  const { data } = await supabaseExtAuth.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Not authenticated')
  return token
}

// No token needed — this endpoint bootstraps the session.
export { apiClientExtensionAuth as apiExtensionAuth } from './apiClient'

export async function apiRegisterCanvasUser(params: {
  canvas_user_id: string
  institution_url: string
  email?: string
  display_name?: string
}): Promise<void> {
  return apiClientRegisterCanvasUser(params, await getToken())
}

export async function apiFetchSavedIds(institutionUrl: string) {
  return apiClientFetchSavedIds(institutionUrl, await getToken())
}

export async function apiFetchPinnedIds(institutionUrl: string): Promise<number[]> {
  return apiClientFetchPinnedIds(institutionUrl, await getToken())
}

export async function apiSaveAssignment(
  item: CanvasPlannerItem,
  canvasUserId: string,
  institutionUrl: string,
): Promise<void> {
  return apiClientSaveAssignment(item, canvasUserId, institutionUrl, await getToken())
}

export async function apiUnsaveAssignment(assignmentId: number, institutionUrl: string): Promise<void> {
  return apiClientUnsaveAssignment(assignmentId, institutionUrl, await getToken())
}

export async function apiCompleteAssignment(
  assignmentId: number,
  institutionUrl: string,
): Promise<CompleteAssignmentResponse> {
  return apiClientCompleteAssignment(assignmentId, institutionUrl, await getToken())
}

export async function apiSavePins(ids: number[], institutionUrl: string): Promise<void> {
  return apiClientSavePins(ids, institutionUrl, await getToken())
}

export async function apiStoreCanvasToken(canvasToken: string): Promise<void> {
  return apiClientStoreCanvasToken(canvasToken, await getToken())
}

export async function apiPushCanvasSnapshot(
  items: CanvasPlannerItem[],
  announcements: CanvasAnnouncement[],
): Promise<void> {
  return apiClientPushCanvasSnapshot(items, announcements, await getToken())
}

export interface ExtensionAuthResult {
  savedIds: Set<number>
  completedIds: Set<number>
  pinnedIds: Set<number>
}

/**
 * Shared extension auth flow used by both the popup and panel.
 *
 * 1. If no session exists: calls /api/auth/canvas-signin to bootstrap one.
 * 2. If a session exists: fire-and-forgets a profile refresh.
 * 3. Returns the user's saved, completed, and pinned assignment IDs.
 */
export async function runExtensionAuth(params: {
  canvasUserId: string
  instUrl: string
  displayName?: string | null
  email?: string | null
}): Promise<ExtensionAuthResult> {
  const { data: sessionData } = await supabaseExtAuth.auth.getSession()

  let token: string

  if (sessionData.session) {
    const { data: refreshed, error: refreshErr } = await supabaseExtAuth.auth.refreshSession()

    if (!refreshErr && refreshed.session) {
      token = refreshed.session.access_token
      void apiClientRegisterCanvasUser(
        { canvas_user_id: params.canvasUserId, institution_url: params.instUrl },
        token,
      )
    } else {
      await supabaseExtAuth.auth.signOut({ scope: 'local' })
      token = await bootstrapSession(params)
    }
  } else {
    token = await bootstrapSession(params)
  }

  const [savedResult, pinnedIds] = await Promise.all([
    apiClientFetchSavedIds(params.instUrl, token),
    apiClientFetchPinnedIds(params.instUrl, token),
  ])

  return {
    savedIds: new Set(savedResult.savedIds),
    completedIds: new Set(savedResult.completedIds),
    pinnedIds: new Set(pinnedIds),
  }
}

async function bootstrapSession(params: {
  canvasUserId: string
  instUrl: string
  displayName?: string | null
  email?: string | null
}): Promise<string> {
  const tokens = await apiClientExtensionAuth({
    canvas_user_id: params.canvasUserId,
    institution_url: params.instUrl,
    display_name: params.displayName ?? undefined,
    email: params.email ?? undefined,
  })
  const { error: setErr } = await supabaseExtAuth.auth.setSession({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
  })
  if (setErr) throw new Error(setErr.message)
  const { data } = await supabaseExtAuth.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Not authenticated after bootstrap')
  return token
}
