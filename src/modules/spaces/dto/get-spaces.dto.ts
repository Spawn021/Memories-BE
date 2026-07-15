import { z } from 'zod'
import { createZodDto } from 'nestjs-zod'
import { SpaceType, SpaceVisibility } from '../../../../generated/prisma/client'
import { PaginationSchema } from '../../../common/dto/pagination.dto'

export const GetSpacesSchema = PaginationSchema.extend({
  role: z.enum(['OWNER', 'MEMBER']).optional(),
  search: z.string().optional(),
  type: z
    .preprocess(
      val => {
        if (typeof val === 'string') return val.split(',')
        return val
      },
      z.array(z.enum(SpaceType)),
    )
    .optional(),
  visibility: z
    .preprocess(
      val => {
        if (typeof val === 'string') return val.split(',')
        return val
      },
      z.array(z.enum(SpaceVisibility)),
    )
    .optional(),
  sortBy: z.string().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export class GetSpacesDto extends createZodDto(GetSpacesSchema) {}
