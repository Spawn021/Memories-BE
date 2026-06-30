import 'dotenv/config'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { ZodValidationPipe } from './common/pipes/zod-validation.pipe'
import cookieParser from 'cookie-parser'
import { TransformInterceptor } from './common/interceptors/transform.interceptor'
import { HttpExceptionFilter } from './common/filters/http-exception.filter'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import { cleanupOpenApiDoc } from 'nestjs-zod'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  // Trust proxy headers (e.g. X-Forwarded-For) for accurate client IP detection
  app.getHttpAdapter().getInstance().set('trust proxy', true)

  app.setGlobalPrefix('api')

  app.use(cookieParser())

  app.enableCors({
    origin: true,
    credentials: true,
  })

  app.useGlobalPipes(new ZodValidationPipe())

  app.useGlobalInterceptors(new TransformInterceptor())
  app.useGlobalFilters(new HttpExceptionFilter())

  const config = new DocumentBuilder()
    .setTitle('Memories API')
    .setDescription('The Memories API description')
    .setVersion('1.0')
    .addBearerAuth()
    .build()

  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('docs', app, cleanupOpenApiDoc(document))

  await app.listen(process.env.PORT ?? 3000)
}
bootstrap()
