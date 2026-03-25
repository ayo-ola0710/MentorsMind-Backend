/**
 * Idempotency Middleware
 *
 * Prevents duplicate payment processing by caching responses keyed on
 * the `Idempotency-Key` header. Responses are stored for 24 hours.
 *
 * Usage: add `idempotency` middleware before payment mutation handlers.
 * Clients must send a unique `Idempotency-Key` (UUID) per request.
 */

import { Request, Response, NextFunction } from 'express';
import { CacheService } from '../services/cache.service';
import { ResponseUtil } from '../utils/response.utils';
import { logger } from '../utils/logger.utils';

const IDEMPOTENCY_TTL = 86_400; // 24 hours
const KEY_PREFIX = 'idempotency:';

export const idempotency = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const idempotencyKey = req.headers['idempotency-key'] as string | undefined;

  if (!idempotencyKey) {
    ResponseUtil.error(res, 'Idempotency-Key header is required', 400);
    return;
  }

  if (!/^[0-9a-f-]{36}$/i.test(idempotencyKey)) {
    ResponseUtil.error(res, 'Idempotency-Key must be a valid UUID', 400);
    return;
  }

  const cacheKey = `${KEY_PREFIX}${idempotencyKey}`;

  try {
    const cached = await CacheService.get<{ status: number; body: unknown }>(cacheKey);

    if (cached) {
      logger.info('Idempotency cache hit', { idempotencyKey });
      res.setHeader('X-Idempotency-Replayed', 'true');
      res.status(cached.status).json(cached.body);
      return;
    }

    // Intercept the response to cache it
    const originalJson = res.json.bind(res);
    res.json = (body: unknown) => {
      const statusCode = res.statusCode;
      // Only cache successful responses (2xx)
      if (statusCode >= 200 && statusCode < 300) {
        CacheService.set(cacheKey, { status: statusCode, body }, IDEMPOTENCY_TTL).catch(
          (err) => logger.warn('Failed to cache idempotency response', { error: err.message }),
        );
      }
      return originalJson(body);
    };

    next();
  } catch (err) {
    logger.warn('Idempotency middleware error', {
      error: err instanceof Error ? err.message : err,
    });
    // Fail open — let the request through if cache is unavailable
    next();
  }
};
