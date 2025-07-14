"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageService = void 0;
const client_1 = require("@prisma/client");
const errors_1 = require("../utils/errors");
const logger_1 = require("../utils/logger");
const prisma = new client_1.PrismaClient();
class MessageService {
    static async sendMessage(messageData) {
        try {
            const message = await prisma.message.create({
                data: {
                    senderId: messageData.senderId,
                    recipientId: messageData.recipientId,
                    groupId: messageData.groupId,
                    encryptedContent: messageData.encryptedContent,
                    messageType: messageData.messageType,
                    replyToId: messageData.replyToId,
                    mediaFileId: messageData.mediaFileId,
                    status: client_1.MessageStatus.SENT,
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
        }
        catch (error) {
            logger_1.logger.error('Error sending message:', error);
            throw error instanceof errors_1.AppError ? error : new errors_1.AppError('Failed to send message', 500);
        }
    }
    static async getMessages(userId, chatId, limit = 50, before, after) {
        try {
            const whereClause = {
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
            const formattedMessages = messages.map(message => ({
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
        }
        catch (error) {
            logger_1.logger.error('Error getting messages:', error);
            throw error instanceof errors_1.AppError ? error : new errors_1.AppError('Failed to get messages', 500);
        }
    }
    static async markAsDelivered(messageId, userId) {
        try {
            const message = await prisma.message.findUnique({
                where: { id: messageId }
            });
            if (!message) {
                throw new errors_1.AppError('Message not found', 404);
            }
            if (message.status === client_1.MessageStatus.SENT) {
                await prisma.message.update({
                    where: { id: messageId },
                    data: {
                        status: client_1.MessageStatus.DELIVERED,
                        deliveredAt: new Date()
                    }
                });
            }
        }
        catch (error) {
            logger_1.logger.error('Error marking message as delivered:', error);
            throw error instanceof errors_1.AppError ? error : new errors_1.AppError('Failed to mark as delivered', 500);
        }
    }
    static async markAsRead(messageId, userId) {
        try {
            const message = await prisma.message.findUnique({
                where: { id: messageId }
            });
            if (!message) {
                throw new errors_1.AppError('Message not found', 404);
            }
            if (message.status !== client_1.MessageStatus.READ) {
                await prisma.message.update({
                    where: { id: messageId },
                    data: {
                        status: client_1.MessageStatus.READ,
                        readAt: new Date(),
                        deliveredAt: message.deliveredAt || new Date()
                    }
                });
            }
        }
        catch (error) {
            logger_1.logger.error('Error marking message as read:', error);
            throw error instanceof errors_1.AppError ? error : new errors_1.AppError('Failed to mark as read', 500);
        }
    }
    static async deleteMessage(messageId, userId, deleteForEveryone = false) {
        try {
            const message = await prisma.message.findUnique({
                where: { id: messageId }
            });
            if (!message) {
                throw new errors_1.AppError('Message not found', 404);
            }
            if (deleteForEveryone) {
                await prisma.message.update({
                    where: { id: messageId },
                    data: {
                        isDeleted: true,
                        deletedAt: new Date(),
                        encryptedContent: Buffer.from('')
                    }
                });
            }
            else {
                await prisma.deletedMessage.create({
                    data: {
                        messageId,
                        userId,
                        deletedAt: new Date()
                    }
                });
            }
        }
        catch (error) {
            logger_1.logger.error('Error deleting message:', error);
            throw error instanceof errors_1.AppError ? error : new errors_1.AppError('Failed to delete message', 500);
        }
    }
    static async getChatList(userId) {
        try {
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
            const chats = [];
            const processedUsers = new Set();
            for (const message of directChats) {
                const otherUser = message.senderId === userId ? message.recipient : message.sender;
                if (!otherUser || processedUsers.has(otherUser.id))
                    continue;
                processedUsers.add(otherUser.id);
                const unreadCount = await prisma.message.count({
                    where: {
                        senderId: otherUser.id,
                        recipientId: userId,
                        status: { not: client_1.MessageStatus.READ },
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
        }
        catch (error) {
            logger_1.logger.error('Error getting chat list:', error);
            throw error instanceof errors_1.AppError ? error : new errors_1.AppError('Failed to get chat list', 500);
        }
    }
}
exports.MessageService = MessageService;
//# sourceMappingURL=message.service.js.map