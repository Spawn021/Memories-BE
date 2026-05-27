import { Controller, Post, Get, Body, Req, Res, Delete, Param, UseGuards } from '@nestjs/common'
import type { Response, Request } from 'express'
import { AuthGuard } from '@nestjs/passport'
import { AuthService } from './auth.service'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'
import { VerifyResetOtpDto } from './dto/verify-reset-otp.dto'
import { ResetPasswordDto } from './dto/reset-password.dto'
import { VerifyEmailDto } from './dto/verify-email.dto'
import { ForgotPasswordDto } from './dto/forgot-password.dto'
import { ResendVerificationDto } from './dto/resend-verification.dto'
import { Public } from '../../common/decorators/public.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { SuccessCode } from '../../common/constants/response-codes'
import {
  setAuthCookies,
  clearAuthCookies,
  setResetTokenCookie,
  clearResetTokenCookie,
} from './auth.utils'
interface GoogleRequest extends Request {
  user: {
    email: string
    displayName: string
    avatarUrl?: string
  }
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto)
  }

  @Public()
  @Post('verify-email')
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto.email, dto.otp)
  }

  @Public()
  @Post('resend-verification')
  async resendVerification(@Body() dto: ResendVerificationDto) {
    return this.authService.resendVerificationEmail(dto.email)
  }

  @Public()
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email)
  }

  @Public()
  @Post('verify-reset-otp')
  async verifyResetOtp(@Body() dto: VerifyResetOtpDto, @Res({ passthrough: true }) res: Response) {
    const { resetToken } = await this.authService.verifyResetOtp(dto.email, dto.otp)
    setResetTokenCookie(res, resetToken)
    return { message: SuccessCode.OTP_VERIFIED }
  }

  @Public()
  @Post('reset-password')
  async resetPassword(
    @Body() dto: ResetPasswordDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const resetToken = req.cookies?.['resetToken'] as string
    const result = await this.authService.resetPassword(resetToken, dto.newPassword)
    clearResetTokenCookie(res)
    return result
  }

  @Public()
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip = req.ip || req.socket.remoteAddress
    const ua = req.headers['user-agent']
    const { accessToken, refreshToken, user } = await this.authService.login(dto, ip, ua)
    setAuthCookies(res, accessToken, refreshToken, dto.rememberMe)
    return { ...user }
  }

  @Public()
  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.['refreshToken'] as string
    const ip = req.ip || req.socket.remoteAddress
    const ua = req.headers['user-agent']
    const result = await this.authService.refresh(refreshToken, ip, ua)

    setAuthCookies(res, result.accessToken, result.refreshToken, result.rememberMe)
  }

  @Public()
  @UseGuards(AuthGuard('google'))
  @Get('google')
  async googleAuth() {
    // Redirection triggered by Passport
  }

  @Public()
  @UseGuards(AuthGuard('google'))
  @Get('google/callback')
  async googleAuthRedirect(@Req() req: GoogleRequest, @Res() res: Response) {
    const ip = req.ip || req.socket.remoteAddress
    const ua = req.headers['user-agent']
    const result = await this.authService.handleGoogleLogin(req.user, ip, ua)

    setAuthCookies(res, result.accessToken, result.refreshToken, true)
    res.redirect(process.env.FRONTEND_URL || 'http://localhost:3000')
  }

  @Post('logout')
  async logout(
    @Res({ passthrough: true }) res: Response,
    @CurrentUser('sessionId') sessionId: number,
  ) {
    clearAuthCookies(res)
    return this.authService.logout(sessionId)
  }

  @Get('sessions')
  async getSessions(@CurrentUser('id') userId: number) {
    return this.authService.getSessions(userId)
  }

  @Delete('sessions/others')
  async revokeOtherSessions(
    @CurrentUser('id') userId: number,
    @CurrentUser('sessionId') currentSessionId: number,
  ) {
    return this.authService.revokeOtherSessions(userId, currentSessionId)
  }

  @Delete('sessions/:id')
  async revokeSession(@CurrentUser('id') userId: number, @Param('id') sessionId: string) {
    return this.authService.revokeSession(userId, parseInt(sessionId, 10))
  }
}
