import { z } from 'zod'
import { createZodDto } from 'nestjs-zod'
import { ErrorCode } from '../../../common/constants/response-codes'

export const ResendVerificationSchema = z.object({
  email: z.string().email(ErrorCode.EMAIL_INVALID),
})

export class ResendVerificationDto extends createZodDto(ResendVerificationSchema) {}
export interface ResendVerificationDto extends z.infer<typeof ResendVerificationSchema> {}
