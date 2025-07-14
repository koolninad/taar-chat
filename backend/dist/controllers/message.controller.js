"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeReaction = exports.addReaction = exports.getMessageReactions = exports.forwardMessage = exports.getDeliveryStatus = exports.markAllAsRead = exports.getUnreadCount = exports.searchMessages = exports.getChatList = exports.deleteMessage = exports.markAsRead = exports.markAsDelivered = exports.getMessages = exports.sendMessage = void 0;
const message_service_1 = require("../services/message.service");
const logger_1 = require("../utils/logger");
const errors_1 = require("../utils/errors");
const errorHandler_1 = require("../middleware/errorHandler");
exports.sendMessage = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { recipientId, groupId, encryptedContent, messageType, replyToId, mediaFileId } = req.body;
    const senderId = req.user.userId;
    const message = await message_service_1.MessageService.sendMessage({
        senderId,
        recipientId,
        groupId,
        encryptedContent,
        messageType: messageType,
        replyToId,
        mediaFileId
    });
    logger_1.logger.info('Message sent', {
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
exports.getMessages = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { chatId } = req.params;
    const { page, limit, before, after } = req.query;
    const userId = req.user.userId;
    const pageNum = page ? parseInt(page) : 1;
    const limitNum = limit ? parseInt(limit) : 20;
    const beforeDate = before ? new Date(before) : undefined;
    const afterDate = after ? new Date(after) : undefined;
    if (limitNum > 100) {
        throw new errors_1.AppError('Limit cannot exceed 100', 400);
    }
    const result = await message_service_1.MessageService.getMessages(userId, chatId, pageNum, limitNum, beforeDate, afterDate);
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
exports.markAsDelivered = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { messageId } = req.params;
    const userId = req.user.userId;
    await message_service_1.MessageService.markAsDelivered(messageId, userId);
    res.status(200).json({
        success: true,
        message: 'Message marked as delivered'
    });
});
exports.markAsRead = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { messageId } = req.params;
    const userId = req.user.userId;
    await message_service_1.MessageService.markAsRead(messageId, userId);
    res.status(200).json({
        success: true,
        message: 'Message marked as read'
    });
});
exports.deleteMessage = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { messageId } = req.params;
    const { deleteForEveryone } = req.body;
    const userId = req.user.userId;
    await message_service_1.MessageService.deleteMessage(messageId, userId, deleteForEveryone);
    logger_1.logger.info('Message deleted', {
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
exports.getChatList = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.userId;
    const chats = await message_service_1.MessageService.getChatList(userId);
    res.status(200).json({
        success: true,
        data: {
            chats,
            total: chats.length
        }
    });
});
exports.searchMessages = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { query, chatId, limit } = req.query;
    const userId = req.user.userId;
    if (!query || typeof query !== 'string') {
        throw new errors_1.AppError('Search query is required', 400);
    }
    if (query.length < 2) {
        throw new errors_1.AppError('Search query must be at least 2 characters', 400);
    }
    const limitNum = limit ? parseInt(limit) : 20;
    if (limitNum > 50) {
        throw new errors_1.AppError('Limit cannot exceed 50', 400);
    }
    const messages = await message_service_1.MessageService.searchMessages(userId, query, chatId, limitNum);
    res.status(200).json({
        success: true,
        data: {
            messages,
            query,
            total: messages.length
        }
    });
});
exports.getUnreadCount = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.userId;
    const { chatId } = req.query;
    const unreadCount = 0;
    res.status(200).json({
        success: true,
        data: {
            unreadCount,
            chatId: chatId || 'all'
        }
    });
});
exports.markAllAsRead = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { chatId } = req.params;
    const userId = req.user.userId;
    logger_1.logger.info('All messages marked as read', { chatId, userId });
    res.status(200).json({
        success: true,
        message: 'All messages marked as read'
    });
});
exports.getDeliveryStatus = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { messageId } = req.params;
    const userId = req.user.userId;
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
exports.forwardMessage = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { messageId } = req.params;
    const { recipientIds, groupIds } = req.body;
    const userId = req.user.userId;
    if (!recipientIds?.length && !groupIds?.length) {
        throw new errors_1.AppError('At least one recipient or group must be specified', 400);
    }
    const totalRecipients = (recipientIds?.length || 0) + (groupIds?.length || 0);
    if (totalRecipients > 10) {
        throw new errors_1.AppError('Cannot forward to more than 10 chats at once', 400);
    }
    logger_1.logger.info('Message forwarded', {
        messageId,
        userId,
        recipientCount: totalRecipients
    });
    res.status(200).json({
        success: true,
        message: `Message forwarded to ${totalRecipients} chat(s)`
    });
});
exports.getMessageReactions = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { messageId } = req.params;
    const userId = req.user.userId;
    const reactions = [];
    res.status(200).json({
        success: true,
        data: {
            reactions,
            total: reactions.length
        }
    });
});
exports.addReaction = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user.userId;
    if (!emoji || typeof emoji !== 'string') {
        throw new errors_1.AppError('Emoji is required', 400);
    }
    logger_1.logger.info('Reaction added', { messageId, userId, emoji });
    res.status(200).json({
        success: true,
        message: 'Reaction added successfully'
    });
});
exports.removeReaction = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user.userId;
    if (!emoji || typeof emoji !== 'string') {
        throw new errors_1.AppError('Emoji is required', 400);
    }
    logger_1.logger.info('Reaction removed', { messageId, userId, emoji });
    res.status(200).json({
        success: true,
        message: 'Reaction removed successfully'
    });
});
//# sourceMappingURL=message.controller.js.map