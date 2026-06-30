import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { UsersService } from '../../users/users.service'
import { RedisService } from '../../../core/redis/redis.service'
import { PrismaService } from '../../../core/prisma/prisma.service'
import { AUTH_CONFIG } from '../auth.constants'
import { getSessionCacheKey } from '../auth.utils'
import { CACHE_STATUS, CACHE_TTL } from '../../../common/constants'
import { UserStatus } from '../../../../generated/prisma/client'
import { ErrorCode } from '../../../common/constants/response-codes'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private usersService: UsersService,
    private redisService: RedisService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: any) => {
          return request?.cookies?.['accessToken'] || null
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: AUTH_CONFIG.JWT_SECRET,
    })
  }

  async validate(payload: { sub: string; email: string; sessionId: string }) {
    const sessionCacheKey = getSessionCacheKey(payload.sessionId)
    const cachedSessionStatus = await this.redisService.get(sessionCacheKey)

    if (cachedSessionStatus === CACHE_STATUS.REVOKED) {
      throw new UnauthorizedException(ErrorCode.SESSION_REVOKED)
    }

    if (!cachedSessionStatus) {
      const session = await this.prisma.userSession.findUnique({
        where: { id: parseInt(payload.sessionId, 10) },
      })
      if (!session || session.revokedAt) {
        await this.redisService.set(
          sessionCacheKey,
          CACHE_STATUS.REVOKED,
          CACHE_TTL.REVOKED_SESSION,
        )
        throw new UnauthorizedException(ErrorCode.SESSION_REVOKED)
      } else {
        await this.redisService.set(sessionCacheKey, CACHE_STATUS.ACTIVE, CACHE_TTL.SESSION)
      }
    }

    const user = await this.usersService.findOneById(parseInt(payload.sub, 10))
    if (!user || user.status === UserStatus.BANNED || user.status === UserStatus.DELETED) {
      throw new UnauthorizedException(ErrorCode.ACCOUNT_SUSPENDED)
    }

    return {
      id: user.id,
      uuid: user.uuid,
      email: user.email,
      globalRole: user.globalRole,
      sessionId: parseInt(payload.sessionId, 10),
    }
  }
}
