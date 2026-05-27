import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { AuthRepository } from './auth.repository'
import { RedisService } from '../../core/redis/redis.service'
import { UsersService } from '../users/users.service'
import { MailService } from '../../core/mail/mail.service'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'
import { v4 as uuidv4 } from 'uuid'
import { TokenType } from '../../../generated/prisma/enums'
import { UserStatus, AuthProvider } from '../../../generated/prisma/client'
import { CACHE_STATUS, CACHE_TTL } from '../../common/constants'
import { hashPassword, comparePassword } from '../../common/utils'
import { AUTH_CONFIG } from './auth.constants'
import {
  generateOtp,
  getSessionCacheKey,
  getTokenBlacklistKey,
  parseDeviceName,
} from './auth.utils'
import { Prisma } from '../../../generated/prisma/client'
import { ErrorCode, SuccessCode } from '../../common/constants/response-codes'

type UserWithProfileAndAccounts = Prisma.UserGetPayload<{
  include: { profile: true; authAccounts: true }
}>

@Injectable()
export class AuthService {
  constructor(
    private authRepo: AuthRepository,
    private redis: RedisService,
    private usersService: UsersService,
    private mailService: MailService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findOneByEmail(dto.email)
    if (existing) {
      if (existing.status !== UserStatus.PENDING) {
        throw new BadRequestException(ErrorCode.EMAIL_ALREADY_REGISTERED)
      }
      await this.usersService.delete(existing.id)
    }

    const passwordHash = await hashPassword(dto.password)
    const uuid = uuidv4()

    // Create user in PENDING state
    const user = await this.usersService.create({
      uuid,
      email: dto.email,
      status: UserStatus.PENDING,
      profile: {
        create: {
          displayName: dto.displayName || null,
          username: dto.username || null,
        },
      },
      authAccounts: {
        create: {
          provider: AuthProvider.EMAIL,
          passwordHash,
        },
      },
    })

    // Generate 6-digit numeric OTP
    const otp = generateOtp()
    const expiredAt = new Date(Date.now() + AUTH_CONFIG.OTP_EXPIRY_MS)

    await this.authRepo.createVerificationToken(
      user.id,
      TokenType.EMAIL_VERIFICATION,
      otp,
      expiredAt,
    )

    // Send Verification Email
    await this.mailService.sendVerificationOtp(dto.email, otp)

    return { message: SuccessCode.VERIFICATION_EMAIL_SENT }
  }

  async verifyEmail(email: string, otp: string) {
    const user = await this.usersService.findOneByEmail(email)
    if (!user) throw new BadRequestException(ErrorCode.USER_NOT_FOUND)
    if (user.status === UserStatus.ACTIVE)
      throw new BadRequestException(ErrorCode.EMAIL_ALREADY_VERIFIED)

    const verificationToken = await this.authRepo.findVerificationToken(
      otp,
      TokenType.EMAIL_VERIFICATION,
    )
    if (!verificationToken || verificationToken.userId !== user.id) {
      throw new BadRequestException(ErrorCode.INVALID_OTP)
    }

    // Update user status and mark token as used
    await this.usersService.updateStatus(user.id, UserStatus.ACTIVE)
    await this.authRepo.useVerificationToken(verificationToken.id)

    return { message: SuccessCode.OTP_VERIFIED }
  }

