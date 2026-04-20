import { useEffect, useState } from 'react'
import { Calendar } from './Calendar'
import type { TrackedAssignment, CanvasPlannerItem } from '../../shared/types/canvas'
import { apiWebSavePins } from '../lib/api'

export function CalendarPage() {
  const [assignments, setAssignments] = useState<TrackedAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [institutionUrl, setInstitutionUrl] = useState<string | null>(null)

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.origin !== globalThis.location.origin) return
      if (event.data?.type === 'CP_CANVAS_DATA') {
        const payload = event.data.payload as { items: CanvasPlannerItem[]; institutionUrl?: string }
        const items = payload?.items ?? []
        const tracked: TrackedAssignment[] = items.map((item) => ({
          ...item,
          isSaved: false,
          savedAt: null,
        }))
        setAssignments(tracked)
        if (payload.institutionUrl) setInstitutionUrl(payload.institutionUrl)
        setLoading(false)
      }
    }

    window.addEventListener('message', handleMessage)
    window.postMessage({ type: 'CP_REQUEST_DATA' }, '*')

    const timeout = setTimeout(() => setLoading(false), 2000)

    return () => {
      window.removeEventListener('message', handleMessage)
      clearTimeout(timeout)
    }
  }, [])

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner" />
      </div>
    )
  }

  if (assignments.length === 0) {
    return (
      <div className="calendar-page">
        <h2 className="page-title">Calendar</h2>
        <div className="canvas-not-linked-banner">
          Open a Canvas tab with the extension installed to see your assignments here.
        </div>
      </div>
    )
  }

  const handleSavePins = institutionUrl
    ? async (ids: Set<number>) => { await apiWebSavePins([...ids], institutionUrl) }
    : undefined

  return <Calendar assignments={assignments} onSavePins={handleSavePins} />
}
