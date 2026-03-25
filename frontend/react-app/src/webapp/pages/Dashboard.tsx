import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { apiGetMe } from '../lib/api'
import type { MeResponse } from '../lib/api'

export function Dashboard() {
  const navigate = useNavigate()
  const [me, setMe] = useState<MeResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) {
        navigate('/sign-in')
        return
      }
      try {
        const result = await apiGetMe()
        setMe(result)
      } catch {
        setMe({ canvas_linked: false })
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [navigate])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/sign-in')
  }

  if (loading) {
    return (
      <div className="webapp-loading">
        <div className="spinner" />
      </div>
    )
  }

  return (
    <div className="webapp-dashboard">
      <header className="dashboard-header">
        <h1>Canvas Pet</h1>
        <button className="webapp-signout-btn" onClick={handleSignOut}>
          Sign out
        </button>
      </header>

      {me && !me.canvas_linked && (
        <div className="canvas-not-linked-banner">
          <strong>Account not linked to Canvas.</strong> Download the extension, open Canvas, and
          press <em>"Link Google Account"</em> from the extension window.
        </div>
      )}

      {me?.canvas_linked && (
        <div className="webapp-welcome">
          <p>Signed in{me.display_name ? ` as ${me.display_name}` : ''}</p>
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
