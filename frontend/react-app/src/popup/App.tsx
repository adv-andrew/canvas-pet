import { useEffect, useState } from 'react'
import { useCanvasData } from './hooks/useCanvasData'
import { NotOnCanvas } from './components/NotOnCanvas'
import { Dashboard } from '../shared/components/Dashboard'
import { linkGoogleAccount } from './lib/auth'
import { supabaseAuth } from './lib/supabaseAuthClient'

export function App() {
  const { assignments, announcements, loading, error, isOnCanvas, refetch, saveAssignment, unsaveAssignment } =
    useCanvasData()
  const [googleAvatar, setGoogleAvatar] = useState<string | null>(null)

  useEffect(() => {
    const checkGoogleLink = async () => {
      const { data } = await supabaseAuth.auth.getUserIdentities()
      const google = data?.identities?.find((i) => i.provider === 'google')
      setGoogleAvatar((google?.identity_data?.avatar_url as string) ?? null)
    }
    void checkGoogleLink()
    const { data: listener } = supabaseAuth.auth.onAuthStateChange(() => {
      void checkGoogleLink()
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  if (!isOnCanvas) {
    return <NotOnCanvas />
  }

  return (
    <Dashboard
      assignments={assignments}
      announcements={announcements}
      loading={loading}
      error={error}
      onSave={saveAssignment}
      onUnsave={unsaveAssignment}
      onRefresh={refetch}
      onLinkGoogle={googleAvatar ? undefined : linkGoogleAccount}
      googleAvatar={googleAvatar ?? undefined}
    />
  )
}
