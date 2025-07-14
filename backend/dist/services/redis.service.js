"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisService = void 0;
const redis_1 = require("redis");
const logger_1 = require("../utils/logger");
const config_1 = require("../config");
class RedisService {
    static get client() {
        if (!this.instance) {
            this.instance = (0, redis_1.createClient)({
                url: config_1.config.redis.url,
                password: config_1.config.redis.password,
                socket: {
                    reconnectStrategy: (retries) => {
                        if (retries > 10) {
                            logger_1.logger.error('Redis: Too many reconnection attempts, giving up');
                            return new Error('Redis connection failed');
                        }
                        const delay = Math.min(retries * 100, 3000);
                        logger_1.logger.warn(`Redis: Reconnecting in ${delay}ms (attempt ${retries})`);
                        return delay;
                    }
                }
            });
            this.instance.on('connect', () => {
                logger_1.logger.info('✅ Redis connected');
            });
            this.instance.on('error', (error) => {
                logger_1.logger.error('❌ Redis connection error:', error);
            });
            this.instance.on('disconnect', () => {
                logger_1.logger.warn('📴 Redis disconnected');
            });
            this.instance.on('reconnecting', () => {
                logger_1.logger.info('🔄 Redis reconnecting...');
            });
        }
        return this.instance;
    }
    static async connect() {
        try {
            await this.client.connect();
            logger_1.logger.info('✅ Redis service initialized');
        }
        catch (error) {
            logger_1.logger.error('❌ Failed to connect to Redis:', error);
            throw error;
        }
    }
    static async disconnect() {
        try {
            await this.client.disconnect();
            logger_1.logger.info('📴 Redis disconnected');
        }
        catch (error) {
            logger_1.logger.error('❌ Error disconnecting from Redis:', error);
        }
    }
    static async healthCheck() {
        try {
            const pong = await this.client.ping();
            return pong === 'PONG';
        }
        catch (error) {
            logger_1.logger.error('Redis health check failed:', error);
            return false;
        }
    }
    static async setSession(userId, sessionData, ttl = 3600) {
        const key = `session:${userId}`;
        await this.client.setEx(key, ttl, JSON.stringify(sessionData));
    }
    static async getSession(userId) {
        const key = `session:${userId}`;
        const data = await this.client.get(key);
        return data ? JSON.parse(data) : null;
    }
    static async deleteSession(userId) {
        const key = `session:${userId}`;
        await this.client.del(key);
    }
    static async setOtp(phoneNumber, otp, ttl = 300) {
        const key = `otp:${phoneNumber}`;
        await this.client.setEx(key, ttl, otp);
    }
    static async getOtp(phoneNumber) {
        const key = `otp:${phoneNumber}`;
        return await this.client.get(key);
    }
    static async deleteOtp(phoneNumber) {
        const key = `otp:${phoneNumber}`;
        await this.client.del(key);
    }
    static async incrementRateLimit(identifier, windowSeconds = 900) {
        const key = `rate_limit:${identifier}`;
        const multi = this.client.multi();
        multi.incr(key);
        multi.expire(key, windowSeconds);
        const results = await multi.exec();
        return results?.[0] || 0;
    }
    static async getRateLimit(identifier) {
        const key = `rate_limit:${identifier}`;
        const count = await this.client.get(key);
        return count ? parseInt(count) : 0;
    }
    static async setUserOnline(userId) {
        const key = `presence:${userId}`;
        await this.client.setEx(key, 60, 'online');
    }
    static async setUserOffline(userId) {
        const key = `presence:${userId}`;
        await this.client.del(key);
    }
    static async isUserOnline(userId) {
        const key = `presence:${userId}`;
        const presence = await this.client.get(key);
        return presence === 'online';
    }
    static async getOnlineUsers(userIds) {
        if (userIds.length === 0)
            return [];
        const keys = userIds.map(id => `presence:${id}`);
        const pipeline = this.client.multi();
        keys.forEach(key => pipeline.get(key));
        const results = await pipeline.exec();
        const onlineUsers = [];
        results?.forEach((result, index) => {
            if (result === 'online') {
                onlineUsers.push(userIds[index]);
            }
        });
        return onlineUsers;
    }
    static async queueMessage(userId, messageData) {
        const key = `queue:${userId}`;
        await this.client.lPush(key, JSON.stringify(messageData));
        await this.client.expire(key, 604800);
    }
    static async getQueuedMessages(userId, limit = 100) {
        const key = `queue:${userId}`;
        const messages = await this.client.lRange(key, 0, limit - 1);
        return messages.map(msg => JSON.parse(msg));
    }
    static async clearMessageQueue(userId) {
        const key = `queue:${userId}`;
        await this.client.del(key);
    }
    static async addConnection(userId, connectionId) {
        const key = `connections:${userId}`;
        await this.client.sAdd(key, connectionId);
        await this.client.expire(key, 3600);
    }
    static async removeConnection(userId, connectionId) {
        const key = `connections:${userId}`;
        await this.client.sRem(key, connectionId);
    }
    static async getUserConnections(userId) {
        const key = `connections:${userId}`;
        return await this.client.sMembers(key);
    }
    static async setCache(key, value, ttl = 3600) {
        await this.client.setEx(`cache:${key}`, ttl, JSON.stringify(value));
    }
    static async getCache(key) {
        const data = await this.client.get(`cache:${key}`);
        return data ? JSON.parse(data) : null;
    }
    static async deleteCache(key) {
        await this.client.del(`cache:${key}`);
    }
    static async cacheUserKeys(userId, keys, ttl = 3600) {
        const key = `signal_keys:${userId}`;
        await this.client.setEx(key, ttl, JSON.stringify(keys));
    }
    static async getCachedUserKeys(userId) {
        const key = `signal_keys:${userId}`;
        const data = await this.client.get(key);
        return data ? JSON.parse(data) : null;
    }
    static async invalidateUserKeys(userId) {
        const key = `signal_keys:${userId}`;
        await this.client.del(key);
    }
}
exports.RedisService = RedisService;
//# sourceMappingURL=redis.service.js.map