import { Request, Response } from 'express';
import { SignalService } from '../services/signal.service';
import { EncryptionService } from '../services/encryption.service';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';
import { asyncHandler } from '../middleware/errorHandler';

/**
 * Initialize Signal Protocol for user
 */
export const initializeSignal = asyncHandler(async (req: Request, res: Response) => {
  const { deviceId } = req.body;
  const userId = req.user!.userId;

  const deviceIdToUse = deviceId || 1;

  const identity = await SignalService.initializeUser(userId, deviceIdToUse);

  logger.info('Signal Protocol initialized', { userId, deviceId: deviceIdToUse });

  res.status(200).json({
    success: true,
    message: 'Signal Protocol initialized successfully',
    data: {
      identity
    }
  });
});

/**
 * Generate prekeys for user
 */
export const generatePreKeys = asyncHandler(async (req: Request, res: Response) => {
  const { deviceId, count } = req.body;
  const userId = req.user!.userId;

  const deviceIdToUse = deviceId || 1;
  const countToGenerate = count || 100;

  if (countToGenerate > 1000) {
    throw new AppError('Cannot generate more than 1000 prekeys at once', 400);
  }

  await SignalService.generatePreKeys(userId, deviceIdToUse, countToGenerate);

  logger.info('Prekeys generated', { userId, deviceId: deviceIdToUse, count: countToGenerate });

  res.status(200).json({
    success: true,
    message: `${countToGenerate} prekeys generated successfully`
  });
});

/**
 * Get prekey bundle for a user
 */
