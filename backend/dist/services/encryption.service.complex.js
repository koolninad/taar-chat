"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EncryptionService = void 0;
const libsignal_client_1 = require("@signalapp/libsignal-client");
const signal_service_1 = require("./signal.service");
const errors_1 = require("../utils/errors");
const logger_1 = require("../utils/logger");
const crypto_1 = __importDefault(require("crypto"));
class EncryptionService {
    static async encryptDirectMessage(senderUserId, recipientUserId, plaintext, deviceId = this.DEFAULT_DEVICE_ID) {
        try {
            const sessionData = await signal_service_1.SignalService.loadSession(senderUserId, recipientUserId, deviceId);
            const recipientAddress = libsignal_client_1.ProtocolAddress.new(recipientUserId, deviceId);
            const stores = await this.createStores(senderUserId);
            if (!sessionData) {
                const preKeyBundle = await signal_service_1.SignalService.getPreKeyBundle(recipientUserId, deviceId);
                await (0, libsignal_client_1.processPreKeyBundle)(preKeyBundle, recipientAddress, stores.sessionStore, stores.identityStore);
            }
            const ciphertext = await (0, libsignal_client_1.signalEncrypt)(Buffer.from(plaintext, 'utf8'), recipientAddress, stores.sessionStore, stores.identityStore);
            logger_1.logger.debug('Direct message encrypted', {
                senderUserId,
                recipientUserId,
                messageType: ciphertext.type()
            });
            return {
                ciphertext: Buffer.from(ciphertext.serialize()).toString('base64'),
                messageType: ciphertext.type(),
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
            const deviceId = encryptedMessage.deviceId;
            const senderAddress = libsignal_client_1.ProtocolAddress.new(senderUserId, deviceId);
            const sessionData = await signal_service_1.SignalService.loadSession(recipientUserId, senderUserId, deviceId);
            if (!sessionData) {
                throw new errors_1.AppError('No session found for sender', 404);
            }
            const stores = await this.createStores(recipientUserId);
            const ciphertextBuffer = Buffer.from(encryptedMessage.ciphertext, 'base64');
            let plaintextBuffer;
            if (encryptedMessage.messageType === libsignal_client_1.CiphertextMessageType.PreKey) {
                const preKeyMessage = libsignal_client_1.PreKeySignalMessage.deserialize(ciphertextBuffer);
                plaintextBuffer = await (0, libsignal_client_1.signalDecryptPreKey)(preKeyMessage, senderAddress, stores.sessionStore, stores.identityStore, stores.preKeyStore, stores.signedPreKeyStore, undefined);
            }
            else if (encryptedMessage.messageType === libsignal_client_1.CiphertextMessageType.Whisper) {
                const signalMessage = libsignal_client_1.SignalMessage.deserialize(ciphertextBuffer);
                plaintextBuffer = await (0, libsignal_client_1.signalDecrypt)(signalMessage, senderAddress, stores.sessionStore, stores.identityStore);
            }
            else {
                throw new errors_1.AppError('Unknown message type', 400);
            }
            const plaintext = plaintextBuffer.toString('utf8');
            logger_1.logger.debug('Direct message decrypted', {
                recipientUserId,
                senderUserId,
                messageType: encryptedMessage.messageType
            });
            return {
                plaintext,
                senderUserId,
                deviceId,
                timestamp: new Date()
            };
        }
        catch (error) {
            logger_1.logger.error('Error decrypting direct message:', error);
            throw error instanceof errors_1.AppError ? error : new errors_1.AppError('Failed to decrypt message', 500);
        }
    }
    static async encryptGroupMessage(senderId, groupId, plaintext, deviceId = this.DEFAULT_DEVICE_ID) {
        try {
            let senderKeyData = await signal_service_1.SignalService.loadSenderKey(groupId, senderId, deviceId);
            let senderKeyDistributionMessage;
            if (!senderKeyData) {
                const senderAddress = libsignal_client_1.ProtocolAddress.new(senderId, deviceId);
                const senderKeyDistribution = libsignal_client_1.SenderKeyDistributionMessage.create(senderAddress, crypto_1.default.randomBytes(32));
                senderKeyDistributionMessage = Buffer.from(senderKeyDistribution.serialize()).toString('base64');
                senderKeyData = 'dummy_sender_key_data';
                await signal_service_1.SignalService.storeSenderKey(groupId, senderId, deviceId, senderKeyData);
            }
            const senderAddress = libsignal_client_1.ProtocolAddress.new(senderId, deviceId);
            const senderKeyStore = this.createSenderKeyStore(groupId, senderId, deviceId, senderKeyData);
            const ciphertext = await (0, libsignal_client_1.groupEncrypt)(Buffer.from(plaintext, 'utf8'), senderAddress, groupId, senderKeyStore);
            logger_1.logger.debug('Group message encrypted', { senderId, groupId, deviceId });
            return {
                ciphertext: Buffer.from(ciphertext).toString('base64'),
                senderKeyDistributionMessage,
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
            const { groupId, senderId, deviceId, ciphertext, senderKeyDistributionMessage } = encryptedMessage;
            if (senderKeyDistributionMessage) {
                await this.processSenderKeyDistributionMessage(recipientUserId, groupId, senderId, deviceId, senderKeyDistributionMessage);
            }
            const senderKeyData = await signal_service_1.SignalService.loadSenderKey(groupId, senderId, deviceId);
            if (!senderKeyData) {
                throw new errors_1.AppError('No sender key found for group message', 404);
            }
            const senderAddress = libsignal_client_1.ProtocolAddress.new(senderId, deviceId);
            const senderKeyStore = this.createSenderKeyStore(groupId, senderId, deviceId, senderKeyData);
            const plaintextBuffer = await (0, libsignal_client_1.groupDecrypt)(Buffer.from(ciphertext, 'base64'), senderAddress, groupId, senderKeyStore);
            const plaintext = plaintextBuffer.toString('utf8');
            logger_1.logger.debug('Group message decrypted', { recipientUserId, groupId, senderId });
            return {
                plaintext,
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
    static async buildSession(localUserId, remoteUserId, preKeyBundle, deviceId) {
        try {
            const remoteAddress = libsignal_client_1.ProtocolAddress.new(remoteUserId, deviceId);
            const bundle = libsignal_client_1.PreKeyBundle.new(preKeyBundle.registrationId, deviceId, preKeyBundle.preKeyId, libsignal_client_1.PublicKey.deserialize(Buffer.from(preKeyBundle.preKey, 'base64')), preKeyBundle.signedPreKeyId, libsignal_client_1.PublicKey.deserialize(Buffer.from(preKeyBundle.signedPreKey, 'base64')), Buffer.from(preKeyBundle.signedPreKeySignature, 'base64'), libsignal_client_1.PublicKey.deserialize(Buffer.from(preKeyBundle.identityKey, 'base64')));
            const stores = await this.createStores(localUserId);
            await (0, libsignal_client_1.processPreKeyBundle)(bundle, remoteAddress, stores.sessionStore, stores.identityStore);
            logger_1.logger.debug('Session built', { localUserId, remoteUserId, deviceId });
        }
        catch (error) {
            logger_1.logger.error('Error building session:', error);
            throw new errors_1.AppError('Failed to build session', 500);
        }
    }
    static async processSenderKeyDistributionMessage(recipientUserId, groupId, senderId, deviceId, senderKeyDistributionMessage) {
        try {
            const senderAddress = libsignal_client_1.ProtocolAddress.new(senderId, deviceId);
            const skdm = libsignal_client_1.SenderKeyDistributionMessage.deserialize(Buffer.from(senderKeyDistributionMessage, 'base64'));
            const senderKeyStore = this.createSenderKeyStore(groupId, senderId, deviceId, '');
            await (0, libsignal_client_1.processSenderKeyDistributionMessage)(skdm, senderAddress, senderKeyStore);
            logger_1.logger.debug('Sender key distribution message processed', {
                recipientUserId,
                groupId,
                senderId,
                deviceId
            });
        }
        catch (error) {
            logger_1.logger.error('Error processing sender key distribution message:', error);
            throw new errors_1.AppError('Failed to process sender key distribution', 500);
        }
    }
    static createInMemoryStore(userId, initialSessionData) {
        const sessions = new Map();
        if (initialSessionData) {
            sessions.set(`${userId}:session`, initialSessionData);
        }
        return {
            loadSession: async (address) => {
                const key = `${address.name()}:${address.deviceId()}:session`;
                const sessionData = sessions.get(key);
                return sessionData ? SessionRecord.deserialize(Buffer.from(sessionData, 'base64')) : null;
            },
            storeSession: async (address, record) => {
                const key = `${address.name()}:${address.deviceId()}:session`;
                sessions.set(key, Buffer.from(record.serialize()).toString('base64'));
            },
            getIdentityKey: async (address) => {
                return null;
            },
            saveIdentityKey: async (address, key) => {
                return true;
            },
            isTrustedIdentity: async (address, key) => {
                return true;
            }
        };
    }
    static createSenderKeyStore(groupId, senderId, deviceId, senderKeyData) {
        return {
            async saveSenderKey(sender, distributionId, record) {
                const newData = Buffer.from(record.serialize()).toString('base64');
                await signal_service_1.SignalService.storeSenderKey(groupId, senderId, deviceId, newData);
            },
            async loadSenderKey(sender, distributionId) {
                if (senderKeyData && senderKeyData !== 'dummy_sender_key_data') {
                    return SenderKeyRecord.deserialize(Buffer.from(senderKeyData, 'base64'));
                }
                return null;
            }
        };
    }
    static async updateSessionAfterEncryption(localUserId, remoteUserId, deviceId) {
        try {
            await signal_service_1.SignalService.storeSession(localUserId, remoteUserId, deviceId, 'updated_session_data');
        }
        catch (error) {
            logger_1.logger.error('Error updating session after encryption:', error);
        }
    }
    static async updateSessionAfterDecryption(localUserId, remoteUserId, deviceId) {
        try {
            await signal_service_1.SignalService.storeSession(localUserId, remoteUserId, deviceId, 'updated_session_data');
        }
        catch (error) {
            logger_1.logger.error('Error updating session after decryption:', error);
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
    static async createStores(userId) {
        const sessionStore = {
            async _saveSession(address, record) {
                const sessionData = Buffer.from(record.serialize()).toString('base64');
                await signal_service_1.SignalService.storeSession(userId, address.name(), address.deviceId(), sessionData);
            },
            async _getSession(address) {
                const sessionData = await signal_service_1.SignalService.loadSession(userId, address.name(), address.deviceId());
                return sessionData ? SessionRecord.deserialize(Buffer.from(sessionData, 'base64')) : null;
            },
            async saveSession(address, record) {
                return this._saveSession(address, record);
            },
            async getSession(address) {
                return this._getSession(address);
            },
            async getExistingSessions(addresses) {
                return [];
            }
        };
        const identityStore = {
            async _getIdentityKey() {
                return libsignal_client_1.PrivateKey.generate();
            },
            async _getLocalRegistrationId() {
                return 1;
            },
            async _saveIdentity(address, key) {
                return true;
            },
            async _isTrustedIdentity(address, key, direction) {
                return true;
            },
            async _getIdentity(address) {
                return null;
            },
            async getIdentityKey() {
                return this._getIdentityKey();
            },
            async getLocalRegistrationId() {
                return this._getLocalRegistrationId();
            },
            async saveIdentity(address, key) {
                return this._saveIdentity(address, key);
            },
            async isTrustedIdentity(address, key, direction) {
                return this._isTrustedIdentity(address, key, direction);
            },
            async getIdentity(address) {
                return this._getIdentity(address);
            }
        };
        const preKeyStore = {
            async _savePreKey(id, record) {
            },
            async _getPreKey(id) {
                throw new Error('PreKey not found');
            },
            async _removePreKey(id) {
            },
            async savePreKey(id, record) {
                return this._savePreKey(id, record);
            },
            async getPreKey(id) {
                return this._getPreKey(id);
            },
            async removePreKey(id) {
                return this._removePreKey(id);
            }
        };
        const signedPreKeyStore = {
            async _saveSignedPreKey(id, record) {
            },
            async _getSignedPreKey(id) {
                throw new Error('SignedPreKey not found');
            },
            async saveSignedPreKey(id, record) {
                return this._saveSignedPreKey(id, record);
            },
            async getSignedPreKey(id) {
                return this._getSignedPreKey(id);
            }
        };
        const senderKeyStore = {
            async saveSenderKey(sender, distributionId, record) {
            },
            async loadSenderKey(sender, distributionId) {
                return null;
            }
        };
        return {
            sessionStore,
            identityStore,
            preKeyStore,
            signedPreKeyStore,
            senderKeyStore
        };
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
//# sourceMappingURL=encryption.service.complex.js.map