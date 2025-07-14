import { createClient, RedisClientType } from 'redis';
import { logger } from '../utils/logger';
import { config } from '../config';

class RedisService {
  private static instance: RedisClientType;
  
  static get client(): RedisClientType {
    if (!this.instance) {
      this.instance = createClient({
        url: config.redis.url,
        password: config.redis.password,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              logger.error('Redis: Too many reconnection attempts, giving up');
              return new Error('Redis connection failed');
            }
            const delay = Math.min(retries * 100, 3000);
            logger.warn(`Redis: Reconnecting in ${delay}ms (attempt ${retries})`);
            return delay;
          }
        }
      });
      
      // Event handlers
      this.instance.on('connect', () => {
        logger.info('✅ Redis connected');
      });
      
      this.instance.on('error', (error) => {
        logger.error('❌ Redis connection error:', error);
      });
      
      this.instance.on('disconnect', () => {
        logger.warn('📴 Redis disconnected');
      });
      
      this.instance.on('reconnecting', () => {
        logger.info('🔄 Redis reconnecting...');
      });
    }
    
    return this.instance;
  }
  
  static async connect(): Promise<void> {
    try {
      await this.client.connect();
      logger.info('✅ Redis service initialized');
    } catch (error) {
      logger.error('❌ Failed to connect to Redis:', error);
      throw error;
    }
  }
  
  static async disconnect(): Promise<void> {
    try {
      await this.client.disconnect();
      logger.info('📴 Redis disconnected');
    } catch (error) {
      logger.error('❌ Error disconnecting from Redis:', error);
    }
  }
  
  static async healthCheck(): Promise<boolean> {
    try {
      const pong = await this.client.ping();
      return pong === 'PONG';
    } catch (error) {
      logger.error('Redis health check failed:', error);
      return false;
    }
  }
  
  // Session management
  static async setSession(userId: string, sessionData: any, ttl: number = 3600): Promise<void> {
    const key = `session:${userId}`;
    await this.client.setEx(key, ttl, JSON.stringify(sessionData));
  }
  
  static async getSession(userId: string): Promise<any | null> {
    const key = `session:${userId}`;
    const data = await this.client.get(key);
    return data ? JSON.parse(data) : null;
  }
  
  static async deleteSession(userId: string): Promise<void> {
    const key = `session:${userId}`;
    await this.client.del(key);
  }
  
  // OTP management
  static async setOtp(phoneNumber: string, otp: string, ttl: number = 300): Promise<void> {
    const key = `otp:${phoneNumber}`;
    await this.client.setEx(key, ttl, otp);
  }
  
  static async getOtp(phoneNumber: string): Promise<string | null> {
    const key = `otp:${phoneNumber}`;
    return await this.client.get(key);
  }
  
  static async deleteOtp(phoneNumber: string): Promise<void> {
    const key = `otp:${phoneNumber}`;
    await this.client.del(key);
  }
  
  // Rate limiting
  static async incrementRateLimit(identifier: string, windowSeconds: number = 900): Promise<number> {
    const key = `rate_limit:${identifier}`;
    const multi = this.client.multi();
    
    multi.incr(key);
    multi.expire(key, windowSeconds);
    
    const results = await multi.exec();
    return results?.[0] as number || 0;
  }
  
  static async getRateLimit(identifier: string): Promise<number> {
    const key = `rate_limit:${identifier}`;
    const count = await this.client.get(key);
    return count ? parseInt(count) : 0;
  }
  
  // User presence management
  static async setUserOnline(userId: string): Promise<void> {
    const key = `presence:${userId}`;
    await this.client.setEx(key, 60, 'online'); // 60 seconds heartbeat
  }
  
  static async setUserOffline(userId: string): Promise<void> {
    const key = `presence:${userId}`;
    await this.client.del(key);
  }
  
  static async isUserOnline(userId: string): Promise<boolean> {
    const key = `presence:${userId}`;
    const presence = await this.client.get(key);
    return presence === 'online';
  }
  
  static async getOnlineUsers(userIds: string[]): Promise<string[]> {
    if (userIds.length === 0) return [];
    
    const keys = userIds.map(id => `presence:${id}`);
    const pipeline = this.client.multi();
    
    keys.forEach(key => pipeline.get(key));
    const results = await pipeline.exec();
    
    const onlineUsers: string[] = [];
    results?.forEach((result, index) => {
      if (result === 'online') {
        onlineUsers.push(userIds[index]!);
      }
    });
    
    return onlineUsers;
  }
  
  // Message queue for offline users
  static async queueMessage(userId: string, messageData: any): Promise<void> {
    const key = `queue:${userId}`;
    await this.client.lPush(key, JSON.stringify(messageData));
    await this.client.expire(key, 604800); // 7 days
  }
  
  static async getQueuedMessages(userId: string, limit: number = 100): Promise<any[]> {
    const key = `queue:${userId}`;
    const messages = await this.client.lRange(key, 0, limit - 1);
    return messages.map(msg => JSON.parse(msg));
  }
  
  static async clearMessageQueue(userId: string): Promise<void> {
    const key = `queue:${userId}`;
    await this.client.del(key);
  }
  
  // WebSocket connection tracking
  static async addConnection(userId: string, connectionId: string): Promise<void> {
    const key = `connections:${userId}`;
    await this.client.sAdd(key, connectionId);
    await this.client.expire(key, 3600); // 1 hour
  }
  
  static async removeConnection(userId: string, connectionId: string): Promise<void> {
    const key = `connections:${userId}`;
    await this.client.sRem(key, connectionId);
  }
  
  static async getUserConnections(userId: string): Promise<string[]> {
    const key = `connections:${userId}`;
    return await this.client.sMembers(key);
  }
  
  // Cache management
  static async setCache(key: string, value: any, ttl: number = 3600): Promise<void> {
    await this.client.setEx(`cache:${key}`, ttl, JSON.stringify(value));
  }
  
  static async getCache(key: string): Promise<any | null> {
    const data = await this.client.get(`cache:${key}`);
    return data ? JSON.parse(data) : null;
  }
  
  static async deleteCache(key: string): Promise<void> {
    await this.client.del(`cache:${key}`);
  }
  
  // Signal Protocol key caching
  static async cacheUserKeys(userId: string, keys: any, ttl: number = 3600): Promise<void> {
    const key = `signal_keys:${userId}`;
    await this.client.setEx(key, ttl, JSON.stringify(keys));
  }
  
  static async getCachedUserKeys(userId: string): Promise<any | null> {
    const key = `signal_keys:${userId}`;
    const data = await this.client.get(key);
    return data ? JSON.parse(data) : null;
  }
  
  static async invalidateUserKeys(userId: string): Promise<void> {
    const key = `signal_keys:${userId}`;
    await this.client.del(key);
  }
}

export { RedisService };