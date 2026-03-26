import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

interface Props {
  rewardPoints?: number
}

export function NavBar({ rewardPoints = 0 }: Props) {
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
        {link('/shop', 'Shop')}
      </div>
      <div className="navbar-right">
        <button
          className="navbar-rp-btn"
          onClick={() => navigate('/shop')}
          title="Reward Points — go to Shop"
        >
          RP: {rewardPoints}
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
