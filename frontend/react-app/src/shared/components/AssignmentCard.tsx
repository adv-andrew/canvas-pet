import type { TrackedAssignment, CanvasPlannerItem } from '../types/canvas'
import { StatusBadge } from './StatusBadge'
import { formatDueDate } from '../lib/dateUtils'

interface Props {
  assignment: TrackedAssignment
  onSave: (item: CanvasPlannerItem) => Promise<void>
  onUnsave: (id: number) => Promise<void>
}

export function AssignmentCard({ assignment, onSave, onUnsave }: Props) {
  // due_at is the canonical due date; fall back to plannable_date (the planner sort date)
  // for items like quizzes that may not have an explicit due_at set.
  const dueLabel = formatDueDate(assignment.plannable.due_at ?? assignment.plannable_date)

  const handleToggle = () => {
    if (assignment.isSaved) {
      void onUnsave(assignment.plannable_id)
    } else {
      void onSave(assignment)
    }
  }

  return (
    <div className="assignment-card">
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
          <button
            className={`save-btn ${assignment.isSaved ? 'saved' : ''}`}
            onClick={handleToggle}
          >
            {assignment.isSaved ? 'Saved ✓' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
