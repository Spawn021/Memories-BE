import { z } from 'zod'
import { createZodDto } from 'nestjs-zod'
import { ErrorCode } from '../../../common/constants/response-codes'

export const VerifyResetOtpSchema = z.object({
  email: z.string().email(ErrorCode.EMAIL_INVALID),
  otp: z.string().length(6, ErrorCode.OTP_INVALID_FORMAT),
})

export class VerifyResetOtpDto extends createZodDto(VerifyResetOtpSchema) {}
export interface VerifyResetOtpDto extends z.infer<typeof VerifyResetOtpSchema> {}
