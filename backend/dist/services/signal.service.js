"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SignalService = void 0;
const client_1 = require("@prisma/client");
const redis_service_1 = require("./redis.service");
const errors_1 = require("../utils/errors");
const logger_1 = require("../utils/logger");
const crypto_1 = __importDefault(require("crypto"));
const prisma = new client_1.PrismaClient();
class SignalService {
    static async initializeUser(userId, deviceId = this.DEFAULT_DEVICE_ID) {
        try {
            const existingIdentity = await prisma.user.findUnique({
                where: { id: userId },
                select: { identityKey: true, registrationId: true }
            });
            if (existingIdentity?.identityKey) {
                return {
                    identityKey: existingIdentity.identityKey,
                    registrationId: existingIdentity.registrationId,
                    deviceId
                };
            }
            const registrationId = Math.floor(Math.random() * 16384);
            const dummyPublicKey = 'dummy_public_key_' + userId;
            const dummyPrivateKey = 'dummy_private_key_' + userId;
            await prisma.user.update({
                where: { id: userId },
                data: {
                    identityKey: dummyPublicKey,
                    registrationId
                }
            });
            const encryptedPrivateKey = this.encryptPrivateKey(dummyPrivateKey, userId);
            await prisma.signalIdentity.create({
                data: {
                    userId,
                    deviceId,
                    identityPublicKey: dummyPublicKey,
                    identityPrivateKey: encryptedPrivateKey,
                    registrationId
                }
            });
            await this.generatePreKeys(userId, deviceId);
            logger_1.logger.info('Signal Protocol initialized for user', { userId, deviceId, registrationId });
            return {
                identityKey: dummyPublicKey,
                registrationId,
                deviceId
            };
        }
        catch (error) {
            logger_1.logger.error('Error initializing Signal Protocol:', error);
            throw new errors_1.AppError('Failed to initialize Signal Protocol', 500);
        }
    }
    static async generatePreKeys(userId, deviceId = this.DEFAULT_DEVICE_ID, count = this.DEFAULT_PREKEY_COUNT) {
        try {
            if (count > this.MAX_PREKEY_COUNT) {
                throw new errors_1.AppError(`Cannot generate more than ${this.MAX_PREKEY_COUNT} prekeys`, 400);
            }
            const identity = await prisma.signalIdentity.findFirst({
                where: { userId }
            });
            if (!identity) {
                throw new errors_1.AppError('User identity not found', 404);
            }
            const lastPreKey = await prisma.prekeyBundle.findFirst({
                where: { userId },
                orderBy: { keyId: 'desc' }
            });
            let startKeyId = (lastPreKey?.keyId || 0) + 1;
            const preKeyData = [];
            for (let i = 0; i < count; i++) {
                preKeyData.push({
                    userId,
                    keyId: startKeyId + i,
                    publicKey: `dummy_prekey_${startKeyId + i}_${userId}`,
                    signature: `dummy_signature_${startKeyId + i}`
                });
            }
            const signedPreKeyId = Date.now();
            await prisma.$transaction([
                prisma.prekeyBundle.createMany({
                    data: preKeyData
                }),
                prisma.signedPrekey.create({
                    data: {
                        userId,
                        keyId: signedPreKeyId,
                        publicKey: `dummy_signed_prekey_${signedPreKeyId}_${userId}`,
                        signature: `dummy_signed_signature_${signedPreKeyId}`
                    }
                })
            ]);
            logger_1.logger.info('Prekeys generated', { userId, deviceId, count, signedPreKeyId });
        }
        catch (error) {
            logger_1.logger.error('Error generating prekeys:', error);
            throw error instanceof errors_1.AppError ? error : new errors_1.AppError('Failed to generate prekeys', 500);
        }
    }
    static async getPreKeyBundle(userId, deviceId = this.DEFAULT_DEVICE_ID) {
        try {
            const [identity, signedPreKey, preKey] = await Promise.all([
                prisma.signalIdentity.findUnique({
                    where: {
                        userId_deviceId: {
                            userId,
                            deviceId
                        }
                    }
                }),
                prisma.signedPrekey.findFirst({
                    where: { userId },
                    orderBy: { createdAt: 'desc' }
                }),
                prisma.prekeyBundle.findFirst({
                    where: { userId },
                    orderBy: { keyId: 'asc' }
                })
            ]);
            if (!identity) {
                throw new errors_1.AppError('User identity not found', 404);
            }
            if (!signedPreKey) {
                throw new errors_1.AppError('Signed prekey not found', 404);
            }
            if (!preKey) {
                await this.generatePreKeys(userId, deviceId, this.DEFAULT_PREKEY_COUNT);
                const newPreKey = await prisma.prekeyBundle.findFirst({
                    where: { userId },
                    orderBy: { keyId: 'asc' }
                });
                if (!newPreKey) {
                    throw new errors_1.AppError('No prekeys available', 404);
                }
                await prisma.prekeyBundle.delete({
                    where: { id: newPreKey.id }
                });
                return {
                    identityKey: identity.identityPublicKey,
                    deviceId,
                    preKeyId: newPreKey.keyId,
                    preKey: newPreKey.publicKey,
                    signedPreKeyId: signedPreKey.keyId,
                    signedPreKey: signedPreKey.publicKey,
                    signedPreKeySignature: signedPreKey.signature,
                    registrationId: identity.registrationId
                };
            }
            await prisma.prekeyBundle.delete({
                where: { id: preKey.id }
            });
            const remainingKeys = await prisma.prekeyBundle.count({
                where: { userId }
            });
            if (remainingKeys < this.PREKEY_REFILL_THRESHOLD) {
                this.generatePreKeys(userId, deviceId, this.DEFAULT_PREKEY_COUNT).catch(error => {
                    logger_1.logger.error('Error auto-generating prekeys:', error);
                });
            }
            return {
                identityKey: identity.identityPublicKey,
                deviceId,
                preKeyId: preKey.keyId,
                preKey: preKey.publicKey,
                signedPreKeyId: signedPreKey.keyId,
                signedPreKey: signedPreKey.publicKey,
                signedPreKeySignature: signedPreKey.signature,
                registrationId: identity.registrationId
            };
        }
        catch (error) {
            logger_1.logger.error('Error getting prekey bundle:', error);
            throw error instanceof errors_1.AppError ? error : new errors_1.AppError('Failed to get prekey bundle', 500);
        }
    }
    static async storeSession(localUserId, remoteUserId, deviceId, sessionData) {
        try {
            await prisma.signalSession.upsert({
                where: {
                    localUserId_remoteUserId_deviceId: {
                        localUserId,
                        remoteUserId,
                        deviceId
                    }
                },
                update: {
                    sessionData,
                    lastUsed: new Date()
                },
                create: {
                    localUserId,
                    remoteUserId,
                    deviceId,
                    sessionData,
                    lastUsed: new Date()
                }
            });
            await redis_service_1.RedisService.setCache(`session:${localUserId}:${remoteUserId}:${deviceId}`, sessionData, 3600);
            logger_1.logger.debug('Session stored', { localUserId, remoteUserId, deviceId });
        }
        catch (error) {
            logger_1.logger.error('Error storing session:', error);
            throw new errors_1.AppError('Failed to store session', 500);
        }
    }
    static async loadSession(localUserId, remoteUserId, deviceId) {
        try {
            const cached = await redis_service_1.RedisService.getCache(`session:${localUserId}:${remoteUserId}:${deviceId}`);
            if (cached) {
                return cached;
            }
            const session = await prisma.signalSession.findUnique({
                where: {
                    localUserId_remoteUserId_deviceId: {
                        localUserId,
                        remoteUserId,
                        deviceId
                    }
                }
            });
            if (session) {
                await redis_service_1.RedisService.setCache(`session:${localUserId}:${remoteUserId}:${deviceId}`, session.sessionData, 3600);
                return session.sessionData;
            }
            return null;
        }
        catch (error) {
            logger_1.logger.error('Error loading session:', error);
            throw new errors_1.AppError('Failed to load session', 500);
        }
    }
    static async storeSenderKey(groupId, senderId, deviceId, senderKeyData) {
        try {
            await prisma.senderKey.upsert({
                where: {
                    groupId_senderId_deviceId: {
                        groupId,
                        senderId,
                        deviceId
                    }
                },
                update: {
                    keyData: senderKeyData,
                    updatedAt: new Date()
                },
                create: {
                    groupId,
                    senderId,
                    deviceId,
                    keyData: senderKeyData
                }
            });
            logger_1.logger.debug('Sender key stored', { groupId, senderId, deviceId });
        }
        catch (error) {
            logger_1.logger.error('Error storing sender key:', error);
            throw new errors_1.AppError('Failed to store sender key', 500);
        }
    }
    static async loadSenderKey(groupId, senderId, deviceId) {
        try {
            const senderKey = await prisma.senderKey.findUnique({
                where: {
                    groupId_senderId_deviceId: {
                        groupId,
                        senderId,
                        deviceId
                    }
                }
            });
            return senderKey?.keyData || null;
        }
        catch (error) {
            logger_1.logger.error('Error loading sender key:', error);
            throw new errors_1.AppError('Failed to load sender key', 500);
        }
    }
    static async deleteSession(localUserId, remoteUserId, deviceId) {
        try {
            await Promise.all([
                prisma.signalSession.deleteMany({
                    where: {
                        localUserId,
                        remoteUserId,
                        deviceId
                    }
                }),
                redis_service_1.RedisService.deleteCache(`session:${localUserId}:${remoteUserId}:${deviceId}`)
            ]);
            logger_1.logger.info('Session deleted', { localUserId, remoteUserId, deviceId });
        }
        catch (error) {
            logger_1.logger.error('Error deleting session:', error);
            throw new errors_1.AppError('Failed to delete session', 500);
        }
    }
    static async getUserSessions(userId) {
        try {
            const sessions = await prisma.signalSession.findMany({
                where: { localUserId: userId },
                orderBy: { lastUsed: 'desc' }
            });
            return sessions.map(session => ({
                userId: session.remoteUserId,
                deviceId: session.deviceId,
                sessionData: session.sessionData,
                createdAt: session.createdAt,
                lastUsed: session.lastUsed
            }));
        }
        catch (error) {
            logger_1.logger.error('Error getting user sessions:', error);
            throw new errors_1.AppError('Failed to get sessions', 500);
        }
    }
    static async rotateSignedPreKey(userId, deviceId = this.DEFAULT_DEVICE_ID) {
        try {
            const identity = await prisma.signalIdentity.findFirst({
                where: { userId }
            });
            if (!identity) {
                throw new errors_1.AppError('User identity not found', 404);
            }
            const signedPreKeyId = Date.now();
            await prisma.signedPrekey.create({
                data: {
                    userId,
                    keyId: signedPreKeyId,
                    publicKey: `dummy_rotated_signed_prekey_${signedPreKeyId}_${userId}`,
                    signature: `dummy_rotated_signature_${signedPreKeyId}`
                }
            });
            const oldSignedPreKeys = await prisma.signedPrekey.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                skip: 3
            });
            if (oldSignedPreKeys.length > 0) {
                await prisma.signedPrekey.deleteMany({
                    where: {
                        id: {
                            in: oldSignedPreKeys.map(key => key.id)
                        }
                    }
                });
            }
            logger_1.logger.info('Signed prekey rotated', { userId, deviceId, newKeyId: signedPreKeyId });
        }
        catch (error) {
            logger_1.logger.error('Error rotating signed prekey:', error);
            throw new errors_1.AppError('Failed to rotate signed prekey', 500);
        }
    }
    static async cleanupOldData() {
        try {
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const deletedSessions = await prisma.signalSession.deleteMany({
                where: {
                    lastUsed: {
                        lt: thirtyDaysAgo
                    }
                }
            });
            const deletedSignedPreKeys = await prisma.signedPrekey.deleteMany({
                where: {
                    createdAt: {
                        lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                    }
                }
            });
            logger_1.logger.info('Signal Protocol cleanup completed', {
                deletedSessions: deletedSessions.count,
                deletedSignedPreKeys: deletedSignedPreKeys.count
            });
        }
        catch (error) {
            logger_1.logger.error('Error during Signal Protocol cleanup:', error);
        }
    }
    static encryptPrivateKey(privateKey, userId) {
        const key = crypto_1.default.scryptSync(userId, 'salt', 32);
        const iv = crypto_1.default.randomBytes(16);
        const cipher = crypto_1.default.createCipher('aes-256-cbc', key);
        let encrypted = cipher.update(privateKey, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return iv.toString('hex') + ':' + encrypted;
    }
    static decryptPrivateKey(encryptedPrivateKey, userId) {
        if (!encryptedPrivateKey) {
            throw new Error('Encrypted private key is required');
        }
        const parts = encryptedPrivateKey.split(':');
        if (parts.length !== 2) {
            throw new Error('Invalid encrypted key format');
        }
        const iv = Buffer.from(parts[0], 'hex');
        const encrypted = parts[1];
        const key = crypto_1.default.scryptSync(userId, 'salt', 32);
        const decipher = crypto_1.default.createDecipher('aes-256-cbc', key);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
}
exports.SignalService = SignalService;
SignalService.DEFAULT_DEVICE_ID = 1;
SignalService.DEFAULT_PREKEY_COUNT = 100;
SignalService.MAX_PREKEY_COUNT = 1000;
SignalService.PREKEY_REFILL_THRESHOLD = 10;
//# sourceMappingURL=signal.service.js.map