  async resendVerificationEmail(email: string) {
    const user = await this.usersService.findOneByEmail(email)
    if (!user) throw new BadRequestException(ErrorCode.USER_NOT_FOUND)
    if (user.status === UserStatus.ACTIVE) {
      throw new BadRequestException(ErrorCode.EMAIL_ALREADY_VERIFIED)
    }

    // Generate 6-digit numeric OTP
    const otp = generateOtp()
    const expiredAt = new Date(Date.now() + AUTH_CONFIG.OTP_EXPIRY_MS)

    await this.authRepo.createVerificationToken(
      user.id,
      TokenType.EMAIL_VERIFICATION,
      otp,
      expiredAt,
    )

    // Send Verification Email
    await this.mailService.sendVerificationOtp(email, otp)

    return { message: SuccessCode.VERIFICATION_EMAIL_RESENT }
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findOneByEmail(email)
    if (!user) throw new BadRequestException(ErrorCode.USER_NOT_FOUND)

    const otp = generateOtp()
    const expiredAt = new Date(Date.now() + AUTH_CONFIG.OTP_EXPIRY_MS)

    await this.authRepo.createVerificationToken(user.id, TokenType.PASSWORD_RESET, otp, expiredAt)

    await this.mailService.sendPasswordResetOtp(email, otp)

    return { message: SuccessCode.PASSWORD_RESET_EMAIL_SENT }
  }

  async verifyResetOtp(email: string, otp: string) {
    const user = await this.usersService.findOneByEmail(email)
    if (!user) throw new BadRequestException(ErrorCode.USER_NOT_FOUND)

    const verificationToken = await this.authRepo.findVerificationToken(
      otp,
      TokenType.PASSWORD_RESET,
    )
    if (!verificationToken || verificationToken.userId !== user.id) {
      throw new BadRequestException(ErrorCode.INVALID_OTP)
    }

    await this.authRepo.useVerificationToken(verificationToken.id)

    const resetToken = await this.jwtService.signAsync(
      { sub: user.uuid, email: user.email, type: 'password_reset_token' },
      { secret: AUTH_CONFIG.JWT_SECRET, expiresIn: AUTH_CONFIG.OTP_EXPIRY_MS },
    )

    return { resetToken }
  }

  async resetPassword(resetToken: string, newPassword: string) {
    if (!resetToken) {
      throw new BadRequestException(ErrorCode.RESET_TOKEN_MISSING)
    }

    const parts = resetToken.split('.')
    const signature = parts[2]
    if (!signature) {
      throw new BadRequestException(ErrorCode.INVALID_RESET_TOKEN_FORMAT)
    }

    const isBlacklisted = await this.redis.get(getTokenBlacklistKey(signature))
    if (isBlacklisted) {
      throw new BadRequestException(ErrorCode.RESET_TOKEN_USED)
    }

    let payload: { sub: string; email: string; type: string }
    try {
      payload = await this.jwtService.verifyAsync(resetToken, {
        secret: AUTH_CONFIG.JWT_SECRET,
      })
    } catch {
      throw new BadRequestException(ErrorCode.INVALID_RESET_TOKEN)
    }

    if (payload.type !== 'password_reset_token') {
      throw new BadRequestException(ErrorCode.INVALID_RESET_TOKEN_TYPE)
    }

    const user = await this.usersService.findOneByUuid(payload.sub)
    if (!user) {
      throw new BadRequestException(ErrorCode.USER_NOT_FOUND)
    }

    const passwordHash = await hashPassword(newPassword)
    await this.authRepo.updatePasswordHash(user.id, passwordHash)

    await this.redis.set(getTokenBlacklistKey(signature), 'true', CACHE_TTL.BLACKLIST_RESET_TOKEN)

    return { message: SuccessCode.PASSWORD_RESET_SUCCESS }
  }

  async login(dto: LoginDto, ipAddress?: string, userAgent?: string) {
    const user = await this.usersService.findOneByEmail(dto.email)
    if (!user) throw new UnauthorizedException(ErrorCode.INVALID_CREDENTIALS)

    if (user.status === UserStatus.PENDING) {
      throw new UnauthorizedException(ErrorCode.EMAIL_UNVERIFIED)
    }

    const emailAccount = user.authAccounts.find(a => a.provider === AuthProvider.EMAIL)
    if (!emailAccount || !emailAccount.passwordHash) {
      throw new UnauthorizedException(ErrorCode.INVALID_CREDENTIALS)
    }

    const isMatch = await comparePassword(dto.password, emailAccount.passwordHash)
    if (!isMatch) {
      throw new UnauthorizedException(ErrorCode.INVALID_CREDENTIALS)
    }

    if (user.status === UserStatus.BANNED || user.status === UserStatus.DELETED) {
      throw new UnauthorizedException(ErrorCode.ACCOUNT_SUSPENDED)
    }

    return this.createSessionAndTokens(user, ipAddress, userAgent, dto.rememberMe)
  }

