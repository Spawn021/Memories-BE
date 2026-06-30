import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../core/prisma/prisma.service'
import { Prisma, TokenType } from '../../../generated/prisma/client'

@Injectable()
export class AuthRepository {
  constructor(private prisma: PrismaService) {}

  async createSession(data: Prisma.UserSessionCreateInput) {
    return this.prisma.userSession.create({ data })
  }

  async findSessionById(id: number) {
    return this.prisma.userSession.findUnique({ where: { id } })
  }

  async updateSession(id: number, data: Prisma.UserSessionUpdateInput) {
    return this.prisma.userSession.update({ where: { id }, data })
  }

  async findManySessionsByUserId(userId: number) {
    return this.prisma.userSession.findMany({
      where: {
        userId,
        revokedAt: null,
        expiredAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async revokeOtherSessions(userId: number, excludeSessionId: number) {
    const activeSessions = await this.prisma.userSession.findMany({
      where: {
        userId,
        revokedAt: null,
        expiredAt: { gt: new Date() },
        id: { not: excludeSessionId },
      },
      select: { id: true },
    })

    await this.prisma.userSession.updateMany({
      where: {
        userId,
        revokedAt: null,
        expiredAt: { gt: new Date() },
        id: { not: excludeSessionId },
      },
      data: { revokedAt: new Date() },
    })

    return activeSessions.map(s => s.id)
  }

  async createVerificationToken(
    userId: number,
    tokenType: TokenType,
    token: string,
    expiredAt: Date,
  ) {
    return this.prisma.verificationToken.create({
      data: {
        userId,
        tokenType,
        token,
        expiredAt,
      },
    })
  }

  async findVerificationToken(token: string, tokenType: TokenType) {
    return this.prisma.verificationToken.findFirst({
      where: {
        token,
        tokenType,
        usedAt: null,
        expiredAt: { gt: new Date() },
      },
    })
  }

  async useVerificationToken(id: number) {
    return this.prisma.verificationToken.update({
      where: { id },
      data: { usedAt: new Date() },
    })
  }

  async linkSocialAccount(userId: number, provider: 'GOOGLE' | 'APPLE' | 'FACEBOOK') {
    return this.prisma.authAccount.create({
      data: {
        userId,
        provider,
      },
    })
  }

  async updatePasswordHash(userId: number, passwordHash: string) {
    return this.prisma.authAccount.updateMany({
      where: {
        userId,
        provider: 'EMAIL',
      },
      data: {
        passwordHash,
      },
    })
  }
}
