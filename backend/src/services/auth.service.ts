import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from '../config';
import { DatabaseService } from './database.service';
import { RedisService } from './redis.service';
import { SmsService } from './sms.service';
import { logger, securityLogger } from '../utils/logger';
import { generateOtp, generateRegistrationId } from '../utils/crypto';
import { AppError } from '../utils/errors';

interface TokenPayload {
  userId: string;
  phoneNumber: string;
  type: 'access' | 'refresh';
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

class AuthService {
  private static readonly SALT_ROUNDS = 12;
  
  /**
   * Send OTP to phone number
   */
  static async sendOtp(phoneNumber: string, countryCode: string): Promise<void> {
    try {
      // Check rate limiting
      const rateLimitKey = `otp_rate:${phoneNumber}`;
      const attempts = await RedisService.incrementRateLimit(rateLimitKey, 300); // 5 minutes
      
      if (attempts > config.otp.maxAttempts) {
        throw new AppError('Too many OTP requests. Please try again later.', 429);
      }
      
      // Generate OTP
      const otpCode = generateOtp(config.otp.length);
      
      // Store OTP in database for audit trail
      await DatabaseService.client.otpAttempt.create({
        data: {
          phoneNumber: `${countryCode}${phoneNumber}`,
          otpCode: await bcrypt.hash(otpCode, this.SALT_ROUNDS),
          expiresAt: new Date(Date.now() + config.otp.expiresInMinutes * 60 * 1000)
        }
      });
      
      // Store OTP in Redis for quick verification
      await RedisService.setOtp(
        `${countryCode}${phoneNumber}`, 
        otpCode, 
        config.otp.expiresInMinutes * 60
      );
      
      // Send SMS via AWS SNS
      await SmsService.sendOtp(`${countryCode}${phoneNumber}`, otpCode);
      
      securityLogger.logAuth('otp_sent', undefined, undefined, phoneNumber);
      
    } catch (error) {
      logger.error('Failed to send OTP:', error);
      throw error;
    }
  }
  
  /**
   * Verify OTP and register/login user
   */
  static async verifyOtp(
    phoneNumber: string, 
    countryCode: string, 
    otpCode: string,
    userInfo?: { name?: string; identityKey: string }
  ): Promise<{ user: any; tokens: AuthTokens; isNewUser: boolean }> {
    try {
      const fullPhoneNumber = `${countryCode}${phoneNumber}`;
      
      // Get OTP from Redis
      const storedOtp = await RedisService.getOtp(fullPhoneNumber);
      if (!storedOtp || storedOtp !== otpCode) {
        throw new AppError('Invalid or expired OTP', 400);
      }
      
      // Clear OTP from Redis
      await RedisService.deleteOtp(fullPhoneNumber);
      
      // Mark OTP as verified in database
      await DatabaseService.client.otpAttempt.updateMany({
        where: {
          phoneNumber: fullPhoneNumber,
          isVerified: false
        },
        data: {
          isVerified: true
        }
      });
      
      // Check if user exists
      let user = await DatabaseService.client.user.findUnique({
        where: { phoneNumber: fullPhoneNumber }
      });
      
      let isNewUser = false;
      
      if (!user && userInfo) {
        // Create new user
        const registrationId = generateRegistrationId();
        
        user = await DatabaseService.client.user.create({
          data: {
            phoneNumber: fullPhoneNumber,
            countryCode,
            name: userInfo.name || `User ${phoneNumber}`,
            identityKey: userInfo.identityKey,
            registrationId
          }
        });
        
        isNewUser = true;
        securityLogger.logAuth('user_registered', user.id);
      } else if (!user) {
        throw new AppError('User not found. Please complete registration.', 404);
      }
      
      // Generate tokens
      const tokens = await this.generateTokens(user);
      
      // Update last seen
      await DatabaseService.client.user.update({
        where: { id: user.id },
        data: { 
          lastSeen: new Date(),
          isOnline: true
        }
      });
      
      // Set user online in Redis
      await RedisService.setUserOnline(user.id);
      
      securityLogger.logAuth('login_success', user.id);
      
      return { user, tokens, isNewUser };
      
    } catch (error) {
      logger.error('OTP verification failed:', error);
      throw error;
    }
  }
  
  /**
   * Generate access and refresh tokens
   */
  static async generateTokens(user: any): Promise<AuthTokens> {
    try {
      const accessPayload: TokenPayload = {
        userId: user.id,
        phoneNumber: user.phoneNumber,
        type: 'access'
      };
      
      const refreshPayload: TokenPayload = {
        userId: user.id,
        phoneNumber: user.phoneNumber,
        type: 'refresh'
      };
      
      const accessToken = jwt.sign(
        accessPayload, 
        config.jwt.secret
      );
      
      const refreshToken = jwt.sign(
        refreshPayload, 
        config.jwt.refreshSecret
      );
      
      // Store refresh token in database
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days
      
      await DatabaseService.client.refreshToken.create({
        data: {
          userId: user.id,
          token: refreshToken,
          expiresAt
        }
      });
      
      // Store session in Redis
      await RedisService.setSession(user.id, {
        userId: user.id,
        phoneNumber: user.phoneNumber,
        lastActivity: new Date().toISOString()
      }, 3600); // 1 hour
      
      return {
        accessToken,
        refreshToken,
        expiresIn: 15 * 60 // 15 minutes in seconds
      };
      
    } catch (error) {
      logger.error('Failed to generate tokens:', error);
      throw new AppError('Failed to generate authentication tokens', 500);
    }
  }
  
