import { PrismaClient } from '@prisma/client';
import { 
  IdentityKeyPair, 
  PreKeyBundle, 
  PreKeyRecord, 
  SignedPreKeyRecord,
  SessionRecord,
  SenderKeyRecord,
  PrivateKey,
  PublicKey
} from '@signalapp/libsignal-client';
import { RedisService } from './redis.service';
import { AppError, ErrorMessages } from '../utils/errors';
import { logger } from '../utils/logger';
import crypto from 'crypto';

const prisma = new PrismaClient();

export interface SignalIdentity {
  identityKey: string;
  registrationId: number;
  deviceId: number;
}

export interface PreKeyBundleResponse {
  identityKey: string;
  deviceId: number;
  preKeyId: number;
  preKey: string;
  signedPreKeyId: number;
  signedPreKey: string;
  signedPreKeySignature: string;
  registrationId: number;
}

export interface GenerateKeysRequest {
  userId: string;
  deviceId?: number;
  preKeyCount?: number;
}

export interface SessionInfo {
  userId: string;
  deviceId: number;
  sessionData: string;
  createdAt: Date;
  lastUsed: Date;
}

export class SignalService {
  private static readonly DEFAULT_DEVICE_ID = 1;
  private static readonly DEFAULT_PREKEY_COUNT = 100;
  private static readonly MAX_PREKEY_COUNT = 1000;
  private static readonly PREKEY_REFILL_THRESHOLD = 10;

  /**
   * Initialize Signal Protocol for a new user
   */
  static async initializeUser(userId: string, deviceId: number = this.DEFAULT_DEVICE_ID): Promise<SignalIdentity> {
    try {
      // Check if user already has identity
      const existingIdentity = await prisma.user.findUnique({
        where: { id: userId },
        select: { identityKey: true, registrationId: true }
      });

      if (existingIdentity?.identityKey) {
        return {
          identityKey: existingIdentity.identityKey,
          registrationId: existingIdentity.registrationId!,
          deviceId
        };
      }

      // Generate new identity (simplified)
      const registrationId = Math.floor(Math.random() * 16384);
      const dummyPublicKey = 'dummy_public_key_' + userId;
      const dummyPrivateKey = 'dummy_private_key_' + userId;

      // Store identity in database
      await prisma.user.update({
        where: { id: userId },
        data: {
          identityKey: dummyPublicKey,
          registrationId
        }
      });

      // Store private key securely (encrypted)
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

      // Generate initial prekeys
      await this.generatePreKeys(userId, deviceId);

      logger.info('Signal Protocol initialized for user', { userId, deviceId, registrationId });

      return {
        identityKey: dummyPublicKey,
        registrationId,
        deviceId
      };
    } catch (error) {
      logger.error('Error initializing Signal Protocol:', error);
      throw new AppError('Failed to initialize Signal Protocol', 500);
    }
  }

  /**
   * Generate and store prekeys for a user
   */
  static async generatePreKeys(
    userId: string, 
    deviceId: number = this.DEFAULT_DEVICE_ID,
    count: number = this.DEFAULT_PREKEY_COUNT
  ): Promise<void> {
    try {
      if (count > this.MAX_PREKEY_COUNT) {
        throw new AppError(`Cannot generate more than ${this.MAX_PREKEY_COUNT} prekeys`, 400);
      }

      // Get user's identity
      const identity = await prisma.signalIdentity.findFirst({
        where: { userId }
      });

      if (!identity) {
        throw new AppError('User identity not found', 404);
      }

      // Get last prekey ID to continue sequence
      const lastPreKey = await prisma.prekeyBundle.findFirst({
        where: { userId },
        orderBy: { keyId: 'desc' }
      });

      let startKeyId = (lastPreKey?.keyId || 0) + 1;

      // Generate new prekeys (simplified)
      const preKeyData = [];
      for (let i = 0; i < count; i++) {
        preKeyData.push({
          userId,
          keyId: startKeyId + i,
          publicKey: `dummy_prekey_${startKeyId + i}_${userId}`,
          signature: `dummy_signature_${startKeyId + i}`
        });
      }

      // Generate signed prekey (simplified)
      const signedPreKeyId = Date.now(); // Use timestamp as ID

      // Store prekeys
      await prisma.$transaction([
        // Store regular prekeys
        prisma.prekeyBundle.createMany({
          data: preKeyData
        }),
        // Store signed prekey
        prisma.signedPrekey.create({
          data: {
            userId,
            keyId: signedPreKeyId,
            publicKey: `dummy_signed_prekey_${signedPreKeyId}_${userId}`,
            signature: `dummy_signed_signature_${signedPreKeyId}`
          }
        })
      ]);

      logger.info('Prekeys generated', { userId, deviceId, count, signedPreKeyId });
    } catch (error) {
      logger.error('Error generating prekeys:', error);
      throw error instanceof AppError ? error : new AppError('Failed to generate prekeys', 500);
    }
  }

