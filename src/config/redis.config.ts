import config from './index';

export const redisConfig = {
  url: config.redis.url,
  options: {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    connectTimeout: 3000,
    enableOfflineQueue: false,
    keyPrefix: 'mm:',
  },
  /** Default cache TTL in seconds when none is specified */
  defaultTtl: 300 as number,
  /** Whether to enable cache hit/miss logging */
  logMetrics: config.isDevelopment,
};
