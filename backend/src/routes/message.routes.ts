import { Router } from 'express';
import * as messageController from '../controllers/message.controller';
import { validate, messageSchemas } from '../middleware/validation.middleware';
import { authenticateToken, createRateLimit } from '../middleware/auth.middleware';

const router = Router();

// All message routes require authentication
router.use(authenticateToken);

/**
 * @swagger
 * /api/v1/messages:
 *   post:
 *     summary: Send a message
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - encryptedContent
 *             properties:
 *               recipientId:
 *                 type: string
 *                 format: uuid
 *                 description: User ID for direct message
 *               groupId:
 *                 type: string
 *                 format: uuid
 *                 description: Group ID for group message
 *               encryptedContent:
 *                 type: string
 *                 format: base64
 *                 description: Encrypted message content
 *               messageType:
 *                 type: string
 *                 enum: [TEXT, IMAGE, VIDEO, AUDIO, DOCUMENT, LOCATION, CONTACT, STICKER]
 *                 default: TEXT
 *               replyToId:
 *                 type: string
 *                 format: uuid
 *                 description: Message ID being replied to
 *               mediaFileId:
 *                 type: string
 *                 format: uuid
 *                 description: Media file ID for media messages
 *     responses:
 *       201:
 *         description: Message sent successfully
 *       400:
 *         description: Invalid message data
 *       403:
 *         description: Cannot send to blocked user or unauthorized group
 *       401:
 *         description: Authentication required
 */
router.post(
  '/',
  createRateLimit(60000, 100, 'Too many messages'), // 100 messages per minute
  validate(messageSchemas.sendMessage),
  messageController.sendMessage
);

/**
 * @swagger
 * /api/v1/messages/search:
 *   get:
 *     summary: Search messages
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 2
 *         description: Search query
 *       - in: query
 *         name: chatId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Limit search to specific chat
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 20
 *     responses:
 *       200:
 *         description: Search results
 *       400:
 *         description: Invalid search query
 *       401:
 *         description: Authentication required
 */
router.get(
  '/search',
  createRateLimit(60000, 30, 'Too many search requests'), // 30 searches per minute
  messageController.searchMessages
);

/**
 * @swagger
 * /api/v1/messages/chats:
 *   get:
 *     summary: Get chat list
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Chat list retrieved successfully
 *       401:
 *         description: Authentication required
 */
router.get('/chats', messageController.getChatList);

/**
 * @swagger
 * /api/v1/messages/unread:
 *   get:
 *     summary: Get unread message count
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: chatId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Get unread count for specific chat
 *     responses:
 *       200:
 *         description: Unread count retrieved successfully
 *       401:
 *         description: Authentication required
 */
router.get('/unread', messageController.getUnreadCount);

/**
 * @swagger
 * /api/v1/messages/{chatId}:
 *   get:
 *     summary: Get messages for a chat
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Chat ID (user ID for direct chat, group ID for group chat)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *       - in: query
 *         name: before
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Get messages before this timestamp
 *       - in: query
 *         name: after
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Get messages after this timestamp
 *     responses:
 *       200:
 *         description: Messages retrieved successfully
 *       403:
 *         description: Invalid chat access
 *       401:
 *         description: Authentication required
 */
router.get(
  '/:chatId',
  validate(messageSchemas.getMessages),
  messageController.getMessages
);

/**
 * @swagger
 * /api/v1/messages/{chatId}/read:
 *   patch:
 *     summary: Mark all messages as read in a chat
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: All messages marked as read
 *       403:
 *         description: Invalid chat access
 *       401:
 *         description: Authentication required
 */
router.patch('/:chatId/read', messageController.markAllAsRead);

/**
 * @swagger
 * /api/v1/messages/{messageId}/delivered:
 *   patch:
 *     summary: Mark message as delivered
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Message marked as delivered
 *       404:
 *         description: Message not found
 *       403:
 *         description: Only recipient can mark as delivered
 *       401:
 *         description: Authentication required
 */
router.patch(
  '/:messageId/delivered',
  validate(messageSchemas.markAsDelivered),
  messageController.markAsDelivered
);

/**
 * @swagger
 * /api/v1/messages/{messageId}/read:
 *   patch:
 *     summary: Mark message as read
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Message marked as read
 *       404:
 *         description: Message not found
 *       403:
 *         description: Only recipient can mark as read
 *       401:
 *         description: Authentication required
 */
router.patch(
  '/:messageId/read',
  validate(messageSchemas.markAsRead),
  messageController.markAsRead
);

/**
 * @swagger
 * /api/v1/messages/{messageId}/status:
 *   get:
 *     summary: Get message delivery status
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Message status retrieved successfully
 *       404:
 *         description: Message not found
 *       401:
 *         description: Authentication required
 */
router.get('/:messageId/status', messageController.getDeliveryStatus);

/**
 * @swagger
 * /api/v1/messages/{messageId}/forward:
 *   post:
 *     summary: Forward message to other chats
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
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
 *             properties:
 *               recipientIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 description: User IDs to forward to
 *               groupIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 description: Group IDs to forward to
 *     responses:
 *       200:
 *         description: Message forwarded successfully
 *       404:
 *         description: Message not found
 *       400:
 *         description: Invalid forward request
 *       401:
 *         description: Authentication required
 */
router.post('/:messageId/forward', messageController.forwardMessage);

/**
 * @swagger
 * /api/v1/messages/{messageId}/reactions:
 *   get:
 *     summary: Get message reactions
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Message reactions retrieved successfully
 *       404:
 *         description: Message not found
 *       401:
 *         description: Authentication required
 */
router.get('/:messageId/reactions', messageController.getMessageReactions);

/**
 * @swagger
 * /api/v1/messages/{messageId}/reactions:
 *   post:
 *     summary: Add reaction to message
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
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
 *               - emoji
 *             properties:
 *               emoji:
 *                 type: string
 *                 description: Emoji reaction
 *     responses:
 *       200:
 *         description: Reaction added successfully
 *       404:
 *         description: Message not found
 *       400:
 *         description: Invalid emoji
 *       401:
 *         description: Authentication required
 */
router.post('/:messageId/reactions', messageController.addReaction);

/**
 * @swagger
 * /api/v1/messages/{messageId}/reactions:
 *   delete:
 *     summary: Remove reaction from message
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
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
 *               - emoji
 *             properties:
 *               emoji:
 *                 type: string
 *                 description: Emoji reaction to remove
 *     responses:
 *       200:
 *         description: Reaction removed successfully
 *       404:
 *         description: Message not found
 *       400:
 *         description: Invalid emoji
 *       401:
 *         description: Authentication required
 */
router.delete('/:messageId/reactions', messageController.removeReaction);

/**
 * @swagger
 * /api/v1/messages/{messageId}:
 *   delete:
 *     summary: Delete message
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               deleteForEveryone:
 *                 type: boolean
 *                 default: false
 *                 description: Delete message for all recipients
 *     responses:
 *       200:
 *         description: Message deleted successfully
 *       404:
 *         description: Message not found
 *       403:
 *         description: Only sender can delete message
 *       400:
 *         description: Message too old to delete for everyone
 *       401:
 *         description: Authentication required
 */
router.delete(
  '/:messageId',
  validate(messageSchemas.deleteMessage),
  messageController.deleteMessage
);

export { router as messageRoutes };