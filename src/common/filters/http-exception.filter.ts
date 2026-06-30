import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import { Request, Response } from 'express'

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name)

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()

    const request = ctx.getRequest<Request>()
    const response = ctx.getResponse<Response>()

    const isProduction = process.env.NODE_ENV === 'production'
    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR
    let message: string | string[] = 'Internal server error'
    let errors: any = undefined

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus()

      const exceptionResponse = exception.getResponse()

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        message = (exceptionResponse as any).message || exception.message
        errors = (exceptionResponse as any).errors || undefined
      } else {
        message = exception.message
      }
    } else {
      message = isProduction
        ? 'Internal server error'
        : exception instanceof Error
          ? exception.message
          : String(exception)
    }

    const errorMessage = Array.isArray(message) ? message.join(', ') : message

    this.logger.error(
      `${request.method} ${request.url} -> ${statusCode} - ${errorMessage}`,
      exception instanceof Error ? exception.stack : undefined,
    )

    // Response to client
    response.status(statusCode).json({
      success: false,
      statusCode,
      message,
      ...(errors ? { errors } : {}),
    })
  }
}
