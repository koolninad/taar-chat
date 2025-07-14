import { Request, Response, NextFunction } from 'express';
import { AppError, formatErrorForClient, isOperationalError } from '../utils/errors';
import { logger } from '../utils/logger';
import { config } from '../config';

/**
 * Global error handling middleware
 */
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log the error
  const errorLog = {
    message: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.userId,
    timestamp: new Date().toISOString()
  };

  if (error instanceof AppError && error.statusCode < 500) {
    logger.warn('Client Error:', errorLog);
  } else {
    logger.error('Server Error:', errorLog);
  }

  // Format error for client response
  const clientError = formatErrorForClient(
    error,
    config.server.isDevelopment && !isOperationalError(error)
  );

  // Send error response
  res.status(clientError.error.statusCode).json(clientError);
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const error = new AppError(`Route ${req.originalUrl} not found`, 404);
  next(error);
};

/**
 * Async error wrapper
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};