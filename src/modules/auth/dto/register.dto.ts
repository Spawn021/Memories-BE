import { z } from 'zod'
import { createZodDto } from 'nestjs-zod'
import { ErrorCode } from '../../../common/constants/response-codes'

export const RegisterSchema = z.object({
  email: z.string().email(ErrorCode.EMAIL_INVALID),
  password: z
    .string()
    .min(8, ErrorCode.PASSWORD_MIN_LENGTH)
    .regex(/^(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/, ErrorCode.PASSWORD_WEAK),
})
export class RegisterDto extends createZodDto(RegisterSchema) {}
