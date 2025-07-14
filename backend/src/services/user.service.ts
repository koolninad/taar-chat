import { PrismaClient } from '@prisma/client';
import { RedisService } from './redis.service';
import { AppError, ErrorMessages } from '../utils/errors';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export interface ContactInfo {
  id: string;
  phoneNumber: string;
  name?: string;
  about?: string;
  avatarUrl?: string;
  isOnline: boolean;
  lastSeen?: Date;
  isBlocked?: boolean;
  isMuted?: boolean;
}

export interface UserSearchResult {
  id: string;
  phoneNumber: string;
  name?: string;
  avatarUrl?: string;
  isOnline: boolean;
}

export class UserService {
  /**
   * Search users by phone number or name
   */
  static async searchUsers(
    query: string,
    currentUserId: string,
    limit: number = 20
  ): Promise<UserSearchResult[]> {
    try {
      // Clean and format query
      const cleanQuery = query.trim().toLowerCase();
      
      if (cleanQuery.length < 2) {
        throw new AppError('Search query must be at least 2 characters', 400);
      }

      const users = await prisma.user.findMany({
        where: {
          AND: [
            { id: { not: currentUserId } }, // Exclude current user
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
    } catch (error) {
      logger.error('Error searching users:', error);
      throw error instanceof AppError ? error : new AppError('Failed to search users', 500);
    }
  }

  /**
   * Get user contacts
   */
  static async getContacts(userId: string): Promise<ContactInfo[]> {
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
    } catch (error) {
      logger.error('Error getting contacts:', error);
      throw new AppError('Failed to get contacts', 500);
    }
  }

  /**
   * Add contact
   */
  static async addContact(
    userId: string, 
    contactPhoneNumber: string,
    customName?: string
  ): Promise<ContactInfo> {
    try {
      // Find the user to add as contact
      const contactUser = await prisma.user.findUnique({
        where: { phoneNumber: contactPhoneNumber }
      });

      if (!contactUser) {
        throw new AppError('User not found with this phone number', 404);
      }

      if (contactUser.id === userId) {
        throw new AppError('Cannot add yourself as contact', 400);
      }

      // Check if contact already exists
      const existingContact = await prisma.contact.findUnique({
        where: {
          userId_contactUserId: {
            userId,
            contactUserId: contactUser.id
          }
        }
      });

      if (existingContact) {
        throw new AppError('Contact already exists', 409);
      }

      // Add contact
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
    } catch (error) {
      logger.error('Error adding contact:', error);
      throw error instanceof AppError ? error : new AppError('Failed to add contact', 500);
    }
  }

  /**
   * Remove contact
   */
  static async removeContact(userId: string, contactUserId: string): Promise<void> {
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
        throw new AppError('Contact not found', 404);
      }

      await prisma.contact.delete({
        where: {
          userId_contactUserId: {
            userId,
            contactUserId
          }
        }
      });
    } catch (error) {
      logger.error('Error removing contact:', error);
      throw error instanceof AppError ? error : new AppError('Failed to remove contact', 500);
    }
  }

  /**
   * Block/Unblock contact
   */
  static async toggleBlockContact(
    userId: string, 
    contactUserId: string, 
    isBlocked: boolean
  ): Promise<ContactInfo> {
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
        throw new AppError('Contact not found', 404);
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
    } catch (error) {
      logger.error('Error toggling block contact:', error);
      throw error instanceof AppError ? error : new AppError('Failed to update contact', 500);
    }
  }

  /**
   * Mute/Unmute contact
   */
  static async toggleMuteContact(
    userId: string, 
    contactUserId: string, 
    isMuted: boolean
  ): Promise<ContactInfo> {
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
        throw new AppError('Contact not found', 404);
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
    } catch (error) {
      logger.error('Error toggling mute contact:', error);
      throw error instanceof AppError ? error : new AppError('Failed to update contact', 500);
    }
  }

  /**
   * Update contact custom name
   */
  static async updateContactName(
    userId: string, 
    contactUserId: string, 
    customName: string
  ): Promise<ContactInfo> {
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
        throw new AppError('Contact not found', 404);
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
    } catch (error) {
      logger.error('Error updating contact name:', error);
      throw error instanceof AppError ? error : new AppError('Failed to update contact name', 500);
    }
  }

  /**
   * Get user profile by ID
   */
  static async getUserById(userId: string, requesterId: string): Promise<UserSearchResult> {
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
        throw new AppError('User not found', 404);
      }

      // Check if requester is blocked by this user
      const isBlockedByUser = await prisma.contact.findFirst({
        where: {
          userId: userId,
          contactUserId: requesterId,
          isBlocked: true
        }
      });

      if (isBlockedByUser) {
        throw new AppError('User not found', 404);
      }

      return {
        id: user.id,
        phoneNumber: user.phoneNumber,
        name: user.name || undefined,
        avatarUrl: user.avatarUrl || undefined,
        isOnline: user.isOnline
      };
    } catch (error) {
      logger.error('Error getting user by ID:', error);
      throw error instanceof AppError ? error : new AppError('Failed to get user', 500);
    }
  }

  /**
   * Update user online status
   */
  static async updateOnlineStatus(userId: string, isOnline: boolean): Promise<void> {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          isOnline,
          lastSeen: isOnline ? null : new Date()
        }
      });

      // Cache online status in Redis for quick access
      await RedisService.setCache(
        `user_online:${userId}`,
        { isOnline, lastUpdated: new Date().toISOString() },
        300 // 5 minutes
      );
    } catch (error) {
      logger.error('Error updating online status:', error);
      throw new AppError('Failed to update status', 500);
    }
  }

  /**
   * Get blocked users
   */
  static async getBlockedUsers(userId: string): Promise<ContactInfo[]> {
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
    } catch (error) {
      logger.error('Error getting blocked users:', error);
      throw new AppError('Failed to get blocked users', 500);
    }
  }
}