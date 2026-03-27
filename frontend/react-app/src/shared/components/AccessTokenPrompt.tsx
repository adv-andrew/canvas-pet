import { useState, useRef } from 'react'

interface AccessTokenPromptProps {
  onSubmitPassword: (password: string) => Promise<void>
  onSubmitToken: (token: string) => Promise<void>
  onDismiss: () => void
}

export function AccessTokenPrompt({ onSubmitPassword, onSubmitToken, onDismiss }: AccessTokenPromptProps) {
  const [mode, setMode] = useState<'choose' | 'password' | 'manual'>('choose')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const value = inputRef.current?.value?.trim() ?? ''
    if (!value) return
    setSubmitting(true)
    setError(null)
    try {
      if (mode === 'password') {
        if (inputRef.current) inputRef.current.value = ''
        await onSubmitPassword(value)
      } else {
        if (inputRef.current) inputRef.current.value = ''
        await onSubmitToken(value)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (mode === 'choose') {
    return (
      <div className="access-token-prompt">
        <p><strong>Enable long-lasting sync</strong></p>
        <p>Your data was passed to the web app. To keep Canvas Pet in sync automatically, connect your account:</p>
        <div className="access-token-options">
          <button className="access-token-option-btn" onClick={() => { setError(null); setMode('password') }}>
            Use Canvas password
          </button>
          <button className="access-token-option-btn" onClick={() => { setError(null); setMode('manual') }}>
            Paste access token
          </button>
        </div>
        <button className="access-token-dismiss" onClick={onDismiss}>Skip for now</button>
      </div>
    )
  }

  return (
    <form className="access-token-prompt" onSubmit={handleSubmit}>
      {mode === 'password' ? (
        <p><strong>Canvas password</strong> — used once to generate an API token. Never stored.</p>
      ) : (
        <p>
          <strong>Paste access token</strong> — create one at:<br />
          <em>Canvas → Profile → Settings → New Access Token</em><br />
          Purpose: "Canvas Pet" · Expires: 119 days
        </p>
      )}
      {error && <span className="access-token-error">{error}</span>}
      <input
        ref={inputRef}
        type="password"
        className="password-input"
        placeholder={mode === 'password' ? 'Canvas password' : 'Paste token here'}
        autoFocus
        disabled={submitting}
      />
      <div className="access-token-actions">
        <button type="button" className="access-token-back" onClick={() => { setError(null); setMode('choose') }} disabled={submitting}>
          ← Back
        </button>
        <button type="submit" className="connect-app-btn" disabled={submitting}>
          {submitting ? '…' : mode === 'password' ? 'Confirm' : 'Save Token'}
        </button>
      </div>
    </form>
  )
}
