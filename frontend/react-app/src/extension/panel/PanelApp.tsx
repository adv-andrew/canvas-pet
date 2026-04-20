import { useState, useEffect } from 'react'
import { Dashboard } from '../../shared/components/Dashboard'
import { usePanelData } from './hooks/usePanelData'

type PanelMode = 'sidebar' | 'fullscreen' | 'minimized'

export function PanelApp() {
  const [mode, setMode] = useState<PanelMode>('sidebar')
  const data = usePanelData()

  // Listen for mode updates from content script (e.g. restore tab clicked)
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'SET_MODE' && e.source === window.parent) {
        setMode(e.data.mode as PanelMode)
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  const setAndBroadcast = (m: PanelMode) => {
    setMode(m)
    window.parent.postMessage({ type: 'SET_MODE', mode: m }, '*')
  }

  return (
    <div className="cp-panel">
      <Dashboard
        assignments={data.assignments}
        announcements={data.announcements}
        loading={data.loading}
        error={data.error}
        onSave={data.saveAssignment}
        onUnsave={data.unsaveAssignment}
        onComplete={data.completeAssignment}
        onRefresh={data.refetch}
        onConnectApp={data.handleConnectApp}
        onConnectAppWithPassword={data.handleConnectAppWithPassword}
        onSubmitManualToken={data.handleSubmitManualToken}
        connectAppState={data.connectAppState}
        onDismissLongAccess={data.handleDismissLongAccess}
        onFullscreen={() => setAndBroadcast(mode === 'fullscreen' ? 'sidebar' : 'fullscreen')}
        onMinimize={() => setAndBroadcast('minimized')}
        isFullscreen={mode === 'fullscreen'}
      />
    </div>
  )
}
