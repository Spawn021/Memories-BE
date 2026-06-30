import { Module } from '@nestjs/common'
import { UsersService } from './users.service'
import { UsersRepository } from './users.repository'
import { CleanupService } from './cleanup.service'
import { UsersController } from './users.controller'

@Module({
  controllers: [UsersController],
  providers: [UsersService, UsersRepository, CleanupService],
  exports: [UsersService, UsersRepository],
})
export class UsersModule {}
