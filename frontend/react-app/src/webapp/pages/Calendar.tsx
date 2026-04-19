import { useState, useMemo } from 'react'
import type { TrackedAssignment } from '../../shared/types/canvas'

interface Props {
  assignments: TrackedAssignment[]
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

interface CalendarDay {
  date: Date
  isCurrentMonth: boolean
  isToday: boolean
  assignments: TrackedAssignment[]
}

function getCalendarDays(year: number, month: number, assignments: TrackedAssignment[]): CalendarDay[] {
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  const startDate = new Date(firstDay)
  startDate.setDate(startDate.getDate() - firstDay.getDay())

  const endDate = new Date(lastDay)
  endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()))

  const assignmentsByDate = new Map<string, TrackedAssignment[]>()
  for (const a of assignments) {
    const dueAt = a.plannable.due_at ?? a.plannable_date
    if (!dueAt) continue
    const d = new Date(dueAt)
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    if (!assignmentsByDate.has(key)) {
      assignmentsByDate.set(key, [])
    }
    assignmentsByDate.get(key)!.push(a)
  }

  const days: CalendarDay[] = []
  const current = new Date(startDate)

  while (current <= endDate) {
    const key = `${current.getFullYear()}-${current.getMonth()}-${current.getDate()}`
    days.push({
      date: new Date(current),
      isCurrentMonth: current.getMonth() === month,
      isToday: key === todayStr,
      assignments: assignmentsByDate.get(key) ?? [],
    })
    current.setDate(current.getDate() + 1)
  }

  return days
}

function getEventClass(assignment: TrackedAssignment): string {
  const dueAt = assignment.plannable.due_at ?? assignment.plannable_date
  if (dueAt && new Date(dueAt) < new Date()) {
    const submissions = assignment.submissions
    if (submissions && !submissions.submitted) {
      return 'overdue'
    }
  }

  const type = assignment.plannable_type
  if (type === 'quiz') return 'quiz'
  if (type === 'discussion_topic') return 'discussion'
  return 'assignment'
}

export function Calendar({ assignments }: Props) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())

  const days = useMemo(
    () => getCalendarDays(year, month, assignments),
    [year, month, assignments]
  )

  const goToPrev = () => {
    if (month === 0) {
      setMonth(11)
      setYear(year - 1)
    } else {
      setMonth(month - 1)
    }
  }

  const goToNext = () => {
    if (month === 11) {
      setMonth(0)
      setYear(year + 1)
    } else {
      setMonth(month + 1)
    }
  }

  const goToToday = () => {
    setYear(today.getFullYear())
    setMonth(today.getMonth())
  }

  return (
    <div className="page-content">
      <div className="calendar-header">
        <div className="calendar-nav">
          <button className="calendar-nav-btn" onClick={goToPrev}>←</button>
          <span className="calendar-month">{MONTHS[month]} {year}</span>
          <button className="calendar-nav-btn" onClick={goToNext}>→</button>
        </div>
        <button className="calendar-today-btn" onClick={goToToday}>Today</button>
      </div>

      <div className="calendar-grid">
        {WEEKDAYS.map((day) => (
          <div key={day} className="calendar-weekday">{day}</div>
        ))}
        {days.map((day, i) => (
          <div
            key={i}
            className={`calendar-day ${day.isCurrentMonth ? '' : 'other-month'} ${day.isToday ? 'today' : ''}`}
          >
            <div className="calendar-day-number">{day.date.getDate()}</div>
            {day.assignments.slice(0, 3).map((a) => (
              <a
                key={a.plannable_id}
                className={`calendar-event ${getEventClass(a)}`}
                href={a.plannable.html_url}
                target="_blank"
                rel="noreferrer"
                title={a.plannable.title}
              >
                {a.plannable.title}
              </a>
            ))}
            {day.assignments.length > 3 && (
              <div className="calendar-more">+{day.assignments.length - 3} more</div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
