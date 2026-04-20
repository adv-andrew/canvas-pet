import { useState, useMemo, useEffect, useRef } from 'react'
import type { TrackedAssignment } from '../../shared/types/canvas'
import { AssignmentCard } from '../../shared/components/AssignmentCard'

interface Props {
  assignments: TrackedAssignment[]
  onSavePins?: (ids: Set<number>) => Promise<void>
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

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
const MAX_VISIBLE = 3

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

  const byDate = new Map<string, TrackedAssignment[]>()
  for (const a of assignments) {
    const dueAt = a.plannable.due_at ?? a.plannable_date
    if (!dueAt) continue
    const d = new Date(dueAt)
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    if (!byDate.has(key)) byDate.set(key, [])
    byDate.get(key)!.push(a)
  }

  const days: CalendarDay[] = []
  const cur = new Date(startDate)
  while (cur <= endDate) {
    const key = `${cur.getFullYear()}-${cur.getMonth()}-${cur.getDate()}`
    days.push({
      date: new Date(cur),
      isCurrentMonth: cur.getMonth() === month,
      isToday: key === todayStr,
      assignments: byDate.get(key) ?? [],
    })
    cur.setDate(cur.getDate() + 1)
  }
  return days
}

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

function isOverdue(a: TrackedAssignment): boolean {
  const dueAt = a.plannable.due_at ?? a.plannable_date
  if (!dueAt || new Date(dueAt) >= new Date()) return false
  return !a.submissions || !a.submissions.submitted
}

function isDueSoon(a: TrackedAssignment): boolean {
  const dueAt = a.plannable.due_at ?? a.plannable_date
  if (!dueAt) return false
  const ms = new Date(dueAt).getTime() - Date.now()
  const submitted = a.submissions && a.submissions.submitted
  return ms > 0 && ms <= 24 * 60 * 60 * 1000 && !submitted
}

function isSubmitted(a: TrackedAssignment): boolean {
  return !!(a.submissions && (a.submissions.submitted || a.submissions.graded)) || !!a.isCompleted
}



