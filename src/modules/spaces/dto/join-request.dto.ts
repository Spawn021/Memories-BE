import { z } from 'zod'
import { createZodDto } from 'nestjs-zod'

export const JoinRequestSchema = z.object({
  message: z.string().nullish(),
})

export class JoinRequestDto extends createZodDto(JoinRequestSchema) {}
