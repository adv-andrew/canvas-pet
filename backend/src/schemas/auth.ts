import { z } from 'zod'

export const RegisterCanvasUserSchema = z.object({
  canvas_user_id: z.string().min(1),
  institution_url: z.string().url(),
  email: z.string().email().optional(),
  display_name: z.string().optional(),
})

export type RegisterCanvasUserInput = z.infer<typeof RegisterCanvasUserSchema>
