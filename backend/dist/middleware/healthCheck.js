"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.livenessCheck = exports.readinessCheck = exports.healthCheck = void 0;
const database_service_1 = require("../services/database.service");
const redis_service_1 = require("../services/redis.service");
const config_1 = require("../config");
const healthCheck = async (req, res, next) => {
    try {
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            version: process.env.npm_package_version || '1.0.0',
            environment: config_1.config.server.env
        };
        if (req.query.detailed === 'true') {
            const startTime = Date.now();
            const dbStart = Date.now();
            const dbHealthy = await database_service_1.DatabaseService.healthCheck();
            const dbResponseTime = Date.now() - dbStart;
            const redisStart = Date.now();
            const redisHealthy = await redis_service_1.RedisService.healthCheck();
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
            const memUsage = process.memoryUsage();
            health.system = {
                memory: {
                    used: memUsage.rss,
                    total: memUsage.heapTotal,
                    percentage: Math.round((memUsage.rss / memUsage.heapTotal) * 100)
                },
                cpu: {
                    usage: Math.round(process.cpuUsage().user / 1000000)
                }
            };
            if (!dbHealthy || !redisHealthy) {
                health.status = 'unhealthy';
            }
            else if (dbResponseTime > 1000 || redisResponseTime > 1000) {
                health.status = 'degraded';
            }
        }
        const statusCode = health.status === 'healthy' ? 200 :
            health.status === 'degraded' ? 200 : 503;
        res.status(statusCode).json({
            success: true,
            data: health
        });
    }
    catch (error) {
        const health = {
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            version: process.env.npm_package_version || '1.0.0',
            environment: config_1.config.server.env
        };
        res.status(503).json({
            success: false,
            data: health,
            error: {
                message: 'Health check failed',
                details: config_1.config.server.isDevelopment ? error : undefined
            }
        });
    }
};
exports.healthCheck = healthCheck;
const readinessCheck = async (req, res, next) => {
    try {
        const dbHealthy = await database_service_1.DatabaseService.healthCheck();
        const redisHealthy = await redis_service_1.RedisService.healthCheck();
        if (dbHealthy && redisHealthy) {
            res.status(200).json({ status: 'ready' });
        }
        else {
            res.status(503).json({ status: 'not ready' });
        }
    }
    catch (error) {
        res.status(503).json({ status: 'not ready', error: error });
    }
};
exports.readinessCheck = readinessCheck;
const livenessCheck = (req, res, next) => {
    res.status(200).json({ status: 'alive' });
};
exports.livenessCheck = livenessCheck;
//# sourceMappingURL=healthCheck.js.map