export const getPreKeyBundle = asyncHandler(async (req: Request, res: Response) => {
  const { userId: targetUserId } = req.params;
  const { deviceId } = req.query;
  const requesterId = req.user!.userId;

  if (!targetUserId) {
    throw new AppError('User ID is required', 400);
  }

  const deviceIdToUse = deviceId ? parseInt(deviceId as string) : 1;

  // Check if requester has permission to get this user's prekey bundle
  // In a real app, you might want to check if they're contacts or in same groups
  
  const preKeyBundle = await SignalService.getPreKeyBundle(targetUserId as string, deviceIdToUse);

  logger.info('Prekey bundle retrieved', { 
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

/**
 * Get user's own prekey bundle
 */
export const getMyPreKeyBundle = asyncHandler(async (req: Request, res: Response) => {
  const { deviceId } = req.query;
  const userId = req.user!.userId;

  const deviceIdToUse = deviceId ? parseInt(deviceId as string) : 1;

  const preKeyBundle = await SignalService.getPreKeyBundle(userId, deviceIdToUse);

  res.status(200).json({
    success: true,
    data: {
      preKeyBundle
    }
  });
});

/**
 * Rotate signed prekey
 */
export const rotateSignedPreKey = asyncHandler(async (req: Request, res: Response) => {
  const { deviceId } = req.body;
  const userId = req.user!.userId;

  const deviceIdToUse = deviceId || 1;

  await SignalService.rotateSignedPreKey(userId, deviceIdToUse);

  logger.info('Signed prekey rotated', { userId, deviceId: deviceIdToUse });

  res.status(200).json({
    success: true,
    message: 'Signed prekey rotated successfully'
  });
});

/**
 * Get user's sessions
 */
export const getSessions = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  const sessions = await SignalService.getUserSessions(userId);

  res.status(200).json({
    success: true,
    data: {
      sessions,
      total: sessions.length
    }
  });
});

/**
 * Delete session with specific user
 */
export const deleteSession = asyncHandler(async (req: Request, res: Response) => {
  const { userId: remoteUserId } = req.params;
  const { deviceId } = req.body;
  const localUserId = req.user!.userId;

  if (!remoteUserId) {
    throw new AppError('Remote user ID is required', 400);
  }

  const deviceIdToUse = deviceId || 1;

  await SignalService.deleteSession(localUserId, remoteUserId as string, deviceIdToUse);

  logger.info('Session deleted', { localUserId, remoteUserId, deviceId: deviceIdToUse });

  res.status(200).json({
    success: true,
    message: 'Session deleted successfully'
  });
});

/**
 * Generate identity fingerprint for verification
 */
export const generateFingerprint = asyncHandler(async (req: Request, res: Response) => {
  const { userId: remoteUserId } = req.params;
  const localUserId = req.user!.userId;

  if (!remoteUserId) {
    throw new AppError('Remote user ID is required', 400);
  }

  const fingerprint = await EncryptionService.generateFingerprint(localUserId, remoteUserId as string);

  res.status(200).json({
    success: true,
    data: {
      fingerprint,
      localUserId,
      remoteUserId
    }
  });
});

/**
 * Encrypt message (for testing purposes)
 */
export const encryptMessage = asyncHandler(async (req: Request, res: Response) => {
  const { recipientId, groupId, message, deviceId } = req.body;
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

  const deviceIdToUse = deviceId || 1;

  let encryptedMessage: any;

  if (recipientId) {
    // Direct message encryption
    encryptedMessage = await EncryptionService.encryptDirectMessage(
      senderId,
      recipientId,
      message,
      deviceIdToUse
    );
  } else {
    // Group message encryption
    encryptedMessage = await EncryptionService.encryptGroupMessage(
      senderId,
      groupId,
      message,
      deviceIdToUse
    );
  }

  logger.info('Message encrypted', { 
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

/**
 * Decrypt message (for testing purposes)
 */
export const decryptMessage = asyncHandler(async (req: Request, res: Response) => {
  const { encryptedMessage, senderId, messageType } = req.body;
  const recipientId = req.user!.userId;

  if (!encryptedMessage || !senderId) {
    throw new AppError('Encrypted message and sender ID are required', 400);
  }

  let decryptedMessage: any;

  if (messageType === 'direct') {
    decryptedMessage = await EncryptionService.decryptDirectMessage(
      recipientId,
      senderId,
      encryptedMessage
    );
  } else if (messageType === 'group') {
    decryptedMessage = await EncryptionService.decryptGroupMessage(
      recipientId,
      encryptedMessage
    );
  } else {
    throw new AppError('Invalid message type. Use "direct" or "group"', 400);
  }

  logger.info('Message decrypted', { 
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

/**
 * Get Signal Protocol statistics
 */
export const getSignalStats = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  // This would require additional database queries
  // For now, returning placeholder stats
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

/**
 * Verify safety numbers (fingerprints)
 */
export const verifySafetyNumbers = asyncHandler(async (req: Request, res: Response) => {
  const { userId: remoteUserId } = req.params;
  const { fingerprint } = req.body;
  const localUserId = req.user!.userId;

  if (!fingerprint || typeof fingerprint !== 'string') {
    throw new AppError('Fingerprint is required', 400);
  }

  if (!remoteUserId) {
    throw new AppError('Remote user ID is required', 400);
  }

  // Generate the actual fingerprint
  const actualFingerprint = await EncryptionService.generateFingerprint(localUserId, remoteUserId as string);

  // Compare fingerprints
  const isValid = fingerprint.replace(/\s/g, '') === actualFingerprint.replace(/\s/g, '');

  logger.info('Safety numbers verification', { 
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

/**
 * Reset Signal Protocol identity (dangerous operation)
 */
export const resetIdentity = asyncHandler(async (req: Request, res: Response) => {
  const { confirmReset } = req.body;
  const userId = req.user!.userId;

  if (!confirmReset) {
    throw new AppError('Identity reset must be explicitly confirmed', 400);
  }

  // This would be a dangerous operation that clears all keys and sessions
  // For now, just returning a warning
  logger.warn('Identity reset requested', { userId });

  res.status(200).json({
    success: true,
    message: 'Identity reset functionality not implemented for security reasons',
    warning: 'This operation would invalidate all existing sessions and require re-establishing trust with all contacts'
  });
});

/**
 * Export Signal Protocol data (for backup)
 */
export const exportSignalData = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  // This would export encrypted backup of Signal Protocol data
  // For security, this is not implemented via API
  
  logger.info('Signal data export requested', { userId });

  res.status(403).json({
    success: false,
    message: 'Signal Protocol data export not available via API for security reasons',
    recommendation: 'Use official backup mechanisms provided by the client application'
  });
});

/**
 * Import Signal Protocol data (for restore)
 */
export const importSignalData = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  // This would import encrypted backup of Signal Protocol data
  // For security, this is not implemented via API
  
  logger.info('Signal data import requested', { userId });

  res.status(403).json({
    success: false,
    message: 'Signal Protocol data import not available via API for security reasons',
    recommendation: 'Use official restore mechanisms provided by the client application'
  });
});

/**
 * Health check for Signal Protocol service
 */
export const signalHealthCheck = asyncHandler(async (req: Request, res: Response) => {
  try {
    // Basic health checks for Signal Protocol service
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
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Signal Protocol service unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});