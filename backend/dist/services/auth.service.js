"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const config_1 = require("../config");
const database_service_1 = require("./database.service");
const redis_service_1 = require("./redis.service");
const sms_service_1 = require("./sms.service");
const logger_1 = require("../utils/logger");
const crypto_1 = require("../utils/crypto");
const errors_1 = require("../utils/errors");
class AuthService {
    static async sendOtp(phoneNumber, countryCode) {
        try {
            const rateLimitKey = `otp_rate:${phoneNumber}`;
            const attempts = await redis_service_1.RedisService.incrementRateLimit(rateLimitKey, 300);
            if (attempts > config_1.config.otp.maxAttempts) {
                throw new errors_1.AppError('Too many OTP requests. Please try again later.', 429);
            }
            const otpCode = (0, crypto_1.generateOtp)(config_1.config.otp.length);
            await database_service_1.DatabaseService.client.otpAttempt.create({
                data: {
                    phoneNumber: `${countryCode}${phoneNumber}`,
                    otpCode: await bcryptjs_1.default.hash(otpCode, this.SALT_ROUNDS),
                    expiresAt: new Date(Date.now() + config_1.config.otp.expiresInMinutes * 60 * 1000)
                }
            });
            await redis_service_1.RedisService.setOtp(`${countryCode}${phoneNumber}`, otpCode, config_1.config.otp.expiresInMinutes * 60);
            await sms_service_1.SmsService.sendOtp(`${countryCode}${phoneNumber}`, otpCode);
            logger_1.securityLogger.logAuth('otp_sent', undefined, undefined, phoneNumber);
        }
        catch (error) {
            logger_1.logger.error('Failed to send OTP:', error);
            throw error;
        }
    }
    static async verifyOtp(phoneNumber, countryCode, otpCode, userInfo) {
        try {
            const fullPhoneNumber = `${countryCode}${phoneNumber}`;
            const storedOtp = await redis_service_1.RedisService.getOtp(fullPhoneNumber);
            if (!storedOtp || storedOtp !== otpCode) {
                throw new errors_1.AppError('Invalid or expired OTP', 400);
            }
            await redis_service_1.RedisService.deleteOtp(fullPhoneNumber);
            await database_service_1.DatabaseService.client.otpAttempt.updateMany({
                where: {
                    phoneNumber: fullPhoneNumber,
                    isVerified: false
                },
                data: {
                    isVerified: true
                }
            });
            let user = await database_service_1.DatabaseService.client.user.findUnique({
                where: { phoneNumber: fullPhoneNumber }
            });
            let isNewUser = false;
            if (!user && userInfo) {
                const registrationId = (0, crypto_1.generateRegistrationId)();
                user = await database_service_1.DatabaseService.client.user.create({
                    data: {
                        phoneNumber: fullPhoneNumber,
                        countryCode,
                        name: userInfo.name || `User ${phoneNumber}`,
                        identityKey: userInfo.identityKey,
                        registrationId
                    }
                });
                isNewUser = true;
                logger_1.securityLogger.logAuth('user_registered', user.id);
            }
            else if (!user) {
                throw new errors_1.AppError('User not found. Please complete registration.', 404);
            }
            const tokens = await this.generateTokens(user);
            await database_service_1.DatabaseService.client.user.update({
                where: { id: user.id },
                data: {
                    lastSeen: new Date(),
                    isOnline: true
                }
            });
            await redis_service_1.RedisService.setUserOnline(user.id);
            logger_1.securityLogger.logAuth('login_success', user.id);
            return { user, tokens, isNewUser };
        }
        catch (error) {
            logger_1.logger.error('OTP verification failed:', error);
            throw error;
        }
    }
    static async generateTokens(user) {
        try {
            const accessPayload = {
                userId: user.id,
                phoneNumber: user.phoneNumber,
                type: 'access'
            };
            const refreshPayload = {
                userId: user.id,
                phoneNumber: user.phoneNumber,
                type: 'refresh'
            };
            const accessToken = jsonwebtoken_1.default.sign(accessPayload, config_1.config.jwt.secret);
            const refreshToken = jsonwebtoken_1.default.sign(refreshPayload, config_1.config.jwt.refreshSecret);
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7);
            await database_service_1.DatabaseService.client.refreshToken.create({
                data: {
                    userId: user.id,
                    token: refreshToken,
                    expiresAt
                }
            });
            await redis_service_1.RedisService.setSession(user.id, {
                userId: user.id,
                phoneNumber: user.phoneNumber,
                lastActivity: new Date().toISOString()
            }, 3600);
            return {
                accessToken,
                refreshToken,
                expiresIn: 15 * 60
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to generate tokens:', error);
            throw new errors_1.AppError('Failed to generate authentication tokens', 500);
        }
    }
    static async refreshToken(refreshToken) {
        try {
            const payload = jsonwebtoken_1.default.verify(refreshToken, config_1.config.jwt.refreshSecret);
            const storedToken = await database_service_1.DatabaseService.client.refreshToken.findUnique({
                where: { token: refreshToken },
                include: { user: true }
            });
            if (!storedToken || storedToken.isRevoked) {
                throw new errors_1.AppError('Invalid refresh token', 401);
            }
            if (new Date() > storedToken.expiresAt) {
                throw new errors_1.AppError('Refresh token expired', 401);
            }
            const newTokens = await this.generateTokens(storedToken.user);
            await database_service_1.DatabaseService.client.refreshToken.update({
                where: { id: storedToken.id },
                data: { isRevoked: true }
            });
            logger_1.securityLogger.logAuth('token_refreshed', storedToken.userId);
            return newTokens;
        }
        catch (error) {
            if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
                throw new errors_1.AppError('Invalid refresh token', 401);
            }
            throw error;
        }
    }
    static async verifyToken(token) {
        try {
            const payload = jsonwebtoken_1.default.verify(token, config_1.config.jwt.secret);
            const session = await redis_service_1.RedisService.getSession(payload.userId);
            if (!session) {
                throw new errors_1.AppError('Session expired', 401);
            }
            return payload;
        }
        catch (error) {
            if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
                throw new errors_1.AppError('Invalid access token', 401);
            }
            throw error;
        }
    }
    static async logout(userId, refreshToken) {
        try {
            if (refreshToken) {
                await database_service_1.DatabaseService.client.refreshToken.updateMany({
                    where: {
                        userId,
                        token: refreshToken
                    },
                    data: { isRevoked: true }
                });
            }
            await redis_service_1.RedisService.deleteSession(userId);
            await redis_service_1.RedisService.setUserOffline(userId);
            await database_service_1.DatabaseService.client.user.update({
                where: { id: userId },
                data: {
                    isOnline: false,
                    lastSeen: new Date()
                }
            });
            logger_1.securityLogger.logAuth('logout', userId);
        }
        catch (error) {
            logger_1.logger.error('Logout failed:', error);
            throw error;
        }
    }
    static async revokeAllSessions(userId) {
        try {
            await database_service_1.DatabaseService.client.refreshToken.updateMany({
                where: { userId },
                data: { isRevoked: true }
            });
            await redis_service_1.RedisService.deleteSession(userId);
            await redis_service_1.RedisService.setUserOffline(userId);
            logger_1.securityLogger.logAuth('all_sessions_revoked', userId);
        }
        catch (error) {
            logger_1.logger.error('Failed to revoke all sessions:', error);
            throw error;
        }
    }
    static async updateProfile(userId, updates) {
        try {
            const user = await database_service_1.DatabaseService.client.user.update({
                where: { id: userId },
                data: {
                    ...updates,
                    updatedAt: new Date()
                }
            });
            await redis_service_1.RedisService.deleteCache(`user:${userId}`);
            return user;
        }
        catch (error) {
            logger_1.logger.error('Failed to update profile:', error);
            throw error;
        }
    }
    static async getProfile(userId) {
        try {
            const cached = await redis_service_1.RedisService.getCache(`user:${userId}`);
            if (cached) {
                return cached;
            }
            const user = await database_service_1.DatabaseService.client.user.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    phoneNumber: true,
                    name: true,
                    about: true,
                    avatarUrl: true,
                    isOnline: true,
                    lastSeen: true,
                    createdAt: true,
                    registrationId: true
                }
            });
            if (!user) {
                throw new errors_1.AppError('User not found', 404);
            }
            await redis_service_1.RedisService.setCache(`user:${userId}`, user, 3600);
            return user;
        }
        catch (error) {
            logger_1.logger.error('Failed to get profile:', error);
            throw error;
        }
    }
}
exports.AuthService = AuthService;
AuthService.SALT_ROUNDS = 12;
//# sourceMappingURL=auth.service.js.map