import { useState } from 'react'
import type React from 'react'
import type { TrackedAssignment, CanvasPlannerItem, CanvasAnnouncement, ConnectAppState } from '../types/canvas'
import { AssignmentCard } from './AssignmentCard'
import { AnnouncementCard } from './AnnouncementCard'
import { AccessTokenPrompt } from './AccessTokenPrompt'

interface Props {
  assignments: TrackedAssignment[]
  announcements: CanvasAnnouncement[]
  loading: boolean
  error: string | null
  onSave: (item: CanvasPlannerItem) => Promise<void>
  onUnsave: (id: number) => Promise<void>
  onComplete?: (id: number) => Promise<{ points_earned: number } | void>
  onRefresh: () => void
  onConnectApp?: () => void
  onConnectAppWithPassword?: (password: string) => Promise<void>
  onSubmitManualToken?: (token: string) => Promise<void>
  connectAppState?: ConnectAppState
  onDismissLongAccess?: () => void
  onFullscreen?: () => void
  onMinimize?: () => void
  isFullscreen?: boolean
  hideHeader?: boolean
  banner?: React.ReactNode
}

const OVERDUE_CUTOFF_DAYS = 30

function isSubmitted(item: TrackedAssignment): boolean {
  return item.submissions !== false && item.submissions.submitted
}

function applyFilters(items: TrackedAssignment[], showAll: boolean): TrackedAssignment[] {
  if (showAll) return items
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - OVERDUE_CUTOFF_DAYS)
  cutoff.setHours(0, 0, 0, 0)
  return items.filter((item) => {
    if (isSubmitted(item)) return false
    const dueAt = item.plannable.due_at ?? item.plannable_date
    if (dueAt && new Date(dueAt) < cutoff) return false
    return true
  })
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

  // Most recently past appears first (e.g. yesterday before last week)
  overdue.sort((a, b) => {
    const aMs = new Date(a.plannable.due_at ?? a.plannable_date ?? '').getTime()
    const bMs = new Date(b.plannable.due_at ?? b.plannable_date ?? '').getTime()
    return bMs - aMs
  })

  return { overdue, dueToday, thisWeek, later }
}

interface GroupSectionProps {
  title: string
  items: TrackedAssignment[]
  onSave: (item: CanvasPlannerItem) => Promise<void>
  onUnsave: (id: number) => Promise<void>
  onComplete?: (id: number) => Promise<{ points_earned: number } | void>
}

function GroupSection({ title, items, onSave, onUnsave, onComplete }: GroupSectionProps) {
  if (items.length === 0) return null
  return (
    <section className="group-section">
      <h3 className="group-title">{title}</h3>
      {items.map((a) => (
        <AssignmentCard key={a.plannable_id} assignment={a} onSave={onSave} onUnsave={onUnsave} onComplete={onComplete} />
      ))}
    </section>
  )
}

export function Dashboard({ assignments, announcements, loading, error, onSave, onUnsave, onComplete, onRefresh, onConnectApp, onConnectAppWithPassword, onSubmitManualToken, connectAppState, onDismissLongAccess, onFullscreen, onMinimize, isFullscreen, hideHeader, banner }: Props) {
  const [activeTab, setActiveTab] = useState<'assignments' | 'announcements'>('assignments')
  const [showAll, setShowAll] = useState(false)

  const visibleAssignments = applyFilters(assignments, showAll)
  const groups = groupAssignments(visibleAssignments)
  const hasAssignments = Object.values(groups).some((g) => g.length > 0)
  const pendingCount = assignments.filter((a) => !isSubmitted(a)).length

  return (
    <div className="dashboard">
      {banner}
      {!hideHeader && <header className="dashboard-header">
        <h1>Canvas Pet</h1>
        <div className="header-actions">
          {onConnectApp && (
            <button
              className="connect-app-btn"
              onClick={onConnectApp}
              disabled={['connecting','reload','needsLongAccess'].includes(connectAppState ?? '')}
              title="Open Canvas Pet web app"
            >
              {connectAppState === 'connecting' ? '…' : 'Open Web App'}
            </button>
          )}
          {onFullscreen && (
            <button className="header-icon-btn" onClick={onFullscreen} title={isFullscreen ? 'Restore' : 'Fullscreen'}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M1 4V1h3M10 1h3v3M13 10v3h-3M4 13H1v-3"/>
              </svg>
            </button>
          )}
          {onMinimize && (
            <button className="header-icon-btn" onClick={onMinimize} title="Minimize">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8">
                <line x1="2" y1="7" x2="12" y2="7"/>
              </svg>
            </button>
          )}
          <button className="refresh-btn" onClick={onRefresh} title="Refresh" disabled={loading}>
            ↻
          </button>
        </div>
      </header>}

      {connectAppState === 'needsLongAccess' && (
        <AccessTokenPrompt
          onSubmitPassword={async (pw) => { await onConnectAppWithPassword?.(pw) }}
          onSubmitToken={async (tok) => { await onSubmitManualToken?.(tok) }}
          onDismiss={() => onDismissLongAccess?.()}
        />
      )}

      {connectAppState === 'reload' && (
        <div className="connect-error-banner">
          <strong>Extension reconnected.</strong> Please reload this Canvas page, then try again.
        </div>
      )}

      {connectAppState === 'error' && (
        <div className="connect-error-banner">
          Failed to connect. Please try again.
        </div>
      )}

      <div className="tab-bar">
        <button
          className={`tab-btn ${activeTab === 'assignments' ? 'active' : ''}`}
          onClick={() => setActiveTab('assignments')}
        >
          Assignments
          {pendingCount > 0 && (
            <span className="tab-count">{pendingCount}</span>
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
          <div className="show-all-row">
            <button className="show-all-btn" onClick={() => setShowAll((v) => !v)}>
              {showAll ? 'Show less' : 'Show all'}
            </button>
          </div>
          {!hasAssignments && (
            <div className="empty-state">
              <p>No upcoming assignments. 🎉</p>
            </div>
          )}
          {hasAssignments && (
            <>
              <GroupSection title="Today" items={groups.dueToday} onSave={onSave} onUnsave={onUnsave} onComplete={onComplete} />
              <GroupSection title="This Week" items={groups.thisWeek} onSave={onSave} onUnsave={onUnsave} onComplete={onComplete} />
              <GroupSection title="Later" items={groups.later} onSave={onSave} onUnsave={onUnsave} onComplete={onComplete} />
              <GroupSection title="Past Due" items={groups.overdue} onSave={onSave} onUnsave={onUnsave} onComplete={onComplete} />
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
