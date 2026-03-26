import type { CanvasAnnouncement } from '../types/canvas'
import { formatPostedDate } from '../lib/dateUtils'

interface Props {
  announcement: CanvasAnnouncement
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
