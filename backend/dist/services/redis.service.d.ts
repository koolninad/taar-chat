import { RedisClientType } from 'redis';
declare class RedisService {
    private static instance;
    static get client(): RedisClientType;
    static connect(): Promise<void>;
    static disconnect(): Promise<void>;
    static healthCheck(): Promise<boolean>;
    static setSession(userId: string, sessionData: any, ttl?: number): Promise<void>;
    static getSession(userId: string): Promise<any | null>;
    static deleteSession(userId: string): Promise<void>;
    static setOtp(phoneNumber: string, otp: string, ttl?: number): Promise<void>;
    static getOtp(phoneNumber: string): Promise<string | null>;
    static deleteOtp(phoneNumber: string): Promise<void>;
    static incrementRateLimit(identifier: string, windowSeconds?: number): Promise<number>;
    static getRateLimit(identifier: string): Promise<number>;
    static setUserOnline(userId: string): Promise<void>;
    static setUserOffline(userId: string): Promise<void>;
    static isUserOnline(userId: string): Promise<boolean>;
    static getOnlineUsers(userIds: string[]): Promise<string[]>;
    static queueMessage(userId: string, messageData: any): Promise<void>;
    static getQueuedMessages(userId: string, limit?: number): Promise<any[]>;
    static clearMessageQueue(userId: string): Promise<void>;
    static addConnection(userId: string, connectionId: string): Promise<void>;
    static removeConnection(userId: string, connectionId: string): Promise<void>;
    static getUserConnections(userId: string): Promise<string[]>;
    static setCache(key: string, value: any, ttl?: number): Promise<void>;
    static getCache(key: string): Promise<any | null>;
    static deleteCache(key: string): Promise<void>;
    static cacheUserKeys(userId: string, keys: any, ttl?: number): Promise<void>;
    static getCachedUserKeys(userId: string): Promise<any | null>;
    static invalidateUserKeys(userId: string): Promise<void>;
}
export { RedisService };
//# sourceMappingURL=redis.service.d.ts.map