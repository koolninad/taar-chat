"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseService = void 0;
const client_1 = require("@prisma/client");
const logger_1 = require("../utils/logger");
const config_1 = require("../config");
class DatabaseService {
    static get client() {
        if (!this.instance) {
            this.instance = new client_1.PrismaClient({
                log: config_1.config.server.isDevelopment
                    ? ['query', 'info', 'warn', 'error']
                    : ['warn', 'error'],
                datasources: {
                    db: {
                        url: config_1.config.database.url
                    }
                }
            });
            this.instance.$use(async (params, next) => {
                const before = Date.now();
                const result = await next(params);
                const after = Date.now();
                logger_1.logger.debug('Database Query', {
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
    static async connect() {
        try {
            await this.client.$connect();
            logger_1.logger.info('✅ Database connected successfully');
        }
        catch (error) {
            logger_1.logger.error('❌ Failed to connect to database:', error);
            throw error;
        }
    }
    static async disconnect() {
        try {
            await this.client.$disconnect();
            logger_1.logger.info('📴 Database disconnected');
        }
        catch (error) {
            logger_1.logger.error('❌ Error disconnecting from database:', error);
            throw error;
        }
    }
    static async healthCheck() {
        try {
            await this.client.$queryRaw `SELECT 1`;
            return true;
        }
        catch (error) {
            logger_1.logger.error('Database health check failed:', error);
            return false;
        }
    }
    static async clearTestData() {
        if (process.env.NODE_ENV !== 'test') {
            throw new Error('clearTestData can only be called in test environment');
        }
        try {
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
            logger_1.logger.info('Test data cleared successfully');
        }
        catch (error) {
            logger_1.logger.error('Error clearing test data:', error);
            throw error;
        }
    }
    static async transaction(fn) {
        return this.client.$transaction(fn);
    }
    static async cleanupExpiredData() {
        try {
            const now = new Date();
            const expiredOtps = await this.client.otpAttempt.deleteMany({
                where: {
                    expiresAt: {
                        lt: now
                    }
                }
            });
            const expiredTokens = await this.client.refreshToken.deleteMany({
                where: {
                    OR: [
                        { expiresAt: { lt: now } },
                        { isRevoked: true }
                    ]
                }
            });
            const expiredMedia = await this.client.mediaFile.deleteMany({
                where: {
                    expiresAt: {
                        lt: now
                    }
                }
            });
            logger_1.logger.info('Database cleanup completed', {
                expiredOtps: expiredOtps.count,
                expiredTokens: expiredTokens.count,
                expiredMedia: expiredMedia.count
            });
        }
        catch (error) {
            logger_1.logger.error('Database cleanup failed:', error);
        }
    }
    static async checkMigrationStatus() {
        try {
            await this.client.user.findFirst({
                take: 1
            });
            return true;
        }
        catch (error) {
            logger_1.logger.warn('Database migrations may not be complete:', error);
            return false;
        }
    }
}
exports.DatabaseService = DatabaseService;
//# sourceMappingURL=database.service.js.map