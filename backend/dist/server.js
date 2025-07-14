"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
require("express-async-errors");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const config_1 = require("./config");
const logger_1 = require("./utils/logger");
const errorHandler_1 = require("./middleware/errorHandler");
const requestLogger_1 = require("./middleware/requestLogger");
const healthCheck_1 = require("./middleware/healthCheck");
const auth_routes_1 = require("./routes/auth.routes");
const signal_routes_1 = require("./routes/signal.routes");
const message_routes_1 = require("./routes/message.routes");
const secure_message_routes_1 = require("./routes/secure-message.routes");
const user_routes_1 = require("./routes/user.routes");
const group_routes_1 = require("./routes/group.routes");
const media_routes_1 = require("./routes/media.routes");
const swagger_1 = require("./config/swagger");
const websocket_service_1 = require("./services/websocket.service");
const redis_service_1 = require("./services/redis.service");
const database_service_1 = require("./services/database.service");
class TaarServer {
    constructor() {
        this.app = (0, express_1.default)();
        this.wsServer = new websocket_service_1.WebSocketServer();
        this.initializeMiddleware();
        this.initializeRoutes();
        this.initializeErrorHandling();
    }
    initializeMiddleware() {
        this.app.use((0, helmet_1.default)());
        this.app.use((0, cors_1.default)({
            origin: config_1.config.cors.allowedOrigins,
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
        }));
        const limiter = (0, express_rate_limit_1.default)({
            windowMs: config_1.config.rateLimit.windowMs,
            max: config_1.config.rateLimit.maxRequests,
            message: {
                error: 'Too many requests from this IP, please try again later.',
                retryAfter: config_1.config.rateLimit.windowMs / 1000
            },
            standardHeaders: true,
            legacyHeaders: false
        });
        this.app.use(limiter);
        this.app.use((0, compression_1.default)());
        this.app.use(express_1.default.json({ limit: '10mb' }));
        this.app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
        this.app.use(requestLogger_1.requestLogger);
        this.app.use('/health', healthCheck_1.healthCheck);
    }
    initializeRoutes() {
        const apiPrefix = `/api/${config_1.config.api.version}`;
        this.app.use(`${apiPrefix}/auth`, auth_routes_1.authRoutes);
        this.app.use(`${apiPrefix}/signal`, signal_routes_1.signalRoutes);
        this.app.use(`${apiPrefix}/messages`, message_routes_1.messageRoutes);
        this.app.use(`${apiPrefix}/secure-messages`, secure_message_routes_1.secureMessageRoutes);
        this.app.use(`${apiPrefix}/users`, user_routes_1.userRoutes);
        this.app.use(`${apiPrefix}/groups`, group_routes_1.groupRoutes);
        this.app.use(`${apiPrefix}/media`, media_routes_1.mediaRoutes);
        (0, swagger_1.swaggerDocs)(this.app);
        this.app.use('*', (req, res) => {
            res.status(404).json({
                success: false,
                message: 'Route not found',
                path: req.originalUrl
            });
        });
    }
    initializeErrorHandling() {
        this.app.use(errorHandler_1.errorHandler);
    }
    async start() {
        try {
            await this.initializeServices();
            this.app.use((err, req, res, next) => {
                console.log(err);
            });
            const server = this.app.listen(config_1.config.server.port, () => {
                logger_1.logger.info(`🚀 Taar API Server started on port ${config_1.config.server.port}`);
                logger_1.logger.info(`📚 API Documentation: http://localhost:${config_1.config.server.port}/docs`);
                logger_1.logger.info(`🏥 Health Check: http://localhost:${config_1.config.server.port}/health`);
            });
            this.wsServer.initialize(server);
            this.setupGracefulShutdown();
        }
        catch (error) {
            logger_1.logger.error('Failed to start server:', error);
            process.exit(1);
        }
    }
    async initializeServices() {
        try {
            await database_service_1.DatabaseService.connect();
            logger_1.logger.info('✅ Database connected successfully');
            await redis_service_1.RedisService.connect();
            logger_1.logger.info('✅ Redis connected successfully');
            await this.healthCheckServices();
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize services:', error);
            throw error;
        }
    }
    async healthCheckServices() {
        try {
            await database_service_1.DatabaseService.healthCheck();
            await redis_service_1.RedisService.healthCheck();
            logger_1.logger.info('✅ All services health check passed');
        }
        catch (error) {
            logger_1.logger.error('Services health check failed:', error);
            throw error;
        }
    }
    setupGracefulShutdown() {
        const gracefulShutdown = async (signal) => {
            logger_1.logger.info(`📴 Received ${signal}. Starting graceful shutdown...`);
            try {
                await this.wsServer.close();
                await database_service_1.DatabaseService.disconnect();
                await redis_service_1.RedisService.disconnect();
                logger_1.logger.info('✅ Graceful shutdown completed');
                process.exit(0);
            }
            catch (error) {
                logger_1.logger.error('Error during graceful shutdown:', error);
                process.exit(1);
            }
        };
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
        process.on('uncaughtException', (error) => {
            logger_1.logger.error('Uncaught Exception:', error);
            process.exit(1);
        });
        process.on('unhandledRejection', (reason, promise) => {
            logger_1.logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
            process.exit(1);
        });
    }
}
const server = new TaarServer();
server.start().catch((error) => {
    console.log(error);
    logger_1.logger.error('Failed to start Taar server:', error);
    process.exit(1);
});
//# sourceMappingURL=server.js.map