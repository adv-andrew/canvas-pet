import { useState, useEffect, useCallback } from 'react'
import type { CanvasPlannerItem, TrackedAssignment, CanvasAnnouncement, ConnectAppState } from '../../../shared/types/canvas'
import { supabaseExtAuth } from '../../../shared/lib/supabaseExtAuth'
import {
  apiSaveAssignment,
  apiUnsaveAssignment,
  apiCompleteAssignment,
  apiSavePins,
  apiStoreCanvasToken,
  apiPushCanvasSnapshot,
  runExtensionAuth,
} from '../../../shared/lib/extensionApi'
import { apiClientGetMe, apiClientGetPetStats, type PetStats } from '../../../shared/lib/apiClient'

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
  petStats: PetStats | null
  userId: string | null
  institutionUrl: string | null
  webAccount: { displayName: string | null; email: string | null } | null
  connectAppState: ConnectAppState
  pinnedIds: Set<number>
  refetch: () => void
  saveAssignment: (item: CanvasPlannerItem) => Promise<void>
  unsaveAssignment: (assignmentId: number) => Promise<void>
  completeAssignment: (assignmentId: number) => Promise<{ points_earned: number } | void>
  togglePin: (assignmentId: number) => void
  clearPins: () => void
  savePins: () => Promise<void>
  handleConnectApp: (() => void) | undefined
  handleConnectAppWithPassword: ((password: string) => Promise<void>) | undefined
  handleSubmitManualToken: ((token: string) => Promise<void>) | undefined
  handleDismissLongAccess: () => void
}

