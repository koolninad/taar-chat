import { Request, Response, NextFunction } from 'express';
import { logger, performanceLogger } from '../utils/logger';

/**
 * Request logging middleware
 */
export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);
  
  // Add request ID to request object for tracing
  req.headers['x-request-id'] = requestId;
  
  // Log incoming request
  logger.info('Incoming Request', {
    requestId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.userId,
    type: 'request'
  });

  // Override res.json to log response
  const originalJson = res.json;
  res.json = function(data: any) {
    const duration = Date.now() - startTime;
    
    // Log response
    performanceLogger.logRequest(
      req.method,
      req.originalUrl,
      duration,
      res.statusCode
    );
    
    logger.info('Response Sent', {
      requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?.userId,
      type: 'response'
    });
    
    return originalJson.call(this, data);
  };

  next();
};