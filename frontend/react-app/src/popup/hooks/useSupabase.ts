import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { CanvasPlannerItem } from '../types/canvas'

export function useSupabase(userId: string | null, institutionUrl: string | null) {
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(false)

  const fetchSavedIds = useCallback(async () => {
    if (!userId || !institutionUrl) return
    setLoading(true)
    const { data } = await supabase
      .from('saved_assignments')
      .select('assignment_id')
      .eq('user_canvas_id', userId)
      .eq('institution_url', institutionUrl)
    if (data) {
      setSavedIds(new Set(data.map((r) => r.assignment_id as number)))
    }
    setLoading(false)
  }, [userId, institutionUrl])

  useEffect(() => {
    void fetchSavedIds()
  }, [fetchSavedIds])

  const saveAssignment = useCallback(
    async (item: CanvasPlannerItem) => {
      if (!userId || !institutionUrl) return
      const { error } = await supabase.from('saved_assignments').upsert({
        user_canvas_id: userId,
        institution_url: institutionUrl,
        assignment_id: item.plannable_id,
        plannable_type: item.plannable_type,
        course_id: item.course_id,
      })
      if (!error) {
        setSavedIds((prev) => new Set([...prev, item.plannable_id]))
      }
    },
    [userId, institutionUrl],
  )

  const unsaveAssignment = useCallback(
    async (assignmentId: number) => {
      if (!userId || !institutionUrl) return
      const { error } = await supabase
        .from('saved_assignments')
        .delete()
        .eq('user_canvas_id', userId)
        .eq('institution_url', institutionUrl)
        .eq('assignment_id', assignmentId)
      if (!error) {
        setSavedIds((prev) => {
          const next = new Set(prev)
          next.delete(assignmentId)
          return next
        })
      }
    },
    [userId, institutionUrl],
  )

  return { savedIds, saveAssignment, unsaveAssignment, loading }
}
