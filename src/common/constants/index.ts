import { SpaceType } from 'generated/prisma/enums'

export const CACHE_STATUS = {
  ACTIVE: 'active',
  REVOKED: 'revoked',
} as const

export const CACHE_TTL = {
  SESSION: 300, // 5 minutes in seconds
  REVOKED_SESSION: 3600, // 1 hour in seconds
  BLACKLIST_RESET_TOKEN: 3 * 60,
} as const

export const SPACE_MEMBER_LIMITS: Record<SpaceType, number> = {
  PERSONAL: 1,
  COUPLE: 2,
  FRIENDS: 50,
  FAMILY: Number.MAX_SAFE_INTEGER,
}
