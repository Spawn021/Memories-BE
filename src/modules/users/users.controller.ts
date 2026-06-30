import { Controller, Get, Patch, Body } from '@nestjs/common'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { GlobalRole } from '../../../generated/prisma/client'
import { UsersService } from './users.service'

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getMe(@CurrentUser() user: { id: number; sessionId: number }) {
    const fullUser = await this.usersService.findOneById(user.id)
    if (!fullUser) return null
    return {
      id: fullUser.id.toString(),
      uuid: fullUser.uuid,
      email: fullUser.email,
      globalRole: fullUser.globalRole,
      displayName: fullUser.profile?.displayName || null,
      username: fullUser.profile?.username || null,
      avatarUrl: fullUser.profile?.avatarUrl || null,
      birthdate: fullUser.profile?.birthdate || null,
      sessionId: user.sessionId,
    }
  }

  @Patch('me')
  async updateMe(
    @CurrentUser() user: { id: number; sessionId: number },
    @Body() dto: { displayName?: string; username?: string },
  ) {
    await this.usersService.updateProfile(user.id, dto)
    const fullUser = await this.usersService.findOneById(user.id)
    if (!fullUser) return null
    return {
      id: fullUser.id.toString(),
      uuid: fullUser.uuid,
      email: fullUser.email,
      globalRole: fullUser.globalRole,
      displayName: fullUser.profile?.displayName || null,
      username: fullUser.profile?.username || null,
      avatarUrl: fullUser.profile?.avatarUrl || null,
      birthdate: fullUser.profile?.birthdate || null,
      sessionId: user.sessionId,
    }
  }

  @Get('admin/test')
  @Roles(GlobalRole.ADMIN)
  getAdminStats() {
    return {
      message: 'Access granted to Admin statistics.',
      timestamp: new Date(),
    }
  }
}
