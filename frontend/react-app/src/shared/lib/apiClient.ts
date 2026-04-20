import type { CanvasPlannerItem, CanvasAnnouncement } from '../types/canvas'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL as string

// Raw fetch helpers — no Supabase or Chrome dependency.
// Each function that requires auth accepts a token string.
// Callers (popup/lib/api.ts, webapp/lib/api.ts) are responsible for
// obtaining the token from their respective Supabase client.

export async function apiClientExtensionAuth(params: {
  canvas_user_id: string
  institution_url: string
  display_name?: string | null
  email?: string | null
}): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
  const res = await fetch(`${BACKEND_URL}/api/auth/canvas-signin`, {
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

export async function apiClientRegisterCanvasUser(
  params: { canvas_user_id: string; institution_url: string; email?: string; display_name?: string },
  token: string,
): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/api/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(params),
  })
  if (!res.ok) {
    const { error } = (await res.json()) as { error: string }
    throw new Error(error)
  }
}

export async function apiClientFetchSavedIds(institutionUrl: string, token: string): Promise<number[]> {
  const url = `${BACKEND_URL}/api/assignments?institution_url=${encodeURIComponent(institutionUrl)}`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) {
    const { error } = (await res.json()) as { error: string }
    throw new Error(error)
  }
  const { data } = (await res.json()) as { data: Array<{ assignment_id: number }> }
  return data.map((r) => r.assignment_id)
}

export async function apiClientSaveAssignment(
  item: CanvasPlannerItem,
  canvasUserId: string,
  institutionUrl: string,
  token: string,
): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/api/assignments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
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

export async function apiClientUnsaveAssignment(
  assignmentId: number,
  institutionUrl: string,
  token: string,
): Promise<void> {
  const url = `${BACKEND_URL}/api/assignments/${assignmentId}?institution_url=${encodeURIComponent(institutionUrl)}`
  const res = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const { error } = (await res.json()) as { error: string }
    throw new Error(error)
  }
}

export interface MeResponse {
  canvas_linked: boolean
  canvas_user_id?: string
  institution_url?: string
  display_name?: string | null
  email?: string | null
  web_linked?: boolean
  web_display_name?: string | null
  web_email?: string | null
  canvas_token_stored?: boolean
  snapshot_available?: boolean
}

export async function apiClientGetMe(token: string): Promise<MeResponse> {
  const res = await fetch(`${BACKEND_URL}/api/auth/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const { error } = (await res.json()) as { error: string }
    throw new Error(error)
  }
  return res.json() as Promise<MeResponse>
}

export async function apiClientStoreCanvasToken(
  canvasToken: string,
  token: string,
): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/api/auth/canvas-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ canvas_token: canvasToken }),
  })
  if (!res.ok) {
    const { error } = (await res.json()) as { error: string }
    throw new Error(error)
  }
}

export async function apiClientLinkCanvas(
  params: { canvas_user_id: string; institution_url: string },
  token: string,
): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/api/auth/link-canvas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(params),
  })
  if (!res.ok) {
    const { error } = (await res.json()) as { error: string }
    throw new Error(error)
  }
}

export interface CanvasSnapshotResponse {
  items: unknown[]
  announcements: unknown[]
  created_at?: string
}

export async function apiClientPushCanvasSnapshot(
  items: CanvasPlannerItem[],
  announcements: CanvasAnnouncement[],
  token: string,
): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/api/canvas-snapshot`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ items, announcements }),
  })
  if (!res.ok) {
    const { error } = (await res.json()) as { error: string }
    throw new Error(error)
  }
}

export async function apiClientGetCanvasSnapshot(token: string): Promise<CanvasSnapshotResponse> {
  const res = await fetch(`${BACKEND_URL}/api/canvas-snapshot`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const { error } = (await res.json()) as { error: string }
    throw new Error(error)
  }
  return res.json() as Promise<CanvasSnapshotResponse>
}

export interface PetStats {
  happiness_score: number
  streak: number
  reward_points: number
}

export async function apiClientGetPetStats(token: string): Promise<PetStats> {
  const res = await fetch(`${BACKEND_URL}/api/pet`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const { error } = (await res.json()) as { error: string }
    throw new Error(error)
  }
  return res.json() as Promise<PetStats>
}

export interface CompleteAssignmentResponse {
  ok: boolean
  completed_at: string
  happiness_score: number
  streak: number
  reward_points: number
  points_earned: number
}

export async function apiClientCompleteAssignment(
  assignmentId: number,
  institutionUrl: string,
  token: string,
): Promise<CompleteAssignmentResponse> {
  const url = `${BACKEND_URL}/api/assignments/${assignmentId}/complete?institution_url=${encodeURIComponent(institutionUrl)}`
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const { error } = (await res.json()) as { error: string }
    throw new Error(error)
  }
  return res.json() as Promise<CompleteAssignmentResponse>
}

export interface ShopItem {
  id: string
  name: string
  description: string | null
  cost: number
  image_url: string | null
}

export async function apiClientGetShopItems(token: string): Promise<ShopItem[]> {
  const res = await fetch(`${BACKEND_URL}/api/shop`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const { error } = (await res.json()) as { error: string }
    throw new Error(error)
  }
  const { data } = (await res.json()) as { data: ShopItem[] }
  return data
}

export interface OwnedItem {
  item_id: string
  unlocked_at: string
  shop_items: {
    id: string
    name: string
    description: string | null
    image_url: string | null
  }
}

export async function apiClientGetOwnedItems(token: string): Promise<OwnedItem[]> {
  const res = await fetch(`${BACKEND_URL}/api/shop/owned`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const { error } = (await res.json()) as { error: string }
    throw new Error(error)
  }
  const { data } = (await res.json()) as { data: OwnedItem[] }
  return data
}

export interface PurchaseResponse {
  ok: boolean
  item_name: string
  reward_points: number
}

export async function apiClientPurchaseItem(itemId: string, token: string): Promise<PurchaseResponse> {
  const res = await fetch(`${BACKEND_URL}/api/shop/purchase`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ item_id: itemId }),
  })
  if (!res.ok) {
    const { error } = (await res.json()) as { error: string }
    throw new Error(error)
  }
  return res.json() as Promise<PurchaseResponse>
}
