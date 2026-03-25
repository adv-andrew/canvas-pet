import { z } from 'zod'

export const RegisterCanvasUserSchema = z.object({
  canvas_user_id: z.string().min(1),
  institution_url: z.string().url(),
  email: z.string().email().optional(),
  display_name: z.string().optional(),
})

export type RegisterCanvasUserInput = z.infer<typeof RegisterCanvasUserSchema>

// Used by POST /api/auth/extension — no JWT required, this IS the auth step.
// Merges canvas user registration so auth + canvas_users upsert are atomic.
export const ExtensionAuthSchema = z.object({
  canvas_user_id: z.string().min(1),
  institution_url: z.string().url(),
  display_name: z.string().optional(),
  email: z.string().email().optional(),
})

export type ExtensionAuthInput = z.infer<typeof ExtensionAuthSchema>
