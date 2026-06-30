import { parseDurationToMs } from '../../common/utils'

export const AUTH_CONFIG = {
  JWT_SECRET: process.env.JWT_SECRET || 'supersecretkey',
  ACCESS_TOKEN_TTL_MS: parseDurationToMs(process.env.ACCESS_TOKEN_EXPIRY, 15 * 60 * 1000),
  REFRESH_TOKEN_TTL_MS: parseDurationToMs(
    process.env.REFRESH_TOKEN_EXPIRY,
    7 * 24 * 60 * 60 * 1000,
  ),
  OTP_EXPIRY_MS: parseDurationToMs(process.env.OTP_EXPIRY_DURATION, 5 * 60 * 1000),
} as const

export const COOKIE_OPTIONS_ACCESS_TOKEN = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: AUTH_CONFIG.ACCESS_TOKEN_TTL_MS,
}

export const COOKIE_OPTIONS_REFRESH_TOKEN = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/api/auth/refresh',
  maxAge: AUTH_CONFIG.REFRESH_TOKEN_TTL_MS,
}

export const COOKIE_OPTIONS_RESET_PASSWORD_TOKEN = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: AUTH_CONFIG.OTP_EXPIRY_MS,
}

export const REDIS_PREFIX = {
  SESSION: 'auth:session:',
  TOKEN_BLACKLIST: 'auth:token:blacklist:',
} as const
