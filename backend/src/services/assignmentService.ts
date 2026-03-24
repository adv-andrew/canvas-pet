import { supabaseAdmin } from '../lib/supabaseAdmin'
import type { SaveAssignmentInput } from '../schemas/assignments'

export async function fetchSavedAssignments(
  canvasUserId: string,
  institutionUrl: string,
) {
  const { data, error } = await supabaseAdmin
    .from('saved_assignments')
    .select('*')
    .eq('canvas_user_id', canvasUserId)
    .eq('institution_url', institutionUrl)
  if (error) throw new Error(`Failed to fetch saved assignments: ${error.message}`)
  return data
}

export async function saveAssignment(input: SaveAssignmentInput) {
  const { error } = await supabaseAdmin
    .from('saved_assignments')
    .upsert(
      {
        canvas_user_id: input.canvas_user_id,
        institution_url: input.institution_url,
        assignment_id: input.assignment_id,
        plannable_type: input.plannable_type,
        course_id: input.course_id ?? null,
      },
      { onConflict: 'canvas_user_id,institution_url,assignment_id' },
    )
  if (error) throw new Error(`Failed to save assignment: ${error.message}`)
}

export async function unsaveAssignment(
  canvasUserId: string,
  institutionUrl: string,
  assignmentId: number,
) {
  const { error } = await supabaseAdmin
    .from('saved_assignments')
    .delete()
    .eq('canvas_user_id', canvasUserId)
    .eq('institution_url', institutionUrl)
    .eq('assignment_id', assignmentId)
  if (error) throw new Error(`Failed to unsave assignment: ${error.message}`)
}
