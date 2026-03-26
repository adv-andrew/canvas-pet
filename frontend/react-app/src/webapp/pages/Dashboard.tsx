import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { apiGetMe, apiLinkCanvas } from '../lib/api'
import type { MeResponse } from '../lib/api'

const WEBAPP_URL = import.meta.env.VITE_WEBAPP_URL as string

export function Dashboard() {
  const navigate = useNavigate()
  const [me, setMe] = useState<MeResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [linkedProviders, setLinkedProviders] = useState<string[]>([])
  const [setPasswordValue, setSetPasswordValue] = useState('')
  const [setPasswordLoading, setSetPasswordLoading] = useState(false)
  const [setPasswordError, setSetPasswordError] = useState<string | null>(null)
  const [setPasswordDone, setSetPasswordDone] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) {
        navigate('/sign-in')
        return
      }
      try {
        // Auto-link canvas identity if the user arrived via "Connect With App" button
        const rawLink = sessionStorage.getItem('pending_canvas_link')
        if (rawLink) {
          try {
            const linkParams = JSON.parse(rawLink) as { canvas_user_id: string; institution_url: string }
            await apiLinkCanvas(linkParams)
            sessionStorage.removeItem('pending_canvas_link')
          } catch {
            // Link failed (e.g. already linked to another account) — clear and continue
            sessionStorage.removeItem('pending_canvas_link')
          }
        }

        const result = await apiGetMe()
        setMe(result)

        // Read which auth providers are linked on this account
        const { data: userData } = await supabase.auth.getUser()
        const providers = (userData.user?.app_metadata?.providers as string[] | undefined) ?? []
        setLinkedProviders(providers)
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

  const handleLinkGoogle = async () => {
    await supabase.auth.linkIdentity({
      provider: 'google',
      options: { redirectTo: `${WEBAPP_URL}/auth/callback` },
    })
    // browser navigates away
  }

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setSetPasswordLoading(true)
    setSetPasswordError(null)
    try {
      const { error } = await supabase.auth.updateUser({ password: setPasswordValue })
      if (error) throw error
      setSetPasswordDone(true)
      setLinkedProviders((prev) => (prev.includes('email') ? prev : [...prev, 'email']))
    } catch (err) {
      setSetPasswordError(err instanceof Error ? err.message : 'Failed to set password')
    } finally {
      setSetPasswordLoading(false)
    }
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
          press <em>"Connect With App"</em> from the extension popup.
        </div>
      )}

      {me?.canvas_linked && (
        <div className="webapp-welcome">
          <p>Signed in{me.display_name ? ` as ${me.display_name}` : ''}</p>
        </div>
      )}

      {/* Multi-auth section */}
      {linkedProviders.length > 0 && (
        <div className="auth-methods">
          {!linkedProviders.includes('google') && (
            <div className="auth-method-row">
              <div>
                <p className="auth-method-title">Also sign in with Google</p>
                <p className="auth-method-desc">Link your Google account to sign in with either method.</p>
              </div>
              <button className="auth-method-btn" onClick={handleLinkGoogle}>
                Link Google
              </button>
            </div>
          )}
          {!linkedProviders.includes('email') && (
            <div className="auth-method-row">
              <div>
                <p className="auth-method-title">Set a password</p>
                <p className="auth-method-desc">Add email/password sign-in to your account.</p>
              </div>
              {setPasswordDone ? (
                <span className="auth-method-success">Password set</span>
              ) : (
                <form onSubmit={handleSetPassword} className="auth-method-form">
                  <input
                    type="password"
                    placeholder="New password"
                    value={setPasswordValue}
                    onChange={(e) => setSetPasswordValue(e.target.value)}
                    required
                    minLength={6}
                    className="signin-input auth-method-input"
                  />
                  {setPasswordError && <p className="signin-error">{setPasswordError}</p>}
                  <button type="submit" className="auth-method-btn" disabled={setPasswordLoading}>
                    {setPasswordLoading ? '…' : 'Set password'}
                  </button>
                </form>
              )}
            </div>
          )}
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
