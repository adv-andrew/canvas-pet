import type { CanvasPlannerItem } from '../types/canvas'

interface Props {
  submissions: CanvasPlannerItem['submissions']
  isAppCompleted?: boolean
}

export function StatusBadge({ submissions, isAppCompleted }: Readonly<Props>) {
  if (isAppCompleted) {
    return <span className="badge badge-completed">Completed</span>
  }
  if (!submissions) {
    return <span className="badge badge-pending">Pending</span>
  }
  if (submissions.missing) {
    return <span className="badge badge-missing">Missing</span>
  }
  if (submissions.late) {
    return <span className="badge badge-late">Late</span>
  }
  if (submissions.submitted || submissions.graded) {
    return <span className="badge badge-submitted">Submitted</span>
  }
  return <span className="badge badge-pending">Pending</span>
}
