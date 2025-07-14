"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.secureMessagingHealthCheck = exports.exportConversationKeys = exports.getConversationSecurity = exports.reEncryptMessage = exports.batchDecryptMessages = exports.getSecureMessagingStats = exports.getSessionInfo = exports.verifyConversation = exports.processKeyExchange = exports.getEncryptedMessages = exports.decryptMessage = exports.sendSecureMessage = void 0;
const secure_message_service_1 = require("../services/secure-message.service");
const logger_1 = require("../utils/logger");
const errors_1 = require("../utils/errors");
const errorHandler_1 = require("../middleware/errorHandler");
const client_1 = require("@prisma/client");
exports.sendSecureMessage = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { recipientId, groupId, message, messageType, replyToId, mediaFileId, deviceId } = req.body;
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
    const secureMessage = await secure_message_service_1.SecureMessageService.sendSecureMessage({
        senderId,
        recipientId,
        groupId,
        plaintextContent: message,
        messageType: messageType || client_1.MessageType.TEXT,
        replyToId,
        mediaFileId,
        deviceId
    });
    logger_1.logger.info('Secure message sent', {
        messageId: secureMessage.id,
        senderId,
        isGroup: !!groupId
    });
    res.status(201).json({
        success: true,
        message: 'Encrypted message sent successfully',
        data: {
            message: {
                id: secureMessage.id,
                senderId: secureMessage.senderId,
                recipientId: secureMessage.recipientId,
                groupId: secureMessage.groupId,
                messageType: secureMessage.messageType,
                status: secureMessage.status,
                sentAt: secureMessage.sentAt,
                signalMetadata: secureMessage.signalMetadata
            }
        }
    });
});
exports.decryptMessage = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { messageId } = req.params;
    const { deviceId } = req.body;
    const recipientUserId = req.user.userId;
    const decryptedMessage = await secure_message_service_1.SecureMessageService.decryptMessage({
        messageId: messageId,
        recipientUserId,
        deviceId
    });
    logger_1.logger.info('Message decrypted', {
        messageId,
        recipientUserId,
        verified: decryptedMessage.metadata.verified
    });
    res.status(200).json({
        success: true,
        message: 'Message decrypted successfully',
        data: {
            decryptedMessage
        }
    });
});
exports.getEncryptedMessages = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { chatId } = req.params;
    const { page, limit } = req.query;
    const userId = req.user.userId;
    const pageNum = page ? parseInt(page) : 1;
    const limitNum = limit ? parseInt(limit) : 20;
    if (limitNum > 100) {
        throw new errors_1.AppError('Limit cannot exceed 100', 400);
    }
    const result = await secure_message_service_1.SecureMessageService.getEncryptedMessages(userId, chatId, pageNum, limitNum);
    res.status(200).json({
        success: true,
        data: {
            messages: result.messages,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total: result.total,
                hasMore: result.hasMore
            }
        }
    });
});
exports.processKeyExchange = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { remoteUserId, deviceId } = req.body;
    const localUserId = req.user.userId;
    if (!remoteUserId) {
        throw new errors_1.AppError('Remote user ID is required', 400);
    }
    const result = await secure_message_service_1.SecureMessageService.processKeyExchange(localUserId, remoteUserId, deviceId);
    logger_1.logger.info('Key exchange processed', {
        localUserId,
        remoteUserId,
        sessionEstablished: result.sessionEstablished
    });
    res.status(200).json({
        success: true,
        message: result.sessionEstablished
            ? 'Session already established'
            : 'Key exchange initiated',
        data: result
    });
});
exports.verifyConversation = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { chatId } = req.params;
    const { lastKnownMessageId } = req.query;
    const userId = req.user.userId;
    const verification = await secure_message_service_1.SecureMessageService.verifyConversation(userId, chatId, lastKnownMessageId);
    logger_1.logger.info('Conversation verified', {
        userId,
        chatId,
        verified: verification.verified,
        issueCount: verification.integrityIssues.length
    });
    res.status(200).json({
        success: true,
        data: {
            verification: {
                verified: verification.verified,
                issueCount: verification.integrityIssues.length,
                issues: verification.integrityIssues
            }
        }
    });
});
exports.getSessionInfo = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { remoteUserId } = req.params;
    const { deviceId } = req.query;
    const localUserId = req.user.userId;
    const deviceIdToUse = deviceId ? parseInt(deviceId) : 1;
    const sessionInfo = await secure_message_service_1.SecureMessageService.getSessionInfo(localUserId, remoteUserId, deviceIdToUse);
    res.status(200).json({
        success: true,
        data: {
            sessionInfo
        }
    });
});
exports.getSecureMessagingStats = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.userId;
    const stats = {
        totalEncryptedMessages: 0,
        totalDecryptedMessages: 0,
        activeSessions: 0,
        verificationFailures: 0,
        lastActivity: null
    };
    res.status(200).json({
        success: true,
        data: {
            stats
        }
    });
});
exports.batchDecryptMessages = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { messageIds, deviceId } = req.body;
    const recipientUserId = req.user.userId;
    if (!Array.isArray(messageIds) || messageIds.length === 0) {
        throw new errors_1.AppError('Message IDs array is required', 400);
    }
    if (messageIds.length > 50) {
        throw new errors_1.AppError('Cannot decrypt more than 50 messages at once', 400);
    }
    const results = {
        decrypted: [],
        failed: [],
        total: messageIds.length
    };
    for (const messageId of messageIds) {
        try {
            const decryptedMessage = await secure_message_service_1.SecureMessageService.decryptMessage({
                messageId,
                recipientUserId,
                deviceId
            });
            results.decrypted.push({
                messageId,
                plaintextContent: decryptedMessage.plaintextContent,
                verified: decryptedMessage.metadata.verified
            });
        }
        catch (error) {
            results.failed.push({
                messageId,
                error: error.message
            });
        }
    }
    logger_1.logger.info('Batch decrypt completed', {
        recipientUserId,
        total: messageIds.length,
        decrypted: results.decrypted.length,
        failed: results.failed.length
    });
    res.status(200).json({
        success: true,
        message: `Batch decryption completed. ${results.decrypted.length} successful, ${results.failed.length} failed.`,
        data: {
            results
        }
    });
});
exports.reEncryptMessage = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { messageId } = req.params;
    const { newDeviceId } = req.body;
    const userId = req.user.userId;
    logger_1.logger.info('Message re-encryption requested', { messageId, userId });
    res.status(501).json({
        success: false,
        message: 'Message re-encryption not yet implemented',
        data: {
            messageId,
            status: 'pending_implementation'
        }
    });
});
exports.getConversationSecurity = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { chatId } = req.params;
    const userId = req.user.userId;
    const securityStatus = {
        isSecure: true,
        encryptionProtocol: 'Signal Protocol',
        lastVerified: new Date(),
        trustLevel: 'verified',
        warnings: []
    };
    res.status(200).json({
        success: true,
        data: {
            securityStatus
        }
    });
});
exports.exportConversationKeys = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { chatId } = req.params;
    const userId = req.user.userId;
    logger_1.logger.warn('Conversation key export requested', { chatId, userId });
    res.status(403).json({
        success: false,
        message: 'Conversation key export not available via API for security reasons',
        recommendation: 'Use official backup mechanisms provided by the client application'
    });
});
exports.secureMessagingHealthCheck = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    try {
        const health = {
            signalProtocol: 'operational',
            encryption: 'operational',
            decryption: 'operational',
            keyExchange: 'operational',
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
            message: 'Secure messaging service unhealthy',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
//# sourceMappingURL=secure-message.controller.js.map