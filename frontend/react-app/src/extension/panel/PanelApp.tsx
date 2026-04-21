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

  // chrome-extension iframes can't open new tabs via target="_blank" even with
  // allow="popups" — intercept all such clicks and route through the content script,
  // which calls chrome.tabs.create to open the URL in a new tab reliably.
  useEffect(() => {
    // ancestorOrigins[0] is the direct parent's origin (Canvas page) — Chrome-only,
    // safe here since this panel only runs as a Chrome extension iframe.
    const parentOrigin = location.ancestorOrigins[0] ?? '*'
    const handler = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest('a')
      if (!anchor?.href || anchor.target !== '_blank') return
      e.preventDefault()
      window.parent.postMessage({ type: 'OPEN_URL', url: anchor.href }, parentOrigin)
    }
    document.addEventListener('click', handler, true)
    return () => document.removeEventListener('click', handler, true)
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
