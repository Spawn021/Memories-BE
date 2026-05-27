import { Injectable } from '@nestjs/common'
import { UsersRepository } from './users.repository'
import { Prisma, UserStatus } from '../../../generated/prisma/client'

@Injectable()
export class UsersService {
  constructor(private usersRepo: UsersRepository) {}

  async findOneByEmail(email: string) {
    return this.usersRepo.findOneByEmail(email)
  }

  async findOneById(id: number) {
    return this.usersRepo.findOneById(id)
  }

  async findOneByUuid(uuid: string) {
    return this.usersRepo.findOneByUuid(uuid)
  }

  async create(data: Prisma.UserCreateInput) {
    return this.usersRepo.create(data)
  }

  async updateStatus(id: number, status: UserStatus) {
    return this.usersRepo.updateStatus(id, status)
  }

  async updateLastLogin(id: number) {
    return this.usersRepo.updateLastLogin(id)
  }

  async updateProfile(userId: number, data: { displayName?: string; username?: string }) {
    return this.usersRepo.updateProfile(userId, data)
  }

  async delete(id: number) {
    return this.usersRepo.delete(id)
  }
}
