import { PrismaClient, MessageType, MessageStatus } from '@prisma/client';
import { MessageService, SendMessageRequest } from './message.service';
import { EncryptionService } from './encryption.service';
import { SignalService } from './signal.service';
import { RedisService } from './redis.service';
import { AppError, ErrorMessages } from '../utils/errors';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export interface SecureMessageRequest {
  senderId: string;
  recipientId?: string;
  groupId?: string;
  plaintextContent: string;
  messageType: MessageType;
  replyToId?: string;
  mediaFileId?: string;
  deviceId?: number;
}

export interface SecureMessageResponse {
  id: string;
  senderId: string;
  recipientId?: string;
  groupId?: string;
  encryptedContent: string;
  messageType: MessageType;
  status: MessageStatus;
  sentAt: Date;
  signalMetadata: {
    cipherType: number;
    deviceId: number;
    senderKeyDistribution?: string;
  };
}

export interface DecryptMessageRequest {
  messageId: string;
  recipientUserId: string;
  deviceId?: number;
}

export interface DecryptedMessageResponse {
  messageId: string;
  senderId: string;
  plaintextContent: string;
  messageType: MessageType;
  sentAt: Date;
  isGroupMessage: boolean;
  metadata: {
    verified: boolean;
    deviceId: number;
    timestamp: Date;
  };
}

export class SecureMessageService {
  private static readonly DEFAULT_DEVICE_ID = 1;

