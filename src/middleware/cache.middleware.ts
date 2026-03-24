import { Request, Response, NextFunction } from 'express';
import { CacheService } from '../services/cache.service';
import { CacheTTL } from '../utils/cache-key.utils';

/**
 * Cache middleware factory.
 * Caches GET responses by URL (+ optional custom key).
 * Skips caching for authenticated requests unless `cacheAuthenticated` is true.
 *
 * @example
 * router.get('/mentors', cacheMiddleware({ ttl: CacheTTL.medium }), handler);
 */
export function cacheMiddleware(options: {
  ttl?: number;
  keyFn?: (req: Request) => string;
  cacheAuthenticated?: boolean;
}) {
  const { ttl = CacheTTL.medium, keyFn, cacheAuthenticated = false } = options;

  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    // Only cache GET requests
    if (req.method !== 'GET') return next();

    // Skip authenticated requests unless explicitly opted in
    const isAuthed = !!(req as any).user;
    if (isAuthed && !cacheAuthenticated) return next();

    const key = keyFn ? keyFn(req) : `mm:http:${req.originalUrl}`;
    const cached = await CacheService.get<{ status: number; body: unknown }>(
      key,
    );

    if (cached) {
      res.status(cached.status).json(cached.body);
      return;
    }

    // Intercept res.json to capture the response
    const originalJson = res.json.bind(res);
    res.json = (body: unknown) => {
      if (res.statusCode < 400) {
        CacheService.set(key, { status: res.statusCode, body }, ttl).catch(
          () => {},
        );
      }
      return originalJson(body);
    };

    next();
  };
}

/**
 * Middleware that adds cache metrics to the response headers (dev/admin use).
 */
export function cacheMetricsMiddleware(
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  const m = CacheService.getMetrics();
  const total = m.hits + m.misses;
  const hitRate = total > 0 ? ((m.hits / total) * 100).toFixed(1) : '0.0';
  res.setHeader('X-Cache-Hits', m.hits);
  res.setHeader('X-Cache-Misses', m.misses);
  res.setHeader('X-Cache-Hit-Rate', `${hitRate}%`);
  res.setHeader(
    'X-Cache-Backend',
    CacheService.isDistributed() ? 'redis' : 'memory',
  );
  next();
}
