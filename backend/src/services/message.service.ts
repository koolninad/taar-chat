import { PrismaClient, MessageType, MessageStatus } from '@prisma/client';
import { RedisService } from './redis.service';
import { AppError, ErrorMessages } from '../utils/errors';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export interface SendMessageRequest {
  senderId: string;
  recipientId?: string;
  groupId?: string;
  encryptedContent: Buffer;
  messageType: MessageType;
  replyToId?: string;
  mediaFileId?: string;
}

export interface MessageResponse {
  id: string;
  senderId: string;
  recipientId?: string;
  groupId?: string;
  content: string;
  messageType: MessageType;
  status: MessageStatus;
  sentAt: Date;
  isDeleted: boolean;
}

export interface ChatInfo {
  id: string;
  type: 'direct' | 'group';
  name?: string;
  avatarUrl?: string;
  participantCount?: number;
  lastMessage?: {
    id: string;
    content: Buffer;
    type: MessageType;
    sentAt: Date;
    senderName?: string;
  };
  unreadCount: number;
  isOnline?: boolean;
  lastSeen?: Date;
}

export class MessageService {
  /**
   * Send message
   */
  static async sendMessage(messageData: SendMessageRequest): Promise<MessageResponse> {
    try {
      // Create message
      const message = await prisma.message.create({
        data: {
          senderId: messageData.senderId,
          recipientId: messageData.recipientId,
          groupId: messageData.groupId,
          encryptedContent: messageData.encryptedContent,
          messageType: messageData.messageType,
          replyToId: messageData.replyToId,
          mediaFileId: messageData.mediaFileId,
          status: MessageStatus.SENT,
          timestamp: BigInt(Date.now())
        }
      });

      return {
        id: message.id,
        senderId: message.senderId,
        recipientId: message.recipientId || undefined,
        groupId: message.groupId || undefined,
        content: message.encryptedContent.toString('base64'),
        messageType: message.messageType,
        status: message.status,
        sentAt: message.sentAt,
        isDeleted: message.isDeleted
      };
    } catch (error) {
      logger.error('Error sending message:', error);
      throw error instanceof AppError ? error : new AppError('Failed to send message', 500);
    }
  }

  /**
   * Get messages
   */
  static async getMessages(
    userId: string,
    chatId: string,
    limit: number = 50,
    before?: string,
    after?: string
  ): Promise<{ messages: MessageResponse[]; hasMore: boolean; total: number }> {
    try {
      const whereClause: any = {
        OR: [
          { senderId: userId, recipientId: chatId },
          { senderId: chatId, recipientId: userId },
          { groupId: chatId }
        ],
        isDeleted: false
      };

      if (before) {
        whereClause.sentAt = { ...whereClause.sentAt, lt: new Date(before) };
      }

      if (after) {
        whereClause.sentAt = { ...whereClause.sentAt, gt: new Date(after) };
      }

      const [messages, totalCount] = await Promise.all([
        prisma.message.findMany({
          where: whereClause,
          orderBy: { sentAt: 'desc' },
          take: limit,
          include: {
            sender: {
              select: { id: true, name: true, avatarUrl: true }
            }
          }
        }),
        prisma.message.count({ where: whereClause })
      ]);

      const formattedMessages: MessageResponse[] = messages.map(message => ({
        id: message.id,
        senderId: message.senderId,
        recipientId: message.recipientId || undefined,
        groupId: message.groupId || undefined,
        content: message.encryptedContent.toString('base64'),
        messageType: message.messageType,
        status: message.status,
        sentAt: message.sentAt,
        isDeleted: message.isDeleted
      }));

      return {
        messages: formattedMessages,
        hasMore: messages.length === limit,
        total: totalCount
      };
    } catch (error) {
      logger.error('Error getting messages:', error);
      throw error instanceof AppError ? error : new AppError('Failed to get messages', 500);
    }
  }

