import { useState, useEffect, useCallback } from 'react'
import type { CanvasPlannerItem, TrackedAssignment, CanvasAnnouncement } from '../../shared/types/canvas'
import { supabaseAuth } from '../lib/supabaseAuthClient'
import {
  apiExtensionAuth,
  apiRegisterCanvasUser,
  apiFetchSavedIds,
  apiSaveAssignment,
  apiUnsaveAssignment,
} from '../lib/api'

interface CanvasDataResult {
  assignments: TrackedAssignment[]
  announcements: CanvasAnnouncement[]
  loading: boolean
  error: string | null
  isOnCanvas: boolean
  userId: string | null
  institutionUrl: string | null
  refetch: () => void
  saveAssignment: (item: CanvasPlannerItem) => Promise<void>
  unsaveAssignment: (assignmentId: number) => Promise<void>
}

interface ContentScriptResponse {
  success: boolean
  items?: CanvasPlannerItem[]
  announcements?: CanvasAnnouncement[]
  userId?: string
  institutionUrl?: string
  displayName?: string | null
  email?: string | null
  error?: string
}

export function useCanvasData(): CanvasDataResult {
  const [rawItems, setRawItems] = useState<CanvasPlannerItem[]>([])
  const [announcements, setAnnouncements] = useState<CanvasAnnouncement[]>([])
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isOnCanvas, setIsOnCanvas] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [institutionUrl, setInstitutionUrl] = useState<string | null>(null)

  const fetchData = useCallback(() => {
    setLoading(true)
    setError(null)

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0]
      if (!tab?.id || !tab.url?.includes('instructure.com')) {
        setIsOnCanvas(false)
        setLoading(false)
        return
      }

      chrome.tabs.sendMessage(
        tab.id,
        { type: 'FETCH_PLANNER_ITEMS' },
        (response: ContentScriptResponse) => {
          if (chrome.runtime.lastError) {
            setError('Could not connect to Canvas page. Try refreshing it.')
            setLoading(false)
            return
          }
          if (!response?.success) {
            setError(response?.error ?? 'Failed to fetch assignments.')
            setLoading(false)
            return
          }

          const canvasUserId = response.userId ?? null
          const instUrl = response.institutionUrl ?? null
          setRawItems(response.items ?? [])
          setAnnouncements(response.announcements ?? [])
          setUserId(canvasUserId)
          setInstitutionUrl(instUrl)

          if (!canvasUserId || !instUrl) {
            setLoading(false)
            return
          }

          // Auth + saved IDs flow:
          // 1. If no session exists, call /api/auth/extension which atomically creates/finds
          //    the Supabase user AND upserts the canvas_users row, then returns session tokens.
          // 2. If a session already exists, fire-and-forget a profile refresh (name/email may change).
          // 3. Fetch saved assignment IDs with the now-guaranteed valid session.
          const run = async () => {
            const { data: sessionData } = await supabaseAuth.auth.getSession()

            if (!sessionData.session) {
              const tokens = await apiExtensionAuth({
                canvas_user_id: canvasUserId,
                institution_url: instUrl,
                display_name: response.displayName ?? undefined,
                email: response.email ?? undefined,
              })
              const { error: setErr } = await supabaseAuth.auth.setSession({
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
              })
              if (setErr) throw new Error(setErr.message)
            } else {
              void apiRegisterCanvasUser({
                canvas_user_id: canvasUserId,
                institution_url: instUrl,
              })
            }

            const ids = await apiFetchSavedIds(instUrl)
            setSavedIds(new Set(ids))
          }

          run()
            .catch((err: Error) => setError(err.message))
            .finally(() => setLoading(false))
        },
      )
    })
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData()
  }, [fetchData])

  const saveAssignment = useCallback(
    async (item: CanvasPlannerItem) => {
      if (!userId || !institutionUrl) return
      await apiSaveAssignment(item, userId, institutionUrl)
      setSavedIds((prev) => new Set([...prev, item.plannable_id]))
    },
    [userId, institutionUrl],
  )

  const unsaveAssignment = useCallback(
    async (assignmentId: number) => {
      if (!institutionUrl) return
      await apiUnsaveAssignment(assignmentId, institutionUrl)
      setSavedIds((prev) => {
        const next = new Set(prev)
        next.delete(assignmentId)
        return next
      })
    },
    [institutionUrl],
  )

  const assignments: TrackedAssignment[] = rawItems.map((item) => ({
    ...item,
    isSaved: savedIds.has(item.plannable_id),
    savedAt: null,
  }))

  return {
    assignments,
    announcements,
    loading,
    error,
    isOnCanvas,
    userId,
    institutionUrl,
    refetch: fetchData,
    saveAssignment,
    unsaveAssignment,
  }
}
