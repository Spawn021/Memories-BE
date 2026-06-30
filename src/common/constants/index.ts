export const CACHE_STATUS = {
  ACTIVE: 'active',
  REVOKED: 'revoked',
} as const

export const CACHE_TTL = {
  SESSION: 300, // 5 minutes in seconds
  REVOKED_SESSION: 3600, // 1 hour in seconds
  BLACKLIST_RESET_TOKEN: 3 * 60,
} as const
