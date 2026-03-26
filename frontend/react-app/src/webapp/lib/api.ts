import { supabase } from './supabaseClient'
import { apiClientGetMe, apiClientLinkCanvas } from '../../shared/lib/apiClient'
import type { MeResponse } from '../../shared/lib/apiClient'

export type { MeResponse }

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
