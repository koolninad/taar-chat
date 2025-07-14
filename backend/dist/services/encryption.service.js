"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EncryptionService = void 0;
const errors_1 = require("../utils/errors");
const logger_1 = require("../utils/logger");
const crypto_1 = __importDefault(require("crypto"));
class EncryptionService {
    static async encryptDirectMessage(senderUserId, recipientUserId, plaintext, deviceId = this.DEFAULT_DEVICE_ID) {
        try {
            const key = crypto_1.default.createHash('sha256').update(`${senderUserId}:${recipientUserId}`).digest();
            const iv = crypto_1.default.randomBytes(16);
            const cipher = crypto_1.default.createCipher('aes-256-cbc', key);
            let encrypted = cipher.update(plaintext, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            const ciphertext = iv.toString('hex') + ':' + encrypted;
            logger_1.logger.debug('Direct message encrypted', { senderUserId, recipientUserId });
            return {
                ciphertext,
                messageType: 1,
                registrationId: 0,
                deviceId
            };
        }
        catch (error) {
            logger_1.logger.error('Error encrypting direct message:', error);
            throw error instanceof errors_1.AppError ? error : new errors_1.AppError('Failed to encrypt message', 500);
        }
    }
    static async decryptDirectMessage(recipientUserId, senderUserId, encryptedMessage) {
        try {
            const parts = encryptedMessage.ciphertext.split(':');
            if (parts.length !== 2) {
                throw new errors_1.AppError('Invalid ciphertext format', 400);
            }
            const iv = Buffer.from(parts[0], 'hex');
            const encrypted = parts[1];
            const key = crypto_1.default.createHash('sha256').update(`${senderUserId}:${recipientUserId}`).digest();
            const decipher = crypto_1.default.createDecipher('aes-256-cbc', key);
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            logger_1.logger.debug('Direct message decrypted', { recipientUserId, senderUserId });
            return {
                plaintext: decrypted,
                senderUserId,
                deviceId: encryptedMessage.deviceId,
                timestamp: new Date()
            };
        }
        catch (error) {
            logger_1.logger.error('Error decrypting direct message:', error);
            throw error instanceof errors_1.AppError ? error : new errors_1.AppError('Failed to decrypt message', 500);
        }
    }
    static async encryptGroupMessage(groupId, senderId, plaintext, deviceId = this.DEFAULT_DEVICE_ID) {
        try {
            const key = crypto_1.default.createHash('sha256').update(`group:${groupId}`).digest();
            const iv = crypto_1.default.randomBytes(16);
            const cipher = crypto_1.default.createCipher('aes-256-cbc', key);
            let encrypted = cipher.update(plaintext, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            const ciphertext = iv.toString('hex') + ':' + encrypted;
            logger_1.logger.debug('Group message encrypted', { senderId, groupId, deviceId });
            return {
                ciphertext,
                groupId,
                senderId,
                deviceId
            };
        }
        catch (error) {
            logger_1.logger.error('Error encrypting group message:', error);
            throw error instanceof errors_1.AppError ? error : new errors_1.AppError('Failed to encrypt group message', 500);
        }
    }
    static async decryptGroupMessage(recipientUserId, encryptedMessage) {
        try {
            const { groupId, senderId, deviceId, ciphertext } = encryptedMessage;
            const parts = ciphertext.split(':');
            if (parts.length !== 2) {
                throw new errors_1.AppError('Invalid ciphertext format', 400);
            }
            const iv = Buffer.from(parts[0], 'hex');
            const encrypted = parts[1];
            const key = crypto_1.default.createHash('sha256').update(`group:${groupId}`).digest();
            const decipher = crypto_1.default.createDecipher('aes-256-cbc', key);
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            logger_1.logger.debug('Group message decrypted', { recipientUserId, groupId, senderId });
            return {
                plaintext: decrypted,
                senderUserId: senderId,
                deviceId,
                timestamp: new Date()
            };
        }
        catch (error) {
            logger_1.logger.error('Error decrypting group message:', error);
            throw error instanceof errors_1.AppError ? error : new errors_1.AppError('Failed to decrypt group message', 500);
        }
    }
    static async verifyMessage(message, metadata) {
        try {
            const maxAge = 5 * 60 * 1000;
            const messageAge = Date.now() - metadata.timestamp.getTime();
            if (messageAge > maxAge) {
                logger_1.logger.warn('Message timestamp too old', {
                    messageId: metadata.messageId,
                    age: messageAge
                });
                return false;
            }
            if ('senderId' in message && message.senderId !== metadata.senderUserId) {
                logger_1.logger.warn('Sender ID mismatch', {
                    messageId: metadata.messageId,
                    expected: metadata.senderUserId,
                    actual: message.senderId
                });
                return false;
            }
            return true;
        }
        catch (error) {
            logger_1.logger.error('Error verifying message:', error);
            return false;
        }
    }
    static async generateFingerprint(localUserId, remoteUserId) {
        try {
            const combined = `${localUserId}:${remoteUserId}`;
            const hash = crypto_1.default.createHash('sha256').update(combined).digest('hex');
            return hash.substring(0, 60).replace(/(.{5})/g, '$1 ').trim();
        }
        catch (error) {
            logger_1.logger.error('Error generating fingerprint:', error);
            throw new errors_1.AppError('Failed to generate fingerprint', 500);
        }
    }
}
exports.EncryptionService = EncryptionService;
EncryptionService.DEFAULT_DEVICE_ID = 1;
//# sourceMappingURL=encryption.service.js.map