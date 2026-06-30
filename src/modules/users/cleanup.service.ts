import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PrismaService } from '../../core/prisma/prisma.service'
import { UserStatus } from '../../../generated/prisma/client'

@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name)

  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleCleanup() {
    this.logger.log('Starting cleanup of expired PENDING users...')

    // Delete PENDING users created more than 24 hours ago
    const threshold = new Date(Date.now() - 24 * 60 * 60 * 1000)

    try {
      const result = await this.prisma.user.deleteMany({
        where: {
          status: UserStatus.PENDING,
          createdAt: { lt: threshold },
        },
      })

      if (result.count > 0) {
        this.logger.log(`Cleaned up ${result.count} expired PENDING user accounts.`)
      } else {
        this.logger.log('No expired PENDING user accounts found.')
      }
    } catch (error) {
      this.logger.error('Failed to cleanup expired PENDING users:', error)
    }
  }
}
