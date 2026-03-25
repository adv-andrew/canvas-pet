import { supabaseAuth } from './supabaseAuthClient'
import type { CanvasPlannerItem } from '../../shared/types/canvas'
import {
  apiClientExtensionAuth,
  apiClientRegisterCanvasUser,
  apiClientFetchSavedIds,
  apiClientSaveAssignment,
  apiClientUnsaveAssignment,
} from '../../shared/lib/apiClient'

// Reads the current session token from chrome.storage via the Supabase auth client.
async function getToken(): Promise<string> {
  const { data } = await supabaseAuth.auth.getSession()
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
