"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRateLimit = exports.requireAdmin = exports.authorizeResourceAccess = exports.extractUserId = exports.authenticateApiKey = exports.requireActiveUser = exports.optionalAuth = exports.authenticateToken = void 0;
const auth_service_1 = require("../services/auth.service");
const errors_1 = require("../utils/errors");
const logger_1 = require("../utils/logger");
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            throw new errors_1.AuthenticationError('No authorization header provided');
        }
        const token = authHeader.split(' ')[1];
        if (!token) {
            throw new errors_1.AuthenticationError('No token provided');
        }
        const payload = await auth_service_1.AuthService.verifyToken(token);
        req.user = {
            userId: payload.userId,
            phoneNumber: payload.phoneNumber
        };
        next();
    }
    catch (error) {
        if (error instanceof errors_1.AppError) {
            return next(error);
        }
        logger_1.logger.error('Token authentication failed:', error);
        next(new errors_1.AuthenticationError('Invalid or expired token'));
    }
};
exports.authenticateToken = authenticateToken;
const optionalAuth = async (req, res, next) => {
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
            const payload = await auth_service_1.AuthService.verifyToken(token);
            req.user = {
                userId: payload.userId,
                phoneNumber: payload.phoneNumber
            };
        }
        catch {
        }
        next();
    }
    catch (error) {
        next();
    }
};
exports.optionalAuth = optionalAuth;
const requireActiveUser = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new errors_1.AuthenticationError('Authentication required');
        }
        const user = await auth_service_1.AuthService.getProfile(req.user.userId);
        if (!user) {
            throw new errors_1.AuthenticationError('User account not found');
        }
        req.user = {
            ...req.user,
            ...user
        };
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.requireActiveUser = requireActiveUser;
const authenticateApiKey = (req, res, next) => {
    try {
        const apiKey = req.headers['x-api-key'];
        if (!apiKey) {
            throw new errors_1.AuthenticationError('API key required');
        }
        if (apiKey !== process.env.INTERNAL_API_KEY) {
            throw new errors_1.AuthenticationError('Invalid API key');
        }
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.authenticateApiKey = authenticateApiKey;
const extractUserId = (req, res, next) => {
    try {
        let userId;
        if (req.user?.userId) {
            userId = req.user.userId;
        }
        if (!userId && req.params.userId) {
            userId = req.params.userId;
        }
        if (!userId && req.query.userId) {
            userId = req.query.userId;
        }
        if (!userId) {
            throw new errors_1.AppError('User ID required', 400);
        }
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(userId)) {
            throw new errors_1.AppError('Invalid user ID format', 400);
        }
        req.params.userId = userId;
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.extractUserId = extractUserId;
const authorizeResourceAccess = (req, res, next) => {
    try {
        if (!req.user) {
            throw new errors_1.AuthenticationError('Authentication required');
        }
        const resourceUserId = req.params.userId;
        const authenticatedUserId = req.user.userId;
        if (resourceUserId && resourceUserId !== authenticatedUserId) {
            throw new errors_1.AppError('Access denied', 403);
        }
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.authorizeResourceAccess = authorizeResourceAccess;
const requireAdmin = (req, res, next) => {
    try {
        if (!req.user) {
            throw new errors_1.AuthenticationError('Authentication required');
        }
        const adminUsers = process.env.ADMIN_USER_IDS?.split(',') || [];
        if (!adminUsers.includes(req.user.userId)) {
            throw new errors_1.AppError('Admin access required', 403);
        }
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.requireAdmin = requireAdmin;
const createRateLimit = (windowMs = 900000, max = 100, message = 'Too many requests from this IP') => {
    return async (req, res, next) => {
        try {
            const identifier = req.ip || req.connection.remoteAddress || 'unknown';
            const key = `${req.route?.path || req.path}:${identifier}`;
            const { RedisService } = await Promise.resolve().then(() => __importStar(require('../services/redis.service')));
            const attempts = await RedisService.incrementRateLimit(key, windowMs / 1000);
            if (attempts > max) {
                throw new errors_1.AppError(message, 429);
            }
            res.set({
                'X-RateLimit-Limit': max.toString(),
                'X-RateLimit-Remaining': Math.max(0, max - attempts).toString(),
                'X-RateLimit-Reset': new Date(Date.now() + windowMs).toISOString()
            });
            next();
        }
        catch (error) {
            next(error);
        }
    };
};
exports.createRateLimit = createRateLimit;
//# sourceMappingURL=auth.middleware.js.map