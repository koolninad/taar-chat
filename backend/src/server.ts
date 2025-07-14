import 'dotenv/config';
import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

import { config } from './config';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { healthCheck } from './middleware/healthCheck';
import { authRoutes } from './routes/auth.routes';
import { signalRoutes } from './routes/signal.routes';
import { messageRoutes } from './routes/message.routes';
import { secureMessageRoutes } from './routes/secure-message.routes';
import { userRoutes } from './routes/user.routes';
import { groupRoutes } from './routes/group.routes';
import { mediaRoutes } from './routes/media.routes';
import { swaggerDocs } from './config/swagger';
import { WebSocketServer } from './services/websocket.service';
import { RedisService } from './services/redis.service';
import { DatabaseService } from './services/database.service';

class TaarServer {
  private app: express.Application;
  private wsServer: WebSocketServer;

  constructor() {
    this.app = express();
    this.wsServer = new WebSocketServer();
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddleware(): void {
    // Security middleware
    this.app.use(helmet());
    this.app.use(cors({
      origin: config.cors.allowedOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.maxRequests,
      message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: config.rateLimit.windowMs / 1000
      },
      standardHeaders: true,
      legacyHeaders: false
    });
    this.app.use(limiter);

    // Body parsing middleware
    this.app.use(compression());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Logging middleware
    this.app.use(requestLogger);

    // Health check
    this.app.use('/health', healthCheck);
  }

  private initializeRoutes(): void {
    const apiPrefix = `/api/${config.api.version}`;

    // API routes
    this.app.use(`${apiPrefix}/auth`, authRoutes);
    this.app.use(`${apiPrefix}/signal`, signalRoutes);
    this.app.use(`${apiPrefix}/messages`, messageRoutes);
    this.app.use(`${apiPrefix}/secure-messages`, secureMessageRoutes);
    this.app.use(`${apiPrefix}/users`, userRoutes);
    this.app.use(`${apiPrefix}/groups`, groupRoutes);
    this.app.use(`${apiPrefix}/media`, mediaRoutes);

    // API documentation
    swaggerDocs(this.app);

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        message: 'Route not found',
        path: req.originalUrl
      });
    });
  }

  private initializeErrorHandling(): void {
    this.app.use(errorHandler);
  }

  public async start(): Promise<void> {
    try {
      // Initialize services
      await this.initializeServices();

      this.app.use((err: any, req: any, res: any, next: any) => {
        console.log(err);
      })

      // Start HTTP server
      const server = this.app.listen(config.server.port, () => {
        logger.info(`🚀 Taar API Server started on port ${config.server.port}`);
        logger.info(`📚 API Documentation: http://localhost:${config.server.port}/docs`);
        logger.info(`🏥 Health Check: http://localhost:${config.server.port}/health`);
      });

      // Start WebSocket server
      this.wsServer.initialize(server);

      // Graceful shutdown
      this.setupGracefulShutdown();

    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  private async initializeServices(): Promise<void> {
    try {
      // Initialize database connection
      await DatabaseService.connect();
      logger.info('✅ Database connected successfully');

      // Initialize Redis connection
      await RedisService.connect();
      logger.info('✅ Redis connected successfully');

      // Test services
      await this.healthCheckServices();

    } catch (error) {
      logger.error('Failed to initialize services:', error);
      throw error;
    }
  }

  private async healthCheckServices(): Promise<void> {
    try {
      // Test database
      await DatabaseService.healthCheck();
      
      // Test Redis
      await RedisService.healthCheck();
      
      logger.info('✅ All services health check passed');
    } catch (error) {
      logger.error('Services health check failed:', error);
      throw error;
    }
  }

  private setupGracefulShutdown(): void {
    const gracefulShutdown = async (signal: string) => {
      logger.info(`📴 Received ${signal}. Starting graceful shutdown...`);
      
      try {
        // Close WebSocket connections
        await this.wsServer.close();
        
        // Close database connections
        await DatabaseService.disconnect();
        
        // Close Redis connections
        await RedisService.disconnect();
        
        logger.info('✅ Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during graceful shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });
  }
}

// Start the server
const server = new TaarServer();
server.start().catch((error) => {
  console.log(error)
  logger.error('Failed to start Taar server:', error);
  process.exit(1);
});