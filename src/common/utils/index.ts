import * as bcrypt from 'bcrypt'

/**
 * Hashes a plain text password using bcrypt with standard salt rounds.
 * @param password The plain text password to hash
 * @param saltRounds Number of rounds to use, defaults to 10
 */
export async function hashPassword(password: string, saltRounds = 10): Promise<string> {
  return bcrypt.hash(password, saltRounds)
}

/**
 * Compares a plain text password with a bcrypt hash.
 * @param password Plain text password
 * @param hash Bcrypt hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

/**
 * Parses a duration string (e.g., "10m", "7d") to milliseconds.
 * Supports: s (seconds), m (minutes), h (hours), d (days).
 * Example: "10m" → 600000, "2d" → 172800000
 */
export const parseDurationToMs = (duration: string | undefined, defaultMs: number): number => {
  if (!duration) return defaultMs
  const match = duration.trim().match(/^(\d+)\s*([smhd])$/i)
  if (!match) return defaultMs

  const value = parseInt(match[1], 10)
  const unit = match[2].toLowerCase()

  switch (unit) {
    case 's':
      return value * 1000
    case 'm':
      return value * 60 * 1000
    case 'h':
      return value * 60 * 60 * 1000
    case 'd':
      return value * 24 * 60 * 60 * 1000
    default:
      return defaultMs
  }
}
