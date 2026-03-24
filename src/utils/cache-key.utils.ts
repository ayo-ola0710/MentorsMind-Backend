/**
 * Cache key utilities.
 * All keys follow the pattern: mm:<resource>:<identifier>[:<qualifier>]
 */

export const CacheKeys = {
  user: (id: string) => `mm:user:${id}`,
  userPublic: (id: string) => `mm:user:${id}:public`,
  mentorProfile: (id: string) => `mm:mentor:${id}`,
  mentorList: (page: number, limit: number) => `mm:mentors:${page}:${limit}`,
  adminStats: () => `mm:admin:stats`,
  systemHealth: () => `mm:admin:health`,
} as const;

/** TTL presets in seconds */
export const CacheTTL: Record<string, number> = {
  short: 60, // 1 min  — frequently changing data
  medium: 300, // 5 min  — user profiles, mentor lists
  long: 3600, // 1 hour — stats, config
  veryLong: 86400, // 1 day  — rarely changing data
};

/** Tags used for group invalidation */
export const CacheTags = {
  user: (id: string) => `tag:user:${id}`,
  mentors: () => `tag:mentors`,
  admin: () => `tag:admin`,
} as const;
