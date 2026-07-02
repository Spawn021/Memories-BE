import { Module } from '@nestjs/common'
import { SpacesController } from './spaces.controller'
import { SpacesService } from './spaces.service'
import { SpacesRepository } from './spaces.repository'
import { MailModule } from '../../core/mail/mail.module'
import { RedisModule } from '../../core/redis/redis.module'

@Module({
  imports: [MailModule, RedisModule],
  controllers: [SpacesController],
  providers: [SpacesService, SpacesRepository],
  exports: [SpacesService, SpacesRepository],
})
export class SpacesModule {}
