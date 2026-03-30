import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { AccountSettings } from '../../shared/components/AccountSettings'

export function Account() {
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/sign-in')
  }

  return <AccountSettings supabaseClient={supabase} onSignOut={handleSignOut} />
}
