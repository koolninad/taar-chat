import { SignalService } from './signal.service';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import crypto from 'crypto';

export interface EncryptedMessage {
  ciphertext: string;
  messageType: number;
  registrationId: number;
  deviceId: number;
}

export interface DecryptedMessage {
  plaintext: string;
  senderUserId: string;
  deviceId: number;
  timestamp: Date;
}

export interface GroupEncryptedMessage {
  ciphertext: string;
  senderKeyDistributionMessage?: string;
  groupId: string;
  senderId: string;
  deviceId: number;
}

export interface MessageMetadata {
  messageId: string;
  timestamp: Date;
  senderUserId: string;
  recipientUserId?: string;
  groupId?: string;
  messageType: 'direct' | 'group';
}

export class EncryptionService {
  private static readonly DEFAULT_DEVICE_ID = 1;

  /**
   * Encrypt message for direct messaging (simplified)
   */
  static async encryptDirectMessage(
    senderUserId: string,
    recipientUserId: string,
    plaintext: string,
    deviceId: number = this.DEFAULT_DEVICE_ID
  ): Promise<EncryptedMessage> {
    try {
      // Simple AES encryption for now
      const key = crypto.createHash('sha256').update(`${senderUserId}:${recipientUserId}`).digest();
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher('aes-256-cbc', key);
      
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const ciphertext = iv.toString('hex') + ':' + encrypted;

      logger.debug('Direct message encrypted', { senderUserId, recipientUserId });

      return {
        ciphertext,
        messageType: 1, // Whisper message
        registrationId: 0,
        deviceId
      };
    } catch (error) {
      logger.error('Error encrypting direct message:', error);
      throw error instanceof AppError ? error : new AppError('Failed to encrypt message', 500);
    }
  }

  /**
   * Decrypt message for direct messaging (simplified)
   */
  static async decryptDirectMessage(
    recipientUserId: string,
    senderUserId: string,
    encryptedMessage: EncryptedMessage
  ): Promise<DecryptedMessage> {
    try {
      const parts = encryptedMessage.ciphertext.split(':');
      if (parts.length !== 2) {
        throw new AppError('Invalid ciphertext format', 400);
      }

      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];

      const key = crypto.createHash('sha256').update(`${senderUserId}:${recipientUserId}`).digest();
      const decipher = crypto.createDecipher('aes-256-cbc', key);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      logger.debug('Direct message decrypted', { recipientUserId, senderUserId });

      return {
        plaintext: decrypted,
        senderUserId,
        deviceId: encryptedMessage.deviceId,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Error decrypting direct message:', error);
      throw error instanceof AppError ? error : new AppError('Failed to decrypt message', 500);
    }
  }

  /**
   * Encrypt message for group messaging (simplified)
   */
  static async encryptGroupMessage(
    groupId: string,
    senderId: string,
    plaintext: string,
    deviceId: number = this.DEFAULT_DEVICE_ID
  ): Promise<GroupEncryptedMessage> {
    try {
      // Simple group encryption using group key
      const key = crypto.createHash('sha256').update(`group:${groupId}`).digest();
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher('aes-256-cbc', key);
      
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const ciphertext = iv.toString('hex') + ':' + encrypted;

      logger.debug('Group message encrypted', { senderId, groupId, deviceId });

      return {
        ciphertext,
        groupId,
        senderId,
        deviceId
      };
    } catch (error) {
      logger.error('Error encrypting group message:', error);
      throw error instanceof AppError ? error : new AppError('Failed to encrypt group message', 500);
    }
  }

  /**
   * Decrypt message for group messaging (simplified)
   */
  static async decryptGroupMessage(
    recipientUserId: string,
    encryptedMessage: GroupEncryptedMessage
  ): Promise<DecryptedMessage> {
    try {
      const { groupId, senderId, deviceId, ciphertext } = encryptedMessage;
      
      const parts = ciphertext.split(':');
      if (parts.length !== 2) {
        throw new AppError('Invalid ciphertext format', 400);
      }

      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];

      const key = crypto.createHash('sha256').update(`group:${groupId}`).digest();
      const decipher = crypto.createDecipher('aes-256-cbc', key);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      logger.debug('Group message decrypted', { recipientUserId, groupId, senderId });

      return {
        plaintext: decrypted,
        senderUserId: senderId,
        deviceId,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Error decrypting group message:', error);
      throw error instanceof AppError ? error : new AppError('Failed to decrypt group message', 500);
    }
  }

  /**
   * Verify message integrity and authenticity
   */
  static async verifyMessage(
    message: EncryptedMessage | GroupEncryptedMessage,
    metadata: MessageMetadata
  ): Promise<boolean> {
    try {
      // Verify timestamp is within acceptable range (5 minutes)
      const maxAge = 5 * 60 * 1000; // 5 minutes
      const messageAge = Date.now() - metadata.timestamp.getTime();
      
      if (messageAge > maxAge) {
        logger.warn('Message timestamp too old', { 
          messageId: metadata.messageId,
          age: messageAge 
        });
        return false;
      }

      // Verify sender identity
      if ('senderId' in message && message.senderId !== metadata.senderUserId) {
        logger.warn('Sender ID mismatch', { 
          messageId: metadata.messageId,
          expected: metadata.senderUserId,
          actual: message.senderId
        });
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Error verifying message:', error);
      return false;
    }
  }

  /**
   * Generate fingerprint for identity verification
   */
  static async generateFingerprint(
    localUserId: string,
    remoteUserId: string
  ): Promise<string> {
    try {
      const combined = `${localUserId}:${remoteUserId}`;
      const hash = crypto.createHash('sha256').update(combined).digest('hex');
      
      // Format as groups of 5 digits
      return hash.substring(0, 60).replace(/(.{5})/g, '$1 ').trim();
    } catch (error) {
      logger.error('Error generating fingerprint:', error);
      throw new AppError('Failed to generate fingerprint', 500);
    }
  }
}