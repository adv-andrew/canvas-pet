import { getSupabaseAdmin } from '../lib/supabaseAdmin'
import type { SaveAssignmentInput, CreateManualAssignmentInput } from '../schemas/assignments'

export async function fetchSavedAssignments(
  canvasUserId: string,
  institutionUrl: string,
) {
  const { data, error } = await getSupabaseAdmin()
    .from('saved_assignments')
    .select('*')
    .eq('canvas_user_id', canvasUserId)
    .eq('institution_url', institutionUrl)
  if (error) throw new Error(`Failed to fetch saved assignments: ${error.message}`)
  return data
}

export async function saveAssignment(input: SaveAssignmentInput) {
  const { error } = await getSupabaseAdmin()
    .from('saved_assignments')
    .upsert(
      {
        canvas_user_id: input.canvas_user_id,
        institution_url: input.institution_url,
        assignment_id: input.assignment_id,
        plannable_type: input.plannable_type,
        course_id: input.course_id ?? null,
        title: input.title ?? null,
        due_date: input.due_date ?? null,
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
  const { error } = await getSupabaseAdmin()
    .from('saved_assignments')
    .delete()
    .eq('canvas_user_id', canvasUserId)
    .eq('institution_url', institutionUrl)
    .eq('assignment_id', assignmentId)
  if (error) throw new Error(`Failed to unsave assignment: ${error.message}`)
}

export async function completeAssignment(
  canvasUserId: string,
  institutionUrl: string,
  assignmentId: number,
) {
  const { data, error } = await getSupabaseAdmin()
    .from('saved_assignments')
    .update({ completed_at: new Date().toISOString() })
    .eq('canvas_user_id', canvasUserId)
    .eq('institution_url', institutionUrl)
    .eq('assignment_id', assignmentId)
    .select()
    .single()
  if (error || !data) throw new Error('Assignment not found or not saved')
  return data as { due_date: string | null; completed_at: string }
}

export async function fetchPinnedIds(
  canvasUserId: string,
  institutionUrl: string,
): Promise<number[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('pinned_assignments')
    .select('assignment_id')
    .eq('canvas_user_id', canvasUserId)
    .eq('institution_url', institutionUrl)
  if (error) throw new Error(`Failed to fetch pinned assignments: ${error.message}`)
  return (data ?? []).map((r) => r.assignment_id as number)
}

export async function setPinnedAssignments(
  canvasUserId: string,
  institutionUrl: string,
  assignmentIds: number[],
): Promise<void> {
  const admin = getSupabaseAdmin()
  const { error: delErr } = await admin
    .from('pinned_assignments')
    .delete()
    .eq('canvas_user_id', canvasUserId)
    .eq('institution_url', institutionUrl)
  if (delErr) throw new Error(`Failed to clear pins: ${delErr.message}`)
  if (assignmentIds.length === 0) return
  const rows = assignmentIds.map((id) => ({
    canvas_user_id: canvasUserId,
    institution_url: institutionUrl,
    assignment_id: id,
  }))
  const { error: insErr } = await admin.from('pinned_assignments').insert(rows)
  if (insErr) throw new Error(`Failed to save pins: ${insErr.message}`)
}

export async function pinAssignment(
  canvasUserId: string,
  institutionUrl: string,
  assignmentId: number,
): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from('pinned_assignments')
    .upsert(
      { canvas_user_id: canvasUserId, institution_url: institutionUrl, assignment_id: assignmentId },
      { onConflict: 'canvas_user_id,institution_url,assignment_id' },
    )
  if (error) throw new Error(`Failed to pin assignment: ${error.message}`)
}

export async function unpinAssignment(
  canvasUserId: string,
  institutionUrl: string,
  assignmentId: number,
): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from('pinned_assignments')
    .delete()
    .eq('canvas_user_id', canvasUserId)
    .eq('institution_url', institutionUrl)
    .eq('assignment_id', assignmentId)
  if (error) throw new Error(`Failed to unpin assignment: ${error.message}`)
}

export async function createManualAssignment(
  canvasUserId: string,
  institutionUrl: string,
  input: CreateManualAssignmentInput,
) {
  const { data: minRow } = await getSupabaseAdmin()
    .from('saved_assignments')
    .select('assignment_id')
    .eq('canvas_user_id', canvasUserId)
    .eq('institution_url', institutionUrl)
    .order('assignment_id', { ascending: true })
    .limit(1)
    .maybeSingle()

  const nextId = minRow && minRow.assignment_id < 0
    ? minRow.assignment_id - 1
    : -1

  const { error } = await getSupabaseAdmin()
    .from('saved_assignments')
    .insert({
      canvas_user_id: canvasUserId,
      institution_url: institutionUrl,
      assignment_id: nextId,
      plannable_type: 'manual',
      title: input.title,
      due_date: input.due_date,
      course_id: null,
    })
  if (error) throw new Error(`Failed to create manual assignment: ${error.message}`)
  return { assignment_id: nextId }
}
