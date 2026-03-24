import { useState } from 'react'
import type { TrackedAssignment, CanvasPlannerItem, CanvasAnnouncement } from '../types/canvas'
import { AssignmentCard } from './AssignmentCard'
import { AnnouncementCard } from './AnnouncementCard'

interface Props {
  assignments: TrackedAssignment[]
  announcements: CanvasAnnouncement[]
  loading: boolean
  error: string | null
  onSave: (item: CanvasPlannerItem) => Promise<void>
  onUnsave: (id: number) => Promise<void>
  onRefresh: () => void
}

function groupAssignments(items: TrackedAssignment[]) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekEnd = new Date(today)
  weekEnd.setDate(weekEnd.getDate() + 7)

  const overdue: TrackedAssignment[] = []
  const dueToday: TrackedAssignment[] = []
  const thisWeek: TrackedAssignment[] = []
  const later: TrackedAssignment[] = []

  for (const item of items) {
    // Fall back to plannable_date so items without a due_at are still grouped correctly
    const dueAt = item.plannable.due_at ?? item.plannable_date
    if (!dueAt) {
      later.push(item)
      continue
    }
    const due = new Date(dueAt)
    const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate())

    if (dueDay < today) overdue.push(item)
    else if (dueDay.getTime() === today.getTime()) dueToday.push(item)
    else if (dueDay <= weekEnd) thisWeek.push(item)
    else later.push(item)
  }

  return { overdue, dueToday, thisWeek, later }
}

interface GroupSectionProps {
  title: string
  items: TrackedAssignment[]
  onSave: (item: CanvasPlannerItem) => Promise<void>
  onUnsave: (id: number) => Promise<void>
}

function GroupSection({ title, items, onSave, onUnsave }: GroupSectionProps) {
  if (items.length === 0) return null
  return (
    <section className="group-section">
      <h3 className="group-title">{title}</h3>
      {items.map((a) => (
        <AssignmentCard key={a.plannable_id} assignment={a} onSave={onSave} onUnsave={onUnsave} />
      ))}
    </section>
  )
}

export function Dashboard({ assignments, announcements, loading, error, onSave, onUnsave, onRefresh }: Props) {
  const [activeTab, setActiveTab] = useState<'assignments' | 'announcements'>('assignments')
  const groups = groupAssignments(assignments)
  const hasAssignments = Object.values(groups).some((g) => g.length > 0)

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Canvas Todo</h1>
        <button className="refresh-btn" onClick={onRefresh} title="Refresh" disabled={loading}>
          ↻
        </button>
      </header>

      <div className="tab-bar">
        <button
          className={`tab-btn ${activeTab === 'assignments' ? 'active' : ''}`}
          onClick={() => setActiveTab('assignments')}
        >
          Assignments
          {assignments.length > 0 && (
            <span className="tab-count">{assignments.length}</span>
          )}
        </button>
        <button
          className={`tab-btn ${activeTab === 'announcements' ? 'active' : ''}`}
          onClick={() => setActiveTab('announcements')}
        >
          Announcements
          {announcements.length > 0 && (
            <span className="tab-count">{announcements.length}</span>
          )}
        </button>
      </div>

      {loading && (
        <div className="loading">
          <div className="spinner" />
          <p>Loading...</p>
        </div>
      )}

      {!loading && error && (
        <div className="error-state">
          <p>{error}</p>
          <button onClick={onRefresh}>Try again</button>
        </div>
      )}

      {!loading && !error && activeTab === 'assignments' && (
        <>
          {!hasAssignments && (
            <div className="empty-state">
              <p>No upcoming assignments. 🎉</p>
            </div>
          )}
          {hasAssignments && (
            <>
              <GroupSection title="Overdue" items={groups.overdue} onSave={onSave} onUnsave={onUnsave} />
              <GroupSection title="Today" items={groups.dueToday} onSave={onSave} onUnsave={onUnsave} />
              <GroupSection title="This Week" items={groups.thisWeek} onSave={onSave} onUnsave={onUnsave} />
              <GroupSection title="Later" items={groups.later} onSave={onSave} onUnsave={onUnsave} />
            </>
          )}
        </>
      )}

      {!loading && !error && activeTab === 'announcements' && (
        <>
          {announcements.length === 0 && (
            <div className="empty-state">
              <p>No recent announcements.</p>
            </div>
          )}
          {announcements.length > 0 && (
            <section className="group-section">
              {announcements.map((a) => (
                <AnnouncementCard key={a.id} announcement={a} />
              ))}
            </section>
          )}
        </>
      )}
    </div>
  )
}
