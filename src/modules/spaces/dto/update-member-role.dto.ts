import { z } from 'zod'
import { createZodDto } from 'nestjs-zod'
import { SpaceRole } from '../../../../generated/prisma/client'

export const UpdateMemberRoleSchema = z.object({
  role: z.enum(SpaceRole),
})

export class UpdateMemberRoleDto extends createZodDto(UpdateMemberRoleSchema) {}