  /**
   * Mark message as delivered
   */
  static async markAsDelivered(messageId: string, userId: string): Promise<void> {
    try {
      const message = await prisma.message.findUnique({
        where: { id: messageId }
      });

      if (!message) {
        throw new AppError('Message not found', 404);
      }

      if (message.status === MessageStatus.SENT) {
        await prisma.message.update({
          where: { id: messageId },
          data: {
            status: MessageStatus.DELIVERED,
            deliveredAt: new Date()
          }
        });
      }
    } catch (error) {
      logger.error('Error marking message as delivered:', error);
      throw error instanceof AppError ? error : new AppError('Failed to mark as delivered', 500);
    }
  }

  /**
   * Mark message as read
   */
  static async markAsRead(messageId: string, userId: string): Promise<void> {
    try {
      const message = await prisma.message.findUnique({
        where: { id: messageId }
      });

      if (!message) {
        throw new AppError('Message not found', 404);
      }

      if (message.status !== MessageStatus.READ) {
        await prisma.message.update({
          where: { id: messageId },
          data: {
            status: MessageStatus.READ,
            readAt: new Date(),
            deliveredAt: message.deliveredAt || new Date()
          }
        });
      }
    } catch (error) {
      logger.error('Error marking message as read:', error);
      throw error instanceof AppError ? error : new AppError('Failed to mark as read', 500);
    }
  }

  /**
   * Delete message
   */
  static async deleteMessage(
    messageId: string, 
    userId: string, 
    deleteForEveryone: boolean = false
  ): Promise<void> {
    try {
      const message = await prisma.message.findUnique({
        where: { id: messageId }
      });

      if (!message) {
        throw new AppError('Message not found', 404);
      }

      if (deleteForEveryone) {
        // Mark as deleted for everyone
        await prisma.message.update({
          where: { id: messageId },
          data: {
            isDeleted: true,
            deletedAt: new Date(),
            encryptedContent: Buffer.from('')
          }
        });
      } else {
        // Add to user's deleted messages list
        await prisma.deletedMessage.create({
          data: {
            messageId,
            userId,
            deletedAt: new Date()
          }
        });
      }
    } catch (error) {
      logger.error('Error deleting message:', error);
      throw error instanceof AppError ? error : new AppError('Failed to delete message', 500);
    }
  }

  /**
   * Get chat list for user
   */
  static async getChatList(userId: string): Promise<ChatInfo[]> {
    try {
      // Get direct chats
      const directChats = await prisma.message.findMany({
        where: {
          OR: [
            { senderId: userId },
            { recipientId: userId }
          ],
          isDeleted: false
        },
        distinct: ['recipientId', 'senderId'],
        orderBy: { sentAt: 'desc' },
        include: {
          sender: {
            select: { id: true, name: true, avatarUrl: true, isOnline: true, lastSeen: true }
          },
          recipient: {
            select: { id: true, name: true, avatarUrl: true, isOnline: true, lastSeen: true }
          }
        }
      });

      const chats: ChatInfo[] = [];

      // Process direct chats
      const processedUsers = new Set<string>();
      for (const message of directChats) {
        const otherUser = message.senderId === userId ? message.recipient : message.sender;
        
        if (!otherUser || processedUsers.has(otherUser.id)) continue;
        processedUsers.add(otherUser.id);

        // Get unread count
        const unreadCount = await prisma.message.count({
          where: {
            senderId: otherUser.id,
            recipientId: userId,
            status: { not: MessageStatus.READ },
            isDeleted: false
          }
        });

        chats.push({
          id: otherUser.id,
          type: 'direct',
          name: otherUser.name,
          avatarUrl: otherUser.avatarUrl,
          unreadCount,
          isOnline: otherUser.isOnline,
          lastSeen: otherUser.lastSeen
        });
      }

      return chats.sort((a, b) => {
        const aTime = a.lastMessage?.sentAt || new Date(0);
        const bTime = b.lastMessage?.sentAt || new Date(0);
        return bTime.getTime() - aTime.getTime();
      });
    } catch (error) {
      logger.error('Error getting chat list:', error);
      throw error instanceof AppError ? error : new AppError('Failed to get chat list', 500);
    }
  }
}

export { MessageService };