import { z } from 'zod'

export const CreateShopItemSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  cost: z.number().int().min(0),
  image_url: z.string().url().optional(),
})

export type CreateShopItemInput = z.infer<typeof CreateShopItemSchema>

export const UpdateShopItemSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  cost: z.number().int().min(0).optional(),
  image_url: z.string().url().nullable().optional(),
  active: z.boolean().optional(),
})

export type UpdateShopItemInput = z.infer<typeof UpdateShopItemSchema>
