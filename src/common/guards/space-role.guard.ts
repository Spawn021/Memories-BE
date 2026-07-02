import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { SpaceRole, SpaceMemberStatus } from '../../../generated/prisma/client'
import { SPACE_ROLES_KEY } from '../decorators/space-roles.decorator'
import { RedisService } from '../../core/redis/redis.service'
import { SpacesRepository } from '../../modules/spaces/spaces.repository'

@Injectable()
export class SpaceRoleGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private redisService: RedisService,
    private spacesRepository: SpacesRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<SpaceRole[]>(SPACE_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    const request = context.switchToHttp().getRequest()
    const user = request.user
    if (!user || !user.id) {
      throw new UnauthorizedException('Authentication required')
    }

    const spaceUuid = request.params.uuid
    if (!spaceUuid) {
      return true
    }

    const userId = user.id

    // 1. Resolve spaceUuid to spaceId (use Redis cache)
    const spaceIdKey = `space:uuid-to-id:${spaceUuid}`
    const spaceIdStr = await this.redisService.get(spaceIdKey)
    let spaceId: number

    if (!spaceIdStr) {
      const dbSpaceId = await this.spacesRepository.findSpaceIdByUuid(spaceUuid)
      if (!dbSpaceId) {
        throw new NotFoundException('Space not found')
      }
      spaceId = dbSpaceId
      await this.redisService.set(spaceIdKey, spaceId.toString(), 86400)
    } else {
      spaceId = parseInt(spaceIdStr, 10)
    }

    const memberCacheKey = `space:member:${spaceId}:${userId}`
    const memberCache = await this.redisService.get(memberCacheKey)
    let memberData: { role: SpaceRole; status: SpaceMemberStatus }

    if (!memberCache) {
      const member = await this.spacesRepository.findMember(spaceId, userId)
      if (!member) {
        throw new ForbiddenException('You are not a member of this space')
      }
      memberData = {
        role: member.role,
        status: member.status,
      }
      await this.redisService.set(memberCacheKey, JSON.stringify(memberData), 86400)
    } else {
      memberData = JSON.parse(memberCache)
    }

    if (memberData.status !== SpaceMemberStatus.ACTIVE) {
      throw new ForbiddenException('Your membership is pending approval or has been rejected')
    }

    request.spaceId = spaceId
    request.spaceMember = memberData

    if (!requiredRoles || requiredRoles.length === 0) {
      return true
    }

    return this.matchRoles(requiredRoles, memberData.role)
  }

  private matchRoles(requiredRoles: SpaceRole[], userRole: SpaceRole): boolean {
    const roleHierarchy: Record<SpaceRole, number> = {
      [SpaceRole.VIEWER]: 1,
      [SpaceRole.CONTRIBUTOR]: 2,
      [SpaceRole.ADMIN]: 3,
      [SpaceRole.OWNER]: 4,
    }

    const userWeight = roleHierarchy[userRole] || 0
    return requiredRoles.some(reqRole => {
      const reqWeight = roleHierarchy[reqRole] || 0
      return userWeight >= reqWeight
    })
  }
}
