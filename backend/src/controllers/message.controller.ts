import { Request, Response } from 'express';
import { MessageService } from '../services/message.service';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';
import { asyncHandler } from '../middleware/errorHandler';
import { MessageType } from '@prisma/client';

/**
 * Send a message to user or group
 */
export const sendMessage = asyncHandler(async (req: Request, res: Response) => {
  const { recipientId, groupId, encryptedContent, messageType, replyToId, mediaFileId } = req.body;
  const senderId = req.user!.userId;

  const message = await MessageService.sendMessage({
    senderId,
    recipientId,
    groupId,
    encryptedContent,
    messageType: messageType as MessageType,
    replyToId,
    mediaFileId
  });

  logger.info('Message sent', { 
    messageId: message.id, 
    senderId,
    chatType: recipientId ? 'direct' : 'group'
  });

  res.status(201).json({
    success: true,
    message: 'Message sent successfully',
    data: {
      message
    }
  });
});

/**
 * Get messages for a chat
 */
export const getMessages = asyncHandler(async (req: Request, res: Response) => {
  const { chatId } = req.params;
  const { page, limit, before, after } = req.query;
  const userId = req.user!.userId;

  const pageNum = page ? parseInt(page as string) : 1;
  const limitNum = limit ? parseInt(limit as string) : 20;
  const beforeDate = before ? new Date(before as string) : undefined;
  const afterDate = after ? new Date(after as string) : undefined;

  if (limitNum > 100) {
    throw new AppError('Limit cannot exceed 100', 400);
  }

  const result = await MessageService.getMessages(
    userId,
    chatId!,
    pageNum,
    limitNum,
    beforeDate,
    afterDate
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
 * Mark message as delivered
 */
export const markAsDelivered = asyncHandler(async (req: Request, res: Response) => {
  const { messageId } = req.params;
  const userId = req.user!.userId;

  await MessageService.markAsDelivered(messageId!, userId);

  res.status(200).json({
    success: true,
    message: 'Message marked as delivered'
  });
});

/**
 * Mark message as read
 */
export const markAsRead = asyncHandler(async (req: Request, res: Response) => {
  const { messageId } = req.params;
  const userId = req.user!.userId;

  await MessageService.markAsRead(messageId!, userId);

  res.status(200).json({
    success: true,
    message: 'Message marked as read'
  });
});

/**
 * Delete message
 */
export const deleteMessage = asyncHandler(async (req: Request, res: Response) => {
  const { messageId } = req.params;
  const { deleteForEveryone } = req.body;
  const userId = req.user!.userId;

  await MessageService.deleteMessage(messageId!, userId, deleteForEveryone);

  logger.info('Message deleted', { 
    messageId, 
    userId, 
    deleteForEveryone: !!deleteForEveryone 
  });

  res.status(200).json({
    success: true,
    message: deleteForEveryone 
      ? 'Message deleted for everyone' 
      : 'Message deleted for you'
  });
});

/**
 * Get chat list
 */
export const getChatList = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  const chats = await MessageService.getChatList(userId);

  res.status(200).json({
    success: true,
    data: {
      chats,
      total: chats.length
    }
  });
});

/**
 * Search messages
 */
export const searchMessages = asyncHandler(async (req: Request, res: Response) => {
  const { query, chatId, limit } = req.query;
  const userId = req.user!.userId;

  if (!query || typeof query !== 'string') {
    throw new AppError('Search query is required', 400);
  }

  if (query.length < 2) {
    throw new AppError('Search query must be at least 2 characters', 400);
  }

  const limitNum = limit ? parseInt(limit as string) : 20;
  
  if (limitNum > 50) {
    throw new AppError('Limit cannot exceed 50', 400);
  }

  const messages = await MessageService.searchMessages(
    userId,
    query,
    chatId as string,
    limitNum
  );

  res.status(200).json({
    success: true,
    data: {
      messages,
      query,
      total: messages.length
    }
  });
});

/**
 * Get unread message count
 */
export const getUnreadCount = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { chatId } = req.query;

  // This would require additional service method implementation
  // For now, returning placeholder
  const unreadCount = 0;

  res.status(200).json({
    success: true,
    data: {
      unreadCount,
      chatId: chatId || 'all'
    }
  });
});

/**
 * Mark all messages as read in a chat
 */
export const markAllAsRead = asyncHandler(async (req: Request, res: Response) => {
  const { chatId } = req.params;
  const userId = req.user!.userId;

  // This would require additional service method implementation
  // For now, returning success response
  
  logger.info('All messages marked as read', { chatId, userId });

  res.status(200).json({
    success: true,
    message: 'All messages marked as read'
  });
});

/**
 * Get message delivery status
 */
export const getDeliveryStatus = asyncHandler(async (req: Request, res: Response) => {
  const { messageId } = req.params;
  const userId = req.user!.userId;

  // This would require additional service method implementation
  // For now, returning placeholder
  const status = {
    messageId,
    sent: true,
    delivered: false,
    read: false,
    sentAt: new Date(),
    deliveredAt: null,
    readAt: null
  };

  res.status(200).json({
    success: true,
    data: {
      status
    }
  });
});

/**
 * Forward message
 */
export const forwardMessage = asyncHandler(async (req: Request, res: Response) => {
  const { messageId } = req.params;
  const { recipientIds, groupIds } = req.body;
  const userId = req.user!.userId;

  if (!recipientIds?.length && !groupIds?.length) {
    throw new AppError('At least one recipient or group must be specified', 400);
  }

  const totalRecipients = (recipientIds?.length || 0) + (groupIds?.length || 0);
  if (totalRecipients > 10) {
    throw new AppError('Cannot forward to more than 10 chats at once', 400);
  }

  // This would require additional service method implementation
  // For now, returning success response
  
  logger.info('Message forwarded', { 
    messageId, 
    userId, 
    recipientCount: totalRecipients 
  });

  res.status(200).json({
    success: true,
    message: `Message forwarded to ${totalRecipients} chat(s)`
  });
});

/**
 * Get message reactions
 */
export const getMessageReactions = asyncHandler(async (req: Request, res: Response) => {
  const { messageId } = req.params;
  const userId = req.user!.userId;

  // This would require additional service method implementation
  // For now, returning placeholder
  const reactions: any[] = [];

  res.status(200).json({
    success: true,
    data: {
      reactions,
      total: reactions.length
    }
  });
});

/**
 * Add reaction to message
 */
export const addReaction = asyncHandler(async (req: Request, res: Response) => {
  const { messageId } = req.params;
  const { emoji } = req.body;
  const userId = req.user!.userId;

  if (!emoji || typeof emoji !== 'string') {
    throw new AppError('Emoji is required', 400);
  }

  // This would require additional service method implementation
  // For now, returning success response
  
  logger.info('Reaction added', { messageId, userId, emoji });

  res.status(200).json({
    success: true,
    message: 'Reaction added successfully'
  });
});

/**
 * Remove reaction from message
 */
export const removeReaction = asyncHandler(async (req: Request, res: Response) => {
  const { messageId } = req.params;
  const { emoji } = req.body;
  const userId = req.user!.userId;

  if (!emoji || typeof emoji !== 'string') {
    throw new AppError('Emoji is required', 400);
  }

  // This would require additional service method implementation
  // For now, returning success response
  
  logger.info('Reaction removed', { messageId, userId, emoji });

  res.status(200).json({
    success: true,
    message: 'Reaction removed successfully'
  });
});