  async handleGoogleLogin(
    googleUser: { email: string; displayName: string; avatarUrl?: string },
    ipAddress?: string,
    userAgent?: string,
  ) {
    let user = await this.usersService.findOneByEmail(googleUser.email)

    if (!user) {
      const uuid = uuidv4()
      // Google authenticated users are ACTIVE immediately
      user = await this.usersService.create({
        uuid,
        email: googleUser.email,
        status: UserStatus.ACTIVE,
        profile: {
          create: {
            displayName: googleUser.displayName,
            avatarUrl: googleUser.avatarUrl || null,
          },
        },
        authAccounts: {
          create: {
            provider: AuthProvider.GOOGLE,
          },
        },
      })
    } else {
      const googleAccount = user.authAccounts.find(a => a.provider === AuthProvider.GOOGLE)
      if (!googleAccount) {
        await this.authRepo.linkSocialAccount(user.id, AuthProvider.GOOGLE)
      }
    }

    return this.createSessionAndTokens(user, ipAddress, userAgent, true)
  }

  private async generateTokens(
    user: { id: number; email: string },
    sessionId: number,
    plainRefreshToken: string,
  ) {
    const sessionIdStr = sessionId.toString()
    const accessToken = await this.jwtService.signAsync(
      { sub: user.id.toString(), email: user.email, sessionId: sessionIdStr },
      { secret: AUTH_CONFIG.JWT_SECRET, expiresIn: AUTH_CONFIG.ACCESS_TOKEN_TTL_MS / 1000 },
    )

    const refreshToken = this.jwtService.sign(
      { sub: user.id.toString(), sessionId: sessionIdStr, token: plainRefreshToken },
      {
        secret: AUTH_CONFIG.JWT_SECRET,
        expiresIn: AUTH_CONFIG.REFRESH_TOKEN_TTL_MS / 1000,
      },
    )

    return { accessToken, refreshToken }
  }

  private async createSessionAndTokens(
    user: UserWithProfileAndAccounts,
    ipAddress?: string,
    userAgent?: string,
    rememberMe = false,
  ) {
    const refreshToken = uuidv4()
    const refreshTokenHash = await hashPassword(refreshToken)
    const expiredAt = new Date(Date.now() + AUTH_CONFIG.REFRESH_TOKEN_TTL_MS)

    const session = await this.authRepo.createSession({
      user: { connect: { id: user.id } },
      refreshTokenHash,
      deviceName: parseDeviceName(userAgent),
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
      rememberMe,
      expiredAt,
    })

    const { accessToken, refreshToken: fullRefreshToken } = await this.generateTokens(
      user,
      session.id,
      refreshToken,
    )

    const sessionIdStr = session.id.toString()
    await this.redis.set(getSessionCacheKey(sessionIdStr), CACHE_STATUS.ACTIVE, CACHE_TTL.SESSION)

    await this.usersService.updateLastLogin(user.id)

    return {
      accessToken,
      refreshToken: fullRefreshToken,
      rememberMe,
      user: {
        id: user.id.toString(),
        uuid: user.uuid,
        email: user.email,
        globalRole: user.globalRole,
        displayName: user.profile?.displayName || null,
        avatarUrl: user.profile?.avatarUrl || null,
      },
    }
  }

