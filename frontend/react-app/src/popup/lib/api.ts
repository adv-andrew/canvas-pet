import { supabaseAuth } from './supabaseAuthClient'
import type { CanvasPlannerItem } from '../types/canvas'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL as string

// Bootstraps a Supabase session from the Canvas identity.
// No auth header required — this endpoint IS the auth step.
export async function apiExtensionAuth(params: {
  canvas_user_id: string
  institution_url: string
  display_name?: string | null
  email?: string | null
}): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
  const res = await fetch(`${BACKEND_URL}/api/auth/extension`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  if (!res.ok) {
    const { error } = (await res.json()) as { error: string }
    throw new Error(error)
  }
  return res.json() as Promise<{ access_token: string; refresh_token: string; expires_in: number }>
}

async function getAuthHeader(): Promise<string> {
  const { data } = await supabaseAuth.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Not authenticated')
  return `Bearer ${token}`
}

export async function apiRegisterCanvasUser(params: {
  canvas_user_id: string
  institution_url: string
  email?: string
  display_name?: string
}): Promise<void> {
  const auth = await getAuthHeader()
  const res = await fetch(`${BACKEND_URL}/api/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: auth },
    body: JSON.stringify(params),
  })
  if (!res.ok) {
    const { error } = (await res.json()) as { error: string }
    throw new Error(error)
  }
}

export async function apiFetchSavedIds(institutionUrl: string): Promise<number[]> {
  const auth = await getAuthHeader()
  const url = `${BACKEND_URL}/api/assignments?institution_url=${encodeURIComponent(institutionUrl)}`
  const res = await fetch(url, { headers: { Authorization: auth } })
  if (!res.ok) {
    const { error } = (await res.json()) as { error: string }
    throw new Error(error)
  }
  const { data } = (await res.json()) as { data: Array<{ assignment_id: number }> }
  return data.map((r) => r.assignment_id)
}

export async function apiSaveAssignment(item: CanvasPlannerItem, canvasUserId: string, institutionUrl: string): Promise<void> {
  const auth = await getAuthHeader()
  const res = await fetch(`${BACKEND_URL}/api/assignments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: auth },
    body: JSON.stringify({
      canvas_user_id: canvasUserId,
      institution_url: institutionUrl,
      assignment_id: item.plannable_id,
      plannable_type: item.plannable_type,
      course_id: item.course_id ?? null,
    }),
  })
  if (!res.ok) {
    const { error } = (await res.json()) as { error: string }
    throw new Error(error)
  }
}

export async function apiUnsaveAssignment(assignmentId: number, institutionUrl: string): Promise<void> {
  const auth = await getAuthHeader()
  const url = `${BACKEND_URL}/api/assignments/${assignmentId}?institution_url=${encodeURIComponent(institutionUrl)}`
  const res = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: auth },
  })
  if (!res.ok) {
    const { error } = (await res.json()) as { error: string }
    throw new Error(error)
  }
}
