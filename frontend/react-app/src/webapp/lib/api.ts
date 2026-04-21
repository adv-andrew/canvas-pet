import { supabase } from './supabaseClient'
import { apiClientGetMe, apiClientLinkCanvas, apiClientGetCanvasSnapshot, apiClientSavePins, apiClientFetchPinnedIds, apiClientFetchSavedIds, apiClientCompleteAssignment } from '../../shared/lib/apiClient'
import type { MeResponse, CanvasSnapshotResponse } from '../../shared/lib/apiClient'
export type { MeResponse, CanvasSnapshotResponse } from '../../shared/lib/apiClient'

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Not authenticated')
  return token
}

export async function apiGetMe(): Promise<MeResponse> {
  return apiClientGetMe(await getToken())
}

export async function apiLinkCanvas(params: {
  canvas_user_id: string
  institution_url: string
}): Promise<void> {
  return apiClientLinkCanvas(params, await getToken())
}

export async function apiGetCanvasSnapshot(): Promise<CanvasSnapshotResponse> {
  return apiClientGetCanvasSnapshot(await getToken())
}

export async function apiWebSavePins(ids: number[], institutionUrl: string): Promise<void> {
  return apiClientSavePins(ids, institutionUrl, await getToken())
}

export async function apiWebFetchPinnedIds(institutionUrl: string): Promise<number[]> {
  return apiClientFetchPinnedIds(institutionUrl, await getToken())
}

export async function apiWebFetchSavedIds(institutionUrl: string): Promise<{ savedIds: number[]; completedIds: number[] }> {
  return apiClientFetchSavedIds(institutionUrl, await getToken())
}

export async function apiWebCompleteAssignment(assignmentId: number, institutionUrl: string): Promise<{ points_earned: number }> {
  const res = await apiClientCompleteAssignment(assignmentId, institutionUrl, await getToken())
  return { points_earned: res.points_earned }
}
