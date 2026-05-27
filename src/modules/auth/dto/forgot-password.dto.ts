import { z } from 'zod'
import { createZodDto } from 'nestjs-zod'
import { ErrorCode } from '../../../common/constants/response-codes'

export const ForgotPasswordSchema = z.object({
  email: z.string().email(ErrorCode.EMAIL_INVALID),
})

export class ForgotPasswordDto extends createZodDto(ForgotPasswordSchema) {}
export interface ForgotPasswordDto extends z.infer<typeof ForgotPasswordSchema> {}
