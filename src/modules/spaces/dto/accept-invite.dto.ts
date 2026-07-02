import { z } from 'zod'
import { createZodDto } from 'nestjs-zod'

export const AcceptInviteSchema = z.object({
  token: z.uuid('Invalid token format'),
})

export class AcceptInviteDto extends createZodDto(AcceptInviteSchema) {}
