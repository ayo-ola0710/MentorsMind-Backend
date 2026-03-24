import morgan from 'morgan';
import { Request, Response, NextFunction } from 'express';
import config from '../config';

morgan.token('user-id', (req: Request) => {
  const authReq = req as any;
  return authReq.user?.id || 'anonymous';
});

morgan.token('body', (req: Request) => {
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    const body = { ...req.body };
    if (body.password) body.password = '[REDACTED]';
    if (body.secretKey) body.secretKey = '[REDACTED]';
    if (body.token) body.token = '[REDACTED]';
    return JSON.stringify(body);
  }
  return '';
});

export const requestLogger = morgan(
  config.isDevelopment
    ? ':method :url :status :response-time ms - :user-id :body'
    : ':remote-addr - :user-id [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"',
);

export const customLogger = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      timestamp: new Date().toISOString(),
    };

    if (res.statusCode >= 400) {
      console.error('Request Error:', logData);
    } else if (config.isDevelopment) {
      console.log('Request:', logData);
    }
  });

  next();
};
