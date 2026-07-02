import { z } from 'zod'
import { createZodDto } from 'nestjs-zod'
import { SpaceMemberStatus } from '../../../../generated/prisma/client'
import { PaginationSchema } from '../../../common/dto/pagination.dto'

export const GetSpaceMembersSchema = PaginationSchema.extend({
  status: z.enum(SpaceMemberStatus).optional(),
})

export class GetSpaceMembersDto extends createZodDto(GetSpaceMembersSchema) {}
