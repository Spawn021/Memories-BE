import { PipeTransform, ArgumentMetadata, BadRequestException, Injectable } from '@nestjs/common'
import { ZodError, ZodObject, ZodSchema } from 'zod'
import { ErrorCode } from '../constants/response-codes'

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  transform(value: unknown, metadata: ArgumentMetadata) {
    const metatype = metadata.metatype
    if (!metatype || !('schema' in metatype)) {
      return value
    }

    let schema = (metatype as any).schema as ZodSchema

    if (schema instanceof ZodObject) {
      schema = schema.strict()
    }

    try {
      return schema.parse(value)
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.issues.reduce(
          (acc, issue) => {
            const key = issue.path.join('.')
            if (!acc[key]) {
              acc[key] = []
            }
            acc[key].push(issue.message)
            return acc
          },
          {} as Record<string, string[]>,
        )

        throw new BadRequestException({
          message: ErrorCode.VALIDATION_FAILED,
          errors: formattedErrors,
        })
      }
      throw error
    }
  }
}
