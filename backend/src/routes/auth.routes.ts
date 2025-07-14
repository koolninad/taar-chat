import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { validate, authSchemas } from '../middleware/validation.middleware';
import { authenticateToken, createRateLimit } from '../middleware/auth.middleware';

const router = Router();

/**
 * @swagger
 * /api/v1/auth/send-otp:
 *   post:
 *     summary: Send OTP for phone verification
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phoneNumber
 *               - countryCode
 *             properties:
 *               phoneNumber:
 *                 type: string
 *                 example: "9876543210"
 *               countryCode:
 *                 type: string
 *                 example: "+91"
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *       400:
 *         description: Invalid phone number
 *       429:
 *         description: Too many requests
 */
router.post(
  '/send-otp',
  createRateLimit(300000, 3, 'Too many OTP requests'), // 3 requests per 5 minutes
  validate(authSchemas.sendOtp),
  authController.sendOtp
);

/**
 * @swagger
 * /api/v1/auth/verify-otp:
 *   post:
 *     summary: Verify OTP and login/register
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phoneNumber
 *               - countryCode
 *               - otpCode
 *             properties:
 *               phoneNumber:
 *                 type: string
 *               countryCode:
 *                 type: string
 *               otpCode:
 *                 type: string
 *               userInfo:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                   identityKey:
 *                     type: string
 *     responses:
 *       200:
 *         description: Authentication successful
 *       400:
 *         description: Invalid OTP or user data
 */
router.post(
  '/verify-otp',
  createRateLimit(300000, 5, 'Too many verification attempts'), // 5 requests per 5 minutes
  validate(authSchemas.verifyOtp),
  authController.verifyOtp
);

/**
 * @swagger
 * /api/v1/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *       401:
 *         description: Invalid refresh token
 */
router.post(
  '/refresh',
  validate(authSchemas.refreshToken),
  authController.refreshToken
);

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Logged out successfully
 *       401:
 *         description: Authentication required
 */
router.post(
  '/logout',
  authenticateToken,
  authController.logout
);

/**
 * @swagger
 * /api/v1/auth/revoke-all:
 *   post:
 *     summary: Revoke all user sessions
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All sessions revoked successfully
 *       401:
 *         description: Authentication required
 */
router.post(
  '/revoke-all',
  authenticateToken,
  authController.revokeAllSessions
);

/**
 * @swagger
 * /api/v1/auth/profile:
 *   get:
 *     summary: Get current user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *       401:
 *         description: Authentication required
 */
router.get(
  '/profile',
  authenticateToken,
  authController.getProfile
);

/**
 * @swagger
 * /api/v1/auth/profile:
 *   put:
 *     summary: Update user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               about:
 *                 type: string
 *               avatarUrl:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       401:
 *         description: Authentication required
 */
router.put(
  '/profile',
  authenticateToken,
  validate(authSchemas.updateProfile),
  authController.updateProfile
);

/**
 * @swagger
 * /api/v1/auth/check:
 *   get:
 *     summary: Check authentication status
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Authentication valid
 *       401:
 *         description: Authentication invalid or expired
 */
router.get(
  '/check',
  authenticateToken,
  authController.checkAuth
);

/**
 * @swagger
 * /api/v1/auth/delete-account:
 *   post:
 *     summary: Request account deletion
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Account deletion request submitted
 *       401:
 *         description: Authentication required
 */
router.post(
  '/delete-account',
  authenticateToken,
  createRateLimit(86400000, 1, 'Only one deletion request per day'), // 1 request per day
  authController.requestAccountDeletion
);

/**
 * @swagger
 * /api/v1/auth/change-phone/request:
 *   post:
 *     summary: Request phone number change
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newPhoneNumber
 *               - countryCode
 *             properties:
 *               newPhoneNumber:
 *                 type: string
 *               countryCode:
 *                 type: string
 *     responses:
 *       200:
 *         description: Verification code sent to new number
 *       401:
 *         description: Authentication required
 */
router.post(
  '/change-phone/request',
  authenticateToken,
  createRateLimit(3600000, 3, 'Too many phone change requests'), // 3 requests per hour
  validate(authSchemas.sendOtp), // Reuse same validation
  authController.changePhoneNumberRequest
);

/**
 * @swagger
 * /api/v1/auth/change-phone/verify:
 *   post:
 *     summary: Verify phone number change
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - otpCode
 *             properties:
 *               otpCode:
 *                 type: string
 *     responses:
 *       200:
 *         description: Phone number changed successfully
 *       401:
 *         description: Authentication required
 */
router.post(
  '/change-phone/verify',
  authenticateToken,
  validate({
    body: authSchemas.verifyOtp.body.fork(['phoneNumber', 'countryCode'], (schema) => 
      schema.forbidden()
    ).append({
      otpCode: authSchemas.verifyOtp.body.extract('otpCode')
    })
  }),
  authController.verifyPhoneNumberChange
);

export { router as authRoutes };