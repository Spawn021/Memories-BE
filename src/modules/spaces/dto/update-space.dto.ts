import { z } from 'zod'
import { createZodDto } from 'nestjs-zod'
import { SpaceVisibility } from '../../../../generated/prisma/client'

export const UpdateSpaceSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255).optional(),
  description: z.string().nullish(),
  visibility: z.enum(SpaceVisibility).optional(),
  themeKey: z.string().optional(),
  layoutKey: z.string().optional(),
  avatarUrl: z.string().nullish(),
  coverUrl: z.string().nullish(),
})

export class UpdateSpaceDto extends createZodDto(UpdateSpaceSchema) {}
