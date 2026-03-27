import { useEffect, useState } from 'react'
import { supabaseAuth } from './lib/supabaseAuthClient'
import { AccountSettings } from '../shared/components/AccountSettings'
import { AccessTokenPrompt } from '../shared/components/AccessTokenPrompt'
import { apiClientGetMe, apiClientStoreCanvasToken } from '../shared/lib/apiClient'

export function App() {
  const [showPrompt, setShowPrompt] = useState(false)
  const [sessionToken, setSessionToken] = useState<string | null>(null)

  useEffect(() => {
    const check = async () => {
      try {
        const { data } = await supabaseAuth.auth.getSession()
        const token = data.session?.access_token
        if (!token) return
        setSessionToken(token)
        const me = await apiClientGetMe(token)
        if (me.canvas_linked && !me.canvas_token_stored) {
          setShowPrompt(true)
        }
      } catch {
        // non-fatal
      }
    }
    void check()
  }, [])

  const handleSignOut = () => {
    void supabaseAuth.auth.signOut()
    window.close()
  }

  const handleSubmitPassword = async (password: string) => {
    const result = await new Promise<{ token?: string; blocked?: boolean; error?: string }>(
      (resolve) => {
        chrome.runtime.sendMessage(
          { type: 'GENERATE_CANVAS_TOKEN', password },
          (response: { result: { token?: string; blocked?: boolean; error?: string } }) => {
            if (chrome.runtime.lastError) {
              resolve({ error: chrome.runtime.lastError.message ?? 'Background error' })
            } else {
              resolve(response?.result ?? { error: 'No response' })
            }
          },
        )
      },
    )
    if (!result.token) throw new Error(result.error ?? 'Could not generate token')
    if (!sessionToken) throw new Error('Not authenticated')
    await apiClientStoreCanvasToken(result.token, sessionToken)
    setShowPrompt(false)
  }

  const handleSubmitToken = async (token: string) => {
    if (!sessionToken) throw new Error('Not authenticated')
    await apiClientStoreCanvasToken(token, sessionToken)
    setShowPrompt(false)
  }

  return (
    <>
      <header className="popup-header">
        <h1>Canvas Pet</h1>
        <span className="popup-header-subtitle">Account Settings</span>
      </header>
      {showPrompt && (
        <AccessTokenPrompt
          onSubmitPassword={handleSubmitPassword}
          onSubmitToken={handleSubmitToken}
          onDismiss={() => setShowPrompt(false)}
        />
      )}
      <AccountSettings supabaseClient={supabaseAuth} onSignOut={handleSignOut} hideTitle hideAuthSections />
    </>
  )
}
