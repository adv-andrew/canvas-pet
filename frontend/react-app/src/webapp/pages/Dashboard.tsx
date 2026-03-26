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
          <strong>Account not linked to Canvas.</strong> Download the extension, open Canvas, and
          press <em>"Connect With App"</em> from the extension popup.
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
          Use the extension to view live assignments.
        </p>
      </div>
    </div>
  )
}
