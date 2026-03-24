// This service handles Canvas authentication via a manually provided API access token,
// intended for use by the web app. It does NOT handle the session-based (piggyback)
// authentication used by the Chrome extension.

import { CanvasUserSchema, type CanvasUser } from '../schemas/canvas'

// Returns true if the token can successfully authenticate with the given Canvas instance.
export async function validateCanvasToken(
  token: string,
  institutionUrl: string,
): Promise<boolean> {
  try {
    await fetchCanvasUser(token, institutionUrl)
    return true
  } catch {
    return false
  }
}

// Fetches the current user from Canvas using a Bearer token and validates the response
// shape against the CanvasUserSchema.
export async function fetchCanvasUser(
  token: string,
  institutionUrl: string,
): Promise<CanvasUser> {
  const url = `${institutionUrl}/api/v1/users/self`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`Canvas API error: ${res.status}`)
  const raw: unknown = await res.json()
  return CanvasUserSchema.parse(raw)
}