  /**
   * Get prekey bundle for a user
   */
  static async getPreKeyBundle(userId: string, deviceId: number = this.DEFAULT_DEVICE_ID): Promise<PreKeyBundleResponse> {
    try {
      // Get user's identity and signed prekey
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
        throw new AppError('User identity not found', 404);
      }

      if (!signedPreKey) {
        throw new AppError('Signed prekey not found', 404);
      }

      if (!preKey) {
        // Auto-generate more prekeys if running low
        await this.generatePreKeys(userId, deviceId, this.DEFAULT_PREKEY_COUNT);
        
        const newPreKey = await prisma.prekeyBundle.findFirst({
          where: { userId },
          orderBy: { keyId: 'asc' }
        });

        if (!newPreKey) {
          throw new AppError('No prekeys available', 404);
        }

        // Delete the used prekey
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

      // Delete the used prekey
      await prisma.prekeyBundle.delete({
        where: { id: preKey.id }
      });

      // Check if we need to refill prekeys
      const remainingKeys = await prisma.prekeyBundle.count({
        where: { userId }
      });

      if (remainingKeys < this.PREKEY_REFILL_THRESHOLD) {
        // Asynchronously generate more prekeys
        this.generatePreKeys(userId, deviceId, this.DEFAULT_PREKEY_COUNT).catch(error => {
          logger.error('Error auto-generating prekeys:', error);
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
    } catch (error) {
      logger.error('Error getting prekey bundle:', error);
      throw error instanceof AppError ? error : new AppError('Failed to get prekey bundle', 500);
    }
  }

  /**
   * Store session record
   */
  static async storeSession(
    localUserId: string,
    remoteUserId: string,
    deviceId: number,
    sessionData: string
  ): Promise<void> {
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

      // Cache session for quick access
      await RedisService.setCache(
        `session:${localUserId}:${remoteUserId}:${deviceId}`,
        sessionData,
        3600 // 1 hour
      );

      logger.debug('Session stored', { localUserId, remoteUserId, deviceId });
    } catch (error) {
      logger.error('Error storing session:', error);
      throw new AppError('Failed to store session', 500);
    }
  }

  /**
   * Load session record
   */
  static async loadSession(
    localUserId: string,
    remoteUserId: string,
    deviceId: number
  ): Promise<string | null> {
    try {
      // Try cache first
      const cached = await RedisService.getCache(`session:${localUserId}:${remoteUserId}:${deviceId}`);
      if (cached) {
        return cached as string;
      }

      // Load from database
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
        // Cache for future use
        await RedisService.setCache(
          `session:${localUserId}:${remoteUserId}:${deviceId}`,
          session.sessionData,
          3600
        );

        return session.sessionData;
      }

      return null;
    } catch (error) {
      logger.error('Error loading session:', error);
      throw new AppError('Failed to load session', 500);
    }
  }

  /**
   * Store sender key for group messaging
   */
  static async storeSenderKey(
    groupId: string,
    senderId: string,
    deviceId: number,
    senderKeyData: string
  ): Promise<void> {
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

      logger.debug('Sender key stored', { groupId, senderId, deviceId });
    } catch (error) {
      logger.error('Error storing sender key:', error);
      throw new AppError('Failed to store sender key', 500);
    }
  }

