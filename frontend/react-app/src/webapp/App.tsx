import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet, useNavigate } from 'react-router-dom'
import { supabase } from './lib/supabaseClient'
import { NavBar } from './components/NavBar'
import { SignIn } from './pages/SignIn'
import { Home } from './pages/Home'
import { Dashboard } from './pages/Dashboard'
import { Shop } from './pages/Shop'
import { Account } from './pages/Account'

// Handles the Supabase OAuth callback (?code=...) — exchanges the code for a
// session, then redirects to the dashboard.
function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        navigate('/dashboard', { replace: true })
      }
    })
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

// Wraps all authenticated pages: checks session, renders NavBar + page content.
function ProtectedLayout() {
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate('/sign-in', { replace: true })
      } else {
        setChecking(false)
      }
    })
  }, [navigate])

  if (checking) {
    return (
      <div className="webapp-loading">
        <div className="spinner" />
      </div>
    )
  }

  return (
    <>
      <NavBar />
      <Outlet />
    </>
  )
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/sign-in" element={<SignIn />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        <Route element={<ProtectedLayout />}>
          <Route path="/home" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/account" element={<Account />} />
        </Route>

        <Route path="*" element={<Navigate to="/sign-in" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
