import { useState, useEffect, useCallback } from 'react'
import type { CanvasPlannerItem, TrackedAssignment, CanvasAnnouncement } from '../../shared/types/canvas'
import { supabaseExtAuth } from '../../shared/lib/supabaseExtAuth'
import {
  apiSaveAssignment,
  apiUnsaveAssignment,
  runExtensionAuth,
} from '../../shared/lib/extensionApi'
import { apiClientGetMe } from '../../shared/lib/apiClient'

const WEBAPP_URL = import.meta.env.VITE_WEBAPP_URL as string

interface CanvasDataPayload {
  items: CanvasPlannerItem[]
  announcements: CanvasAnnouncement[]
  userId: string
  institutionUrl: string
  displayName: string | null
  email: string | null
}

interface PanelDataResult {
  assignments: TrackedAssignment[]
  announcements: CanvasAnnouncement[]
  loading: boolean
  error: string | null
  userId: string | null
  institutionUrl: string | null
  webAccount: { displayName: string | null; email: string | null } | null
  refetch: () => void
  saveAssignment: (item: CanvasPlannerItem) => Promise<void>
  unsaveAssignment: (assignmentId: number) => Promise<void>
  handleConnectApp: (() => void) | undefined
}

export function usePanelData(): PanelDataResult {
  const [rawItems, setRawItems] = useState<CanvasPlannerItem[]>([])
  const [announcements, setAnnouncements] = useState<CanvasAnnouncement[]>([])
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [institutionUrl, setInstitutionUrl] = useState<string | null>(null)
  const [webAccount, setWebAccount] = useState<{ displayName: string | null; email: string | null } | null>(null)

  const handleCanvasData = useCallback(async (payload: CanvasDataPayload) => {
    setRawItems(payload.items)
    setAnnouncements(payload.announcements)
    setUserId(payload.userId)
    setInstitutionUrl(payload.institutionUrl)

    const ids = await runExtensionAuth({
      canvasUserId: payload.userId,
      instUrl: payload.institutionUrl,
      displayName: payload.displayName,
      email: payload.email,
    })
    setSavedIds(ids)

    // Check web account link (non-fatal)
    try {
      const token = (await supabaseExtAuth.auth.getSession()).data.session?.access_token
      if (token) {
        const me = await apiClientGetMe(token)
        if (me.web_linked) {
          setWebAccount({ displayName: me.web_display_name ?? null, email: me.web_email ?? null })
        }
      }
    } catch {
      // non-fatal
    }
  }, [])

  useEffect(() => {
    const handler = async (e: MessageEvent) => {
      if (e.data?.type === 'CANVAS_ERROR') {
        setError(e.data.error as string)
        setLoading(false)
        return
      }
      if (e.data?.type !== 'CANVAS_DATA') return

      setError(null)
      try {
        await handleCanvasData(e.data.payload as CanvasDataPayload)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [handleCanvasData])

  const refetch = useCallback(() => {
    setLoading(true)
    window.parent.postMessage({ type: 'REFETCH' }, '*')
  }, [])

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

  const handleConnectApp = userId && institutionUrl
    ? () => {
        const url = `${WEBAPP_URL}/sign-in?cid=${encodeURIComponent(userId)}&iu=${encodeURIComponent(institutionUrl)}`
        chrome.tabs.create({ url })
      }
    : undefined

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
    userId,
    institutionUrl,
    webAccount,
    refetch,
    saveAssignment,
    unsaveAssignment,
    handleConnectApp,
  }
}