  /**
   * Load sender key for group messaging
   */
  static async loadSenderKey(
    groupId: string,
    senderId: string,
    deviceId: number
  ): Promise<string | null> {
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
    } catch (error) {
      logger.error('Error loading sender key:', error);
      throw new AppError('Failed to load sender key', 500);
    }
  }

  /**
   * Delete session
   */
  static async deleteSession(
    localUserId: string,
    remoteUserId: string,
    deviceId: number
  ): Promise<void> {
    try {
      await Promise.all([
        prisma.signalSession.deleteMany({
          where: {
            localUserId,
            remoteUserId,
            deviceId
          }
        }),
        RedisService.deleteCache(`session:${localUserId}:${remoteUserId}:${deviceId}`)
      ]);

      logger.info('Session deleted', { localUserId, remoteUserId, deviceId });
    } catch (error) {
      logger.error('Error deleting session:', error);
      throw new AppError('Failed to delete session', 500);
    }
  }

  /**
   * Get all sessions for a user
   */
  static async getUserSessions(userId: string): Promise<SessionInfo[]> {
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
    } catch (error) {
      logger.error('Error getting user sessions:', error);
      throw new AppError('Failed to get sessions', 500);
    }
  }

  /**
   * Rotate signed prekey
   */
  static async rotateSignedPreKey(userId: string, deviceId: number = this.DEFAULT_DEVICE_ID): Promise<void> {
    try {
      const identity = await prisma.signalIdentity.findFirst({
        where: { userId }
      });

      if (!identity) {
        throw new AppError('User identity not found', 404);
      }

      // Generate new signed prekey (simplified)
      const signedPreKeyId = Date.now();

      // Store new signed prekey
      await prisma.signedPrekey.create({
        data: {
          userId,
          keyId: signedPreKeyId,
          publicKey: `dummy_rotated_signed_prekey_${signedPreKeyId}_${userId}`,
          signature: `dummy_rotated_signature_${signedPreKeyId}`
        }
      });

      // Delete old signed prekeys (keep last 3 for safety)
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

      logger.info('Signed prekey rotated', { userId, deviceId, newKeyId: signedPreKeyId });
    } catch (error) {
      logger.error('Error rotating signed prekey:', error);
      throw new AppError('Failed to rotate signed prekey', 500);
    }
  }

  /**
   * Clean up old sessions and keys
   */
  static async cleanupOldData(): Promise<void> {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      // Delete old sessions
      const deletedSessions = await prisma.signalSession.deleteMany({
        where: {
          lastUsed: {
            lt: thirtyDaysAgo
          }
        }
      });

      // Delete old signed prekeys (keep recent ones)
      const deletedSignedPreKeys = await prisma.signedPrekey.deleteMany({
        where: {
          createdAt: {
            lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days
          }
        }
      });

      logger.info('Signal Protocol cleanup completed', {
        deletedSessions: deletedSessions.count,
        deletedSignedPreKeys: deletedSignedPreKeys.count
      });
    } catch (error) {
      logger.error('Error during Signal Protocol cleanup:', error);
    }
  }

  // Helper methods
  private static encryptPrivateKey(privateKey: string, userId: string): string {
    // Use user ID as part of the encryption key (in production, use proper key derivation)
    const key = crypto.scryptSync(userId, 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-cbc', key);
    
    let encrypted = cipher.update(privateKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  }

  private static decryptPrivateKey(encryptedPrivateKey: string, userId: string): string {
    if (!encryptedPrivateKey) {
      throw new Error('Encrypted private key is required');
    }
    
    const parts = encryptedPrivateKey.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted key format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    
    const key = crypto.scryptSync(userId, 'salt', 32);
    const decipher = crypto.createDecipher('aes-256-cbc', key);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}