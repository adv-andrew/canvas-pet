import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { supabase } from './lib/supabaseClient'
import { SignIn } from './pages/SignIn'
import { Dashboard } from './pages/Dashboard'

// Handles the Supabase OAuth callback (?code=...) — exchanges the code for a
// session, then redirects to the dashboard. Supabase detects the code in the
// URL automatically during client initialization, so we just wait for the
// auth state to update and navigate.
function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        navigate('/dashboard', { replace: true })
      }
    })
    // Fallback: if already signed in (code already exchanged), go straight to dashboard
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate('/dashboard', { replace: true })
    })
    return () => listener.subscription.unsubscribe()
  }, [navigate])

  return (
    <div className="webapp-loading">
      <div className="spinner" />
    </div>
  )
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/sign-in" element={<SignIn />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="*" element={<Navigate to="/sign-in" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