  /**
   * Send encrypted message using Signal Protocol
   */
  static async sendSecureMessage(messageData: SecureMessageRequest): Promise<SecureMessageResponse> {
    try {
      const deviceId = messageData.deviceId || this.DEFAULT_DEVICE_ID;

      // Validate that user has Signal Protocol initialized
      await this.ensureSignalInitialized(messageData.senderId, deviceId);

      let encryptedData: any;
      let signalMetadata: any;

      if (messageData.recipientId) {
        // Direct message encryption
        await this.ensureSignalInitialized(messageData.recipientId, deviceId);
        
        encryptedData = await EncryptionService.encryptDirectMessage(
          messageData.senderId,
          messageData.recipientId,
          messageData.plaintextContent,
          deviceId
        );

        signalMetadata = {
          cipherType: encryptedData.messageType,
          deviceId: encryptedData.deviceId
        };
      } else if (messageData.groupId) {
        // Group message encryption
        await this.validateGroupMembership(messageData.senderId, messageData.groupId);
        
        encryptedData = await EncryptionService.encryptGroupMessage(
          messageData.senderId,
          messageData.groupId,
          messageData.plaintextContent,
          deviceId
        );

        signalMetadata = {
          cipherType: 0, // Group messages don't have prekey types
          deviceId: encryptedData.deviceId,
          senderKeyDistribution: encryptedData.senderKeyDistributionMessage
        };
      } else {
        throw new AppError('Either recipientId or groupId must be provided', 400);
      }

      // Store encrypted message
      const secureMessageRequest: SendMessageRequest = {
        senderId: messageData.senderId,
        recipientId: messageData.recipientId,
        groupId: messageData.groupId,
        encryptedContent: encryptedData.ciphertext,
        messageType: messageData.messageType,
        replyToId: messageData.replyToId,
        mediaFileId: messageData.mediaFileId
      };

      const message = await MessageService.sendMessage(secureMessageRequest);

      // Store Signal Protocol metadata
      await this.storeSignalMetadata(message.id, signalMetadata);

      // Cache message verification data
      await this.cacheMessageMetadata(message.id, {
        messageId: message.id,
        timestamp: message.sentAt,
        senderUserId: messageData.senderId,
        recipientUserId: messageData.recipientId,
        groupId: messageData.groupId,
        messageType: messageData.recipientId ? 'direct' : 'group'
      });

      logger.info('Secure message sent', {
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
    } catch (error) {
      logger.error('Error sending secure message:', error);
      throw error instanceof AppError ? error : new AppError('Failed to send secure message', 500);
    }
  }

  /**
   * Decrypt received message using Signal Protocol
   */
  static async decryptMessage(decryptRequest: DecryptMessageRequest): Promise<DecryptedMessageResponse> {
    try {
      const deviceId = decryptRequest.deviceId || this.DEFAULT_DEVICE_ID;

      // Get message from database
      const message = await prisma.message.findUnique({
        where: { id: decryptRequest.messageId },
        include: {
          signalMetadata: true
        }
      });

      if (!message) {
        throw new AppError('Message not found', 404);
      }

      // Verify recipient has access to this message
      const hasAccess = message.recipientId === decryptRequest.recipientUserId || 
        (message.groupId && await this.validateGroupMembership(decryptRequest.recipientUserId, message.groupId));

      if (!hasAccess) {
        throw new AppError('Access denied to this message', 403);
      }

      // Get Signal Protocol metadata
      const signalMetadata = await this.getSignalMetadata(message.id);
      if (!signalMetadata) {
        throw new AppError('Signal metadata not found', 404);
      }

      let decryptedData: any;

      if (message.recipientId) {
        // Direct message decryption
        const encryptedMessage = {
          ciphertext: message.encryptedContent.toString('base64'),
          messageType: signalMetadata.cipherType,
          deviceId: signalMetadata.deviceId,
          registrationId: 0 // Not used in current implementation
        };

        decryptedData = await EncryptionService.decryptDirectMessage(
          decryptRequest.recipientUserId,
          message.senderId,
          encryptedMessage
        );
      } else if (message.groupId) {
        // Group message decryption
        const encryptedMessage = {
          ciphertext: message.encryptedContent.toString('base64'),
          senderKeyDistributionMessage: signalMetadata.senderKeyDistribution,
          groupId: message.groupId,
          senderId: message.senderId,
          deviceId: signalMetadata.deviceId
        };

        decryptedData = await EncryptionService.decryptGroupMessage(
          decryptRequest.recipientUserId,
          encryptedMessage
        );
      } else {
        throw new AppError('Invalid message type', 400);
      }

      // Verify message integrity
      const messageMetadata = await this.getMessageMetadata(message.id);
      const isVerified = messageMetadata && await EncryptionService.verifyMessage(
        { ciphertext: message.encryptedContent.toString('base64'), messageType: signalMetadata.cipherType },
        messageMetadata
      );

      logger.info('Message decrypted', {
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
    } catch (error) {
      logger.error('Error decrypting message:', error);
      throw error instanceof AppError ? error : new AppError('Failed to decrypt message', 500);
    }
  }

  /**
   * Get encrypted messages for a chat (returns encrypted content)
   */
  static async getEncryptedMessages(
    userId: string,
    chatId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ messages: SecureMessageResponse[]; hasMore: boolean; total: number }> {
    try {
      const result = await MessageService.getMessages(userId, chatId, page, limit);

      const secureMessages: SecureMessageResponse[] = [];

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
    } catch (error) {
      logger.error('Error getting encrypted messages:', error);
      throw error instanceof AppError ? error : new AppError('Failed to get encrypted messages', 500);
    }
  }

  /**
   * Process key exchange for new conversations
   */
  static async processKeyExchange(
    localUserId: string,
    remoteUserId: string,
    deviceId: number = this.DEFAULT_DEVICE_ID
  ): Promise<{ success: boolean; sessionEstablished: boolean }> {
    try {
      // Check if session already exists
      const existingSession = await SignalService.loadSession(localUserId, remoteUserId, deviceId);
      
      if (existingSession) {
        return { success: true, sessionEstablished: true };
      }

      // Get remote user's prekey bundle
      const preKeyBundle = await SignalService.getPreKeyBundle(remoteUserId, deviceId);
      
      // Build session using prekey bundle
      // This is handled internally by the encryption service when sending first message
      
      logger.info('Key exchange processed', { localUserId, remoteUserId, deviceId });
      
      return { success: true, sessionEstablished: false };
    } catch (error) {
      logger.error('Error processing key exchange:', error);
      throw error instanceof AppError ? error : new AppError('Failed to process key exchange', 500);
    }
  }

  /**
   * Verify conversation integrity
   */
  static async verifyConversation(
    userId: string,
    chatId: string,
    lastKnownMessageId?: string
  ): Promise<{ verified: boolean; integrityIssues: string[] }> {
    try {
      const issues: string[] = [];

      // Get recent messages
      const result = await MessageService.getMessages(userId, chatId, 1, 50);

      let lastTimestamp = 0;
      let messageCount = 0;

      for (const message of result.messages) {
        messageCount++;

        // Check timestamp ordering
        if (message.sentAt.getTime() < lastTimestamp) {
          issues.push(`Message ${message.id} has out-of-order timestamp`);
        }
        lastTimestamp = message.sentAt.getTime();

        // Verify message has Signal metadata
        const signalMetadata = await this.getSignalMetadata(message.id);
        if (!signalMetadata) {
          issues.push(`Message ${message.id} missing Signal metadata`);
        }

        // Check for gaps in message sequence
        if (lastKnownMessageId && message.id === lastKnownMessageId) {
          break;
        }
      }

      const verified = issues.length === 0;

      logger.info('Conversation verification completed', {
        userId,
        chatId,
        verified,
        issueCount: issues.length,
        messagesChecked: messageCount
      });

      return { verified, integrityIssues: issues };
    } catch (error) {
      logger.error('Error verifying conversation:', error);
      throw error instanceof AppError ? error : new AppError('Failed to verify conversation', 500);
    }
  }

  /**
   * Get Signal Protocol session info for debugging
   */
  static async getSessionInfo(
    localUserId: string,
    remoteUserId: string,
    deviceId: number = this.DEFAULT_DEVICE_ID
  ): Promise<{ hasSession: boolean; lastUsed?: Date; sessionData?: any }> {
    try {
      const sessionData = await SignalService.loadSession(localUserId, remoteUserId, deviceId);
      
      if (!sessionData) {
        return { hasSession: false };
      }

      // Get session metadata from database
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
    } catch (error) {
      logger.error('Error getting session info:', error);
      throw error instanceof AppError ? error : new AppError('Failed to get session info', 500);
    }
  }

  // Helper methods
  private static async ensureSignalInitialized(userId: string, deviceId: number): Promise<void> {
    const identity = await prisma.signalIdentity.findUnique({
      where: {
        userId_deviceId: {
          userId,
          deviceId
        }
      }
    });

    if (!identity) {
      throw new AppError(`Signal Protocol not initialized for user ${userId}`, 400);
    }
  }

  private static async validateGroupMembership(userId: string, groupId: string): Promise<void> {
    const membership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId
        }
      }
    });

    if (!membership) {
      throw new AppError('User is not a member of this group', 403);
    }
  }

  private static async storeSignalMetadata(messageId: string, metadata: any): Promise<void> {
    await prisma.signalMessageMetadata.create({
      data: {
        messageId,
        cipherType: metadata.cipherType,
        deviceId: metadata.deviceId,
        senderKeyDistribution: metadata.senderKeyDistribution
      }
    });
  }

  private static async getSignalMetadata(messageId: string): Promise<any> {
    const metadata = await prisma.signalMessageMetadata.findUnique({
      where: { messageId }
    });

    if (!metadata) return null;

    return {
      cipherType: metadata.cipherType,
      deviceId: metadata.deviceId,
      senderKeyDistribution: metadata.senderKeyDistribution
    };
  }

  private static async cacheMessageMetadata(messageId: string, metadata: any): Promise<void> {
    await RedisService.setCache(
      `message_metadata:${messageId}`,
      metadata,
      3600 // 1 hour
    );
  }

  private static async getMessageMetadata(messageId: string): Promise<any> {
    return await RedisService.getCache(`message_metadata:${messageId}`);
  }
}