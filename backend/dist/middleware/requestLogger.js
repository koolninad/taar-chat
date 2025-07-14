"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestLogger = void 0;
const logger_1 = require("../utils/logger");
const requestLogger = (req, res, next) => {
    const startTime = Date.now();
    const requestId = Math.random().toString(36).substring(7);
    req.headers['x-request-id'] = requestId;
    logger_1.logger.info('Incoming Request', {
        requestId,
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: req.user?.userId,
        type: 'request'
    });
    const originalJson = res.json;
    res.json = function (data) {
        const duration = Date.now() - startTime;
        logger_1.performanceLogger.logRequest(req.method, req.originalUrl, duration, res.statusCode);
        logger_1.logger.info('Response Sent', {
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
exports.requestLogger = requestLogger;
//# sourceMappingURL=requestLogger.js.map