  async refresh(fullRefreshToken: string, ipAddress?: string, userAgent?: string) {
    try {
      const payload = await this.jwtService.verifyAsync<{
        sub: string
        sessionId: string
        token: string
      }>(fullRefreshToken, {
        secret: AUTH_CONFIG.JWT_SECRET,
      })

      const session = await this.authRepo.findSessionById(parseInt(payload.sessionId, 10))

      if (!session || session.revokedAt || new Date() > session.expiredAt) {
        throw new UnauthorizedException(ErrorCode.SESSION_INACTIVE)
      }

      const isMatch = await comparePassword(payload.token, session.refreshTokenHash)
      if (!isMatch) {
        await this.authRepo.updateSession(session.id, { revokedAt: new Date() })
        await this.redis.set(
          getSessionCacheKey(session.id),
          CACHE_STATUS.REVOKED,
          CACHE_TTL.REVOKED_SESSION,
        )
        throw new UnauthorizedException(ErrorCode.TOKEN_REUSE_DETECTED)
      }

      const user = await this.usersService.findOneById(session.userId)
      if (!user) {
        throw new UnauthorizedException(ErrorCode.USER_NOT_FOUND)
      }

      const newRefreshToken = uuidv4()
      const newRefreshTokenHash = await hashPassword(newRefreshToken)

      await this.authRepo.updateSession(session.id, {
        refreshTokenHash: newRefreshTokenHash,
        lastUsedAt: new Date(),
        deviceName: userAgent ? parseDeviceName(userAgent) : session.deviceName,
        ipAddress: ipAddress || session.ipAddress,
        userAgent: userAgent || session.userAgent,
      })

      const { accessToken, refreshToken: generatedRefreshToken } = await this.generateTokens(
        user,
        session.id,
        newRefreshToken,
      )

      const sessionIdStr = session.id.toString()
      await this.redis.set(getSessionCacheKey(sessionIdStr), CACHE_STATUS.ACTIVE, CACHE_TTL.SESSION)

      return {
        accessToken,
        refreshToken: generatedRefreshToken,
        rememberMe: session.rememberMe,
      }
    } catch (e) {
      throw new UnauthorizedException(
        e instanceof UnauthorizedException ? e.message : ErrorCode.INVALID_RESET_TOKEN,
      )
    }
  }

  async logout(sessionId: number) {
    const sessionIdStr = sessionId.toString()

    await this.authRepo.updateSession(sessionId, { revokedAt: new Date() })

    await this.redis.set(
      getSessionCacheKey(sessionIdStr),
      CACHE_STATUS.REVOKED,
      CACHE_TTL.REVOKED_SESSION,
    )
  }

  async getSessions(userId: number) {
    const sessions = await this.authRepo.findManySessionsByUserId(userId)

    return sessions.map(s => ({
      id: s.id.toString(),
      deviceName: s.deviceName,
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      lastUsedAt: s.lastUsedAt,
      createdAt: s.createdAt,
    }))
  }

  async revokeSession(userId: number, targetSessionId: number) {
    const session = await this.authRepo.findSessionById(targetSessionId)

    if (!session) {
      throw new BadRequestException(ErrorCode.SESSION_NOT_FOUND)
    }

    if (session.userId !== userId) {
      throw new ForbiddenException(ErrorCode.FORBIDDEN_REVOKE)
    }

    await this.authRepo.updateSession(targetSessionId, { revokedAt: new Date() })

    await this.redis.set(
      getSessionCacheKey(targetSessionId),
      CACHE_STATUS.REVOKED,
      CACHE_TTL.REVOKED_SESSION,
    )
  }

  async revokeOtherSessions(userId: number, currentSessionId: number) {
    const revokedSessionIds = await this.authRepo.revokeOtherSessions(userId, currentSessionId)

    await Promise.all(
      revokedSessionIds.map(id =>
        this.redis.set(getSessionCacheKey(id), CACHE_STATUS.REVOKED, CACHE_TTL.REVOKED_SESSION),
      ),
    )

    return { success: true }
  }
}
