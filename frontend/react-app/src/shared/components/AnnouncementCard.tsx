import type { CanvasAnnouncement } from '../types/canvas'
import { formatPostedDate } from '../lib/dateUtils'

interface Props {
  announcement: CanvasAnnouncement
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

export function AnnouncementCard({ announcement }: Readonly<Props>) {
  const color = COURSE_COLORS[Math.abs(announcement.course_id ?? 0) % COURSE_COLORS.length]
  const label = announcement.context_type === 'Course' ? 'Course Announcement' : announcement.context_type

  return (
    <div className="assignment-card">
      <div className="calendar-detail-header" style={{ background: color.bg, color: color.text }}>
        <span>📢</span>
        <span className="calendar-detail-course">{label}</span>
        <span className="calendar-detail-due">{formatPostedDate(announcement.created_at)}</span>
      </div>
      <div className="calendar-detail-body">
        <a
          className="calendar-detail-title"
          href={announcement.html_url}
          rel="noreferrer"
          onClick={(e) => {
            e.preventDefault()
            const url = announcement.html_url
            if (typeof chrome !== 'undefined' && chrome.tabs) {
              void chrome.tabs.create({ url })
            } else {
              window.open(url, '_blank', 'noopener,noreferrer')
            }
          }}
        >
          {announcement.title}
        </a>
      </div>
    </div>
  )
}
