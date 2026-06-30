import { z } from 'zod'
import { createZodDto } from 'nestjs-zod'
import { ErrorCode } from '../../../common/constants/response-codes'

export const LoginSchema = z.object({
  email: z.string().email(ErrorCode.EMAIL_INVALID),
  password: z.string().min(1, ErrorCode.PASSWORD_REQUIRED),
  rememberMe: z.boolean().optional(),
})

export class LoginDto extends createZodDto(LoginSchema) {}
export interface LoginDto extends z.infer<typeof LoginSchema> {}
