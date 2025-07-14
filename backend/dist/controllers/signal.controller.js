"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.signalHealthCheck = exports.importSignalData = exports.exportSignalData = exports.resetIdentity = exports.verifySafetyNumbers = exports.getSignalStats = exports.decryptMessage = exports.encryptMessage = exports.generateFingerprint = exports.deleteSession = exports.getSessions = exports.rotateSignedPreKey = exports.getMyPreKeyBundle = exports.getPreKeyBundle = exports.generatePreKeys = exports.initializeSignal = void 0;
const signal_service_1 = require("../services/signal.service");
const encryption_service_1 = require("../services/encryption.service");
const logger_1 = require("../utils/logger");
const errors_1 = require("../utils/errors");
const errorHandler_1 = require("../middleware/errorHandler");
exports.initializeSignal = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { deviceId } = req.body;
    const userId = req.user.userId;
    const deviceIdToUse = deviceId || 1;
    const identity = await signal_service_1.SignalService.initializeUser(userId, deviceIdToUse);
    logger_1.logger.info('Signal Protocol initialized', { userId, deviceId: deviceIdToUse });
    res.status(200).json({
        success: true,
        message: 'Signal Protocol initialized successfully',
        data: {
            identity
        }
    });
});
exports.generatePreKeys = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { deviceId, count } = req.body;
    const userId = req.user.userId;
    const deviceIdToUse = deviceId || 1;
    const countToGenerate = count || 100;
    if (countToGenerate > 1000) {
        throw new errors_1.AppError('Cannot generate more than 1000 prekeys at once', 400);
    }
    await signal_service_1.SignalService.generatePreKeys(userId, deviceIdToUse, countToGenerate);
    logger_1.logger.info('Prekeys generated', { userId, deviceId: deviceIdToUse, count: countToGenerate });
    res.status(200).json({
        success: true,
        message: `${countToGenerate} prekeys generated successfully`
    });
});
exports.getPreKeyBundle = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { userId: targetUserId } = req.params;
    const { deviceId } = req.query;
    const requesterId = req.user.userId;
    if (!targetUserId) {
        throw new errors_1.AppError('User ID is required', 400);
    }
    const deviceIdToUse = deviceId ? parseInt(deviceId) : 1;
    const preKeyBundle = await signal_service_1.SignalService.getPreKeyBundle(targetUserId, deviceIdToUse);
    logger_1.logger.info('Prekey bundle retrieved', {
        requesterId,
        targetUserId,
        deviceId: deviceIdToUse
    });
    res.status(200).json({
        success: true,
        data: {
            preKeyBundle
        }
    });
});
exports.getMyPreKeyBundle = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { deviceId } = req.query;
    const userId = req.user.userId;
    const deviceIdToUse = deviceId ? parseInt(deviceId) : 1;
    const preKeyBundle = await signal_service_1.SignalService.getPreKeyBundle(userId, deviceIdToUse);
    res.status(200).json({
        success: true,
        data: {
            preKeyBundle
        }
    });
});
exports.rotateSignedPreKey = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { deviceId } = req.body;
    const userId = req.user.userId;
    const deviceIdToUse = deviceId || 1;
    await signal_service_1.SignalService.rotateSignedPreKey(userId, deviceIdToUse);
    logger_1.logger.info('Signed prekey rotated', { userId, deviceId: deviceIdToUse });
    res.status(200).json({
        success: true,
        message: 'Signed prekey rotated successfully'
    });
});
exports.getSessions = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.userId;
    const sessions = await signal_service_1.SignalService.getUserSessions(userId);
    res.status(200).json({
        success: true,
        data: {
            sessions,
            total: sessions.length
        }
    });
});
exports.deleteSession = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { userId: remoteUserId } = req.params;
    const { deviceId } = req.body;
    const localUserId = req.user.userId;
    if (!remoteUserId) {
        throw new errors_1.AppError('Remote user ID is required', 400);
    }
    const deviceIdToUse = deviceId || 1;
    await signal_service_1.SignalService.deleteSession(localUserId, remoteUserId, deviceIdToUse);
    logger_1.logger.info('Session deleted', { localUserId, remoteUserId, deviceId: deviceIdToUse });
    res.status(200).json({
        success: true,
        message: 'Session deleted successfully'
    });
});
exports.generateFingerprint = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { userId: remoteUserId } = req.params;
    const localUserId = req.user.userId;
    if (!remoteUserId) {
        throw new errors_1.AppError('Remote user ID is required', 400);
    }
    const fingerprint = await encryption_service_1.EncryptionService.generateFingerprint(localUserId, remoteUserId);
    res.status(200).json({
        success: true,
        data: {
            fingerprint,
            localUserId,
            remoteUserId
        }
    });
});
exports.encryptMessage = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { recipientId, groupId, message, deviceId } = req.body;
    const senderId = req.user.userId;
    if (!message || typeof message !== 'string') {
        throw new errors_1.AppError('Message content is required', 400);
    }
    if (!recipientId && !groupId) {
        throw new errors_1.AppError('Either recipientId or groupId must be provided', 400);
    }
    if (recipientId && groupId) {
        throw new errors_1.AppError('Cannot specify both recipientId and groupId', 400);
    }
    const deviceIdToUse = deviceId || 1;
    let encryptedMessage;
    if (recipientId) {
        encryptedMessage = await encryption_service_1.EncryptionService.encryptDirectMessage(senderId, recipientId, message, deviceIdToUse);
    }
    else {
        encryptedMessage = await encryption_service_1.EncryptionService.encryptGroupMessage(senderId, groupId, message, deviceIdToUse);
    }
    logger_1.logger.info('Message encrypted', {
        senderId,
        recipientId,
        groupId,
        messageType: recipientId ? 'direct' : 'group'
    });
    res.status(200).json({
        success: true,
        message: 'Message encrypted successfully',
        data: {
            encryptedMessage,
            messageType: recipientId ? 'direct' : 'group'
        }
    });
});
exports.decryptMessage = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { encryptedMessage, senderId, messageType } = req.body;
    const recipientId = req.user.userId;
    if (!encryptedMessage || !senderId) {
        throw new errors_1.AppError('Encrypted message and sender ID are required', 400);
    }
    let decryptedMessage;
    if (messageType === 'direct') {
        decryptedMessage = await encryption_service_1.EncryptionService.decryptDirectMessage(recipientId, senderId, encryptedMessage);
    }
    else if (messageType === 'group') {
        decryptedMessage = await encryption_service_1.EncryptionService.decryptGroupMessage(recipientId, encryptedMessage);
    }
    else {
        throw new errors_1.AppError('Invalid message type. Use "direct" or "group"', 400);
    }
    logger_1.logger.info('Message decrypted', {
        recipientId,
        senderId,
        messageType
    });
    res.status(200).json({
        success: true,
        message: 'Message decrypted successfully',
        data: {
            decryptedMessage
        }
    });
});
exports.getSignalStats = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.userId;
    const stats = {
        totalSessions: 0,
        totalPreKeys: 0,
        lastSignedPreKeyRotation: null,
        identityKeyFingerprint: null,
        registrationId: 0
    };
    res.status(200).json({
        success: true,
        data: {
            stats
        }
    });
});
exports.verifySafetyNumbers = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { userId: remoteUserId } = req.params;
    const { fingerprint } = req.body;
    const localUserId = req.user.userId;
    if (!fingerprint || typeof fingerprint !== 'string') {
        throw new errors_1.AppError('Fingerprint is required', 400);
    }
    if (!remoteUserId) {
        throw new errors_1.AppError('Remote user ID is required', 400);
    }
    const actualFingerprint = await encryption_service_1.EncryptionService.generateFingerprint(localUserId, remoteUserId);
    const isValid = fingerprint.replace(/\s/g, '') === actualFingerprint.replace(/\s/g, '');
    logger_1.logger.info('Safety numbers verification', {
        localUserId,
        remoteUserId,
        isValid
    });
    res.status(200).json({
        success: true,
        data: {
            isValid,
            actualFingerprint,
            providedFingerprint: fingerprint
        }
    });
});
exports.resetIdentity = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { confirmReset } = req.body;
    const userId = req.user.userId;
    if (!confirmReset) {
        throw new errors_1.AppError('Identity reset must be explicitly confirmed', 400);
    }
    logger_1.logger.warn('Identity reset requested', { userId });
    res.status(200).json({
        success: true,
        message: 'Identity reset functionality not implemented for security reasons',
        warning: 'This operation would invalidate all existing sessions and require re-establishing trust with all contacts'
    });
});
exports.exportSignalData = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.userId;
    logger_1.logger.info('Signal data export requested', { userId });
    res.status(403).json({
        success: false,
        message: 'Signal Protocol data export not available via API for security reasons',
        recommendation: 'Use official backup mechanisms provided by the client application'
    });
});
exports.importSignalData = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.userId;
    logger_1.logger.info('Signal data import requested', { userId });
    res.status(403).json({
        success: false,
        message: 'Signal Protocol data import not available via API for security reasons',
        recommendation: 'Use official restore mechanisms provided by the client application'
    });
});
exports.signalHealthCheck = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    try {
        const health = {
            signalProtocol: 'healthy',
            keyGeneration: 'operational',
            encryption: 'operational',
            sessions: 'operational',
            lastCheck: new Date().toISOString()
        };
        res.status(200).json({
            success: true,
            data: health
        });
    }
    catch (error) {
        res.status(503).json({
            success: false,
            message: 'Signal Protocol service unhealthy',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
//# sourceMappingURL=signal.controller.js.map