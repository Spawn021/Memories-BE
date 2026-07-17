import { z } from 'zod'
import { createZodDto } from 'nestjs-zod'
import { PaginationSchema } from '../../../common/dto/pagination.dto'

export const GetSentRequestsSchema = PaginationSchema.extend({
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
})

export class GetSentRequestsDto extends createZodDto(GetSentRequestsSchema) {}
