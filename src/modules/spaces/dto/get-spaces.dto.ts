import { z } from 'zod'
import { createZodDto } from 'nestjs-zod'
import { SpaceType } from '../../../../generated/prisma/client'
import { PaginationSchema } from '../../../common/dto/pagination.dto'

export const GetSpacesSchema = PaginationSchema.extend({
  role: z.enum(['OWNER', 'MEMBER']).optional(),
  search: z.string().optional(),
  type: z.enum(SpaceType).optional(),
  sortBy: z.string().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export class GetSpacesDto extends createZodDto(GetSpacesSchema) {}
