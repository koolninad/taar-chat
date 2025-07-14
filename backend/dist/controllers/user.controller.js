"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.importContacts = exports.getMutualContacts = exports.getBlockedUsers = exports.updateOnlineStatus = exports.getUserProfile = exports.updateContactName = exports.toggleMuteContact = exports.toggleBlockContact = exports.removeContact = exports.addContact = exports.getContacts = exports.searchUsers = void 0;
const user_service_1 = require("../services/user.service");
const logger_1 = require("../utils/logger");
const errors_1 = require("../utils/errors");
const errorHandler_1 = require("../middleware/errorHandler");
exports.searchUsers = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { query, limit } = req.query;
    const userId = req.user.userId;
    if (!query || typeof query !== 'string') {
        throw new errors_1.AppError('Search query is required', 400);
    }
    const searchLimit = limit ? parseInt(limit) : 20;
    if (searchLimit > 50) {
        throw new errors_1.AppError('Limit cannot exceed 50', 400);
    }
    const users = await user_service_1.UserService.searchUsers(query, userId, searchLimit);
    res.status(200).json({
        success: true,
        data: {
            users,
            query,
            total: users.length
        }
    });
});
exports.getContacts = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.userId;
    const contacts = await user_service_1.UserService.getContacts(userId);
    res.status(200).json({
        success: true,
        data: {
            contacts,
            total: contacts.length
        }
    });
});
exports.addContact = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { phoneNumber, customName } = req.body;
    const userId = req.user.userId;
    const contact = await user_service_1.UserService.addContact(userId, phoneNumber, customName);
    logger_1.logger.info('Contact added', { userId, contactId: contact.id });
    res.status(201).json({
        success: true,
        message: 'Contact added successfully',
        data: {
            contact
        }
    });
});
exports.removeContact = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { contactId } = req.params;
    const userId = req.user.userId;
    await user_service_1.UserService.removeContact(userId, contactId);
    logger_1.logger.info('Contact removed', { userId, contactId });
    res.status(200).json({
        success: true,
        message: 'Contact removed successfully'
    });
});
exports.toggleBlockContact = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { contactId } = req.params;
    const { isBlocked } = req.body;
    const userId = req.user.userId;
    const contact = await user_service_1.UserService.toggleBlockContact(userId, contactId, isBlocked);
    logger_1.logger.info('Contact block status updated', { userId, contactId, isBlocked });
    res.status(200).json({
        success: true,
        message: `Contact ${isBlocked ? 'blocked' : 'unblocked'} successfully`,
        data: {
            contact
        }
    });
});
exports.toggleMuteContact = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { contactId } = req.params;
    const { isMuted } = req.body;
    const userId = req.user.userId;
    const contact = await user_service_1.UserService.toggleMuteContact(userId, contactId, isMuted);
    logger_1.logger.info('Contact mute status updated', { userId, contactId, isMuted });
    res.status(200).json({
        success: true,
        message: `Contact ${isMuted ? 'muted' : 'unmuted'} successfully`,
        data: {
            contact
        }
    });
});
exports.updateContactName = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { contactId } = req.params;
    const { customName } = req.body;
    const userId = req.user.userId;
    const contact = await user_service_1.UserService.updateContactName(userId, contactId, customName);
    logger_1.logger.info('Contact name updated', { userId, contactId });
    res.status(200).json({
        success: true,
        message: 'Contact name updated successfully',
        data: {
            contact
        }
    });
});
exports.getUserProfile = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { userId: targetUserId } = req.params;
    const userId = req.user.userId;
    const user = await user_service_1.UserService.getUserById(targetUserId, userId);
    res.status(200).json({
        success: true,
        data: {
            user
        }
    });
});
exports.updateOnlineStatus = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { isOnline } = req.body;
    const userId = req.user.userId;
    await user_service_1.UserService.updateOnlineStatus(userId, isOnline);
    res.status(200).json({
        success: true,
        message: `Status updated to ${isOnline ? 'online' : 'offline'}`
    });
});
exports.getBlockedUsers = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.userId;
    const blockedUsers = await user_service_1.UserService.getBlockedUsers(userId);
    res.status(200).json({
        success: true,
        data: {
            blockedUsers,
            total: blockedUsers.length
        }
    });
});
exports.getMutualContacts = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { userId: targetUserId } = req.params;
    const currentUserId = req.user.userId;
    const mutualContacts = [];
    res.status(200).json({
        success: true,
        data: {
            mutualContacts,
            total: mutualContacts.length
        }
    });
});
exports.importContacts = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { contacts } = req.body;
    const userId = req.user.userId;
    if (!Array.isArray(contacts)) {
        throw new errors_1.AppError('Contacts must be an array', 400);
    }
    if (contacts.length > 100) {
        throw new errors_1.AppError('Cannot import more than 100 contacts at once', 400);
    }
    const results = {
        imported: 0,
        alreadyExists: 0,
        notFound: 0,
        errors: 0
    };
    for (const contactData of contacts) {
        try {
            if (!contactData.phoneNumber)
                continue;
            await user_service_1.UserService.addContact(userId, contactData.phoneNumber, contactData.name);
            results.imported++;
        }
        catch (error) {
            if (error.message?.includes('already exists')) {
                results.alreadyExists++;
            }
            else if (error.message?.includes('not found')) {
                results.notFound++;
            }
            else {
                results.errors++;
            }
        }
    }
    logger_1.logger.info('Contacts imported', { userId, results });
    res.status(200).json({
        success: true,
        message: 'Contact import completed',
        data: {
            results,
            totalProcessed: contacts.length
        }
    });
});
//# sourceMappingURL=user.controller.js.map