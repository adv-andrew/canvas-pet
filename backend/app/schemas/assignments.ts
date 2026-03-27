import { z } from 'zod'

export const SaveAssignmentSchema = z.object({
  canvas_user_id: z.string().min(1),
  institution_url: z.string().url(),
  assignment_id: z.number().int().positive(),
  plannable_type: z.string().min(1),
  course_id: z.number().int().nullable().optional(),
})

export type SaveAssignmentInput = z.infer<typeof SaveAssignmentSchema>