export function usePanelData(): PanelDataResult {
  const [rawItems, setRawItems] = useState<CanvasPlannerItem[]>([])
  const [announcements, setAnnouncements] = useState<CanvasAnnouncement[]>([])
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set())
  const [completedIds, setCompletedIds] = useState<Set<number>>(new Set())
  const [pinnedIds, setPinnedIds] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [institutionUrl, setInstitutionUrl] = useState<string | null>(null)
  const [webAccount, setWebAccount] = useState<{ displayName: string | null; email: string | null } | null>(null)
  const [connectAppState, setConnectAppState] = useState<ConnectAppState>('idle')
  const [petStats, setPetStats] = useState<PetStats | null>(null)

  const handleCanvasData = useCallback(async (payload: CanvasDataPayload) => {
    setRawItems(payload.items)
    setAnnouncements(payload.announcements)
    setUserId(payload.userId)
    setInstitutionUrl(payload.institutionUrl)

    const result = await runExtensionAuth({
      canvasUserId: payload.userId,
      instUrl: payload.institutionUrl,
      displayName: payload.displayName,
      email: payload.email,
    })
    setSavedIds(result.savedIds)
    setCompletedIds(result.completedIds)
    setPinnedIds(result.pinnedIds)

    // Check web account link + pet stats (non-fatal)
    try {
      const token = (await supabaseExtAuth.auth.getSession()).data.session?.access_token
      if (token) {
        const [me, stats] = await Promise.all([
          apiClientGetMe(token),
          apiClientGetPetStats(token),
        ])
        if (me.web_linked) {
          setWebAccount({ displayName: me.web_display_name ?? null, email: me.web_email ?? null })
        }
        setPetStats(stats)
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

  const completeAssignment = useCallback(
    async (assignmentId: number): Promise<{ points_earned: number } | void> => {
      if (!institutionUrl) return
      const dueDate = rawItems.find((i) => i.plannable_id === assignmentId)?.plannable.due_at ?? null
      const result = await apiCompleteAssignment(assignmentId, institutionUrl, dueDate)
      setCompletedIds((prev) => new Set([...prev, assignmentId]))
      setPetStats({
        happiness_score: result.happiness_score,
        streak: result.streak,
        reward_points: result.reward_points,
      })
      return { points_earned: result.points_earned }
    },
    [institutionUrl, rawItems],
  )

  const togglePin = useCallback((assignmentId: number) => {
    setPinnedIds((prev) => {
      const next = new Set(prev)
      if (next.has(assignmentId)) next.delete(assignmentId)
      else next.add(assignmentId)
      return next
    })
  }, [])

  const clearPins = useCallback(() => setPinnedIds(new Set()), [])

  const savePins = useCallback(async () => {
    if (!institutionUrl) return
    await apiSavePins([...pinnedIds], institutionUrl)
  }, [institutionUrl, pinnedIds])

  // Requests a Canvas API token from the content script via postMessage,
  // stores it on the backend, then opens the web app. Falls back gracefully
  // to needsLongAccess if the institution requires a password confirmation.
  const handleConnectApp = useCallback(() => {
    if (!userId || !institutionUrl) return
    setConnectAppState('connecting')

    const tokenPromise = new Promise<{ token?: string; blocked?: boolean; error?: string }>(
      (resolve) => {
        const timeoutId = setTimeout(() => {
          window.removeEventListener('message', handler)
          resolve({ error: 'Request timed out' })
        }, 15000)
        function handler(e: MessageEvent) {
          if (e.source !== window.parent || e.data?.type !== 'CANVAS_TOKEN_RESULT') return
          clearTimeout(timeoutId)
          window.removeEventListener('message', handler)
          console.log('[CP panel] CANVAS_TOKEN_RESULT received:', e.data.result)
          resolve(e.data.result as { token?: string; blocked?: boolean; error?: string })
        }
        window.addEventListener('message', handler)
        console.log('[CP panel] sending GENERATE_CANVAS_TOKEN to content script')
        window.parent.postMessage({ type: 'GENERATE_CANVAS_TOKEN' }, '*')
      },
    )

    const webAppUrl = `${WEBAPP_URL}/sign-in?cid=${encodeURIComponent(userId)}&iu=${encodeURIComponent(institutionUrl)}`

    tokenPromise
      .then(async (result) => {
        if (result.blocked) {
          // Auto-push snapshot (non-fatal) then open web app
          try { await apiPushCanvasSnapshot(rawItems, announcements) } catch { /* non-fatal */ }
          chrome.tabs.create({ url: webAppUrl })
          setConnectAppState('needsLongAccess')
          return
        }
        if (result.error === 'RELOAD_PAGE') {
          setConnectAppState('reload')
          return
        }
        if (result.error || !result.token) {
          setConnectAppState('error')
          return
        }
        try {
          await apiStoreCanvasToken(result.token)
        } catch {
          // swallow — likely the migration hasn't been applied yet
        }
        setConnectAppState('idle')
        chrome.tabs.create({ url: webAppUrl })
      })
      .catch(() => setConnectAppState('error'))
  }, [userId, institutionUrl, rawItems, announcements])

  // Called when the user submits their Canvas password in the needsLongAccess prompt.
  // Password is used for a single request and never stored.
  const handleConnectAppWithPassword = useCallback(async (password: string) => {
    if (!userId || !institutionUrl) return
    setConnectAppState('connecting')

    const tokenPromise = new Promise<{ token?: string; blocked?: boolean; error?: string }>(
      (resolve) => {
        const timeoutId = setTimeout(() => {
          window.removeEventListener('message', handler)
          resolve({ error: 'Request timed out' })
        }, 15000)
        function handler(e: MessageEvent) {
          if (e.source !== window.parent || e.data?.type !== 'CANVAS_TOKEN_RESULT') return
          clearTimeout(timeoutId)
          window.removeEventListener('message', handler)
          resolve(e.data.result as { token?: string; blocked?: boolean; error?: string })
        }
        window.addEventListener('message', handler)
        window.parent.postMessage({ type: 'GENERATE_CANVAS_TOKEN', password }, '*')
      },
    )

    const webAppUrl = `${WEBAPP_URL}/sign-in?cid=${encodeURIComponent(userId)}&iu=${encodeURIComponent(institutionUrl)}`

    try {
      const result = await tokenPromise
      if (result.blocked || result.error || !result.token) {
        setConnectAppState('needsLongAccess')
        return
      }
      try {
        await apiStoreCanvasToken(result.token)
      } catch {
        // non-fatal
      }
      setConnectAppState('idle')
      chrome.tabs.create({ url: webAppUrl })
    } catch {
      setConnectAppState('needsLongAccess')
    }
  }, [userId, institutionUrl])

  // Called when the user manually pastes a Canvas access token.
  const handleSubmitManualToken = useCallback(async (token: string) => {
    if (!userId || !institutionUrl) return
    setConnectAppState('connecting')
    try {
      await apiStoreCanvasToken(token)
      setConnectAppState('idle')
      const webAppUrl = `${WEBAPP_URL}/sign-in?cid=${encodeURIComponent(userId)}&iu=${encodeURIComponent(institutionUrl)}`
      chrome.tabs.create({ url: webAppUrl })
    } catch {
      setConnectAppState('needsLongAccess')
    }
  }, [userId, institutionUrl])

  const handleDismissLongAccess = useCallback(() => setConnectAppState('idle'), [])

  const assignments: TrackedAssignment[] = rawItems.map((item) => ({
    ...item,
    isSaved: savedIds.has(item.plannable_id),
    savedAt: null,
    isCompleted: completedIds.has(item.plannable_id),
    completedAt: null,
  }))

  return {
    assignments,
    announcements,
    loading,
    error,
    petStats,
    userId,
    institutionUrl,
    webAccount,
    connectAppState,
    pinnedIds,
    refetch,
    saveAssignment,
    unsaveAssignment,
    completeAssignment,
    togglePin,
    clearPins,
    savePins,
    handleConnectApp,
    handleConnectAppWithPassword,
    handleSubmitManualToken,
    handleDismissLongAccess,
  }
}
