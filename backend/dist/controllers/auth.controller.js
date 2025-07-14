"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyPhoneNumberChange = exports.changePhoneNumberRequest = exports.requestAccountDeletion = exports.checkAuth = exports.updateProfile = exports.getProfile = exports.revokeAllSessions = exports.logout = exports.refreshToken = exports.verifyOtp = exports.sendOtp = void 0;
const auth_service_1 = require("../services/auth.service");
const sms_service_1 = require("../services/sms.service");
const redis_service_1 = require("../services/redis.service");
const logger_1 = require("../utils/logger");
const errors_1 = require("../utils/errors");
const errorHandler_1 = require("../middleware/errorHandler");
exports.sendOtp = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { phoneNumber, countryCode } = req.body;
    if (!sms_service_1.SmsService.validatePhoneNumber(`${countryCode}${phoneNumber}`)) {
        throw new errors_1.AppError(errors_1.ErrorMessages.INVALID_PHONE_NUMBER, 400);
    }
    const formattedNumber = sms_service_1.SmsService.formatPhoneNumber(`${countryCode}${phoneNumber}`);
    await auth_service_1.AuthService.sendOtp(phoneNumber, countryCode);
    logger_1.securityLogger.logAuth('otp_sent', undefined, req.ip, req.get('User-Agent'));
    res.status(200).json({
        success: true,
        message: 'Verification code sent successfully',
        data: {
            phoneNumber: formattedNumber.replace(/\d(?=\d{4})/g, '*'),
            expiresIn: 300
        }
    });
});
exports.verifyOtp = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { phoneNumber, countryCode, otpCode, userInfo } = req.body;
    const result = await auth_service_1.AuthService.verifyOtp(phoneNumber, countryCode, otpCode, userInfo);
    logger_1.securityLogger.logAuth(result.isNewUser ? 'user_registered' : 'login_success', result.user.id, req.ip, req.get('User-Agent'));
    if (result.isNewUser) {
        await sms_service_1.SmsService.sendWelcomeMessage(`${countryCode}${phoneNumber}`, result.user.name || 'User');
    }
    res.status(200).json({
        success: true,
        message: result.isNewUser ? 'Account created successfully' : 'Login successful',
        data: {
            user: {
                id: result.user.id,
                phoneNumber: result.user.phoneNumber,
                name: result.user.name,
                about: result.user.about,
                avatarUrl: result.user.avatarUrl,
                isOnline: result.user.isOnline,
                lastSeen: result.user.lastSeen,
                registrationId: result.user.registrationId
            },
            tokens: result.tokens,
            isNewUser: result.isNewUser
        }
    });
});
exports.refreshToken = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { refreshToken } = req.body;
    const tokens = await auth_service_1.AuthService.refreshToken(refreshToken);
    res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
            tokens
        }
    });
});
exports.logout = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.userId;
    const refreshToken = req.body.refreshToken;
    await auth_service_1.AuthService.logout(userId, refreshToken);
    logger_1.securityLogger.logAuth('logout', userId, req.ip, req.get('User-Agent'));
    res.status(200).json({
        success: true,
        message: 'Logged out successfully'
    });
});
exports.revokeAllSessions = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.userId;
    await auth_service_1.AuthService.revokeAllSessions(userId);
    logger_1.securityLogger.logAuth('all_sessions_revoked', userId, req.ip, req.get('User-Agent'));
    res.status(200).json({
        success: true,
        message: 'All sessions revoked successfully'
    });
});
exports.getProfile = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.userId;
    const user = await auth_service_1.AuthService.getProfile(userId);
    res.status(200).json({
        success: true,
        data: {
            user: {
                id: user.id,
                phoneNumber: user.phoneNumber,
                name: user.name,
                about: user.about,
                avatarUrl: user.avatarUrl,
                isOnline: user.isOnline,
                lastSeen: user.lastSeen,
                createdAt: user.createdAt,
                registrationId: user.registrationId
            }
        }
    });
});
exports.updateProfile = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.userId;
    const updates = req.body;
    const user = await auth_service_1.AuthService.updateProfile(userId, updates);
    res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: {
            user: {
                id: user.id,
                phoneNumber: user.phoneNumber,
                name: user.name,
                about: user.about,
                avatarUrl: user.avatarUrl,
                isOnline: user.isOnline,
                lastSeen: user.lastSeen,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt
            }
        }
    });
});
exports.checkAuth = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.userId;
    const session = await redis_service_1.RedisService.getSession(userId);
    if (!session) {
        throw new errors_1.AppError(errors_1.ErrorMessages.SESSION_EXPIRED, 401);
    }
    res.status(200).json({
        success: true,
        message: 'Authentication valid',
        data: {
            userId,
            sessionExpiry: session.lastActivity
        }
    });
});
exports.requestAccountDeletion = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.userId;
    logger_1.logger.info('Account deletion requested', { userId });
    logger_1.securityLogger.logAuth('account_deletion_requested', userId, req.ip, req.get('User-Agent'));
    res.status(200).json({
        success: true,
        message: 'Account deletion request submitted. You will receive confirmation within 24 hours.',
        data: {
            requestId: `del_${Date.now()}`,
            expectedDeletion: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }
    });
});
exports.changePhoneNumberRequest = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { newPhoneNumber, countryCode } = req.body;
    const userId = req.user.userId;
    if (!sms_service_1.SmsService.validatePhoneNumber(`${countryCode}${newPhoneNumber}`)) {
        throw new errors_1.AppError(errors_1.ErrorMessages.INVALID_PHONE_NUMBER, 400);
    }
    const existingUser = await auth_service_1.AuthService.getProfile(userId);
    await auth_service_1.AuthService.sendOtp(newPhoneNumber, countryCode);
    await redis_service_1.RedisService.setCache(`phone_change:${userId}`, { newPhoneNumber: `${countryCode}${newPhoneNumber}` }, 300);
    logger_1.securityLogger.logAuth('phone_change_requested', userId, req.ip, req.get('User-Agent'));
    res.status(200).json({
        success: true,
        message: 'Verification code sent to new phone number',
        data: {
            maskedPhoneNumber: `${countryCode}${newPhoneNumber}`.replace(/\d(?=\d{4})/g, '*')
        }
    });
});
exports.verifyPhoneNumberChange = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { otpCode } = req.body;
    const userId = req.user.userId;
    const changeRequest = await redis_service_1.RedisService.getCache(`phone_change:${userId}`);
    if (!changeRequest) {
        throw new errors_1.AppError('No pending phone number change request', 400);
    }
    const storedOtp = await redis_service_1.RedisService.getOtp(changeRequest.newPhoneNumber);
    if (!storedOtp || storedOtp !== otpCode) {
        throw new errors_1.AppError(errors_1.ErrorMessages.INVALID_OTP, 400);
    }
    await redis_service_1.RedisService.deleteCache(`phone_change:${userId}`);
    await redis_service_1.RedisService.deleteOtp(changeRequest.newPhoneNumber);
    logger_1.securityLogger.logAuth('phone_number_changed', userId, req.ip, req.get('User-Agent'));
    res.status(200).json({
        success: true,
        message: 'Phone number changed successfully'
    });
});
//# sourceMappingURL=auth.controller.js.map