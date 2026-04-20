import { useState } from 'react'
import type { TrackedAssignment, CanvasPlannerItem } from '../types/canvas'
import { StatusBadge } from './StatusBadge'
import { formatDueDate } from '../lib/dateUtils'

interface Props {
  assignment: TrackedAssignment
  onSave: (item: CanvasPlannerItem) => Promise<void>
  onUnsave: (id: number) => Promise<void>
  onComplete?: (id: number) => Promise<{ points_earned: number } | void>
}

export function AssignmentCard({ assignment, onSave, onUnsave, onComplete }: Props) {
  const [completing, setCompleting] = useState(false)
  const [pointsEarned, setPointsEarned] = useState<number | null>(null)

  const dueLabel = formatDueDate(assignment.plannable.due_at ?? assignment.plannable_date)

  const handleToggle = () => {
    if (assignment.isSaved) {
      void onUnsave(assignment.plannable_id)
    } else {
      void onSave(assignment)
    }
  }

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

  const isCompleted = assignment.isCompleted

  return (
    <div className={`assignment-card ${isCompleted ? 'completed' : ''}`}>
      {pointsEarned !== null && (
        <div className="points-earned-popup">+{pointsEarned} RP!</div>
      )}
      <div className="card-header">
        <span className="course-name">{assignment.context_name}</span>
        <span className="due-date">{dueLabel}</span>
      </div>
      <div className="card-body">
        <a
          className="assignment-title"
          href={assignment.plannable.html_url}
          target="_blank"
          rel="noreferrer"
        >
          {assignment.plannable.title}
        </a>
        <div className="card-footer">
          <StatusBadge submissions={assignment.submissions} />
          <div className="card-actions">
            {onComplete && assignment.isSaved && !isCompleted && (
              <button
                className="complete-btn"
                onClick={handleComplete}
                disabled={completing}
                title="Mark as complete and earn points"
              >
                {completing ? '...' : '✓'}
              </button>
            )}
            <button
              className={`save-btn ${assignment.isSaved ? 'saved' : ''}`}
              onClick={handleToggle}
            >
              {assignment.isSaved ? 'Saved ✓' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
