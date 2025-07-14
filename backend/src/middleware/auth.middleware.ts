import { Request, Response, NextFunction } from 'express';
import { AuthService, TokenPayload } from '../services/auth.service';
import { AppError, AuthenticationError } from '../utils/errors';
import { logger } from '../utils/logger';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        phoneNumber: string;
      };
    }
  }
}

/**
 * Middleware to authenticate JWT tokens
 */
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      throw new AuthenticationError('No authorization header provided');
    }
    
    const token = authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      throw new AuthenticationError('No token provided');
    }
    
    // Verify token
    const payload: TokenPayload = await AuthService.verifyToken(token);
    
    // Add user info to request
    req.user = {
      userId: payload.userId,
      phoneNumber: payload.phoneNumber
    };
    
    next();
    
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }
    
    logger.error('Token authentication failed:', error);
    next(new AuthenticationError('Invalid or expired token'));
  }
};

/**
 * Optional authentication - doesn't fail if no token provided
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return next();
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return next();
    }
    
    try {
      const payload: TokenPayload = await AuthService.verifyToken(token);
      req.user = {
        userId: payload.userId,
        phoneNumber: payload.phoneNumber
      };
    } catch {
      // Ignore auth errors for optional auth
    }
    
    next();
    
  } catch (error) {
    next();
  }
};

/**
 * Middleware to check if user exists and is active
 */
export const requireActiveUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AuthenticationError('Authentication required');
    }
    
    const user = await AuthService.getProfile(req.user.userId);
    
    if (!user) {
      throw new AuthenticationError('User account not found');
    }
    
    // Add full user data to request
    req.user = {
      ...req.user,
      ...user
    };
    
    next();
    
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware for API key authentication (for server-to-server)
 */
export const authenticateApiKey = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const apiKey = req.headers['x-api-key'] as string;
    
    if (!apiKey) {
      throw new AuthenticationError('API key required');
    }
    
    // In production, validate against stored API keys
    // For now, just check if it exists
    if (apiKey !== process.env.INTERNAL_API_KEY) {
      throw new AuthenticationError('Invalid API key');
    }
    
    next();
    
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to extract user ID from various sources
 */
export const extractUserId = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    let userId: string | undefined;
    
    // Try to get from authenticated user
    if (req.user?.userId) {
      userId = req.user.userId;
    }
    
    // Try to get from route params
    if (!userId && req.params.userId) {
      userId = req.params.userId;
    }
    
    // Try to get from query params
    if (!userId && req.query.userId) {
      userId = req.query.userId as string;
    }
    
    if (!userId) {
      throw new AppError('User ID required', 400);
    }
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      throw new AppError('Invalid user ID format', 400);
    }
    
    req.params.userId = userId;
    next();
    
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to check if authenticated user can access resource
 */
export const authorizeResourceAccess = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    if (!req.user) {
      throw new AuthenticationError('Authentication required');
    }
    
    const resourceUserId = req.params.userId;
    const authenticatedUserId = req.user.userId;
    
    // Users can only access their own resources
    if (resourceUserId && resourceUserId !== authenticatedUserId) {
      throw new AppError('Access denied', 403);
    }
    
    next();
    
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware for admin-only routes
 */
export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    if (!req.user) {
      throw new AuthenticationError('Authentication required');
    }
    
    // In a real implementation, check user role from database
    // For now, just check if it's a specific admin user
    const adminUsers = process.env.ADMIN_USER_IDS?.split(',') || [];
    
    if (!adminUsers.includes(req.user.userId)) {
      throw new AppError('Admin access required', 403);
    }
    
    next();
    
  } catch (error) {
    next(error);
  }
};

/**
 * Rate limiting middleware wrapper
 */
export const createRateLimit = (
  windowMs: number = 900000, // 15 minutes
  max: number = 100,
  message: string = 'Too many requests from this IP'
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const identifier = req.ip || req.connection.remoteAddress || 'unknown';
      const key = `${req.route?.path || req.path}:${identifier}`;
      
      const { RedisService } = await import('../services/redis.service');
      const attempts = await RedisService.incrementRateLimit(key, windowMs / 1000);
      
      if (attempts > max) {
        throw new AppError(message, 429);
      }
      
      // Add rate limit headers
      res.set({
        'X-RateLimit-Limit': max.toString(),
        'X-RateLimit-Remaining': Math.max(0, max - attempts).toString(),
        'X-RateLimit-Reset': new Date(Date.now() + windowMs).toISOString()
      });
      
      next();
      
    } catch (error) {
      next(error);
    }
  };
};