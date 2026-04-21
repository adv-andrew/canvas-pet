import { useEffect, useState } from 'react'
import { Calendar } from './Calendar'
import type { TrackedAssignment, CanvasPlannerItem } from '../../shared/types/canvas'

export function CalendarPage() {
  const [assignments, setAssignments] = useState<TrackedAssignment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === 'CP_CANVAS_DATA') {
        const payload = event.data.payload as { items: CanvasPlannerItem[] }
        const items = payload?.items ?? []
        const tracked: TrackedAssignment[] = items.map((item) => ({
          ...item,
          isSaved: false,
          savedAt: null,
        }))
        setAssignments(tracked)
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

  return <Calendar assignments={assignments} />
}
