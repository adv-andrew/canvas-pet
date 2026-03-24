export interface CanvasPlannerItem {
  plannable_id: number
  plannable_type: string // 'assignment' | 'quiz' | 'discussion_topic' | 'wiki_page' etc.
  plannable_date: string // ISO 8601
  context_name: string // course name
  course_id: number | null
  plannable: {
    id: number
    title: string
    due_at: string | null
    points_possible: number | null
    html_url: string
  }
  submissions:
    | false
    | {
        submitted: boolean
        excused: boolean
        graded: boolean
        posted_at: string | null
        late: boolean
        missing: boolean
        needs_grading: boolean
        has_feedback: boolean
      }
}

export interface TrackedAssignment extends CanvasPlannerItem {
  isSaved: boolean
  savedAt: string | null
}

export interface CanvasAnnouncement {
  id: number
  title: string
  message: string
  type: 'Announcement'
  context_type: string
  course_id: number | null
  html_url: string
  created_at: string
  updated_at: string
}

export interface SavedAssignment {
  id: string
  user_canvas_id: string
  institution_url: string
  assignment_id: number
  plannable_type: string
  course_id: number | null
  saved_at: string
}
