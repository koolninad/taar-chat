"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecureMessageService = void 0;
const client_1 = require("@prisma/client");
const message_service_1 = require("./message.service");
const encryption_service_1 = require("./encryption.service");
const signal_service_1 = require("./signal.service");
const redis_service_1 = require("./redis.service");
const errors_1 = require("../utils/errors");
const logger_1 = require("../utils/logger");
const prisma = new client_1.PrismaClient();
class SecureMessageService {
    static async sendSecureMessage(messageData) {
        try {
            const deviceId = messageData.deviceId || this.DEFAULT_DEVICE_ID;
            await this.ensureSignalInitialized(messageData.senderId, deviceId);
            let encryptedData;
            let signalMetadata;
            if (messageData.recipientId) {
                await this.ensureSignalInitialized(messageData.recipientId, deviceId);
                encryptedData = await encryption_service_1.EncryptionService.encryptDirectMessage(messageData.senderId, messageData.recipientId, messageData.plaintextContent, deviceId);
                signalMetadata = {
                    cipherType: encryptedData.messageType,
                    deviceId: encryptedData.deviceId
                };
            }
            else if (messageData.groupId) {
                await this.validateGroupMembership(messageData.senderId, messageData.groupId);
                encryptedData = await encryption_service_1.EncryptionService.encryptGroupMessage(messageData.senderId, messageData.groupId, messageData.plaintextContent, deviceId);
                signalMetadata = {
                    cipherType: 0,
                    deviceId: encryptedData.deviceId,
                    senderKeyDistribution: encryptedData.senderKeyDistributionMessage
                };
            }
            else {
                throw new errors_1.AppError('Either recipientId or groupId must be provided', 400);
            }
            const secureMessageRequest = {
                senderId: messageData.senderId,
                recipientId: messageData.recipientId,
                groupId: messageData.groupId,
                encryptedContent: encryptedData.ciphertext,
                messageType: messageData.messageType,
                replyToId: messageData.replyToId,
                mediaFileId: messageData.mediaFileId
            };
            const message = await message_service_1.MessageService.sendMessage(secureMessageRequest);
            await this.storeSignalMetadata(message.id, signalMetadata);
            await this.cacheMessageMetadata(message.id, {
                messageId: message.id,
                timestamp: message.sentAt,
                senderUserId: messageData.senderId,
                recipientUserId: messageData.recipientId,
                groupId: messageData.groupId,
                messageType: messageData.recipientId ? 'direct' : 'group'
            });
            logger_1.logger.info('Secure message sent', {
                messageId: message.id,
                senderId: messageData.senderId,
                isGroup: !!messageData.groupId,
                cipherType: signalMetadata.cipherType
            });
            return {
                id: message.id,
                senderId: message.senderId,
                recipientId: message.recipientId,
                groupId: message.groupId,
                encryptedContent: message.encryptedContent,
                messageType: message.messageType,
                status: message.status,
                sentAt: message.sentAt,
                signalMetadata
            };
        }
        catch (error) {
            logger_1.logger.error('Error sending secure message:', error);
            throw error instanceof errors_1.AppError ? error : new errors_1.AppError('Failed to send secure message', 500);
        }
    }
    static async decryptMessage(decryptRequest) {
        try {
            const deviceId = decryptRequest.deviceId || this.DEFAULT_DEVICE_ID;
            const message = await prisma.message.findUnique({
                where: { id: decryptRequest.messageId },
                include: {
                    signalMetadata: true
                }
            });
            if (!message) {
                throw new errors_1.AppError('Message not found', 404);
            }
            const hasAccess = message.recipientId === decryptRequest.recipientUserId ||
                (message.groupId && await this.validateGroupMembership(decryptRequest.recipientUserId, message.groupId));
            if (!hasAccess) {
                throw new errors_1.AppError('Access denied to this message', 403);
            }
            const signalMetadata = await this.getSignalMetadata(message.id);
            if (!signalMetadata) {
                throw new errors_1.AppError('Signal metadata not found', 404);
            }
            let decryptedData;
            if (message.recipientId) {
                const encryptedMessage = {
                    ciphertext: message.encryptedContent.toString('base64'),
                    messageType: signalMetadata.cipherType,
                    deviceId: signalMetadata.deviceId,
                    registrationId: 0
                };
                decryptedData = await encryption_service_1.EncryptionService.decryptDirectMessage(decryptRequest.recipientUserId, message.senderId, encryptedMessage);
            }
            else if (message.groupId) {
                const encryptedMessage = {
                    ciphertext: message.encryptedContent.toString('base64'),
                    senderKeyDistributionMessage: signalMetadata.senderKeyDistribution,
                    groupId: message.groupId,
                    senderId: message.senderId,
                    deviceId: signalMetadata.deviceId
                };
                decryptedData = await encryption_service_1.EncryptionService.decryptGroupMessage(decryptRequest.recipientUserId, encryptedMessage);
            }
            else {
                throw new errors_1.AppError('Invalid message type', 400);
            }
            const messageMetadata = await this.getMessageMetadata(message.id);
            const isVerified = messageMetadata && await encryption_service_1.EncryptionService.verifyMessage({ ciphertext: message.encryptedContent.toString('base64'), messageType: signalMetadata.cipherType }, messageMetadata);
            logger_1.logger.info('Message decrypted', {
                messageId: message.id,
                recipientId: decryptRequest.recipientUserId,
                senderId: message.senderId,
                isGroup: !!message.groupId,
                verified: isVerified
            });
            return {
                messageId: message.id,
                senderId: message.senderId,
                plaintextContent: decryptedData.plaintext,
                messageType: message.messageType,
                sentAt: message.sentAt,
                isGroupMessage: !!message.groupId,
                metadata: {
                    verified: !!isVerified,
                    deviceId: signalMetadata.deviceId,
                    timestamp: decryptedData.timestamp
                }
            };
        }
        catch (error) {
            logger_1.logger.error('Error decrypting message:', error);
            throw error instanceof errors_1.AppError ? error : new errors_1.AppError('Failed to decrypt message', 500);
        }
    }
    static async getEncryptedMessages(userId, chatId, page = 1, limit = 20) {
        try {
            const result = await message_service_1.MessageService.getMessages(userId, chatId, page, limit);
            const secureMessages = [];
            for (const message of result.messages) {
                const signalMetadata = await this.getSignalMetadata(message.id);
                secureMessages.push({
                    id: message.id,
                    senderId: message.senderId,
                    recipientId: message.recipientId,
                    groupId: message.groupId,
                    encryptedContent: message.encryptedContent,
                    messageType: message.messageType,
                    status: message.status,
                    sentAt: message.sentAt,
                    signalMetadata: signalMetadata || {
                        cipherType: 0,
                        deviceId: this.DEFAULT_DEVICE_ID
                    }
                });
            }
            return {
                messages: secureMessages,
                hasMore: result.hasMore,
                total: result.total
            };
        }
        catch (error) {
            logger_1.logger.error('Error getting encrypted messages:', error);
            throw error instanceof errors_1.AppError ? error : new errors_1.AppError('Failed to get encrypted messages', 500);
        }
    }
    static async processKeyExchange(localUserId, remoteUserId, deviceId = this.DEFAULT_DEVICE_ID) {
        try {
            const existingSession = await signal_service_1.SignalService.loadSession(localUserId, remoteUserId, deviceId);
            if (existingSession) {
                return { success: true, sessionEstablished: true };
            }
            const preKeyBundle = await signal_service_1.SignalService.getPreKeyBundle(remoteUserId, deviceId);
            logger_1.logger.info('Key exchange processed', { localUserId, remoteUserId, deviceId });
            return { success: true, sessionEstablished: false };
        }
        catch (error) {
            logger_1.logger.error('Error processing key exchange:', error);
            throw error instanceof errors_1.AppError ? error : new errors_1.AppError('Failed to process key exchange', 500);
        }
    }
    static async verifyConversation(userId, chatId, lastKnownMessageId) {
        try {
            const issues = [];
            const result = await message_service_1.MessageService.getMessages(userId, chatId, 1, 50);
            let lastTimestamp = 0;
            let messageCount = 0;
            for (const message of result.messages) {
                messageCount++;
                if (message.sentAt.getTime() < lastTimestamp) {
                    issues.push(`Message ${message.id} has out-of-order timestamp`);
                }
                lastTimestamp = message.sentAt.getTime();
                const signalMetadata = await this.getSignalMetadata(message.id);
                if (!signalMetadata) {
                    issues.push(`Message ${message.id} missing Signal metadata`);
                }
                if (lastKnownMessageId && message.id === lastKnownMessageId) {
                    break;
                }
            }
            const verified = issues.length === 0;
            logger_1.logger.info('Conversation verification completed', {
                userId,
                chatId,
                verified,
                issueCount: issues.length,
                messagesChecked: messageCount
            });
            return { verified, integrityIssues: issues };
        }
        catch (error) {
            logger_1.logger.error('Error verifying conversation:', error);
            throw error instanceof errors_1.AppError ? error : new errors_1.AppError('Failed to verify conversation', 500);
        }
    }
    static async getSessionInfo(localUserId, remoteUserId, deviceId = this.DEFAULT_DEVICE_ID) {
        try {
            const sessionData = await signal_service_1.SignalService.loadSession(localUserId, remoteUserId, deviceId);
            if (!sessionData) {
                return { hasSession: false };
            }
            const sessionRecord = await prisma.signalSession.findUnique({
                where: {
                    localUserId_remoteUserId_deviceId: {
                        localUserId,
                        remoteUserId,
                        deviceId
                    }
                }
            });
            return {
                hasSession: true,
                lastUsed: sessionRecord?.lastUsed,
                sessionData: {
                    hasData: !!sessionData,
                    deviceId,
                    createdAt: sessionRecord?.createdAt
                }
            };
        }
        catch (error) {
            logger_1.logger.error('Error getting session info:', error);
            throw error instanceof errors_1.AppError ? error : new errors_1.AppError('Failed to get session info', 500);
        }
    }
    static async ensureSignalInitialized(userId, deviceId) {
        const identity = await prisma.signalIdentity.findUnique({
            where: {
                userId_deviceId: {
                    userId,
                    deviceId
                }
            }
        });
        if (!identity) {
            throw new errors_1.AppError(`Signal Protocol not initialized for user ${userId}`, 400);
        }
    }
    static async validateGroupMembership(userId, groupId) {
        const membership = await prisma.groupMember.findUnique({
            where: {
                groupId_userId: {
                    groupId,
                    userId
                }
            }
        });
        if (!membership) {
            throw new errors_1.AppError('User is not a member of this group', 403);
        }
    }
    static async storeSignalMetadata(messageId, metadata) {
        await prisma.signalMessageMetadata.create({
            data: {
                messageId,
                cipherType: metadata.cipherType,
                deviceId: metadata.deviceId,
                senderKeyDistribution: metadata.senderKeyDistribution
            }
        });
    }
    static async getSignalMetadata(messageId) {
        const metadata = await prisma.signalMessageMetadata.findUnique({
            where: { messageId }
        });
        if (!metadata)
            return null;
        return {
            cipherType: metadata.cipherType,
            deviceId: metadata.deviceId,
            senderKeyDistribution: metadata.senderKeyDistribution
        };
    }
    static async cacheMessageMetadata(messageId, metadata) {
        await redis_service_1.RedisService.setCache(`message_metadata:${messageId}`, metadata, 3600);
    }
    static async getMessageMetadata(messageId) {
        return await redis_service_1.RedisService.getCache(`message_metadata:${messageId}`);
    }
}
exports.SecureMessageService = SecureMessageService;
SecureMessageService.DEFAULT_DEVICE_ID = 1;
//# sourceMappingURL=secure-message.service.js.map