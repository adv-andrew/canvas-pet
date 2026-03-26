import { useEffect, useState } from 'react'
import { useCanvasData } from './hooks/useCanvasData'
import { NotOnCanvas } from './components/NotOnCanvas'
import { Dashboard } from '../shared/components/Dashboard'
import { supabaseAuth } from './lib/supabaseAuthClient'
import { apiClientGetMe } from '../shared/lib/apiClient'

const WEBAPP_URL = import.meta.env.VITE_WEBAPP_URL as string

export function App() {
  const {
    assignments,
    announcements,
    loading,
    error,
    isOnCanvas,
    refetch,
    saveAssignment,
    unsaveAssignment,
    userId,
    institutionUrl,
  } = useCanvasData()

  const [webAccount, setWebAccount] = useState<{ displayName: string | null; email: string | null } | null>(null)

  useEffect(() => {
    const checkWebLink = async () => {
      try {
        const token = (await supabaseAuth.auth.getSession()).data.session?.access_token
        if (!token) return
        const me = await apiClientGetMe(token)
        if (me.web_linked) {
          setWebAccount({ displayName: me.web_display_name ?? null, email: me.web_email ?? null })
        } else {
          setWebAccount(null)
        }
      } catch {
        setWebAccount(null)
      }
    }

    void checkWebLink()
    const { data: listener } = supabaseAuth.auth.onAuthStateChange(() => {
      void checkWebLink()
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  const handleConnectApp = () => {
    if (!userId || !institutionUrl) return
    const url = `${WEBAPP_URL}/sign-in?cid=${encodeURIComponent(userId)}&iu=${encodeURIComponent(institutionUrl)}`
    chrome.tabs.create({ url })
  }

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
      onConnectApp={webAccount ? undefined : handleConnectApp}
      webAccount={webAccount ?? undefined}
    />
  )
}
