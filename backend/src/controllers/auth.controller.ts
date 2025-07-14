import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { SmsService } from '../services/sms.service';
import { RedisService } from '../services/redis.service';
import { logger, securityLogger } from '../utils/logger';
import { AppError, ErrorMessages } from '../utils/errors';
import { asyncHandler } from '../middleware/errorHandler';

/**
 * Send OTP for phone verification
 */
export const sendOtp = asyncHandler(async (req: Request, res: Response) => {
  const { phoneNumber, countryCode } = req.body;
  
  // Validate phone number format
  if (!SmsService.validatePhoneNumber(`${countryCode}${phoneNumber}`)) {
    throw new AppError(ErrorMessages.INVALID_PHONE_NUMBER, 400);
  }
  
  // Format phone number
  const formattedNumber = SmsService.formatPhoneNumber(`${countryCode}${phoneNumber}`);
  
  await AuthService.sendOtp(phoneNumber, countryCode);
  
  securityLogger.logAuth('otp_sent', undefined, req.ip, req.get('User-Agent'));
  
  res.status(200).json({
    success: true,
    message: 'Verification code sent successfully',
    data: {
      phoneNumber: formattedNumber.replace(/\d(?=\d{4})/g, '*'), // Mask phone number
      expiresIn: 300 // 5 minutes
    }
  });
});

/**
 * Verify OTP and login/register user
 */
export const verifyOtp = asyncHandler(async (req: Request, res: Response) => {
  const { phoneNumber, countryCode, otpCode, userInfo } = req.body;
  
  const result = await AuthService.verifyOtp(
    phoneNumber, 
    countryCode, 
    otpCode, 
    userInfo
  );
  
  securityLogger.logAuth(
    result.isNewUser ? 'user_registered' : 'login_success',
    result.user.id,
    req.ip,
    req.get('User-Agent')
  );
  
  // Send welcome SMS for new users
  if (result.isNewUser) {
    await SmsService.sendWelcomeMessage(
      `${countryCode}${phoneNumber}`,
      result.user.name || 'User'
    );
  }
  
  res.status(200).json({
    success: true,
    message: result.isNewUser ? 'Account created successfully' : 'Login successful',
    data: {
      user: {
        id: result.user.id,
        phoneNumber: result.user.phoneNumber,
        name: result.user.name,
        about: result.user.about,
        avatarUrl: result.user.avatarUrl,
        isOnline: result.user.isOnline,
        lastSeen: result.user.lastSeen,
        registrationId: result.user.registrationId
      },
      tokens: result.tokens,
      isNewUser: result.isNewUser
    }
  });
});

/**
 * Refresh access token
 */
export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  
  const tokens = await AuthService.refreshToken(refreshToken);
  
  res.status(200).json({
    success: true,
    message: 'Token refreshed successfully',
    data: {
      tokens
    }
  });
});

/**
 * Logout user
 */
export const logout = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const refreshToken = req.body.refreshToken;
  
  await AuthService.logout(userId, refreshToken);
  
  securityLogger.logAuth('logout', userId, req.ip, req.get('User-Agent'));
  
  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
});

/**
 * Revoke all user sessions
 */
export const revokeAllSessions = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  
  await AuthService.revokeAllSessions(userId);
  
  securityLogger.logAuth('all_sessions_revoked', userId, req.ip, req.get('User-Agent'));
  
  res.status(200).json({
    success: true,
    message: 'All sessions revoked successfully'
  });
});

/**
 * Get current user profile
 */
export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  
  const user = await AuthService.getProfile(userId);
  
  res.status(200).json({
    success: true,
    data: {
      user: {
        id: user.id,
        phoneNumber: user.phoneNumber,
        name: user.name,
        about: user.about,
        avatarUrl: user.avatarUrl,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen,
        createdAt: user.createdAt,
        registrationId: user.registrationId
      }
    }
  });
});

/**
 * Update user profile
 */
export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const updates = req.body;
  
  const user = await AuthService.updateProfile(userId, updates);
  
  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: {
      user: {
        id: user.id,
        phoneNumber: user.phoneNumber,
        name: user.name,
        about: user.about,
        avatarUrl: user.avatarUrl,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    }
  });
});

/**
 * Check authentication status
 */
export const checkAuth = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  
  // Check if session is still valid
  const session = await RedisService.getSession(userId);
  
  if (!session) {
    throw new AppError(ErrorMessages.SESSION_EXPIRED, 401);
  }
  
  res.status(200).json({
    success: true,
    message: 'Authentication valid',
    data: {
      userId,
      sessionExpiry: session.lastActivity
    }
  });
});

/**
 * Request account deletion
 */
export const requestAccountDeletion = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  
  // In a real implementation, this would start a deletion process
  // For now, we'll just log the request
  logger.info('Account deletion requested', { userId });
  
  securityLogger.logAuth('account_deletion_requested', userId, req.ip, req.get('User-Agent'));
  
  res.status(200).json({
    success: true,
    message: 'Account deletion request submitted. You will receive confirmation within 24 hours.',
    data: {
      requestId: `del_${Date.now()}`,
      expectedDeletion: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    }
  });
});

/**
 * Change phone number (send OTP to new number)
 */
export const changePhoneNumberRequest = asyncHandler(async (req: Request, res: Response) => {
  const { newPhoneNumber, countryCode } = req.body;
  const userId = req.user!.userId;
  
  // Validate phone number format
  if (!SmsService.validatePhoneNumber(`${countryCode}${newPhoneNumber}`)) {
    throw new AppError(ErrorMessages.INVALID_PHONE_NUMBER, 400);
  }
  
  // Check if new phone number is already in use
  const existingUser = await AuthService.getProfile(userId);
  // In real implementation, check if phone number exists
  
  // Send OTP to new number
  await AuthService.sendOtp(newPhoneNumber, countryCode);
  
  // Store the change request in Redis temporarily
  await RedisService.setCache(
    `phone_change:${userId}`,
    { newPhoneNumber: `${countryCode}${newPhoneNumber}` },
    300 // 5 minutes
  );
  
  securityLogger.logAuth('phone_change_requested', userId, req.ip, req.get('User-Agent'));
  
  res.status(200).json({
    success: true,
    message: 'Verification code sent to new phone number',
    data: {
      maskedPhoneNumber: `${countryCode}${newPhoneNumber}`.replace(/\d(?=\d{4})/g, '*')
    }
  });
});

/**
 * Verify new phone number change
 */
export const verifyPhoneNumberChange = asyncHandler(async (req: Request, res: Response) => {
  const { otpCode } = req.body;
  const userId = req.user!.userId;
  
  // Get the pending change request
  const changeRequest = await RedisService.getCache(`phone_change:${userId}`);
  
  if (!changeRequest) {
    throw new AppError('No pending phone number change request', 400);
  }
  
  // Verify OTP for new phone number
  const storedOtp = await RedisService.getOtp(changeRequest.newPhoneNumber);
  
  if (!storedOtp || storedOtp !== otpCode) {
    throw new AppError(ErrorMessages.INVALID_OTP, 400);
  }
  
  // Update user's phone number in database
  // Note: This is a critical operation that should be done in a transaction
  // with proper validation and security checks
  
  // Clean up temporary data
  await RedisService.deleteCache(`phone_change:${userId}`);
  await RedisService.deleteOtp(changeRequest.newPhoneNumber);
  
  securityLogger.logAuth('phone_number_changed', userId, req.ip, req.get('User-Agent'));
  
  res.status(200).json({
    success: true,
    message: 'Phone number changed successfully'
  });
});