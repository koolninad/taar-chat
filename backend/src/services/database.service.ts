import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { config } from '../config';

class DatabaseService {
  private static instance: PrismaClient;
  
  static get client(): PrismaClient {
    if (!this.instance) {
      this.instance = new PrismaClient({
        log: config.server.isDevelopment 
          ? ['query', 'info', 'warn', 'error']
          : ['warn', 'error'],
        
        datasources: {
          db: {
            url: config.database.url
          }
        }
      });
      
      // Add query logging middleware
      this.instance.$use(async (params, next) => {
        const before = Date.now();
        const result = await next(params);
        const after = Date.now();
        
        logger.debug('Database Query', {
          model: params.model,
          action: params.action,
          duration: `${after - before}ms`,
          type: 'database'
        });
        
        return result;
      });
    }
    
    return this.instance;
  }
  
  static async connect(): Promise<void> {
    try {
      await this.client.$connect();
      logger.info('✅ Database connected successfully');
    } catch (error) {
      logger.error('❌ Failed to connect to database:', error);
      throw error;
    }
  }
  
  static async disconnect(): Promise<void> {
    try {
      await this.client.$disconnect();
      logger.info('📴 Database disconnected');
    } catch (error) {
      logger.error('❌ Error disconnecting from database:', error);
      throw error;
    }
  }
  
  static async healthCheck(): Promise<boolean> {
    try {
      await this.client.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      logger.error('Database health check failed:', error);
      return false;
    }
  }

  /**
   * Clear test data (only in test environment)
   */
  static async clearTestData(): Promise<void> {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('clearTestData can only be called in test environment');
    }

    try {
      // Delete in correct order to avoid foreign key constraints
      await this.client.deletedMessage.deleteMany();
      await this.client.signalMessageMetadata.deleteMany();
      await this.client.message.deleteMany();
      await this.client.senderKey.deleteMany();
      await this.client.signalSession.deleteMany();
      await this.client.contact.deleteMany();
      await this.client.groupMember.deleteMany();
      await this.client.group.deleteMany();
      await this.client.mediaFile.deleteMany();
      await this.client.signalIdentity.deleteMany();
      await this.client.signedPrekey.deleteMany();
      await this.client.prekeyBundle.deleteMany();
      await this.client.refreshToken.deleteMany();
      await this.client.otpAttempt.deleteMany();
      await this.client.user.deleteMany();
      
      logger.info('Test data cleared successfully');
    } catch (error) {
      logger.error('Error clearing test data:', error);
      throw error;
    }
  }
  
  // Transaction helper
  static async transaction<T>(
    fn: (prisma: any) => Promise<T>
  ): Promise<T> {
    return this.client.$transaction(fn);
  }
  
  // Cleanup helper for expired data
  static async cleanupExpiredData(): Promise<void> {
    try {
      const now = new Date();
      
      // Clean expired OTP attempts
      const expiredOtps = await this.client.otpAttempt.deleteMany({
        where: {
          expiresAt: {
            lt: now
          }
        }
      });
      
      // Clean expired refresh tokens
      const expiredTokens = await this.client.refreshToken.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: now } },
            { isRevoked: true }
          ]
        }
      });
      
      // Clean expired media files
      const expiredMedia = await this.client.mediaFile.deleteMany({
        where: {
          expiresAt: {
            lt: now
          }
        }
      });
      
      logger.info('Database cleanup completed', {
        expiredOtps: expiredOtps.count,
        expiredTokens: expiredTokens.count,
        expiredMedia: expiredMedia.count
      });
      
    } catch (error) {
      logger.error('Database cleanup failed:', error);
    }
  }
  
  // Migration status check
  static async checkMigrationStatus(): Promise<boolean> {
    try {
      // Try to query a table that should exist after migrations
      await this.client.user.findFirst({
        take: 1
      });
      return true;
    } catch (error) {
      logger.warn('Database migrations may not be complete:', error);
      return false;
    }
  }
}

export { DatabaseService };