  /**
   * Refresh access token
   */
  static async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      // Verify refresh token
      const payload = jwt.verify(refreshToken, config.jwt.refreshSecret) as TokenPayload;
      
      // Check if refresh token exists in database
      const storedToken = await DatabaseService.client.refreshToken.findUnique({
        where: { token: refreshToken },
        include: { user: true }
      });
      
      if (!storedToken || storedToken.isRevoked) {
        throw new AppError('Invalid refresh token', 401);
      }
      
      if (new Date() > storedToken.expiresAt) {
        throw new AppError('Refresh token expired', 401);
      }
      
      // Generate new tokens
      const newTokens = await this.generateTokens(storedToken.user);
      
      // Revoke old refresh token
      await DatabaseService.client.refreshToken.update({
        where: { id: storedToken.id },
        data: { isRevoked: true }
      });
      
      securityLogger.logAuth('token_refreshed', storedToken.userId);
      
      return newTokens;
      
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AppError('Invalid refresh token', 401);
      }
      throw error;
    }
  }
  
  /**
   * Verify access token
   */
  static async verifyToken(token: string): Promise<TokenPayload> {
    try {
      const payload = jwt.verify(token, config.jwt.secret) as TokenPayload;
      
      // Check if user session exists in Redis
      const session = await RedisService.getSession(payload.userId);
      if (!session) {
        throw new AppError('Session expired', 401);
      }
      
      return payload;
      
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AppError('Invalid access token', 401);
      }
      throw error;
    }
  }
  
  /**
   * Logout user
   */
  static async logout(userId: string, refreshToken?: string): Promise<void> {
    try {
      // Revoke refresh token if provided
      if (refreshToken) {
        await DatabaseService.client.refreshToken.updateMany({
          where: {
            userId,
            token: refreshToken
          },
          data: { isRevoked: true }
        });
      }
      
      // Clear session from Redis
      await RedisService.deleteSession(userId);
      
      // Set user offline
      await RedisService.setUserOffline(userId);
      
      // Update user status in database
      await DatabaseService.client.user.update({
        where: { id: userId },
        data: { 
          isOnline: false,
          lastSeen: new Date()
        }
      });
      
      securityLogger.logAuth('logout', userId);
      
    } catch (error) {
      logger.error('Logout failed:', error);
      throw error;
    }
  }
  
  /**
   * Revoke all user sessions
   */
  static async revokeAllSessions(userId: string): Promise<void> {
    try {
      // Revoke all refresh tokens
      await DatabaseService.client.refreshToken.updateMany({
        where: { userId },
        data: { isRevoked: true }
      });
      
      // Clear session from Redis
      await RedisService.deleteSession(userId);
      
      // Set user offline
      await RedisService.setUserOffline(userId);
      
      securityLogger.logAuth('all_sessions_revoked', userId);
      
    } catch (error) {
      logger.error('Failed to revoke all sessions:', error);
      throw error;
    }
  }
  
  /**
   * Update user profile
   */
  static async updateProfile(
    userId: string, 
    updates: { name?: string; about?: string; avatarUrl?: string }
  ): Promise<any> {
    try {
      const user = await DatabaseService.client.user.update({
        where: { id: userId },
        data: {
          ...updates,
          updatedAt: new Date()
        }
      });
      
      // Invalidate cached user data
      await RedisService.deleteCache(`user:${userId}`);
      
      return user;
      
    } catch (error) {
      logger.error('Failed to update profile:', error);
      throw error;
    }
  }
  
  /**
   * Get user profile
   */
  static async getProfile(userId: string): Promise<any> {
    try {
      // Try to get from cache first
      const cached = await RedisService.getCache(`user:${userId}`);
      if (cached) {
        return cached;
      }
      
      const user = await DatabaseService.client.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          phoneNumber: true,
          name: true,
          about: true,
          avatarUrl: true,
          isOnline: true,
          lastSeen: true,
          createdAt: true,
          registrationId: true
        }
      });
      
      if (!user) {
        throw new AppError('User not found', 404);
      }
      
      // Cache for 1 hour
      await RedisService.setCache(`user:${userId}`, user, 3600);
      
      return user;
      
    } catch (error) {
      logger.error('Failed to get profile:', error);
      throw error;
    }
  }
}

export { AuthService, TokenPayload, AuthTokens };