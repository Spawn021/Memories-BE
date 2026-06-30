import type { Response } from 'express'
import {
  REDIS_PREFIX,
  COOKIE_OPTIONS_ACCESS_TOKEN,
  COOKIE_OPTIONS_REFRESH_TOKEN,
  COOKIE_OPTIONS_RESET_PASSWORD_TOKEN,
} from './auth.constants'

/**
 * Generates a standard 6-digit numeric OTP code.
 */
export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

/**
 * Generates the Redis key for session status cache.
 * @param sessionId User session ID
 */
export function getSessionCacheKey(sessionId: string | number): string {
  return `${REDIS_PREFIX.SESSION}${sessionId}`
}

/**
 * Generates the Redis key for blacklisted token signature cache.
 * @param signature JWT token signature
 */
export function getTokenBlacklistKey(signature: string): string {
  return `${REDIS_PREFIX.TOKEN_BLACKLIST}${signature}`
}

/**
 * Sets auth cookies (accessToken and refreshToken) on the response object.
 */
export function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string,
  rememberMe = false,
): void {
  if (rememberMe) {
    res.cookie('accessToken', accessToken, COOKIE_OPTIONS_ACCESS_TOKEN)
    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS_REFRESH_TOKEN)
  } else {
    const { maxAge: _, ...accessTokenOptions } = COOKIE_OPTIONS_ACCESS_TOKEN
    const { maxAge: __, ...refreshTokenOptions } = COOKIE_OPTIONS_REFRESH_TOKEN
    res.cookie('accessToken', accessToken, accessTokenOptions)
    res.cookie('refreshToken', refreshToken, refreshTokenOptions)
  }
}

/**
 * Clears auth cookies (accessToken and refreshToken) on the response object.
 */
export function clearAuthCookies(res: Response): void {
  const { maxAge: _1, ...accessTokenOptions } = COOKIE_OPTIONS_ACCESS_TOKEN
  const { maxAge: _2, ...refreshTokenOptions } = COOKIE_OPTIONS_REFRESH_TOKEN

  res.clearCookie('accessToken', accessTokenOptions)
  res.clearCookie('refreshToken', refreshTokenOptions)
}
/**
 * Sets the reset password OTP verification token cookie.
 */
export function setResetTokenCookie(res: Response, resetToken: string): void {
  res.cookie('resetToken', resetToken, COOKIE_OPTIONS_RESET_PASSWORD_TOKEN)
}

/**
 * Clears the reset password OTP verification token cookie.
 */
export function clearResetTokenCookie(res: Response): void {
  const { maxAge: _, ...resetTokenOptions } = COOKIE_OPTIONS_RESET_PASSWORD_TOKEN
  res.clearCookie('resetToken', resetTokenOptions)
}

/**
 * Simple parser to extract a human-readable device/OS name from User-Agent.
 */
export function parseDeviceName(userAgent: string | undefined): string {
  if (!userAgent) return 'Unknown Device'

  const ua = userAgent.toLowerCase()

  if (ua.includes('postman')) {
    return 'Postman'
  }
  if (ua.includes('iphone')) {
    return 'iPhone'
  }
  if (ua.includes('ipad')) {
    return 'iPad'
  }
  if (ua.includes('android')) {
    return 'Android Device'
  }
  if (ua.includes('macintosh') || ua.includes('mac os x')) {
    return 'Mac'
  }
  if (ua.includes('windows')) {
    return 'Windows PC'
  }
  if (ua.includes('linux')) {
    return 'Linux PC'
  }

  // Fallbacks based on browser signature if OS is not detected
  if (ua.includes('chrome')) return 'Chrome Browser'
  if (ua.includes('firefox')) return 'Firefox Browser'
  if (ua.includes('safari')) return 'Safari Browser'

  return 'Unknown Device'
}
