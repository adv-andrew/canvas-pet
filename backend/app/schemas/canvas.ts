import { z } from 'zod'

// Describes the shape of the Canvas /api/v1/users/self response.
// Used by canvasTokenService for web app token-based authentication.
export const CanvasUserSchema = z.object({
  id: z.number(),
  name: z.string(),
  primary_email: z.string().email().optional(),
  login_id: z.string().optional(),
})

export type CanvasUser = z.infer<typeof CanvasUserSchema>
