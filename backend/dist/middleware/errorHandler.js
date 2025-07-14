"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = exports.notFoundHandler = exports.errorHandler = void 0;
const errors_1 = require("../utils/errors");
const logger_1 = require("../utils/logger");
const config_1 = require("../config");
const errorHandler = (error, req, res, next) => {
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
    if (error instanceof errors_1.AppError && error.statusCode < 500) {
        logger_1.logger.warn('Client Error:', errorLog);
    }
    else {
        logger_1.logger.error('Server Error:', errorLog);
    }
    const clientError = (0, errors_1.formatErrorForClient)(error, config_1.config.server.isDevelopment && !(0, errors_1.isOperationalError)(error));
    res.status(clientError.error.statusCode).json(clientError);
};
exports.errorHandler = errorHandler;
const notFoundHandler = (req, res, next) => {
    const error = new errors_1.AppError(`Route ${req.originalUrl} not found`, 404);
    next(error);
};
exports.notFoundHandler = notFoundHandler;
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
//# sourceMappingURL=errorHandler.js.map