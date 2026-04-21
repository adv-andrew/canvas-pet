import { useEffect, useState, useCallback } from 'react'
import { apiGetMe, apiLinkCanvas, apiWebSavePins, apiWebFetchPinnedIds, apiWebFetchSavedIds, apiWebCompleteAssignment } from '../lib/api'
import type { MeResponse } from '../lib/api'
import type { CanvasPlannerItem, CanvasAnnouncement, TrackedAssignment } from '../../shared/types/canvas'
import { Dashboard as SharedDashboard } from '../../shared/components/Dashboard'
import { usePetStats } from '../lib/petStatsContext'

export function Dashboard() {
  const [me, setMe] = useState<MeResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<CanvasPlannerItem[]>([])
  const [announcements, setAnnouncements] = useState<CanvasAnnouncement[]>([])
  const [institutionUrl, setInstitutionUrl] = useState<string | null>(null)
  const [pinnedIds, setPinnedIds] = useState<Set<number>>(new Set())
  const [completedIds, setCompletedIds] = useState<Set<number>>(new Set())

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return
      if (e.data?.type !== 'CP_CANVAS_DATA') return
      const payload = e.data.payload as {
        items: CanvasPlannerItem[]
        announcements: CanvasAnnouncement[]
        institutionUrl?: string
      }
      if (payload.items.length > 0 || payload.announcements.length > 0) {
        setItems(payload.items)
        setAnnouncements(payload.announcements)
      }
      if (payload.institutionUrl) {
        const url = payload.institutionUrl
        setInstitutionUrl(url)
        apiWebFetchPinnedIds(url).then((ids) => setPinnedIds(new Set(ids))).catch(() => { /* non-fatal */ })
        apiWebFetchSavedIds(url).then(({ completedIds: cids }) => setCompletedIds(new Set(cids))).catch(() => { /* non-fatal */ })
      }
    }
    window.addEventListener('message', handler)
    window.postMessage({ type: 'CP_REQUEST_DATA' }, window.location.origin)
    return () => window.removeEventListener('message', handler)
  }, [])

  useEffect(() => {
    const load = async () => {
      try {
        const rawLink = sessionStorage.getItem('pending_canvas_link')
        if (rawLink) {
          try {
            const linkParams = JSON.parse(rawLink) as { canvas_user_id: string; institution_url: string }
            await apiLinkCanvas(linkParams)
          } catch {
            // Link failed (e.g. already linked to another account) — ignore
          } finally {
            sessionStorage.removeItem('pending_canvas_link')
          }
        }
        const result = await apiGetMe()
        setMe(result)
      } catch {
        setMe({ canvas_linked: false })
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  const togglePin = useCallback((id: number) => {
    setPinnedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const clearPins = useCallback(() => setPinnedIds(new Set()), [])

  const savePins = useCallback(async () => {
    if (!institutionUrl) return
    await apiWebSavePins([...pinnedIds], institutionUrl)
  }, [institutionUrl, pinnedIds])

  const { stats, updateStats } = usePetStats()

  const completeAssignment = useCallback(async (assignmentId: number): Promise<{ points_earned: number } | void> => {
    if (!institutionUrl) return
    const dueDate = items.find((i) => i.plannable_id === assignmentId)?.plannable.due_at ?? null
    const result = await apiWebCompleteAssignment(assignmentId, institutionUrl, dueDate)
    setCompletedIds((prev) => new Set([...prev, assignmentId]))
    updateStats({ happiness_score: result.happiness_score, streak: result.streak, reward_points: result.reward_points })
    return result
  }, [institutionUrl, items, updateStats])

  const hasData = items.length > 0 || announcements.length > 0
  const assignments: TrackedAssignment[] = items.map((item) => ({
    ...item,
    isSaved: false,
    savedAt: null,
    isCompleted: completedIds.has(item.plannable_id),
  }))
  const banner = (
    <>
      {me && !me.canvas_linked && (
        <div className="canvas-not-linked-banner">
          <strong>Extension not connected.</strong> Open Canvas in your browser with the
          Canvas Pet extension installed, then press <em>"Open Web App"</em> from the panel.
        </div>
      )}
      {me?.canvas_linked && !hasData && !loading && (
        <div className="canvas-not-linked-banner">
          Open Canvas in another tab with the Canvas Pet extension to sync your assignments here.
        </div>
      )}
    </>
  )

  return (
    <div className="page-content">
      <SharedDashboard
        assignments={assignments}
        announcements={announcements}
        loading={loading}
        error={null}
        topPetStats={stats ?? undefined}
        pinnedIds={pinnedIds}
        onTogglePin={togglePin}
        onClearPins={clearPins}
        onSavePins={institutionUrl ? savePins : undefined}
        onComplete={institutionUrl ? completeAssignment : undefined}
        onRefresh={() => window.postMessage({ type: 'CP_REQUEST_DATA' }, window.location.origin)}
        hideHeader
        banner={banner}
      />
    </div>
  )
}
