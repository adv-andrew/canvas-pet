import { useEffect, useState } from 'react'
import { apiGetMe, apiLinkCanvas } from '../lib/api'
import type { MeResponse } from '../lib/api'
import type { CanvasPlannerItem, CanvasAnnouncement, TrackedAssignment } from '../../shared/types/canvas'
import { Dashboard as SharedDashboard } from '../../shared/components/Dashboard'

export function Dashboard() {
  const [me, setMe] = useState<MeResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<CanvasPlannerItem[]>([])
  const [announcements, setAnnouncements] = useState<CanvasAnnouncement[]>([])

  // Listen for Canvas data bridged from the extension content script.
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return
      if (e.data?.type !== 'CP_CANVAS_DATA') return
      const payload = e.data.payload as { items: CanvasPlannerItem[]; announcements: CanvasAnnouncement[] }
      if (payload.items.length > 0 || payload.announcements.length > 0) {
        setItems(payload.items)
        setAnnouncements(payload.announcements)
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

  const hasData = items.length > 0 || announcements.length > 0
  const assignments: TrackedAssignment[] = items.map((item) => ({ ...item, isSaved: false, savedAt: null }))
  const noop = async () => { /* no-op in web app */ }

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
        onSave={noop}
        onUnsave={noop}
        onRefresh={() => window.postMessage({ type: 'CP_REQUEST_DATA' }, window.location.origin)}
        hideHeader
        banner={banner}
      />
    </div>
  )
}
