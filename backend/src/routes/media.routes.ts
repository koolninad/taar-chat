import { Router } from 'express';
import * as mediaController from '../controllers/media.controller';
import { validate, mediaSchemas } from '../middleware/validation.middleware';
import { authenticateToken, createRateLimit } from '../middleware/auth.middleware';

const router = Router();

// All media routes require authentication
router.use(authenticateToken);

/**
 * @swagger
 * /api/v1/media/upload:
 *   post:
 *     summary: Generate presigned upload URL
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - filename
 *               - mimeType
 *               - fileSize
 *             properties:
 *               filename:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 255
 *                 example: "document.pdf"
 *               mimeType:
 *                 type: string
 *                 example: "application/pdf"
 *               fileSize:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 104857600
 *                 example: 1024000
 *               encryptionKey:
 *                 type: string
 *                 format: base64
 *                 description: Optional encryption key for E2E encrypted files
 *     responses:
 *       200:
 *         description: Upload URL generated successfully
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
 *                     uploadUrl:
 *                       type: string
 *                       format: uri
 *                     mediaFileId:
 *                       type: string
 *                       format: uuid
 *                     expiresIn:
 *                       type: integer
 *                     maxFileSize:
 *                       type: integer
 *       400:
 *         description: Invalid file data or file type not allowed
 *       401:
 *         description: Authentication required
 */
router.post(
  '/upload',
  createRateLimit(300000, 20, 'Too many upload requests'), // 20 uploads per 5 minutes
  validate(mediaSchemas.uploadMedia),
  mediaController.generateUploadUrl
);

/**
 * @swagger
 * /api/v1/media/{mediaFileId}/confirm:
 *   post:
 *     summary: Confirm upload completion
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: mediaFileId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Upload confirmed successfully
 *       404:
 *         description: Media file not found
 *       403:
 *         description: Not authorized to confirm this upload
 *       401:
 *         description: Authentication required
 */
router.post('/:mediaFileId/confirm', mediaController.confirmUpload);

/**
 * @swagger
 * /api/v1/media/my:
 *   get:
 *     summary: Get user's media files
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *         name: type
 *         schema:
 *           type: string
 *           enum: [image, video, audio, document]
 *         description: Filter by file type
 *     responses:
 *       200:
 *         description: Media files retrieved successfully
 *       401:
 *         description: Authentication required
 */
router.get('/my', mediaController.getUserMediaFiles);

/**
 * @swagger
 * /api/v1/media/search:
 *   get:
 *     summary: Search media files
 *     tags: [Media]
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
 *         name: type
 *         schema:
 *           type: string
 *           enum: [image, video, audio, document]
 *         description: Filter by file type
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
  mediaController.searchMediaFiles
);

/**
 * @swagger
 * /api/v1/media/stats:
 *   get:
 *     summary: Get media file statistics
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Media statistics retrieved successfully
 *       401:
 *         description: Authentication required
 */
router.get('/stats', mediaController.getMediaStats);

/**
 * @swagger
 * /api/v1/media/bulk-delete:
 *   post:
 *     summary: Bulk delete media files
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - mediaFileIds
 *             properties:
 *               mediaFileIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 minItems: 1
 *                 maxItems: 50
 *     responses:
 *       200:
 *         description: Bulk delete completed
 *       400:
 *         description: Invalid media file IDs
 *       401:
 *         description: Authentication required
 */
router.post(
  '/bulk-delete',
  createRateLimit(300000, 5, 'Too many bulk delete requests'), // 5 bulk deletes per 5 minutes
  mediaController.bulkDeleteMediaFiles
);

/**
 * @swagger
 * /api/v1/media/{mediaFileId}:
 *   get:
 *     summary: Get media file information
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: mediaFileId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Media file information retrieved
 *       404:
 *         description: Media file not found
 *       403:
 *         description: Not authorized to access this file
 *       401:
 *         description: Authentication required
 */
router.get(
  '/:mediaFileId',
  validate(mediaSchemas.getMedia),
  mediaController.getMediaFile
);

/**
 * @swagger
 * /api/v1/media/{mediaFileId}:
 *   put:
 *     summary: Update media file metadata
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: mediaFileId
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
 *               filename:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 255
 *     responses:
 *       200:
 *         description: Media file updated successfully
 *       404:
 *         description: Media file not found
 *       403:
 *         description: Not authorized to update this file
 *       401:
 *         description: Authentication required
 */
router.put('/:mediaFileId', mediaController.updateMediaFile);

/**
 * @swagger
 * /api/v1/media/{mediaFileId}:
 *   delete:
 *     summary: Delete media file
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: mediaFileId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Media file deleted successfully
 *       404:
 *         description: Media file not found
 *       403:
 *         description: Not authorized to delete this file
 *       400:
 *         description: Cannot delete file that is being used
 *       401:
 *         description: Authentication required
 */
router.delete(
  '/:mediaFileId',
  validate(mediaSchemas.deleteMedia),
  mediaController.deleteMediaFile
);

/**
 * @swagger
 * /api/v1/media/{mediaFileId}/download:
 *   get:
 *     summary: Generate download URL
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: mediaFileId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Download URL generated successfully
 *       404:
 *         description: Media file not found
 *       403:
 *         description: Not authorized to access this file
 *       401:
 *         description: Authentication required
 */
router.get(
  '/:mediaFileId/download',
  createRateLimit(60000, 50, 'Too many download requests'), // 50 downloads per minute
  mediaController.generateDownloadUrl
);

/**
 * @swagger
 * /api/v1/media/{mediaFileId}/thumbnail:
 *   post:
 *     summary: Generate thumbnail for image/video
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: mediaFileId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Thumbnail generated successfully
 *       400:
 *         description: Thumbnail not supported for this file type
 *       404:
 *         description: Media file not found
 *       403:
 *         description: Not authorized to access this file
 *       401:
 *         description: Authentication required
 */
router.post(
  '/:mediaFileId/thumbnail',
  createRateLimit(300000, 10, 'Too many thumbnail requests'), // 10 thumbnails per 5 minutes
  mediaController.generateThumbnail
);

/**
 * @swagger
 * /api/v1/media/{mediaFileId}/progress:
 *   get:
 *     summary: Get upload progress
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: mediaFileId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Upload progress retrieved
 *       404:
 *         description: Media file not found
 *       403:
 *         description: Not authorized to access this file
 *       401:
 *         description: Authentication required
 */
router.get('/:mediaFileId/progress', mediaController.getUploadProgress);

/**
 * @swagger
 * /api/v1/media/{mediaFileId}/cancel:
 *   post:
 *     summary: Cancel ongoing upload
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: mediaFileId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Upload cancelled successfully
 *       404:
 *         description: Media file not found
 *       403:
 *         description: Not authorized to cancel this upload
 *       401:
 *         description: Authentication required
 */
router.post('/:mediaFileId/cancel', mediaController.cancelUpload);

export { router as mediaRoutes };