import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { PrivacyPolicy } from './PrivacyPolicy'

const WEBAPP_URL = import.meta.env.VITE_WEBAPP_URL as string

export function SignIn() {
  const navigate = useNavigate()

  // Store pending canvas link params in sessionStorage before any OAuth redirect.
  // The dashboard picks these up after sign-in and calls POST /api/auth/link-canvas.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const cid = params.get('cid')
    const iu = params.get('iu')
    if (cid && iu) {
      sessionStorage.setItem(
        'pending_canvas_link',
        JSON.stringify({ canvas_user_id: cid, institution_url: iu }),
      )
    }
  }, [])

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [consentChecked, setConsentChecked] = useState(false)
  const [showPolicy, setShowPolicy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [confirmationSent, setConfirmationSent] = useState(false)

  const handleGoogleSignIn = async () => {
    setError(null)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${WEBAPP_URL}/auth/callback` },
    })
    // browser navigates away — no further code runs
  }

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (isSignUp) {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { privacy_consent_at: new Date().toISOString() } },
        })
        if (signUpError) throw signUpError
        setConfirmationSent(true)
        return
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
        if (signInError) throw signInError
      }
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  const switchMode = () => {
    setIsSignUp(!isSignUp)
    setConsentChecked(false)
    setError(null)
    setConfirmationSent(false)
  }

  return (
    <div className="signin-page">
      {showPolicy && <PrivacyPolicy onClose={() => setShowPolicy(false)} />}

      <div className="signin-card">
        <div className="signin-header">
          <h1>Canvas Pet</h1>
          <p>{isSignUp ? 'Create your account' : 'Sign in to access your dashboard'}</p>
        </div>

        <button className="google-btn" onClick={handleGoogleSignIn}>
          Sign in with Google
        </button>

        <div className="signin-divider">
          <span>or</span>
        </div>

        <form onSubmit={handleEmailSubmit} className="signin-form">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="signin-input"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="signin-input"
          />

          {isSignUp && (
            <label className="signin-consent">
              <input
                type="checkbox"
                checked={consentChecked}
                onChange={(e) => setConsentChecked(e.target.checked)}
              />
              <span>
                I have read and agree to the{' '}
                <button
                  type="button"
                  className="signin-policy-link"
                  onClick={() => setShowPolicy(true)}
                >
                  Privacy Policy
                </button>
              </span>
            </label>
          )}

          {error && <p className="signin-error">{error}</p>}

          <button
            type="submit"
            className="signin-submit-btn"
            disabled={loading || (isSignUp && !consentChecked)}
          >
            {loading ? 'Loading…' : isSignUp ? 'Create account' : 'Sign in'}
          </button>
        </form>

        {confirmationSent && (
          <p className="signin-confirmation">
            Check your email for a confirmation link to activate your account.
          </p>
        )}

        <button className="signin-toggle" onClick={switchMode}>
          {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
        </button>

        <button className="signin-policy-footer" onClick={() => setShowPolicy(true)}>
          Privacy Policy
        </button>
      </div>
    </div>
  )
}
