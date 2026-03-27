import { useEffect, useState } from 'react'
import { apiGetMe, apiLinkCanvas } from '../lib/api'
import type { MeResponse } from '../lib/api'

export function Dashboard() {
  const [me, setMe] = useState<MeResponse | null>(null)
  const [loading, setLoading] = useState(true)

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

  return (
    <div className="page-content">
      {me && !me.canvas_linked && (
        <div className="canvas-not-linked-banner">
          <strong>Extension not connected.</strong> Open Canvas in your browser with the
          Canvas Pet extension installed, then press <em>"Open Web App"</em> from the panel.
        </div>
      )}

      {me?.canvas_linked && !me.canvas_token_stored && (
        <div className="canvas-not-linked-banner">
          <strong>Live sync not set up.</strong> Open Canvas with the Canvas Pet extension
          and press <em>"Open Web App"</em> from the panel to enable assignment syncing.
        </div>
      )}

      {me?.canvas_linked && me.display_name && (
        <div className="webapp-welcome">
          <p>Welcome, {me.display_name}</p>
        </div>
      )}

      <div className="tab-bar">
        <button className="tab-btn active">Assignments</button>
        <button className="tab-btn">Announcements</button>
      </div>

      <div className="empty-state">
        <p>Full Canvas data sync coming soon.</p>
        <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
          Use the extension panel to view live assignments.
        </p>
      </div>
    </div>
  )
}
