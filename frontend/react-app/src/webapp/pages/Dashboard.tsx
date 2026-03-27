import { useEffect, useState } from 'react'
import { apiGetMe, apiLinkCanvas } from '../lib/api'
import type { MeResponse, CanvasSnapshotResponse } from '../lib/api'
import type { CanvasPlannerItem, CanvasAnnouncement, TrackedAssignment } from '../../shared/types/canvas'
import { AssignmentCard } from '../../shared/components/AssignmentCard'
import { AnnouncementCard } from '../../shared/components/AnnouncementCard'

export function Dashboard() {
  const [me, setMe] = useState<MeResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [snapshot, setSnapshot] = useState<CanvasSnapshotResponse | null>(null)
  const [activeTab, setActiveTab] = useState<'assignments' | 'announcements'>('assignments')

  // Listen for Canvas data bridged from the extension content script.
  // The content script runs on localhost, reads chrome.storage.session, and
  // posts CP_CANVAS_DATA to the page. We also send CP_REQUEST_DATA immediately
  // to handle the race where initBridge() fired before this listener registered.
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return
      if (e.data?.type !== 'CP_CANVAS_DATA') return
      const payload = e.data.payload as { items: unknown[]; announcements: unknown[] }
      if (payload.items.length > 0 || payload.announcements.length > 0) {
        setSnapshot(payload)
      }
    }
    window.addEventListener('message', handler)
    window.postMessage({ type: 'CP_REQUEST_DATA' }, window.location.origin)
    return () => window.removeEventListener('message', handler)
  }, [])

  useEffect(() => {
    const load = async () => {
      try {
        // Auto-link canvas identity if the user arrived via "Connect With App" button
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

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner" />
      </div>
    )
  }

  const items = (snapshot?.items ?? []) as CanvasPlannerItem[]
  const announcements = (snapshot?.announcements ?? []) as CanvasAnnouncement[]
  const assignments: TrackedAssignment[] = items.map((item) => ({ ...item, isSaved: false, savedAt: null }))

  const noop = async () => { /* no-op in web app */ }

  return (
    <div className="page-content">
      {me && !me.canvas_linked && (
        <div className="canvas-not-linked-banner">
          <strong>Extension not connected.</strong> Open Canvas in your browser with the
          Canvas Pet extension installed, then press <em>"Open Web App"</em> from the panel.
        </div>
      )}

      {me?.canvas_linked && !snapshot && (
        <div className="canvas-not-linked-banner">
          Open Canvas in another tab with the Canvas Pet extension to sync your assignments here.
        </div>
      )}

      {snapshot && (
        <div className="canvas-snapshot-banner">
          Synced from extension — data expires after viewing.
        </div>
      )}

      {me?.canvas_linked && me.display_name && (
        <div className="webapp-welcome">
          <p>Welcome, {me.display_name}</p>
        </div>
      )}

      <div className="tab-bar">
        <button
          className={`tab-btn ${activeTab === 'assignments' ? 'active' : ''}`}
          onClick={() => setActiveTab('assignments')}
        >
          Assignments
          {assignments.length > 0 && <span className="tab-count">{assignments.length}</span>}
        </button>
        <button
          className={`tab-btn ${activeTab === 'announcements' ? 'active' : ''}`}
          onClick={() => setActiveTab('announcements')}
        >
          Announcements
          {announcements.length > 0 && <span className="tab-count">{announcements.length}</span>}
        </button>
      </div>

      {!snapshot && (
        <div className="empty-state">
          <p>Full Canvas data sync coming soon.</p>
          <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
            Use the extension panel to view live assignments.
          </p>
        </div>
      )}

      {snapshot && activeTab === 'assignments' && (
        <>
          {assignments.length === 0 && (
            <div className="empty-state"><p>No upcoming assignments.</p></div>
          )}
          {assignments.length > 0 && (
            <section className="group-section">
              {assignments.map((a) => (
                <AssignmentCard key={a.plannable_id} assignment={a} onSave={noop} onUnsave={noop} />
              ))}
            </section>
          )}
        </>
      )}

      {snapshot && activeTab === 'announcements' && (
        <>
          {announcements.length === 0 && (
            <div className="empty-state"><p>No recent announcements.</p></div>
          )}
          {announcements.length > 0 && (
            <section className="group-section">
              {announcements.map((a) => (
                <AnnouncementCard key={a.id} announcement={a} />
              ))}
            </section>
          )}
        </>
      )}
    </div>
  )
}
