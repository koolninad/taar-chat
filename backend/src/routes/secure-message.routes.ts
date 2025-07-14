import { Router } from 'express';
import * as secureMessageController from '../controllers/secure-message.controller';
import { authenticateToken, createRateLimit } from '../middleware/auth.middleware';

const router = Router();

// All secure messaging routes require authentication
router.use(authenticateToken);

/**
 * @swagger
 * /api/v1/secure-messages:
 *   post:
 *     summary: Send encrypted message using Signal Protocol
 *     tags: [Secure Messages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               recipientId:
 *                 type: string
 *                 format: uuid
 *                 description: User ID for direct message
 *               groupId:
 *                 type: string
 *                 format: uuid
 *                 description: Group ID for group message
 *               message:
 *                 type: string
 *                 description: Plain text message to encrypt
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
 *               deviceId:
 *                 type: integer
 *                 default: 1
 *     responses:
 *       201:
 *         description: Encrypted message sent successfully
 *       400:
 *         description: Invalid message data
 *       401:
 *         description: Authentication required
 */
router.post(
  '/',
  createRateLimit(60000, 100, 'Too many secure messages'), // 100 per minute
  secureMessageController.sendSecureMessage
);

/**
 * @swagger
 * /api/v1/secure-messages/{messageId}/decrypt:
 *   post:
 *     summary: Decrypt received message
 *     tags: [Secure Messages]
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
 *               deviceId:
 *                 type: integer
 *                 default: 1
 *     responses:
 *       200:
 *         description: Message decrypted successfully
 *       404:
 *         description: Message not found
 *       403:
 *         description: Access denied to this message
 *       401:
 *         description: Authentication required
 */
router.post('/:messageId/decrypt', secureMessageController.decryptMessage);

/**
 * @swagger
 * /api/v1/secure-messages/chat/{chatId}:
 *   get:
 *     summary: Get encrypted messages for a chat
 *     tags: [Secure Messages]
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
 *     responses:
 *       200:
 *         description: Encrypted messages retrieved successfully
 *       403:
 *         description: Invalid chat access
 *       401:
 *         description: Authentication required
 */
router.get('/chat/:chatId', secureMessageController.getEncryptedMessages);

/**
 * @swagger
 * /api/v1/secure-messages/key-exchange:
 *   post:
 *     summary: Process key exchange for new conversation
 *     tags: [Secure Messages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - remoteUserId
 *             properties:
 *               remoteUserId:
 *                 type: string
 *                 format: uuid
 *               deviceId:
 *                 type: integer
 *                 default: 1
 *     responses:
 *       200:
 *         description: Key exchange processed successfully
 *       400:
 *         description: Invalid parameters
 *       401:
 *         description: Authentication required
 */
router.post('/key-exchange', secureMessageController.processKeyExchange);

/**
 * @swagger
 * /api/v1/secure-messages/verify/{chatId}:
 *   get:
 *     summary: Verify conversation integrity
 *     tags: [Secure Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: lastKnownMessageId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Last known message ID for integrity check
 *     responses:
 *       200:
 *         description: Conversation verification completed
 *       403:
 *         description: Access denied to this conversation
 *       401:
 *         description: Authentication required
 */
router.get('/verify/:chatId', secureMessageController.verifyConversation);

/**
 * @swagger
 * /api/v1/secure-messages/sessions/{remoteUserId}:
 *   get:
 *     summary: Get Signal Protocol session information
 *     tags: [Secure Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: remoteUserId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: deviceId
 *         schema:
 *           type: integer
 *           default: 1
 *     responses:
 *       200:
 *         description: Session information retrieved
 *       404:
 *         description: Session not found
 *       401:
 *         description: Authentication required
 */
router.get('/sessions/:remoteUserId', secureMessageController.getSessionInfo);

/**
 * @swagger
 * /api/v1/secure-messages/stats:
 *   get:
 *     summary: Get secure messaging statistics
 *     tags: [Secure Messages]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *       401:
 *         description: Authentication required
 */
router.get('/stats', secureMessageController.getSecureMessagingStats);

/**
 * @swagger
 * /api/v1/secure-messages/batch-decrypt:
 *   post:
 *     summary: Decrypt multiple messages at once
 *     tags: [Secure Messages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - messageIds
 *             properties:
 *               messageIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 minItems: 1
 *                 maxItems: 50
 *               deviceId:
 *                 type: integer
 *                 default: 1
 *     responses:
 *       200:
 *         description: Batch decryption completed
 *       400:
 *         description: Invalid message IDs
 *       401:
 *         description: Authentication required
 */
router.post(
  '/batch-decrypt',
  createRateLimit(300000, 10, 'Too many batch decrypt requests'), // 10 per 5 minutes
  secureMessageController.batchDecryptMessages
);

/**
 * @swagger
 * /api/v1/secure-messages/{messageId}/re-encrypt:
 *   post:
 *     summary: Re-encrypt message with new keys
 *     tags: [Secure Messages]
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
 *               newDeviceId:
 *                 type: integer
 *     responses:
 *       501:
 *         description: Not yet implemented
 *       404:
 *         description: Message not found
 *       401:
 *         description: Authentication required
 */
router.post('/:messageId/re-encrypt', secureMessageController.reEncryptMessage);

/**
 * @swagger
 * /api/v1/secure-messages/security/{chatId}:
 *   get:
 *     summary: Get conversation security status
 *     tags: [Secure Messages]
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
 *         description: Security status retrieved
 *       403:
 *         description: Access denied to this conversation
 *       401:
 *         description: Authentication required
 */
router.get('/security/:chatId', secureMessageController.getConversationSecurity);

/**
 * @swagger
 * /api/v1/secure-messages/export/{chatId}:
 *   get:
 *     summary: Export conversation keys for backup
 *     tags: [Secure Messages]
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
 *       403:
 *         description: Export not available via API for security
 *       401:
 *         description: Authentication required
 */
router.get('/export/:chatId', secureMessageController.exportConversationKeys);

/**
 * @swagger
 * /api/v1/secure-messages/health:
 *   get:
 *     summary: Secure messaging service health check
 *     tags: [Secure Messages]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Service is healthy
 *       503:
 *         description: Service is unhealthy
 */
router.get('/health', secureMessageController.secureMessagingHealthCheck);

export { router as secureMessageRoutes };