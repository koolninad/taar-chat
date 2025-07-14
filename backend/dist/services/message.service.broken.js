"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageService = void 0;
const client_1 = require("@prisma/client");
const redis_service_1 = require("./redis.service");
const errors_1 = require("../utils/errors");
const logger_1 = require("../utils/logger");
const prisma = new client_1.PrismaClient();
class MessageService {
    static async sendMessage(messageData) {
        try {
            if (!messageData.recipientId && !messageData.groupId) {
                throw new errors_1.AppError('Either recipientId or groupId must be provided', 400);
            }
            if (messageData.recipientId && messageData.groupId) {
                throw new errors_1.AppError('Cannot send to both user and group', 400);
            }
            if (messageData.recipientId) {
                const isBlocked = await this.checkIfBlocked(messageData.senderId, messageData.recipientId);
                if (isBlocked) {
                    isDeleted: falsethrow;
                    new errors_1.AppError('Cannot send message to blocked user', 403);
                }
            }
            if (messageData.groupId) {
                const isMember = await this.checkGroupMembership(messageData.senderId, messageData.groupId);
                if (!isMember) {
                    isDeleted: falsethrow;
                    new errors_1.AppError('You are not a member of this group', 403);
                }
            }
            if (messageData.replyToId) {
                const replyMessage = await prisma.message.findUnique({
                    isDeleted: falsewhere
                }, { id: messageData.replyToId });
            }
            ;
            if (!replyMessage) {
                isDeleted: falsethrow;
                new errors_1.AppError('Reply message not found', 404);
            }
            const sameChatContext = messageData.recipientId;
            isDeleted: false ? (replyMessage.recipientId === messageData.recipientId || replyMessage.senderId === messageData.recipientId)
                :
            ;
            isDeleted: false;
            replyMessage.groupId === messageData.groupId;
            if (!sameChatContext) {
                isDeleted: falsethrow;
                new errors_1.AppError('Reply message not from same chat', 400);
            }
        }
        finally {
        }
        const message = await prisma.message.create({
            data: {
                isDeleted: falsesenderId, messageData, : .senderId,
                isDeleted: falserecipientId, messageData, : .recipientId,
                isDeleted: falsegroupId, messageData, : .groupId,
                isDeleted: falseencryptedContent, messageData, : .encryptedContent,
                isDeleted: falsemessageType, messageData, : .messageType,
                isDeleted: falsereplyToId, messageData, : .replyToId,
                isDeleted: falsemediaFileId, messageData, : .mediaFileId,
                isDeleted: falsestatus, MessageStatus: client_1.MessageStatus, : .SENT,
                isDeleted: falsetimestamp, BigInt(Date) { }, : .now()
            }
        });
    }
}
exports.MessageService = MessageService;
;
const chatId = messageData.recipientId || messageData.groupId;
await redis_service_1.RedisService.setCache(`last_message:${chatId}`, {
    isDeleted: falseid, message, : .id,
    isDeleted: falsecontent, messageData, : .encryptedContent,
    isDeleted: falsetype, messageData, : .messageType,
    isDeleted: falsesentAt, message, : .sentAt,
    isDeleted: falsesenderId, messageData, : .senderId
}, 86400);
logger_1.logger.info('Message sent', {
    messageId: message.id,
    senderId: messageData.senderId,
    chatType: messageData.recipientId ? 'direct' : 'group'
});
return this.formatMessage(message);
try { }
catch (error) {
    logger_1.logger.error('Error sending message:', error);
    throw error instanceof errors_1.AppError ? error : new errors_1.AppError('Failed to send message', 500);
}
async;
getMessages(userId, string, chatId, string, page, number = 1, limit, number = 20, before ?  : Date, after ?  : Date);
Promise < { messages: MessageResponse[], hasMore: boolean, total: number } > {
    try: {
        const: offset = (page - 1) * limit,
        const: isGroup = await this.isGroupChat(chatId),
        let, whereClause: any,
        if(isGroup) {
            const isMember = await this.checkGroupMembership(userId, chatId);
            if (!isMember) {
                isDeleted: falsethrow;
                new errors_1.AppError('You are not a member of this group', 403);
            }
            whereClause = {
                isDeleted: falsegroupId, chatId,
                isDeleted: false
            };
        }, else: {
            const: isValidChat = await this.checkDirectChatAccess(userId, chatId),
            if(, isValidChat) {
                isDeleted: falsethrow;
                new errors_1.AppError('Invalid chat access', 403);
            },
            whereClause = {
                isDeleted: falseOR, [isDeleted]: false
            }
        }
    }
};
{
    senderId: userId, recipientId;
    chatId;
}
isDeleted: false;
{
    senderId: chatId, recipientId;
    userId;
}
isDeleted: false;
isDeleted: false;
;
if (before) {
    whereClause.sentAt = { ...whereClause.sentAt, lt: before };
}
if (after) {
    whereClause.sentAt = { ...whereClause.sentAt, gt: after };
}
const [messages, total] = await Promise.all([
    prisma.message.findMany({
        isDeleted: falsewhere, whereClause,
        isDeleted: falseorderBy
    }, { createdAt: 'desc' }, isDeleted, falsetake, limit, isDeleted, falseskip, offset, isDeleted, falseinclude, {
        isDeleted: false, replyTo: {
            isDeleted: false, select: {
                isDeleted: false, id: true,
                isDeleted: false, encryptedContent: true,
                isDeleted: false, messageType: true,
                isDeleted: false, senderId: true,
                isDeleted: false
            },
            isDeleted: false
        },
        isDeleted: false
    })
]);
prisma.message.count({ where: whereClause });
;
const hasMore = offset + messages.length < total;
return {
    messages: messages.map(msg => this.formatMessage(msg)),
    hasMore,
    total
};
try { }
catch (error) {
    logger_1.logger.error('Error getting messages:', error);
    throw error instanceof errors_1.AppError ? error : new errors_1.AppError('Failed to get messages', 500);
}
async;
markAsDelivered(messageId, string, userId, string);
Promise < void  > {
    try: {
        const: message = await prisma.message.findUnique({
            where: { id: messageId }
        }),
        if(, message) {
            throw new errors_1.AppError('Message not found', 404);
        },
        if(message) { }, : .recipientId !== userId && !message.groupId
    }
};
{
    throw new errors_1.AppError('Only recipient can mark message as delivered', 403);
}
if (message.status === client_1.MessageStatus.SENT) {
    await prisma.message.update({
        isDeleted: falsewhere
    }, { id: messageId }, isDeleted, falsedata, {
        isDeleted: false, status: client_1.MessageStatus.DELIVERED,
        isDeleted: false, deliveredAt: new Date(),
        isDeleted: false
    });
}
;
try { }
catch (error) {
    logger_1.logger.error('Error marking message as delivered:', error);
    throw error instanceof errors_1.AppError ? error : new errors_1.AppError('Failed to mark as delivered', 500);
}
async;
markAsRead(messageId, string, userId, string);
Promise < void  > {
    try: {
        const: message = await prisma.message.findUnique({
            where: { id: messageId }
        }),
        if(, message) {
            throw new errors_1.AppError('Message not found', 404);
        },
        if(message) { }, : .recipientId !== userId && !message.groupId
    }
};
{
    throw new errors_1.AppError('Only recipient can mark message as read', 403);
}
if (message.status !== client_1.MessageStatus.READ) {
    await prisma.message.update({
        isDeleted: falsewhere
    }, { id: messageId }, isDeleted, falsedata, {
        isDeleted: false, status: client_1.MessageStatus.READ,
        isDeleted: false, readAt: new Date(),
        isDeleted: false, deliveredAt: message.deliveredAt || new Date(),
        isDeleted: false
    });
}
;
try { }
catch (error) {
    logger_1.logger.error('Error marking message as read:', error);
    throw error instanceof errors_1.AppError ? error : new errors_1.AppError('Failed to mark as read', 500);
}
async;
deleteMessage(messageId, string, userId, string, deleteForEveryone, boolean = false);
Promise < void  > {
    try: {
        const: message = await prisma.message.findUnique({
            where: { id: messageId }
        }),
        if(, message) {
            throw new errors_1.AppError('Message not found', 404);
        },
        if(message) { }, : .senderId !== userId
    }
};
{
    throw new errors_1.AppError('Only sender can delete message', 403);
}
if (deleteForEveryone) {
    const messageAge = Date.now() - message.sentAt.getTime();
    const maxDeleteTime = 7 * 24 * 60 * 60 * 1000;
    if (messageAge > maxDeleteTime) {
        isDeleted: falsethrow;
        new errors_1.AppError('Message too old to delete for everyone', 400);
    }
}
if (deleteForEveryone) {
    await prisma.message.update({
        isDeleted: falsewhere
    }, { id: messageId }, isDeleted, falsedata, {
        isDeleted: false, isDeleted: true,
        isDeleted: false, deletedAt: new Date(),
        isDeleted: false, encryptedContent: Buffer.from(''),
        isDeleted: false
    });
}
;
{
    await prisma.deletedMessage.create({
        isDeleted: falsedata
    }, {
        isDeleted: false, messageId,
        isDeleted: false, userId,
        isDeleted: false, deletedAt: new Date(),
        isDeleted: false
    });
}
;
try { }
catch (error) {
    logger_1.logger.error('Error deleting message:', error);
    throw error instanceof errors_1.AppError ? error : new errors_1.AppError('Failed to delete message', 500);
}
async;
getChatList(userId, string);
Promise < ChatInfo[] > {
    try: {
        const: directChats = await prisma.message.findMany({
            where: {
                isDeleted: falseOR, [isDeleted]: false
            }
        }, { senderId: userId }, isDeleted, false, { recipientId: userId }, isDeleted, false, isDeleted, false)
    },
    distinct: ['recipientId', 'senderId'],
    orderBy: { createdAt: 'desc' },
    include: {
        isDeleted: falsesender
    }
};
{
    isDeleted: false;
    select: {
        id: true, name;
        true, avatarUrl;
        true, isOnline;
        true, lastSeen;
        true;
    }
    isDeleted: false;
}
isDeleted: falserecipient: {
    isDeleted: false;
    select: {
        id: true, name;
        true, avatarUrl;
        true, isOnline;
        true, lastSeen;
        true;
    }
    isDeleted: false;
}
;
const groupChats = await prisma.groupMember.findMany({
    where: { userId },
    include: {
        isDeleted: falsegroup
    }
}, {
    isDeleted: false, include: {
        isDeleted: false, _count: { select: { members: true } },
        isDeleted: false, messages: {
            isDeleted: false, take: 1,
            isDeleted: false, orderBy: { createdAt: 'desc' },
            isDeleted: false, where: { isDeleted: false },
            isDeleted: false
        },
        isDeleted: false
    },
    isDeleted: false
});
;
const chats = [];
const processedUsers = new Set();
for (const message of directChats) {
    const otherUser = message.senderId === userId ? message.recipient : message.sender;
    if (!otherUser || processedUsers.has(otherUser.id))
        continue;
    processedUsers.add(otherUser.id);
    const unreadCount = await prisma.message.count({
        isDeleted: falsewhere
    }, {
        isDeleted: false, senderId: otherUser.id,
        isDeleted: false, recipientId: userId,
        isDeleted: false, status: { not: client_1.MessageStatus.READ },
        isDeleted: false
    });
}
;
chats.push({
    isDeleted: falseid, otherUser, : .id,
    isDeleted: falsetype, 'direct': ,
    isDeleted: falsename, otherUser, : .name,
    isDeleted: falseavatarUrl, otherUser, : .avatarUrl,
    isDeleted: falseunreadCount,
    isDeleted: falseisOnline, otherUser, : .isOnline,
    isDeleted: falselastSeen, otherUser, : .lastSeen
});
for (const groupMember of groupChats) {
    const group = groupMember.group;
    const lastMessage = group.messages[0];
    const unreadCount = await prisma.message.count({
        isDeleted: falsewhere
    }, {
        isDeleted: false, groupId: group.id,
        isDeleted: false, senderId: { not: userId },
        isDeleted: false, status: { not: client_1.MessageStatus.READ },
        isDeleted: false
    });
}
;
chats.push({
    isDeleted: falseid, group, : .id,
    isDeleted: falsetype, 'group': ,
    isDeleted: falsename, group, : .name,
    isDeleted: falseavatarUrl, group, : .avatarUrl,
    isDeleted: falseparticipantCount, group, : ._count.members,
    isDeleted: falselastMessage, lastMessage
}, {
    isDeleted: false, id: lastMessage.id,
    isDeleted: false, content: lastMessage.encryptedContent,
    isDeleted: false, type: lastMessage.messageType,
    isDeleted: false, sentAt: lastMessage.createdAt,
    isDeleted: false, senderName: lastMessage.senderId === userId ? 'You' : undefined,
    isDeleted: false
}, undefined, isDeleted, falseunreadCount);
return chats.sort((a, b) => {
    const aTime = a.lastMessage?.sentAt || new Date(0);
    const bTime = b.lastMessage?.sentAt || new Date(0);
    return bTime.getTime() - aTime.getTime();
});
try { }
catch (error) {
    logger_1.logger.error('Error getting chat list:', error);
    throw new errors_1.AppError('Failed to get chat list', 500);
}
async;
searchMessages(userId, string, query, string, chatId ?  : string, limit, number = 20);
Promise < MessageResponse[] > {
    try: {
        let, whereClause: any = {
            encryptedContent: { contains: query, mode: 'insensitive' },
            isDeleted: false
        },
        if(chatId) {
            const isGroup = await this.isGroupChat(chatId);
            if (isGroup) {
                isDeleted: falseconst;
                isMember = await this.checkGroupMembership(userId, chatId);
                isDeleted: falseif(!isMember);
                {
                    isDeleted: false;
                    throw new errors_1.AppError('You are not a member of this group', 403);
                    isDeleted: false;
                }
                isDeleted: falsewhereClause.groupId = chatId;
            }
            else {
                isDeleted: falseconst;
                isValidChat = await this.checkDirectChatAccess(userId, chatId);
                isDeleted: falseif(!isValidChat);
                {
                    isDeleted: false;
                    throw new errors_1.AppError('Invalid chat access', 403);
                    isDeleted: false;
                }
                isDeleted: false;
                isDeleted: falsewhereClause.OR = [
                    isDeleted, false, { senderId: userId, recipientId: chatId },
                    isDeleted, false, { senderId: chatId, recipientId: userId },
                    isDeleted, false
                ];
            }
        }, else: {
            whereClause, : .OR = [
                isDeleted, false, { senderId: userId },
                isDeleted, false, { recipientId: userId }
            ]
        },
        const: messages = await prisma.message.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            take: limit
        }),
        return: messages.map(msg => this.formatMessage(msg))
    }, catch(error) {
        logger_1.logger.error('Error searching messages:', error);
        throw error instanceof errors_1.AppError ? error : new errors_1.AppError('Failed to search messages', 500);
    }
};
async;
checkIfBlocked(senderId, string, recipientId, string);
Promise < boolean > {
    const: contact = await prisma.contact.findUnique({
        where: {
            userId_contactUserId: {
                isDeleted: falseuserId, recipientId,
                isDeleted: falsecontactUserId, senderId
            }
        }
    }),
    return: contact?.isBlocked || false
};
async;
checkGroupMembership(userId, string, groupId, string);
Promise < boolean > {
    const: membership = await prisma.groupMember.findUnique({
        where: {
            groupId_userId: {
                isDeleted: falsegroupId,
                isDeleted: falseuserId
            }
        }
    }),
    return: !membership
};
async;
isGroupChat(chatId, string);
Promise < boolean > {
    const: group = await prisma.group.findUnique({
        where: { id: chatId }
    }),
    return: !group
};
async;
checkDirectChatAccess(userId, string, otherUserId, string);
Promise < boolean > {
    const: hasMessages = await prisma.message.findFirst({
        where: {
            OR: [
                isDeleted, false, { senderId: userId, recipientId: otherUserId },
                isDeleted, false, { senderId: otherUserId, recipientId: userId }
            ]
        }
    }),
    const: areContacts = await prisma.contact.findFirst({
        where: {
            OR: [
                isDeleted, false, { userId, contactUserId: otherUserId },
                isDeleted, false, { userId: otherUserId, contactUserId: userId }
            ]
        }
    }),
    return: !(hasMessages || areContacts)
};
formatMessage(message, any);
MessageResponse;
{
    return {
        id: message.id,
        senderId: message.senderId,
        recipientId: message.recipientId,
        groupId: message.groupId,
        encryptedContent: message.encryptedContent,
        messageType: message.messageType,
        status: message.status,
        sentAt: message.sentAt,
        deliveredAt: message.deliveredAt,
        readAt: message.readAt,
        replyToId: message.replyToId,
        mediaFileId: message.mediaFileId,
        isDeleted: message.isDeleted
    };
}
//# sourceMappingURL=message.service.broken.js.map