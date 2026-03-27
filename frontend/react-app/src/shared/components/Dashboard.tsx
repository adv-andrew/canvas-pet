import { useState, useRef } from 'react'
import type { TrackedAssignment, CanvasPlannerItem, CanvasAnnouncement } from '../types/canvas'
import type { ConnectAppState } from '../../panel/hooks/usePanelData'
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
  onConnectApp?: () => void
  onConnectAppWithPassword?: (password: string) => void
  onSubmitManualToken?: (token: string) => Promise<void>
  connectAppState?: ConnectAppState
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

export function Dashboard({ assignments, announcements, loading, error, onSave, onUnsave, onRefresh, onConnectApp, onConnectAppWithPassword, onSubmitManualToken, connectAppState }: Props) {
  const [activeTab, setActiveTab] = useState<'assignments' | 'announcements'>('assignments')
  const passwordRef = useRef<HTMLInputElement>(null)
  const manualTokenRef = useRef<HTMLInputElement>(null)

  const groups = groupAssignments(assignments)
  const hasAssignments = Object.values(groups).some((g) => g.length > 0)

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Canvas Pet</h1>
        <div className="header-actions">
          {onConnectApp && (
            <button
              className="connect-app-btn"
              onClick={onConnectApp}
              disabled={['connecting','reload','needsPassword','passwordError'].includes(connectAppState ?? '')}
              title="Open Canvas Pet web app"
            >
              {connectAppState === 'connecting' ? '…' : 'Open Web App'}
            </button>
          )}
          <button className="refresh-btn" onClick={onRefresh} title="Refresh" disabled={loading}>
            ↻
          </button>
        </div>
      </header>

      {connectAppState === 'needsPassword' && (
        <form
          className="connect-password-form"
          onSubmit={(e) => {
            e.preventDefault()
            const pw = passwordRef.current?.value ?? ''
            if (!pw) return
            if (passwordRef.current) passwordRef.current.value = ''
            onConnectAppWithPassword?.(pw)
          }}
        >
          <p>
            <strong>Canvas password required.</strong> Your institution requires password
            confirmation to generate API tokens. It is used once and never stored.
          </p>
          <input
            ref={passwordRef}
            type="password"
            className="password-input"
            placeholder="Canvas password"
            autoFocus
          />
          <button type="submit" className="connect-app-btn">
            Confirm
          </button>
        </form>
      )}

      {connectAppState === 'passwordError' && (
        <form
          className="connect-password-form"
          onSubmit={(e) => {
            e.preventDefault()
            const tok = manualTokenRef.current?.value?.trim() ?? ''
            if (!tok) return
            if (manualTokenRef.current) manualTokenRef.current.value = ''
            void onSubmitManualToken?.(tok)
          }}
        >
          <p>
            <strong>Automatic token generation blocked.</strong> Your institution uses SSO
            and does not allow API-based token creation.
          </p>
          <p>
            To enable live sync, manually create a token in Canvas:
            <br />
            <em>Profile → Settings → New Access Token → purpose: "Canvas Pet"</em>
          </p>
          <input
            ref={manualTokenRef}
            type="password"
            className="password-input"
            placeholder="Paste token here"
            autoFocus
          />
          <button type="submit" className="connect-app-btn">
            Save Token
          </button>
        </form>
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
