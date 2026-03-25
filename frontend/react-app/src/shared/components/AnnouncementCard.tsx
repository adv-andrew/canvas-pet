import type { CanvasAnnouncement } from '../types/canvas'

interface Props {
  announcement: CanvasAnnouncement
}

function formatPostedDate(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const posted = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diffDays = Math.round((today.getTime() - posted.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Posted today'
  if (diffDays === 1) return 'Posted yesterday'
  if (diffDays < 7) return `Posted ${diffDays}d ago`
  return `Posted ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
}

export function AnnouncementCard({ announcement }: Props) {
  return (
    <div className="assignment-card">
      <div className="card-header">
        <span className="course-name announcement-course">
          {announcement.context_type === 'Course' ? 'Course Announcement' : announcement.context_type}
        </span>
        <span className="due-date">{formatPostedDate(announcement.created_at)}</span>
      </div>
      <div className="card-body">
        <a
          className="assignment-title"
          href={announcement.html_url}
          target="_blank"
          rel="noreferrer"
        >
          {announcement.title}
        </a>
      </div>
    </div>
  )
}
