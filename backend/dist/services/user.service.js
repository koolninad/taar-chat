"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const client_1 = require("@prisma/client");
const redis_service_1 = require("./redis.service");
const errors_1 = require("../utils/errors");
const logger_1 = require("../utils/logger");
const prisma = new client_1.PrismaClient();
class UserService {
    static async searchUsers(query, currentUserId, limit = 20) {
        try {
            const cleanQuery = query.trim().toLowerCase();
            if (cleanQuery.length < 2) {
                throw new errors_1.AppError('Search query must be at least 2 characters', 400);
            }
            const users = await prisma.user.findMany({
                where: {
                    AND: [
                        { id: { not: currentUserId } },
                        {
                            OR: [
                                { phoneNumber: { contains: cleanQuery } },
                                { name: { contains: cleanQuery, mode: 'insensitive' } }
                            ]
                        }
                    ]
                },
                select: {
                    id: true,
                    phoneNumber: true,
                    name: true,
                    avatarUrl: true,
                    isOnline: true
                },
                take: limit,
                orderBy: [
                    { isOnline: 'desc' },
                    { name: 'asc' }
                ]
            });
            return users.map(user => ({
                id: user.id,
                phoneNumber: user.phoneNumber,
                name: user.name || undefined,
                avatarUrl: user.avatarUrl || undefined,
                isOnline: user.isOnline
            }));
        }
        catch (error) {
            logger_1.logger.error('Error searching users:', error);
            throw error instanceof errors_1.AppError ? error : new errors_1.AppError('Failed to search users', 500);
        }
    }
    static async getContacts(userId) {
        try {
            const contacts = await prisma.contact.findMany({
                where: { userId },
                include: {
                    contactUser: {
                        select: {
                            id: true,
                            phoneNumber: true,
                            name: true,
                            about: true,
                            avatarUrl: true,
                            isOnline: true,
                            lastSeen: true
                        }
                    }
                },
                orderBy: { contactUser: { name: 'asc' } }
            });
            return contacts.map(contact => ({
                id: contact.contactUser.id,
                phoneNumber: contact.contactUser.phoneNumber,
                name: contact.contactUser.name || undefined,
                about: contact.contactUser.about || undefined,
                avatarUrl: contact.contactUser.avatarUrl || undefined,
                isOnline: contact.contactUser.isOnline,
                lastSeen: contact.contactUser.lastSeen || undefined,
                isBlocked: contact.isBlocked,
                isMuted: contact.isMuted
            }));
        }
        catch (error) {
            logger_1.logger.error('Error getting contacts:', error);
            throw new errors_1.AppError('Failed to get contacts', 500);
        }
    }
    static async addContact(userId, contactPhoneNumber, customName) {
        try {
            const contactUser = await prisma.user.findUnique({
                where: { phoneNumber: contactPhoneNumber }
            });
            if (!contactUser) {
                throw new errors_1.AppError('User not found with this phone number', 404);
            }
            if (contactUser.id === userId) {
                throw new errors_1.AppError('Cannot add yourself as contact', 400);
            }
            const existingContact = await prisma.contact.findUnique({
                where: {
                    userId_contactUserId: {
                        userId,
                        contactUserId: contactUser.id
                    }
                }
            });
            if (existingContact) {
                throw new errors_1.AppError('Contact already exists', 409);
            }
            const contact = await prisma.contact.create({
                data: {
                    userId,
                    contactUserId: contactUser.id,
                    customName,
                    addedAt: new Date()
                },
                include: {
                    contactUser: {
                        select: {
                            id: true,
                            phoneNumber: true,
                            name: true,
                            about: true,
                            avatarUrl: true,
                            isOnline: true,
                            lastSeen: true
                        }
                    }
                }
            });
            return {
                id: contact.contactUser.id,
                phoneNumber: contact.contactUser.phoneNumber,
                name: contact.customName || contact.contactUser.name || undefined,
                about: contact.contactUser.about || undefined,
                avatarUrl: contact.contactUser.avatarUrl || undefined,
                isOnline: contact.contactUser.isOnline,
                lastSeen: contact.contactUser.lastSeen || undefined,
                isBlocked: contact.isBlocked,
                isMuted: contact.isMuted
            };
        }
        catch (error) {
            logger_1.logger.error('Error adding contact:', error);
            throw error instanceof errors_1.AppError ? error : new errors_1.AppError('Failed to add contact', 500);
        }
    }
    static async removeContact(userId, contactUserId) {
        try {
            const contact = await prisma.contact.findUnique({
                where: {
                    userId_contactUserId: {
                        userId,
                        contactUserId
                    }
                }
            });
            if (!contact) {
                throw new errors_1.AppError('Contact not found', 404);
            }
            await prisma.contact.delete({
                where: {
                    userId_contactUserId: {
                        userId,
                        contactUserId
                    }
                }
            });
        }
        catch (error) {
            logger_1.logger.error('Error removing contact:', error);
            throw error instanceof errors_1.AppError ? error : new errors_1.AppError('Failed to remove contact', 500);
        }
    }
    static async toggleBlockContact(userId, contactUserId, isBlocked) {
        try {
            const contact = await prisma.contact.findUnique({
                where: {
                    userId_contactUserId: {
                        userId,
                        contactUserId
                    }
                }
            });
            if (!contact) {
                throw new errors_1.AppError('Contact not found', 404);
            }
            const updatedContact = await prisma.contact.update({
                where: {
                    userId_contactUserId: {
                        userId,
                        contactUserId
                    }
                },
                data: { isBlocked },
                include: {
                    contactUser: {
                        select: {
                            id: true,
                            phoneNumber: true,
                            name: true,
                            about: true,
                            avatarUrl: true,
                            isOnline: true,
                            lastSeen: true
                        }
                    }
                }
            });
            return {
                id: updatedContact.contactUser.id,
                phoneNumber: updatedContact.contactUser.phoneNumber,
                name: updatedContact.customName || updatedContact.contactUser.name || undefined,
                about: updatedContact.contactUser.about || undefined,
                avatarUrl: updatedContact.contactUser.avatarUrl || undefined,
                isOnline: updatedContact.contactUser.isOnline,
                lastSeen: updatedContact.contactUser.lastSeen || undefined,
                isBlocked: updatedContact.isBlocked,
                isMuted: updatedContact.isMuted
            };
        }
        catch (error) {
            logger_1.logger.error('Error toggling block contact:', error);
            throw error instanceof errors_1.AppError ? error : new errors_1.AppError('Failed to update contact', 500);
        }
    }
    static async toggleMuteContact(userId, contactUserId, isMuted) {
        try {
            const contact = await prisma.contact.findUnique({
                where: {
                    userId_contactUserId: {
                        userId,
                        contactUserId
                    }
                }
            });
            if (!contact) {
                throw new errors_1.AppError('Contact not found', 404);
            }
            const updatedContact = await prisma.contact.update({
                where: {
                    userId_contactUserId: {
                        userId,
                        contactUserId
                    }
                },
                data: { isMuted },
                include: {
                    contactUser: {
                        select: {
                            id: true,
                            phoneNumber: true,
                            name: true,
                            about: true,
                            avatarUrl: true,
                            isOnline: true,
                            lastSeen: true
                        }
                    }
                }
            });
            return {
                id: updatedContact.contactUser.id,
                phoneNumber: updatedContact.contactUser.phoneNumber,
                name: updatedContact.customName || updatedContact.contactUser.name || undefined,
                about: updatedContact.contactUser.about || undefined,
                avatarUrl: updatedContact.contactUser.avatarUrl || undefined,
                isOnline: updatedContact.contactUser.isOnline,
                lastSeen: updatedContact.contactUser.lastSeen || undefined,
                isBlocked: updatedContact.isBlocked,
                isMuted: updatedContact.isMuted
            };
        }
        catch (error) {
            logger_1.logger.error('Error toggling mute contact:', error);
            throw error instanceof errors_1.AppError ? error : new errors_1.AppError('Failed to update contact', 500);
        }
    }
    static async updateContactName(userId, contactUserId, customName) {
        try {
            const contact = await prisma.contact.findUnique({
                where: {
                    userId_contactUserId: {
                        userId,
                        contactUserId
                    }
                }
            });
            if (!contact) {
                throw new errors_1.AppError('Contact not found', 404);
            }
            const updatedContact = await prisma.contact.update({
                where: {
                    userId_contactUserId: {
                        userId,
                        contactUserId
                    }
                },
                data: { customName: customName.trim() || null },
                include: {
                    contactUser: {
                        select: {
                            id: true,
                            phoneNumber: true,
                            name: true,
                            about: true,
                            avatarUrl: true,
                            isOnline: true,
                            lastSeen: true
                        }
                    }
                }
            });
            return {
                id: updatedContact.contactUser.id,
                phoneNumber: updatedContact.contactUser.phoneNumber,
                name: updatedContact.customName || updatedContact.contactUser.name || undefined,
                about: updatedContact.contactUser.about || undefined,
                avatarUrl: updatedContact.contactUser.avatarUrl || undefined,
                isOnline: updatedContact.contactUser.isOnline,
                lastSeen: updatedContact.contactUser.lastSeen || undefined,
                isBlocked: updatedContact.isBlocked,
                isMuted: updatedContact.isMuted
            };
        }
        catch (error) {
            logger_1.logger.error('Error updating contact name:', error);
            throw error instanceof errors_1.AppError ? error : new errors_1.AppError('Failed to update contact name', 500);
        }
    }
    static async getUserById(userId, requesterId) {
        try {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    phoneNumber: true,
                    name: true,
                    avatarUrl: true,
                    isOnline: true,
                    lastSeen: true
                }
            });
            if (!user) {
                throw new errors_1.AppError('User not found', 404);
            }
            const isBlockedByUser = await prisma.contact.findFirst({
                where: {
                    userId: userId,
                    contactUserId: requesterId,
                    isBlocked: true
                }
            });
            if (isBlockedByUser) {
                throw new errors_1.AppError('User not found', 404);
            }
            return {
                id: user.id,
                phoneNumber: user.phoneNumber,
                name: user.name || undefined,
                avatarUrl: user.avatarUrl || undefined,
                isOnline: user.isOnline
            };
        }
        catch (error) {
            logger_1.logger.error('Error getting user by ID:', error);
            throw error instanceof errors_1.AppError ? error : new errors_1.AppError('Failed to get user', 500);
        }
    }
    static async updateOnlineStatus(userId, isOnline) {
        try {
            await prisma.user.update({
                where: { id: userId },
                data: {
                    isOnline,
                    lastSeen: isOnline ? null : new Date()
                }
            });
            await redis_service_1.RedisService.setCache(`user_online:${userId}`, { isOnline, lastUpdated: new Date().toISOString() }, 300);
        }
        catch (error) {
            logger_1.logger.error('Error updating online status:', error);
            throw new errors_1.AppError('Failed to update status', 500);
        }
    }
    static async getBlockedUsers(userId) {
        try {
            const blockedContacts = await prisma.contact.findMany({
                where: {
                    userId,
                    isBlocked: true
                },
                include: {
                    contactUser: {
                        select: {
                            id: true,
                            phoneNumber: true,
                            name: true,
                            about: true,
                            avatarUrl: true,
                            isOnline: true,
                            lastSeen: true
                        }
                    }
                },
                orderBy: { contactUser: { name: 'asc' } }
            });
            return blockedContacts.map(contact => ({
                id: contact.contactUser.id,
                phoneNumber: contact.contactUser.phoneNumber,
                name: contact.customName || contact.contactUser.name || undefined,
                about: contact.contactUser.about || undefined,
                avatarUrl: contact.contactUser.avatarUrl || undefined,
                isOnline: contact.contactUser.isOnline,
                lastSeen: contact.contactUser.lastSeen || undefined,
                isBlocked: contact.isBlocked,
                isMuted: contact.isMuted
            }));
        }
        catch (error) {
            logger_1.logger.error('Error getting blocked users:', error);
            throw new errors_1.AppError('Failed to get blocked users', 500);
        }
    }
}
exports.UserService = UserService;
//# sourceMappingURL=user.service.js.map