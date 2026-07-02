import { z } from 'zod'
import { createZodDto } from 'nestjs-zod'
import { SpaceType, SpaceVisibility } from '../../../../generated/prisma/client'

export const CreateSpaceSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().nullish(),
  type: z.enum(SpaceType).default(SpaceType.FRIENDS),
  visibility: z.enum(SpaceVisibility).default(SpaceVisibility.PUBLIC),
  themeKey: z.string().optional(),
  layoutKey: z.string().optional(),
  avatarUrl: z.string().nullish(),
  coverUrl: z.string().nullish(),
})

export class CreateSpaceDto extends createZodDto(CreateSpaceSchema) {}
