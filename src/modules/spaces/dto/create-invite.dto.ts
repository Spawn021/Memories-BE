import { z } from 'zod'
import { createZodDto } from 'nestjs-zod'
import { SpaceRole } from '../../../../generated/prisma/client'

export const CreateInviteSchema = z.object({
  role: z.enum(SpaceRole).default(SpaceRole.CONTRIBUTOR),
  expiresInHours: z.number().int().min(1).max(720).default(48), // Max 30 days (720h)
  email: z.string().email('Email không hợp lệ').optional(),
  message: z.string().optional(),
  requiresApproval: z.boolean().optional(),
})

export class CreateInviteDto extends createZodDto(CreateInviteSchema) {}
