import helmet from 'helmet';
import { Request, Response, NextFunction } from 'express';

export const securityMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  frameguard: {
    action: 'deny',
  },
  noSniff: true,
  xssFilter: true,
});

import { sanitizeObject, detectAndLogSqlInjection } from '../utils/sanitization.utils';

export const sanitizeInput = (req: Request, _res: Response, next: NextFunction): void => {
  if (req.body) {
    req.body = sanitizeObject(req.body);
    // Optional: detect and log SQL injection on the entire body stringified
    detectAndLogSqlInjection(JSON.stringify(req.body), 'body', req.headers['x-request-id'] as string);
  }
  // req.query and req.params are read-only getters in Express 5
  // sanitize body only; query/params are validated via Zod schemas
  next();
};
