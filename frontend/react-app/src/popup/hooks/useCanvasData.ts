import { useState, useEffect, useCallback } from 'react'
import type { CanvasPlannerItem, TrackedAssignment, CanvasAnnouncement } from '../types/canvas'
import { useSupabase } from './useSupabase'

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
  error?: string
}

export function useCanvasData(): CanvasDataResult {
  const [rawItems, setRawItems] = useState<CanvasPlannerItem[]>([])
  const [announcements, setAnnouncements] = useState<CanvasAnnouncement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isOnCanvas, setIsOnCanvas] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [institutionUrl, setInstitutionUrl] = useState<string | null>(null)

  const { savedIds, saveAssignment, unsaveAssignment } = useSupabase(userId, institutionUrl)

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
          setRawItems(response.items ?? [])
          setAnnouncements(response.announcements ?? [])
          setUserId(response.userId ?? null)
          setInstitutionUrl(response.institutionUrl ?? null)
          setLoading(false)
        },
      )
    })
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

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
