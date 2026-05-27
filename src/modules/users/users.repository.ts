import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../core/prisma/prisma.service'
import { Prisma, UserStatus } from '../../../generated/prisma/client'

@Injectable()
export class UsersRepository {
  constructor(private prisma: PrismaService) {}

  async findOneByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: { profile: true, authAccounts: true },
    })
  }

  async findOneById(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { profile: true },
    })
  }

  async findOneByUuid(uuid: string) {
    return this.prisma.user.findUnique({
      where: { uuid },
      include: { profile: true },
    })
  }

  async create(data: Prisma.UserCreateInput) {
    return this.prisma.user.create({
      data,
      include: { profile: true, authAccounts: true },
    })
  }

  async updateStatus(id: number, status: UserStatus) {
    return this.prisma.user.update({
      where: { id },
      data: { status },
    })
  }

  async updateLastLogin(id: number) {
    return this.prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    })
  }

  async updateProfile(userId: number, data: { displayName?: string; username?: string }) {
    return this.prisma.userProfile.upsert({
      where: { userId },
      update: {
        displayName: data.displayName,
        username: data.username,
      },
      create: {
        userId,
        displayName: data.displayName,
        username: data.username,
      },
    })
  }

  async delete(id: number) {
    return this.prisma.user.delete({
      where: { id },
    })
  }
}
