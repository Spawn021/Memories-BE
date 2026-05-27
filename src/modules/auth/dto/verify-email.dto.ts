import { z } from 'zod'
import { createZodDto } from 'nestjs-zod'
import { ErrorCode } from '../../../common/constants/response-codes'

export const VerifyEmailSchema = z.object({
  email: z.string().email(ErrorCode.EMAIL_INVALID),
  otp: z.string().length(6, ErrorCode.OTP_INVALID_FORMAT),
})

export class VerifyEmailDto extends createZodDto(VerifyEmailSchema) {}
export interface VerifyEmailDto extends z.infer<typeof VerifyEmailSchema> {}
