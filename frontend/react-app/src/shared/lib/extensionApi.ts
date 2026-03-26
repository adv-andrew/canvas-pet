import { supabaseExtAuth } from './supabaseExtAuth'
import type { CanvasPlannerItem } from '../types/canvas'
import {
  apiClientExtensionAuth,
  apiClientRegisterCanvasUser,
  apiClientFetchSavedIds,
  apiClientSaveAssignment,
  apiClientUnsaveAssignment,
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

/**
 * Shared extension auth flow used by both the popup and panel.
 *
 * 1. If no session exists: calls /api/auth/extension to bootstrap one.
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

  if (!sessionData.session) {
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
  } else {
    void apiClientRegisterCanvasUser(
      { canvas_user_id: params.canvasUserId, institution_url: params.instUrl },
      sessionData.session.access_token,
    )
  }

  const token = await getToken()
  const ids = await apiClientFetchSavedIds(params.instUrl, token)
  return new Set(ids)
}
