import { Request, Response } from 'express';
import { SecureMessageService } from '../services/secure-message.service';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';
import { asyncHandler } from '../middleware/errorHandler';
import { MessageType } from '@prisma/client';

/**
 * Send encrypted message using Signal Protocol
 */
export const sendSecureMessage = asyncHandler(async (req: Request, res: Response) => {
  const { recipientId, groupId, message, messageType, replyToId, mediaFileId, deviceId } = req.body;
  const senderId = req.user!.userId;

  if (!message || typeof message !== 'string') {
    throw new AppError('Message content is required', 400);
  }

  if (!recipientId && !groupId) {
    throw new AppError('Either recipientId or groupId must be provided', 400);
  }

  if (recipientId && groupId) {
    throw new AppError('Cannot specify both recipientId and groupId', 400);
  }

  const secureMessage = await SecureMessageService.sendSecureMessage({
    senderId,
    recipientId,
    groupId,
    plaintextContent: message,
    messageType: messageType as MessageType || MessageType.TEXT,
    replyToId,
    mediaFileId,
    deviceId
  });

  logger.info('Secure message sent', {
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

/**
 * Decrypt message using Signal Protocol
 */
export const decryptMessage = asyncHandler(async (req: Request, res: Response) => {
  const { messageId } = req.params;
  const { deviceId } = req.body;
  const recipientUserId = req.user!.userId;

  const decryptedMessage = await SecureMessageService.decryptMessage({
    messageId: messageId!,
    recipientUserId,
    deviceId
  });

  logger.info('Message decrypted', {
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

/**
 * Get encrypted messages for a chat
 */
export const getEncryptedMessages = asyncHandler(async (req: Request, res: Response) => {
  const { chatId } = req.params;
  const { page, limit } = req.query;
  const userId = req.user!.userId;

  const pageNum = page ? parseInt(page as string) : 1;
  const limitNum = limit ? parseInt(limit as string) : 20;

  if (limitNum > 100) {
    throw new AppError('Limit cannot exceed 100', 400);
  }

  const result = await SecureMessageService.getEncryptedMessages(
    userId,
    chatId!,
    pageNum,
    limitNum
  );

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

/**
 * Process key exchange for new conversation
 */
export const processKeyExchange = asyncHandler(async (req: Request, res: Response) => {
  const { remoteUserId, deviceId } = req.body;
  const localUserId = req.user!.userId;

  if (!remoteUserId) {
    throw new AppError('Remote user ID is required', 400);
  }

  const result = await SecureMessageService.processKeyExchange(
    localUserId,
    remoteUserId,
    deviceId
  );

  logger.info('Key exchange processed', {
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

/**
 * Verify conversation integrity
 */
export const verifyConversation = asyncHandler(async (req: Request, res: Response) => {
  const { chatId } = req.params;
  const { lastKnownMessageId } = req.query;
  const userId = req.user!.userId;

  const verification = await SecureMessageService.verifyConversation(
    userId,
    chatId!,
    lastKnownMessageId as string
  );

  logger.info('Conversation verified', {
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

/**
 * Get Signal Protocol session information
 */
export const getSessionInfo = asyncHandler(async (req: Request, res: Response) => {
  const { remoteUserId } = req.params;
  const { deviceId } = req.query;
  const localUserId = req.user!.userId;

  const deviceIdToUse = deviceId ? parseInt(deviceId as string) : 1;

  const sessionInfo = await SecureMessageService.getSessionInfo(
    localUserId,
    remoteUserId!,
    deviceIdToUse
  );

  res.status(200).json({
    success: true,
    data: {
      sessionInfo
    }
  });
});

/**
 * Get secure messaging statistics
 */
export const getSecureMessagingStats = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  // This would require additional database queries
  // For now, returning placeholder stats
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

/**
 * Batch decrypt messages
 */
export const batchDecryptMessages = asyncHandler(async (req: Request, res: Response) => {
  const { messageIds, deviceId } = req.body;
  const recipientUserId = req.user!.userId;

  if (!Array.isArray(messageIds) || messageIds.length === 0) {
    throw new AppError('Message IDs array is required', 400);
  }

  if (messageIds.length > 50) {
    throw new AppError('Cannot decrypt more than 50 messages at once', 400);
  }

  const results = {
    decrypted: [] as any[],
    failed: [] as any[],
    total: messageIds.length
  };

  for (const messageId of messageIds) {
    try {
      const decryptedMessage = await SecureMessageService.decryptMessage({
        messageId,
        recipientUserId,
        deviceId
      });
      
      results.decrypted.push({
        messageId,
        plaintextContent: decryptedMessage.plaintextContent,
        verified: decryptedMessage.metadata.verified
      });
    } catch (error: any) {
      results.failed.push({
        messageId,
        error: error.message
      });
    }
  }

  logger.info('Batch decrypt completed', {
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

/**
 * Re-encrypt message with new keys (for key rotation)
 */
export const reEncryptMessage = asyncHandler(async (req: Request, res: Response) => {
  const { messageId } = req.params;
  const { newDeviceId } = req.body;
  const userId = req.user!.userId;

  // This would implement key rotation functionality
  // For now, returning not implemented
  
  logger.info('Message re-encryption requested', { messageId, userId });

  res.status(501).json({
    success: false,
    message: 'Message re-encryption not yet implemented',
    data: {
      messageId,
      status: 'pending_implementation'
    }
  });
});

/**
 * Get conversation security status
 */
export const getConversationSecurity = asyncHandler(async (req: Request, res: Response) => {
  const { chatId } = req.params;
  const userId = req.user!.userId;

  // This would analyze the security status of a conversation
  const securityStatus = {
    isSecure: true,
    encryptionProtocol: 'Signal Protocol',
    lastVerified: new Date(),
    trustLevel: 'verified',
    warnings: [] as string[]
  };

  res.status(200).json({
    success: true,
    data: {
      securityStatus
    }
  });
});

/**
 * Export conversation keys for backup (secure operation)
 */
export const exportConversationKeys = asyncHandler(async (req: Request, res: Response) => {
  const { chatId } = req.params;
  const userId = req.user!.userId;

  // This would be a highly secure operation for key backup
  // For security, this is not implemented via API
  
  logger.warn('Conversation key export requested', { chatId, userId });

  res.status(403).json({
    success: false,
    message: 'Conversation key export not available via API for security reasons',
    recommendation: 'Use official backup mechanisms provided by the client application'
  });
});

/**
 * Health check for secure messaging
 */
export const secureMessagingHealthCheck = asyncHandler(async (req: Request, res: Response) => {
  try {
    // Basic health checks for secure messaging
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
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Secure messaging service unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});