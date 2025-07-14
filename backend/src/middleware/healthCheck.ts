import { Request, Response, NextFunction } from 'express';
import { DatabaseService } from '../services/database.service';
import { RedisService } from '../services/redis.service';
import { config } from '../config';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  services?: {
    database: {
      status: 'healthy' | 'unhealthy';
      responseTime?: number;
    };
    redis: {
      status: 'healthy' | 'unhealthy';
      responseTime?: number;
    };
  };
  system?: {
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    cpu: {
      usage: number;
    };
  };
}

/**
 * Basic health check endpoint
 */
export const healthCheck = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const health: HealthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: config.server.env
    };

    // If detailed health check is requested
    if (req.query.detailed === 'true') {
      const startTime = Date.now();
      
      // Check database
      const dbStart = Date.now();
      const dbHealthy = await DatabaseService.healthCheck();
      const dbResponseTime = Date.now() - dbStart;
      
      // Check Redis
      const redisStart = Date.now();
      const redisHealthy = await RedisService.healthCheck();
      const redisResponseTime = Date.now() - redisStart;
      
      health.services = {
        database: {
          status: dbHealthy ? 'healthy' : 'unhealthy',
          responseTime: dbResponseTime
        },
        redis: {
          status: redisHealthy ? 'healthy' : 'unhealthy',
          responseTime: redisResponseTime
        }
      };

      // Add system information
      const memUsage = process.memoryUsage();
      health.system = {
        memory: {
          used: memUsage.rss,
          total: memUsage.heapTotal,
          percentage: Math.round((memUsage.rss / memUsage.heapTotal) * 100)
        },
        cpu: {
          usage: Math.round(process.cpuUsage().user / 1000000) // Convert to percentage
        }
      };

      // Determine overall health status
      if (!dbHealthy || !redisHealthy) {
        health.status = 'unhealthy';
      } else if (dbResponseTime > 1000 || redisResponseTime > 1000) {
        health.status = 'degraded';
      }
    }

    const statusCode = health.status === 'healthy' ? 200 : 
                      health.status === 'degraded' ? 200 : 503;

    res.status(statusCode).json({
      success: true,
      data: health
    });

  } catch (error) {
    const health: HealthStatus = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: config.server.env
    };

    res.status(503).json({
      success: false,
      data: health,
      error: {
        message: 'Health check failed',
        details: config.server.isDevelopment ? error : undefined
      }
    });
  }
};

/**
 * Readiness probe for Kubernetes
 */
export const readinessCheck = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Check if all critical services are available
    const dbHealthy = await DatabaseService.healthCheck();
    const redisHealthy = await RedisService.healthCheck();
    
    if (dbHealthy && redisHealthy) {
      res.status(200).json({ status: 'ready' });
    } else {
      res.status(503).json({ status: 'not ready' });
    }
  } catch (error) {
    res.status(503).json({ status: 'not ready', error: error });
  }
};

/**
 * Liveness probe for Kubernetes
 */
export const livenessCheck = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Simple liveness check - if the server can respond, it's alive
  res.status(200).json({ status: 'alive' });
};