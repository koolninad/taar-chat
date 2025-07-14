import { Request, Response } from 'express';
import { UserService } from '../services/user.service';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';
import { asyncHandler } from '../middleware/errorHandler';

/**
 * Search users by phone number or name
 */
export const searchUsers = asyncHandler(async (req: Request, res: Response) => {
  const { query, limit } = req.query;
  const userId = req.user!.userId;

  if (!query || typeof query !== 'string') {
    throw new AppError('Search query is required', 400);
  }

  const searchLimit = limit ? parseInt(limit as string) : 20;
  
  if (searchLimit > 50) {
    throw new AppError('Limit cannot exceed 50', 400);
  }

  const users = await UserService.searchUsers(query, userId, searchLimit);

  res.status(200).json({
    success: true,
    data: {
      users,
      query,
      total: users.length
    }
  });
});

/**
 * Get user contacts
 */
export const getContacts = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  const contacts = await UserService.getContacts(userId);

  res.status(200).json({
    success: true,
    data: {
      contacts,
      total: contacts.length
    }
  });
});

/**
 * Add new contact
 */
export const addContact = asyncHandler(async (req: Request, res: Response) => {
  const { phoneNumber, customName } = req.body;
  const userId = req.user!.userId;

  const contact = await UserService.addContact(userId, phoneNumber, customName);

  logger.info('Contact added', { userId, contactId: contact.id });

  res.status(201).json({
    success: true,
    message: 'Contact added successfully',
    data: {
      contact
    }
  });
});

/**
 * Remove contact
 */
export const removeContact = asyncHandler(async (req: Request, res: Response) => {
  const { contactId } = req.params;
  const userId = req.user!.userId;

  await UserService.removeContact(userId, contactId!);

  logger.info('Contact removed', { userId, contactId });

  res.status(200).json({
    success: true,
    message: 'Contact removed successfully'
  });
});

/**
 * Block/Unblock contact
 */
export const toggleBlockContact = asyncHandler(async (req: Request, res: Response) => {
  const { contactId } = req.params;
  const { isBlocked } = req.body;
  const userId = req.user!.userId;

  const contact = await UserService.toggleBlockContact(userId, contactId!, isBlocked);

  logger.info('Contact block status updated', { userId, contactId, isBlocked });

  res.status(200).json({
    success: true,
    message: `Contact ${isBlocked ? 'blocked' : 'unblocked'} successfully`,
    data: {
      contact
    }
  });
});

/**
 * Mute/Unmute contact
 */
export const toggleMuteContact = asyncHandler(async (req: Request, res: Response) => {
  const { contactId } = req.params;
  const { isMuted } = req.body;
  const userId = req.user!.userId;

  const contact = await UserService.toggleMuteContact(userId, contactId!, isMuted);

  logger.info('Contact mute status updated', { userId, contactId, isMuted });

  res.status(200).json({
    success: true,
    message: `Contact ${isMuted ? 'muted' : 'unmuted'} successfully`,
    data: {
      contact
    }
  });
});

/**
 * Update contact custom name
 */
export const updateContactName = asyncHandler(async (req: Request, res: Response) => {
  const { contactId } = req.params;
  const { customName } = req.body;
  const userId = req.user!.userId;

  const contact = await UserService.updateContactName(userId, contactId!, customName);

  logger.info('Contact name updated', { userId, contactId });

  res.status(200).json({
    success: true,
    message: 'Contact name updated successfully',
    data: {
      contact
    }
  });
});

/**
 * Get user profile by ID
 */
export const getUserProfile = asyncHandler(async (req: Request, res: Response) => {
  const { userId: targetUserId } = req.params;
  const userId = req.user!.userId;

  const user = await UserService.getUserById(targetUserId!, userId);

  res.status(200).json({
    success: true,
    data: {
      user
    }
  });
});

/**
 * Update online status
 */
export const updateOnlineStatus = asyncHandler(async (req: Request, res: Response) => {
  const { isOnline } = req.body;
  const userId = req.user!.userId;

  await UserService.updateOnlineStatus(userId, isOnline);

  res.status(200).json({
    success: true,
    message: `Status updated to ${isOnline ? 'online' : 'offline'}`
  });
});

/**
 * Get blocked users
 */
export const getBlockedUsers = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  const blockedUsers = await UserService.getBlockedUsers(userId);

  res.status(200).json({
    success: true,
    data: {
      blockedUsers,
      total: blockedUsers.length
    }
  });
});

/**
 * Get mutual contacts between two users
 */
export const getMutualContacts = asyncHandler(async (req: Request, res: Response) => {
  const { userId: targetUserId } = req.params;
  const currentUserId = req.user!.userId;

  // This would require a more complex query to find mutual contacts
  // For now, returning empty array as placeholder
  const mutualContacts: any[] = [];

  res.status(200).json({
    success: true,
    data: {
      mutualContacts,
      total: mutualContacts.length
    }
  });
});

/**
 * Import contacts from phone
 */
export const importContacts = asyncHandler(async (req: Request, res: Response) => {
  const { contacts } = req.body; // Array of { phoneNumber, name? }
  const userId = req.user!.userId;

  if (!Array.isArray(contacts)) {
    throw new AppError('Contacts must be an array', 400);
  }

  if (contacts.length > 100) {
    throw new AppError('Cannot import more than 100 contacts at once', 400);
  }

  const results = {
    imported: 0,
    alreadyExists: 0,
    notFound: 0,
    errors: 0
  };

  // Process each contact
  for (const contactData of contacts) {
    try {
      if (!contactData.phoneNumber) continue;
      
      await UserService.addContact(
        userId, 
        contactData.phoneNumber, 
        contactData.name
      );
      results.imported++;
    } catch (error: any) {
      if (error.message?.includes('already exists')) {
        results.alreadyExists++;
      } else if (error.message?.includes('not found')) {
        results.notFound++;
      } else {
        results.errors++;
      }
    }
  }

  logger.info('Contacts imported', { userId, results });

  res.status(200).json({
    success: true,
    message: 'Contact import completed',
    data: {
      results,
      totalProcessed: contacts.length
    }
  });
});