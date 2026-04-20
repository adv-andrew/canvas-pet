import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet, useNavigate } from 'react-router-dom'
import { supabase } from './lib/supabaseClient'
import { apiClientGetPetStats } from '../shared/lib/apiClient'
import { NavBar } from './components/NavBar'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL as string
import { SignIn } from './pages/SignIn'
import { Home } from './pages/Home'
import { Dashboard } from './pages/Dashboard'
import { Shop } from './pages/Shop'
import { Account } from './pages/Account'
import { CalendarPage } from './pages/CalendarPage'
import { Admin } from './pages/Admin'

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
  const [rewardPoints, setRewardPoints] = useState(0)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        navigate('/sign-in', { replace: true })
      } else {
        const token = data.session.access_token
        const [stats, adminRes] = await Promise.allSettled([
          apiClientGetPetStats(token),
          fetch(`${BACKEND_URL}/api/admin/users`, { headers: { Authorization: `Bearer ${token}` } }),
        ])
        if (stats.status === 'fulfilled') setRewardPoints(stats.value.reward_points)
        if (adminRes.status === 'fulfilled' && adminRes.value.ok) setIsAdmin(true)
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
      <NavBar rewardPoints={rewardPoints} isAdmin={isAdmin} />
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
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/account" element={<Account />} />
          <Route path="/admin" element={<Admin />} />
        </Route>

        <Route path="*" element={<Navigate to="/sign-in" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
