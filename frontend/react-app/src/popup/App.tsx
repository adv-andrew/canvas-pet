import { supabaseAuth } from './lib/supabaseAuthClient'
import { AccountSettings } from '../shared/components/AccountSettings'

export function App() {
  const handleSignOut = () => {
    void supabaseAuth.auth.signOut()
    window.close()
  }

  return (
    <>
      <header className="popup-header">
        <h1>Canvas Pet</h1>
        <span className="popup-header-subtitle">Account Settings</span>
      </header>
      <AccountSettings supabaseClient={supabaseAuth} onSignOut={handleSignOut} hideTitle hideAuthSections />
    </>
  )
}