export function Calendar({ assignments, onSavePins }: Readonly<Props>) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedCourses, setSelectedCourses] = useState<Set<number | null>>(new Set())
  const [pinnedIds, setPinnedIds] = useState<Set<number>>(new Set())
  const [previewId, setPreviewId] = useState<number | null>(null)
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null)
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set())
  const sidePanelRef = useRef<HTMLDivElement>(null)
  const assignmentClickTimers = useRef(new Map<number, ReturnType<typeof setTimeout>>())
  const dateClickTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>())

  useEffect(() => {
    const dismiss = (e: MouseEvent) => {
      if (sidePanelRef.current?.contains(e.target as Node)) return
      setPreviewId(null)
      setSelectedDayKey(null)
    }
    document.addEventListener('click', dismiss)
    return () => document.removeEventListener('click', dismiss)
  }, [])

  // Clean up pending timers on unmount
  useEffect(() => {
    const at = assignmentClickTimers.current
    const dt = dateClickTimers.current
    return () => { at.forEach(clearTimeout); dt.forEach(clearTimeout) }
  }, [])

  const assignmentById = useMemo(() => {
    const map = new Map<number, TrackedAssignment>()
    for (const a of assignments) map.set(a.plannable_id, a)
    return map
  }, [assignments])

  const courses = useMemo(() => {
    const seen = new Map<number | null, string>()
    for (const a of assignments) {
      if (!seen.has(a.course_id)) seen.set(a.course_id, a.context_name ?? 'Other')
    }
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }))
  }, [assignments])

  const courseColorMap = useMemo(() => {
    const map = new Map<number | null, number>()
    courses.forEach((c, i) => map.set(c.id, i % COURSE_COLORS.length))
    return map
  }, [courses])

  const filteredAssignments = useMemo(() => {
    if (selectedCourses.size === 0) return assignments
    return assignments.filter((a) => selectedCourses.has(a.course_id))
  }, [assignments, selectedCourses])

  const days = useMemo(
    () => getCalendarDays(year, month, filteredAssignments),
    [year, month, filteredAssignments]
  )

  const sidePanelItems = useMemo(() => {
    const items: Array<{ a: TrackedAssignment; isPinned: boolean }> = []
    for (const id of pinnedIds) {
      const a = assignmentById.get(id)
      if (a) items.push({ a, isPinned: true })
    }
    if (selectedDayKey !== null) {
      const day = days.find(d => dayKey(d.date) === selectedDayKey)
      if (day) {
        for (const a of day.assignments) {
          if (!pinnedIds.has(a.plannable_id)) items.push({ a, isPinned: false })
        }
      }
    } else if (previewId !== null && !pinnedIds.has(previewId)) {
      const a = assignmentById.get(previewId)
      if (a) items.push({ a, isPinned: false })
    }
    return items
  }, [pinnedIds, previewId, selectedDayKey, assignmentById, days])

  const getCourseColor = (id: number | null) => COURSE_COLORS[courseColorMap.get(id) ?? 0]

  const getBorderColor = (a: TrackedAssignment) => {
    if (isDueSoon(a)) return '#f59e0b'
    if (isOverdue(a)) return OVERDUE_COLOR.text
    return getCourseColor(a.course_id).text
  }

  const getCourseTextColor = (a: TrackedAssignment) => {
    if (isOverdue(a)) return OVERDUE_COLOR.text
    return getCourseColor(a.course_id).text
  }

  const toggleCourse = (id: number | null) => {
    setSelectedCourses((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleDayClick = (e: React.MouseEvent | React.KeyboardEvent, key: string) => {
    e.stopPropagation()
    setSelectedDayKey(prev => prev === key ? null : key)
    setPreviewId(null)
  }

  const toggleExpand = (key: string) => {
    setExpandedDays((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const DBLCLICK_MS = 400

  // Single click: immediately preview. Fast second click within DBLCLICK_MS: toggle pin.
  const handleAssignmentInteraction = (e: React.MouseEvent, id: number) => {
    e.preventDefault()
    e.stopPropagation()
    if (assignmentClickTimers.current.has(id)) {
      clearTimeout(assignmentClickTimers.current.get(id)!)
      assignmentClickTimers.current.delete(id)
      setPinnedIds((prev) => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      })
      setSelectedDayKey(null)
      setPreviewId(null)
    } else {
      setSelectedDayKey(null)
      setPreviewId(id)
      assignmentClickTimers.current.set(id, setTimeout(() => {
        assignmentClickTimers.current.delete(id)
      }, DBLCLICK_MS))
    }
  }

  // Single click on date number: select day. Fast second click: toggle pin all for that day.
  const handleDateNumberClick = (e: React.MouseEvent, key: string, dayAssignments: TrackedAssignment[]) => {
    e.stopPropagation()
    if (dateClickTimers.current.has(key)) {
      clearTimeout(dateClickTimers.current.get(key)!)
      dateClickTimers.current.delete(key)
      setSelectedDayKey(null)
      setPreviewId(null)
      const ids = dayAssignments.map((a) => a.plannable_id)
      if (ids.length > 0) {
        setPinnedIds((prev) => {
          const allPinned = ids.every((id) => prev.has(id))
          const next = new Set(prev)
          if (allPinned) ids.forEach((id) => next.delete(id))
          else ids.forEach((id) => next.add(id))
          return next
        })
      }
    } else {
      setSelectedDayKey((prev) => (prev === key ? null : key))
      setPreviewId(null)
      dateClickTimers.current.set(key, setTimeout(() => {
        dateClickTimers.current.delete(key)
      }, DBLCLICK_MS))
    }
  }

  const pinAssignment = (id: number) => {
    setPinnedIds((prev) => new Set([...prev, id]))
    setPreviewId(null)
  }

  const unpinAssignment = (id: number) => {
    setPinnedIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  const goToPrev = () => {
    if (month === 0) { setMonth(11); setYear(year - 1) }
    else setMonth(month - 1)
  }
  const goToNext = () => {
    if (month === 11) { setMonth(0); setYear(year + 1) }
    else setMonth(month + 1)
  }
  const goToToday = () => {
    setYear(today.getFullYear())
    setMonth(today.getMonth())
    setSelectedDayKey(dayKey(today))
    setPreviewId(null)
  }

  return (
    <div className="calendar-page">
      <div className="calendar-header">
        <div className="calendar-nav">
          <button className="calendar-nav-btn" onClick={goToPrev}>←</button>
          <span className="calendar-month">{MONTHS[month]} {year}</span>
          <button className="calendar-nav-btn" onClick={goToNext}>→</button>
        </div>
        <button className="calendar-today-btn" onClick={goToToday}>Today</button>
      </div>

      {courses.length > 0 && (
        <div className="calendar-filters">
          <button
            className={`calendar-filter-pill ${selectedCourses.size === 0 ? 'active' : ''}`}
            onClick={(e) => { e.stopPropagation(); setSelectedCourses(new Set()) }}
          >
            All
          </button>
          {courses.map(({ id, name }) => {
            const active = selectedCourses.has(id)
            const color = getCourseColor(id)
            return (
              <button
                key={id ?? 'null'}
                className="calendar-filter-pill"
                style={active ? { backgroundColor: color.bg, color: color.text, borderColor: color.text } : undefined}
                onClick={(e) => { e.stopPropagation(); toggleCourse(id) }}
              >
                <span className="calendar-filter-dot" style={{ backgroundColor: color.text }} />
                {name}
              </button>
            )
          })}
        </div>
      )}

      <div className="calendar-layout">
        <div className="calendar-main">
          <div className="calendar-grid">
            {WEEKDAYS.map((day) => (
              <div key={day} className="calendar-weekday">{day}</div>
            ))}
            {days.map((day) => {
              const key = dayKey(day.date)
              const isSelected = selectedDayKey === key
              const isExpanded = expandedDays.has(key)
              const visible = isExpanded ? day.assignments : day.assignments.slice(0, MAX_VISIBLE)
              const overflow = day.assignments.length - MAX_VISIBLE
              return (
                <div
                  key={key}
                  className={`calendar-day ${day.isCurrentMonth ? '' : 'other-month'} ${day.isToday ? 'today' : ''}${isSelected ? ' selected' : ''}${isExpanded ? ' expanded' : ''}`}
                  onClick={(e) => handleDayClick(e, key)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleDayClick(e, key) }}
                >
                  <button
                    className="calendar-day-number"
                    title={day.assignments.length > 0 ? 'Double-click to pin/unpin all' : undefined}
                    onClick={(e) => handleDateNumberClick(e, key, day.assignments)}
                  >
                    {day.date.getDate()}
                  </button>
                  {visible.map((a) => {
                    const isActive = previewId === a.plannable_id || pinnedIds.has(a.plannable_id) || isSelected
                    return (
                      <a
                        key={a.plannable_id}
                        className={`calendar-mini-card${isSubmitted(a) ? ' submitted' : ''}${isActive ? ' active' : ''}`}
                        style={{ borderLeftColor: getBorderColor(a) }}
                        href={a.plannable.html_url}
                        target="_blank"
                        rel="noreferrer"
                        title="Click to preview · Double-click to pin/unpin"
                        onClick={(e) => handleAssignmentInteraction(e, a.plannable_id)}
                      >
                        <div className="calendar-mini-course" style={{ color: getCourseTextColor(a) }}>
                          {a.context_name}
                        </div>
                        <div className="calendar-mini-title">
                          {a.plannable.title}
                          {isSubmitted(a) && <span className="calendar-event-check"> ✓</span>}
                        </div>
                      </a>
                    )
                  })}
                  {overflow > 0 && !isExpanded && (
                    <button className="calendar-more" onClick={(e) => { e.stopPropagation(); toggleExpand(key) }}>
                      +{overflow} more
                    </button>
                  )}
                  {isExpanded && (
                    <button className="calendar-more collapse" onClick={(e) => { e.stopPropagation(); toggleExpand(key) }}>
                      ↑ hide
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div className="calendar-side-panel" ref={sidePanelRef}>
          <div className="calendar-side-heading">
            <span>{selectedDayKey
              ? new Date(...(selectedDayKey.split('-').map(Number) as [number, number, number])).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
              : 'Assignments'}</span>
            <div className="calendar-side-pin-actions">
              {onSavePins && (
                <button className="save-pins-btn" onClick={() => { void onSavePins(pinnedIds) }}>
                  Save Pins
                </button>
              )}
              {pinnedIds.size > 0 && (
                <button className="calendar-clear-pins" onClick={() => setPinnedIds(new Set())}>
                  Clear pins
                </button>
              )}
            </div>
          </div>
          {sidePanelItems.length === 0 ? (
            <div className="calendar-side-empty">
              Click a date number or assignment to preview. Double-click an assignment or the press pin icon to pin it.
            </div>
          ) : (
            sidePanelItems.map(({ a, isPinned }) => (
              <AssignmentCard
                key={a.plannable_id}
                assignment={a}
                courseColor={getCourseColor(a.course_id)}
                isPinned={isPinned}
                onPin={() => isPinned ? unpinAssignment(a.plannable_id) : pinAssignment(a.plannable_id)}
                onRemove={() => {
                  unpinAssignment(a.plannable_id)
                  if (previewId === a.plannable_id) setPreviewId(null)
                  if (selectedDayKey !== null && !pinnedIds.has(a.plannable_id)) setSelectedDayKey(null)
                }}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
