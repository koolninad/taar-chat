import { Router } from 'express';
import * as userController from '../controllers/user.controller';
import { validate, userSchemas } from '../middleware/validation.middleware';
import { authenticateToken, createRateLimit } from '../middleware/auth.middleware';

const router = Router();

// All user routes require authentication
router.use(authenticateToken);

/**
 * @swagger
 * /api/v1/users/search:
 *   get:
 *     summary: Search users by phone number or name
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 2
 *         description: Search query (phone number or name)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 20
 *         description: Maximum number of results
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     users:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           phoneNumber:
 *                             type: string
 *                           name:
 *                             type: string
 *                           avatarUrl:
 *                             type: string
 *                           isOnline:
 *                             type: boolean
 *                     query:
 *                       type: string
 *                     total:
 *                       type: integer
 *       400:
 *         description: Invalid search query
 *       401:
 *         description: Authentication required
 */
router.get(
  '/search',
  createRateLimit(60000, 30, 'Too many search requests'), // 30 requests per minute
  validate(userSchemas.searchUsers),
  userController.searchUsers
);

/**
 * @swagger
 * /api/v1/users/contacts:
 *   get:
 *     summary: Get user contacts
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User contacts retrieved successfully
 *       401:
 *         description: Authentication required
 */
router.get('/contacts', userController.getContacts);

/**
 * @swagger
 * /api/v1/users/contacts:
 *   post:
 *     summary: Add new contact
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phoneNumber
 *             properties:
 *               phoneNumber:
 *                 type: string
 *                 example: "+919876543210"
 *               customName:
 *                 type: string
 *                 example: "John Doe"
 *     responses:
 *       201:
 *         description: Contact added successfully
 *       400:
 *         description: Invalid phone number or contact already exists
 *       404:
 *         description: User not found with this phone number
 *       401:
 *         description: Authentication required
 */
router.post(
  '/contacts',
  createRateLimit(300000, 10, 'Too many contact additions'), // 10 requests per 5 minutes
  validate(userSchemas.addContact),
  userController.addContact
);

/**
 * @swagger
 * /api/v1/users/contacts/import:
 *   post:
 *     summary: Import multiple contacts from phone
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - contacts
 *             properties:
 *               contacts:
 *                 type: array
 *                 maxItems: 100
 *                 items:
 *                   type: object
 *                   required:
 *                     - phoneNumber
 *                   properties:
 *                     phoneNumber:
 *                       type: string
 *                     name:
 *                       type: string
 *     responses:
 *       200:
 *         description: Contact import completed
 *       400:
 *         description: Invalid contacts data
 *       401:
 *         description: Authentication required
 */
router.post(
  '/contacts/import',
  createRateLimit(3600000, 3, 'Too many import requests'), // 3 requests per hour
  validate(userSchemas.importContacts),
  userController.importContacts
);

/**
 * @swagger
 * /api/v1/users/contacts/{contactId}:
 *   delete:
 *     summary: Remove contact
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contactId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Contact removed successfully
 *       404:
 *         description: Contact not found
 *       401:
 *         description: Authentication required
 */
router.delete(
  '/contacts/:contactId',
  validate(userSchemas.removeContact),
  userController.removeContact
);

/**
 * @swagger
 * /api/v1/users/contacts/{contactId}/block:
 *   patch:
 *     summary: Block or unblock contact
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contactId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isBlocked
 *             properties:
 *               isBlocked:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Contact block status updated
 *       404:
 *         description: Contact not found
 *       401:
 *         description: Authentication required
 */
router.patch(
  '/contacts/:contactId/block',
  validate(userSchemas.toggleBlock),
  userController.toggleBlockContact
);

/**
 * @swagger
 * /api/v1/users/contacts/{contactId}/mute:
 *   patch:
 *     summary: Mute or unmute contact
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contactId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isMuted
 *             properties:
 *               isMuted:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Contact mute status updated
 *       404:
 *         description: Contact not found
 *       401:
 *         description: Authentication required
 */
router.patch(
  '/contacts/:contactId/mute',
  validate(userSchemas.toggleMute),
  userController.toggleMuteContact
);

/**
 * @swagger
 * /api/v1/users/contacts/{contactId}/name:
 *   patch:
 *     summary: Update contact custom name
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contactId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customName
 *             properties:
 *               customName:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 255
 *     responses:
 *       200:
 *         description: Contact name updated successfully
 *       404:
 *         description: Contact not found
 *       401:
 *         description: Authentication required
 */
router.patch(
  '/contacts/:contactId/name',
  validate(userSchemas.updateContactName),
  userController.updateContactName
);

/**
 * @swagger
 * /api/v1/users/blocked:
 *   get:
 *     summary: Get blocked users
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Blocked users retrieved successfully
 *       401:
 *         description: Authentication required
 */
router.get('/blocked', userController.getBlockedUsers);

/**
 * @swagger
 * /api/v1/users/{userId}:
 *   get:
 *     summary: Get user profile by ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *       404:
 *         description: User not found
 *       401:
 *         description: Authentication required
 */
router.get(
  '/:userId',
  validate(userSchemas.getUserById),
  userController.getUserProfile
);

/**
 * @swagger
 * /api/v1/users/{userId}/mutual-contacts:
 *   get:
 *     summary: Get mutual contacts with another user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Mutual contacts retrieved successfully
 *       404:
 *         description: User not found
 *       401:
 *         description: Authentication required
 */
router.get(
  '/:userId/mutual-contacts',
  validate(userSchemas.getUserById),
  userController.getMutualContacts
);

/**
 * @swagger
 * /api/v1/users/status/online:
 *   patch:
 *     summary: Update online status
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isOnline
 *             properties:
 *               isOnline:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Online status updated successfully
 *       401:
 *         description: Authentication required
 */
router.patch(
  '/status/online',
  validate(userSchemas.updateOnlineStatus),
  userController.updateOnlineStatus
);

export { router as userRoutes };