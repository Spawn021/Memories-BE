import { z } from 'zod'
import { createZodDto } from 'nestjs-zod'
import { ErrorCode } from '../../../common/constants/response-codes'

export const ResetPasswordSchema = z.object({
  newPassword: z
    .string()
    .min(8, ErrorCode.PASSWORD_MIN_LENGTH)
    .regex(
      /^(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/,
      ErrorCode.PASSWORD_WEAK,
    ),
})

export class ResetPasswordDto extends createZodDto(ResetPasswordSchema) {}
export interface ResetPasswordDto extends z.infer<typeof ResetPasswordSchema> {}
