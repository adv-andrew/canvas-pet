// Based on implementation for assignments
import { z } from 'zod'

export const SaveTaskSchema = z.object({
  canvas_user_id: z.string().min(1),
  institution_url: z.string().url(),
  task_id: z.number().int().positive(),
  plannable_type: z.string().min(1),
  course_id: z.number().int().nullable().optional(),
  title: z.string().optional(),
  due_date: z.string().datetime().optional(),
})

export type SaveTaskInput = z.infer<typeof SaveTaskSchema>

export const CompleteTaskSchema = z.object({
  institution_url: z.string().url(),
})

export type CompleteTaskInput = z.infer<typeof CompleteTaskSchema>

export const CreateTaskSchema = z.object({
  title: z.string().min(1).max(500),
  due_date: z.string().datetime(),
  institution_url: z.string().url(),
  course_name: z.string().optional(),
})

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>
