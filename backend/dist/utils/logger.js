"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.businessLogger = exports.securityLogger = exports.performanceLogger = exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const path_1 = __importDefault(require("path"));
const config_1 = require("../config");
const logFormat = winston_1.default.format.combine(winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json(), winston_1.default.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    if (Object.keys(meta).length > 0) {
        log += `\n${JSON.stringify(meta, null, 2)}`;
    }
    return log;
}));
exports.logger = winston_1.default.createLogger({
    level: config_1.config.logging.level,
    format: logFormat,
    defaultMeta: { service: 'taar-backend' },
    transports: [
        new winston_1.default.transports.Console({
            format: winston_1.default.format.combine(winston_1.default.format.colorize({ all: true }), winston_1.default.format.simple())
        }),
        new winston_1.default.transports.File({
            filename: path_1.default.join(config_1.config.logging.filePath, 'app.log'),
            maxsize: 5242880,
            maxFiles: 10
        }),
        new winston_1.default.transports.File({
            filename: path_1.default.join(config_1.config.logging.filePath, 'error.log'),
            level: 'error',
            maxsize: 5242880,
            maxFiles: 5
        })
    ],
    exceptionHandlers: [
        new winston_1.default.transports.File({
            filename: path_1.default.join(config_1.config.logging.filePath, 'exceptions.log')
        })
    ],
    rejectionHandlers: [
        new winston_1.default.transports.File({
            filename: path_1.default.join(config_1.config.logging.filePath, 'rejections.log')
        })
    ]
});
const fs_1 = __importDefault(require("fs"));
if (!fs_1.default.existsSync(config_1.config.logging.filePath)) {
    fs_1.default.mkdirSync(config_1.config.logging.filePath, { recursive: true });
}
exports.performanceLogger = {
    logRequest: (method, url, duration, statusCode) => {
        const level = statusCode >= 400 ? 'warn' : 'info';
        exports.logger.log(level, 'API Request', {
            method,
            url,
            duration: `${duration}ms`,
            statusCode,
            type: 'performance'
        });
    },
    logWebSocket: (event, duration, connectionId) => {
        exports.logger.info('WebSocket Event', {
            event,
            duration: `${duration}ms`,
            connectionId,
            type: 'websocket'
        });
    },
    logDatabase: (query, duration) => {
        exports.logger.debug('Database Query', {
            query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
            duration: `${duration}ms`,
            type: 'database'
        });
    }
};
exports.securityLogger = {
    logAuth: (event, userId, ip, userAgent) => {
        exports.logger.info('Authentication Event', {
            event,
            userId,
            ip,
            userAgent,
            type: 'security'
        });
    },
    logSignalProtocol: (event, userId, details) => {
        exports.logger.info('Signal Protocol Event', {
            event,
            userId,
            details,
            type: 'signal'
        });
    },
    logRateLimit: (ip, endpoint) => {
        exports.logger.warn('Rate Limit Exceeded', {
            ip,
            endpoint,
            type: 'rate-limit'
        });
    }
};
exports.businessLogger = {
    logMessage: (senderId, recipientId, messageType) => {
        exports.logger.info('Message Sent', {
            senderId,
            recipientId,
            messageType,
            type: 'business'
        });
    },
    logGroup: (event, groupId, userId) => {
        exports.logger.info('Group Event', {
            event,
            groupId,
            userId,
            type: 'business'
        });
    }
};
//# sourceMappingURL=logger.js.map