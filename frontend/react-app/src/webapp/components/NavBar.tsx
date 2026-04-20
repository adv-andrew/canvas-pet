import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

interface Props {
  readonly rewardPoints?: number
  readonly happiness?: number
  readonly isAdmin?: boolean
}

export function NavBar({ rewardPoints = 0, happiness = 0, isAdmin = false }: Props) {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/sign-in')
  }

  const link = (path: string, label: string) => (
    <button
      className={`navbar-link${pathname === path ? ' active' : ''}`}
      onClick={() => navigate(path)}
    >
      {label}
    </button>
  )

  return (
    <nav className="navbar">
      <span className="navbar-brand">Canvas Pet</span>
      <div className="navbar-links">
        {link('/home', 'Home')}
        {link('/dashboard', 'Dashboard')}
        {link('/calendar', 'Calendar')}
        {link('/shop', 'Shop')}
      </div>
      <div className="navbar-right">
        {isAdmin && (
          <button
            className="navbar-admin-btn"
            onClick={() => navigate('/admin')}
            title="Admin Panel"
          >
            Admin
          </button>
        )}
        <button
          className="navbar-stat-pill navbar-happiness-pill"
          onClick={() => navigate('/home')}
          title="Happiness — go to Home"
        >
          <span className="navbar-stat-icon">❤️</span>
          {happiness}%
        </button>
        <button
          className="navbar-stat-pill navbar-rp-pill"
          onClick={() => navigate('/shop')}
          title="Reward Points — go to Shop"
        >
          <span className="navbar-stat-icon">⭐</span>
          {rewardPoints}
        </button>
        <button
          className="navbar-profile-btn"
          onClick={() => navigate('/account')}
          title="Account settings"
          aria-label="Account settings"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
          </svg>
        </button>
        <button className="navbar-signout-btn" onClick={handleSignOut}>
          Sign out
        </button>
      </div>
    </nav>
  )
}
