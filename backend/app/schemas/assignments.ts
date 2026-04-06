import { z } from 'zod'

export const SaveAssignmentSchema = z.object({
  canvas_user_id: z.string().min(1),
  institution_url: z.string().url(),
  assignment_id: z.number().int().positive(),
  plannable_type: z.string().min(1),
  course_id: z.number().int().nullable().optional(),
  title: z.string().optional(),
  due_date: z.string().datetime().optional(),
})

export type SaveAssignmentInput = z.infer<typeof SaveAssignmentSchema>

export const CompleteAssignmentSchema = z.object({
  institution_url: z.string().url(),
})

export type CompleteAssignmentInput = z.infer<typeof CompleteAssignmentSchema>

export const CreateManualAssignmentSchema = z.object({
  title: z.string().min(1).max(500),
  due_date: z.string().datetime(),
  institution_url: z.string().url(),
  course_name: z.string().optional(),
})

export type CreateManualAssignmentInput = z.infer<typeof CreateManualAssignmentSchema>
