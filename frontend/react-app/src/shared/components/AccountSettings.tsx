import { useEffect, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'

const WEBAPP_URL = import.meta.env.VITE_WEBAPP_URL as string

interface Props {
  supabaseClient: SupabaseClient
  onSignOut: () => void
  /** Hide the "Account Settings" heading — use when the parent already shows a title/header */
  hideTitle?: boolean
  /**
   * Hide Google-link and password sections.
   * Use in the extension popup where the Supabase session is the extension-only
   * anonymous session (not the web app session that owns those auth methods).
   */
  hideAuthSections?: boolean
}

export function AccountSettings({ supabaseClient, onSignOut, hideTitle, hideAuthSections }: Props) {
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [linkedProviders, setLinkedProviders] = useState<string[]>([])

  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordDone, setPasswordDone] = useState(false)

  const [googleLoading, setGoogleLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabaseClient.auth.getUser()
      setUserEmail(data.user?.email ?? null)
      const providers = (data.user?.app_metadata?.providers as string[] | undefined) ?? []
      setLinkedProviders(providers)
    }
    void load()
  }, [supabaseClient])

  const handleLinkGoogle = async () => {
    setGoogleLoading(true)
    await supabaseClient.auth.linkIdentity({
      provider: 'google',
      options: { redirectTo: `${WEBAPP_URL}/auth/callback` },
    })
    // browser navigates away
  }

  const hasEmail = linkedProviders.includes('email')

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordLoading(true)
    setPasswordError(null)
    try {
      if (hasEmail) {
        if (!userEmail) throw new Error('Could not read account email')
        const { error: signInError } = await supabaseClient.auth.signInWithPassword({
          email: userEmail,
          password: oldPassword,
        })
        if (signInError) throw new Error('Current password is incorrect')
      }
      const { error } = await supabaseClient.auth.updateUser({ password: newPassword })
      if (error) throw error
      setPasswordDone(true)
      if (!hasEmail) {
        setLinkedProviders((prev) => [...prev, 'email'])
      }
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to update password')
    } finally {
      setPasswordLoading(false)
    }
  }

  return (
    <div className="page-content">
      {!hideTitle && <h2 className="page-title">Account Settings</h2>}

      {userEmail && (
        <p className="account-email">{userEmail}</p>
      )}

      {hideAuthSections && (
        <p className="account-manage-note">
          To manage sign-in methods (Google, password),{' '}
          <a href={WEBAPP_URL + '/account'} target="_blank" rel="noreferrer">
            open the Canvas Pet web app
          </a>
          .
        </p>
      )}

      {!hideAuthSections && (
        <div className="account-sections">
          {/* Google sign-in */}
          <div className="account-section">
            <div className="account-section-info">
              <p className="account-section-title">Sign in with Google</p>
              <p className="account-section-desc">
                {linkedProviders.includes('google')
                  ? 'Google account is linked.'
                  : 'Link your Google account to sign in with either method.'}
              </p>
            </div>
            {linkedProviders.includes('google') ? (
              <span className="account-section-badge">Linked</span>
            ) : (
              <button
                className="account-btn"
                onClick={handleLinkGoogle}
                disabled={googleLoading}
              >
                {googleLoading ? '…' : 'Link Google'}
              </button>
            )}
          </div>

          {/* Password */}
          <div className="account-section">
            <div className="account-section-info">
              <p className="account-section-title">
                {hasEmail ? 'Reset password' : 'Set a password'}
              </p>
              <p className="account-section-desc">
                {hasEmail
                  ? 'Change your current password. You will need to enter the old one.'
                  : 'Add email/password sign-in to your account.'}
              </p>
            </div>

            {passwordDone ? (
              <span className="account-section-badge">
                {hasEmail ? 'Password updated' : 'Password set'}
              </span>
            ) : (
              <form onSubmit={handlePasswordSubmit} className="account-password-form">
                {hasEmail && (
                  <input
                    type="password"
                    placeholder="Current password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    required
                    className="signin-input"
                  />
                )}
                <input
                  type="password"
                  placeholder="New password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  className="signin-input"
                />
                {passwordError && <p className="signin-error">{passwordError}</p>}
                <button type="submit" className="account-btn" disabled={passwordLoading}>
                  {passwordLoading ? '…' : hasEmail ? 'Reset password' : 'Set password'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      <div className="account-signout">
        <button className="account-signout-btn" onClick={onSignOut}>
          Sign out
        </button>
      </div>
    </div>
  )
}
