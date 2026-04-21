import { useState } from 'react'
import type { TrackedAssignment } from '../types/canvas'
import { StatusBadge } from './StatusBadge'
import { formatExactDueDate } from '../lib/dateUtils'

interface Props {
  assignment: TrackedAssignment
  isPinned: boolean
  isSelected?: boolean
  onPin: () => void
  onSelect?: () => void
  onRemove?: () => void
  onComplete?: (id: number) => Promise<{ points_earned: number } | void>
  courseColor?: { bg: string; text: string }
}

const COURSE_COLORS = [
  { bg: '#dbeafe', text: '#1e40af' },
  { bg: '#d1fae5', text: '#065f46' },
  { bg: '#fce7f3', text: '#9d174d' },
  { bg: '#e0e7ff', text: '#3730a3' },
  { bg: '#ffedd5', text: '#7c2d12' },
  { bg: '#f3e8ff', text: '#6b21a8' },
  { bg: '#cffafe', text: '#164e63' },
  { bg: '#fef9c3', text: '#713f12' },
  { bg: '#dcfce7', text: '#14532d' },
  { bg: '#ffe4e6', text: '#9f1239' },
  { bg: '#fef3c7', text: '#92400e' },
  { bg: '#d1d5fb', text: '#312e81' },
  { bg: '#fde8d8', text: '#7c3929' },
  { bg: '#d6f5e3', text: '#065535' },
  { bg: '#fde2f3', text: '#831843' },
  { bg: '#e0f2fe', text: '#0c4a6e' },
  { bg: '#ecfdf5', text: '#064e3b' },
  { bg: '#fdf4ff', text: '#701a75' },
  { bg: '#fff7ed', text: '#7c2d12' },
  { bg: '#f0fdf4', text: '#166534' },
]
const OVERDUE_COLOR = { bg: '#fee2e2', text: '#991b1b' }

function isOverdue(a: TrackedAssignment): boolean {
  const dueAt = a.plannable.due_at ?? a.plannable_date
  if (!dueAt || new Date(dueAt) >= new Date()) return false
  return !a.submissions || !a.submissions.submitted
}

function isCanvasCompleted(a: TrackedAssignment): boolean {
  return !!(a.submissions && (a.submissions.submitted || a.submissions.graded))
}

function isCompleted(a: TrackedAssignment): boolean {
  return isCanvasCompleted(a) || !!a.isCompleted
}

function getTypeIcon(type: string): string {
  if (type === 'quiz') return '📋'
  if (type === 'discussion_topic') return '💬'
  return '📝'
}

// Mirrors backend calculateAward base (without streak, which is user-level)
function calculateBaseRP(dueDate: string | null): number {
  if (!dueDate) return 5
  const daysEarly = (new Date(dueDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000)
  if (daysEarly < 0) return 0
  if (daysEarly >= 2) return 15
  if (daysEarly >= 1) return 10
  return 5
}

function calculateHappinessGain(dueDate: string | null): number {
  if (!dueDate) return 5
  const daysEarly = (new Date(dueDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000)
  if (daysEarly < 0) return 0
  if (daysEarly >= 2) return 10
  if (daysEarly >= 1) return 7
  return 5
}

export function AssignmentCard({ assignment, isPinned, isSelected, onPin, onSelect, onRemove, onComplete, courseColor }: Readonly<Props>) {
  const [completing, setCompleting] = useState(false)
  const [pointsEarned, setPointsEarned] = useState<number | null>(null)

  const autoColor = COURSE_COLORS[Math.abs(assignment.course_id ?? 0) % COURSE_COLORS.length]
  const baseColor = courseColor ?? autoColor
  const color = isOverdue(assignment) ? OVERDUE_COLOR : baseColor
  const done = isCompleted(assignment)
  const dueDate = assignment.plannable.due_at ?? assignment.plannable_date
  const rpBase = calculateBaseRP(dueDate)
  const happinessGain = calculateHappinessGain(dueDate)

  const handleComplete = async () => {
    if (!onComplete || completing) return
    setCompleting(true)
    try {
      const result = await onComplete(assignment.plannable_id)
      if (result?.points_earned) {
        setPointsEarned(result.points_earned)
        setTimeout(() => setPointsEarned(null), 3000)
      }
    } finally {
      setCompleting(false)
    }
  }

  return (
    <div
      className={`assignment-card${isPinned ? ' pinned' : ''}${!isPinned && onRemove ? ' preview' : ''}${isSelected ? ' selected' : ''}`}
      onDoubleClick={onPin}
      onClick={onSelect}
      onKeyDown={(e) => { if (e.key === 'Enter') onSelect?.() }}
    >
      {pointsEarned !== null && (
        <div className="points-earned-popup">+{pointsEarned} RP!</div>
      )}
      <div className="calendar-detail-header" style={{ background: color.bg, color: color.text }}>
        <span>{getTypeIcon(assignment.plannable_type)}</span>
        <span className="calendar-detail-course">{assignment.context_name}</span>
        <span className="calendar-detail-due">{formatExactDueDate(assignment.plannable.due_at ?? assignment.plannable_date)}</span>
        <div className="calendar-detail-actions">
          {onComplete && !done && (
            <button
              className="calendar-complete-btn"
              onClick={handleComplete}
              disabled={completing}
              title="Mark as complete and earn points"
            >
              {completing ? '...' : '✓'}
            </button>
          )}
          <button
            className={`calendar-pin-btn${isPinned ? ' pinned' : ''}`}
            onClick={(e) => { e.stopPropagation(); onPin() }}
            title={isPinned ? 'Unpin' : 'Pin'}
          >
            📌
          </button>
          {onRemove && (
            <button
              className="calendar-remove-btn"
              onClick={(e) => { e.stopPropagation(); onRemove() }}
              title="Remove"
            >
              ×
            </button>
          )}
        </div>
      </div>
      <div className="calendar-detail-body">
        {assignment.plannable.html_url ? (
          <a
            className="calendar-detail-title"
            href={assignment.plannable.html_url}
            rel="noreferrer"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              const url = assignment.plannable.html_url!
              if (typeof chrome !== 'undefined' && chrome.tabs) {
                void chrome.tabs.create({ url })
              } else {
                window.open(url, '_blank', 'noopener,noreferrer')
              }
            }}
          >
            {assignment.plannable.title}
          </a>
        ) : (
          <span className="calendar-detail-title">{assignment.plannable.title}</span>
        )}
        <div className="calendar-detail-footer">
          <StatusBadge submissions={assignment.submissions} isAppCompleted={!!assignment.isCompleted} />
          <div className="assignment-point-stats">
            {assignment.plannable.points_possible != null && (
              <span className="canvas-pts" title="Canvas grade points">
                {assignment.plannable.points_possible} Points
              </span>
            )}
            {!done && (
              <>
                <span
                  className="app-rp-badge"
                  title={`Reward Points earned on completion. Base: ${rpBase} RP (+0–10 streak bonus on top)`}
                >
                  +{rpBase} RP
                </span>
                <span
                  className="app-happiness-badge"
                  title="Pet happiness gained on completion"
                >
                  +{happinessGain}% ❤️
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
