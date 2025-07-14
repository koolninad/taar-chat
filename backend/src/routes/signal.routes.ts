import { Router } from 'express';
import * as signalController from '../controllers/signal.controller';
import { validate, signalSchemas } from '../middleware/validation.middleware';
import { authenticateToken, createRateLimit } from '../middleware/auth.middleware';

const router = Router();

// All Signal Protocol routes require authentication
router.use(authenticateToken);

/**
 * @swagger
 * /api/v1/signal/init:
 *   post:
 *     summary: Initialize Signal Protocol for user
 *     tags: [Signal Protocol]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               deviceId:
 *                 type: integer
 *                 default: 1
 *                 description: Device ID for this client
 *     responses:
 *       200:
 *         description: Signal Protocol initialized successfully
 *       400:
 *         description: Invalid device ID
 *       401:
 *         description: Authentication required
 */
router.post(
  '/init',
  createRateLimit(3600000, 5, 'Too many Signal initialization requests'), // 5 per hour
  signalController.initializeSignal
);

/**
 * @swagger
 * /api/v1/signal/prekeys:
 *   post:
 *     summary: Generate prekeys
 *     tags: [Signal Protocol]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               deviceId:
 *                 type: integer
 *                 default: 1
 *               count:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 1000
 *                 default: 100
 *     responses:
 *       200:
 *         description: Prekeys generated successfully
 *       400:
 *         description: Invalid parameters
 *       401:
 *         description: Authentication required
 */
router.post(
  '/prekeys',
  createRateLimit(3600000, 10, 'Too many prekey generation requests'), // 10 per hour
  signalController.generatePreKeys
);

/**
 * @swagger
 * /api/v1/signal/prekeys/my:
 *   get:
 *     summary: Get own prekey bundle
 *     tags: [Signal Protocol]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: deviceId
 *         schema:
 *           type: integer
 *           default: 1
 *     responses:
 *       200:
 *         description: Prekey bundle retrieved successfully
 *       404:
 *         description: No prekeys available
 *       401:
 *         description: Authentication required
 */
router.get('/prekeys/my', signalController.getMyPreKeyBundle);

/**
 * @swagger
 * /api/v1/signal/prekeys/{userId}:
 *   get:
 *     summary: Get prekey bundle for another user
 *     tags: [Signal Protocol]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
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
 *         description: Prekey bundle retrieved successfully
 *       404:
 *         description: User or prekeys not found
 *       401:
 *         description: Authentication required
 */
router.get(
  '/prekeys/:userId',
  createRateLimit(60000, 30, 'Too many prekey requests'), // 30 per minute
  validate(signalSchemas.getPrekeys),
  signalController.getPreKeyBundle
);

/**
 * @swagger
 * /api/v1/signal/signed-prekey/rotate:
 *   post:
 *     summary: Rotate signed prekey
 *     tags: [Signal Protocol]
 *     security:
 *       - bearerAuth: []
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
 *         description: Signed prekey rotated successfully
 *       400:
 *         description: Invalid device ID
 *       401:
 *         description: Authentication required
 */
router.post(
  '/signed-prekey/rotate',
  createRateLimit(86400000, 3, 'Too many signed prekey rotations'), // 3 per day
  signalController.rotateSignedPreKey
);

/**
 * @swagger
 * /api/v1/signal/sessions:
 *   get:
 *     summary: Get user's Signal Protocol sessions
 *     tags: [Signal Protocol]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sessions retrieved successfully
 *       401:
 *         description: Authentication required
 */
router.get('/sessions', signalController.getSessions);

/**
 * @swagger
 * /api/v1/signal/sessions/{userId}:
 *   delete:
 *     summary: Delete session with specific user
 *     tags: [Signal Protocol]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
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
 *         description: Session deleted successfully
 *       404:
 *         description: Session not found
 *       401:
 *         description: Authentication required
 */
router.delete('/sessions/:userId', signalController.deleteSession);

/**
 * @swagger
 * /api/v1/signal/fingerprint/{userId}:
 *   get:
 *     summary: Generate identity fingerprint for verification
 *     tags: [Signal Protocol]
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
 *         description: Fingerprint generated successfully
 *       404:
 *         description: User not found
 *       401:
 *         description: Authentication required
 */
