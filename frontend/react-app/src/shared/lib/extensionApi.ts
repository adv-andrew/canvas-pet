import { supabaseExtAuth } from './supabaseExtAuth'
import type { CanvasPlannerItem, CanvasAnnouncement } from '../types/canvas'
import {
  apiClientExtensionAuth,
  apiClientRegisterCanvasUser,
  apiClientFetchSavedIds,
  apiClientSaveAssignment,
  apiClientUnsaveAssignment,
  apiClientStoreCanvasToken,
  apiClientPushCanvasSnapshot,
} from './apiClient'

async function getToken(): Promise<string> {
  const { data } = await supabaseExtAuth.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Not authenticated')
  return token
}

// No token needed — this endpoint bootstraps the session.
export const apiExtensionAuth = apiClientExtensionAuth

export async function apiRegisterCanvasUser(params: {
  canvas_user_id: string
  institution_url: string
  email?: string
  display_name?: string
}): Promise<void> {
  return apiClientRegisterCanvasUser(params, await getToken())
}

export async function apiFetchSavedIds(institutionUrl: string): Promise<number[]> {
  return apiClientFetchSavedIds(institutionUrl, await getToken())
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

export async function apiStoreCanvasToken(canvasToken: string): Promise<void> {
  return apiClientStoreCanvasToken(canvasToken, await getToken())
}

export async function apiPushCanvasSnapshot(
  items: CanvasPlannerItem[],
  announcements: CanvasAnnouncement[],
): Promise<void> {
  return apiClientPushCanvasSnapshot(items, announcements, await getToken())
}

/**
 * Shared extension auth flow used by both the popup and panel.
 *
 * 1. If no session exists: calls /api/auth/canvas-signin to bootstrap one.
 * 2. If a session exists: fire-and-forgets a profile refresh.
 * 3. Returns the user's saved assignment IDs as a Set.
 */
export async function runExtensionAuth(params: {
  canvasUserId: string
  instUrl: string
  displayName?: string | null
  email?: string | null
}): Promise<Set<number>> {
  const { data: sessionData } = await supabaseExtAuth.auth.getSession()

  if (sessionData.session) {
    // The popup and panel run in separate JS contexts — signing out from the popup
    // clears chrome.storage but leaves the panel's in-memory session stale.
    // Refreshing the session validates it server-side and gets a fresh token.
    const { data: refreshed, error: refreshErr } = await supabaseExtAuth.auth.refreshSession()

    if (!refreshErr && refreshed.session) {
      // Session still valid — fire-and-forget profile refresh and return early
      void apiClientRegisterCanvasUser(
        { canvas_user_id: params.canvasUserId, institution_url: params.instUrl },
        refreshed.session.access_token,
      )
      const ids = await apiClientFetchSavedIds(params.instUrl, refreshed.session.access_token)
      return new Set(ids)
    }

    // Session was invalidated (e.g., signed out from popup) — clear local state
    await supabaseExtAuth.auth.signOut({ scope: 'local' })
  }

  // No session or session was just cleared — bootstrap via Canvas identity
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

  const token = await getToken()
  const ids = await apiClientFetchSavedIds(params.instUrl, token)
  return new Set(ids)
}