router.get(
  '/fingerprint/:userId',
  validate(signalSchemas.getIdentityKey),
  signalController.generateFingerprint
);

/**
 * @swagger
 * /api/v1/signal/verify/{userId}:
 *   post:
 *     summary: Verify safety numbers with another user
 *     tags: [Signal Protocol]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
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
 *               - fingerprint
 *             properties:
 *               fingerprint:
 *                 type: string
 *                 description: The fingerprint to verify
 *     responses:
 *       200:
 *         description: Safety numbers verified
 *       400:
 *         description: Invalid fingerprint
 *       404:
 *         description: User not found
 *       401:
 *         description: Authentication required
 */
router.post('/verify/:userId', signalController.verifySafetyNumbers);

/**
 * @swagger
 * /api/v1/signal/encrypt:
 *   post:
 *     summary: Encrypt message (testing endpoint)
 *     tags: [Signal Protocol]
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
 *                 description: For direct messages
 *               groupId:
 *                 type: string
 *                 format: uuid
 *                 description: For group messages
 *               message:
 *                 type: string
 *                 description: Plain text message to encrypt
 *               deviceId:
 *                 type: integer
 *                 default: 1
 *     responses:
 *       200:
 *         description: Message encrypted successfully
 *       400:
 *         description: Invalid parameters
 *       401:
 *         description: Authentication required
 */
router.post(
  '/encrypt',
  createRateLimit(60000, 100, 'Too many encryption requests'), // 100 per minute
  signalController.encryptMessage
);

/**
 * @swagger
 * /api/v1/signal/decrypt:
 *   post:
 *     summary: Decrypt message (testing endpoint)
 *     tags: [Signal Protocol]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - encryptedMessage
 *               - senderId
 *               - messageType
 *             properties:
 *               encryptedMessage:
 *                 type: object
 *                 description: The encrypted message object
 *               senderId:
 *                 type: string
 *                 format: uuid
 *               messageType:
 *                 type: string
 *                 enum: [direct, group]
 *     responses:
 *       200:
 *         description: Message decrypted successfully
 *       400:
 *         description: Invalid parameters or decryption failed
 *       401:
 *         description: Authentication required
 */
router.post(
  '/decrypt',
  createRateLimit(60000, 100, 'Too many decryption requests'), // 100 per minute
  signalController.decryptMessage
);

/**
 * @swagger
 * /api/v1/signal/stats:
 *   get:
 *     summary: Get Signal Protocol statistics
 *     tags: [Signal Protocol]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *       401:
 *         description: Authentication required
 */
router.get('/stats', signalController.getSignalStats);

/**
 * @swagger
 * /api/v1/signal/reset:
 *   post:
 *     summary: Reset Signal Protocol identity (dangerous)
 *     tags: [Signal Protocol]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - confirmReset
 *             properties:
 *               confirmReset:
 *                 type: boolean
 *                 description: Must be true to confirm the reset
 *     responses:
 *       200:
 *         description: Identity reset (or warning returned)
 *       400:
 *         description: Reset not confirmed
 *       401:
 *         description: Authentication required
 */
router.post(
  '/reset',
  createRateLimit(86400000, 1, 'Only one reset per day allowed'), // 1 per day
  signalController.resetIdentity
);

/**
 * @swagger
 * /api/v1/signal/export:
 *   get:
 *     summary: Export Signal Protocol data for backup
 *     tags: [Signal Protocol]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       403:
 *         description: Export not available via API for security
 *       401:
 *         description: Authentication required
 */
router.get('/export', signalController.exportSignalData);

/**
 * @swagger
 * /api/v1/signal/import:
 *   post:
 *     summary: Import Signal Protocol data from backup
 *     tags: [Signal Protocol]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       403:
 *         description: Import not available via API for security
 *       401:
 *         description: Authentication required
 */
router.post('/import', signalController.importSignalData);

/**
 * @swagger
 * /api/v1/signal/health:
 *   get:
 *     summary: Signal Protocol service health check
 *     tags: [Signal Protocol]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Service is healthy
 *       503:
 *         description: Service is unhealthy
 */
router.get('/health', signalController.signalHealthCheck);

export { router as signalRoutes };