"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const zod_1 = require("zod");
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'staging', 'production', 'test']).default('development'),
    PORT: zod_1.z.string().transform(Number).pipe(zod_1.z.number().min(1000).max(65535)).default('3000'),
    API_VERSION: zod_1.z.string().default('v1'),
    DATABASE_URL: zod_1.z.string().url(),
    REDIS_URL: zod_1.z.string().url(),
    REDIS_PASSWORD: zod_1.z.string().optional(),
    JWT_SECRET: zod_1.z.string().min(32),
    JWT_REFRESH_SECRET: zod_1.z.string().min(32),
    JWT_EXPIRES_IN: zod_1.z.string().default('15m'),
    JWT_REFRESH_EXPIRES_IN: zod_1.z.string().default('7d'),
    AWS_REGION: zod_1.z.string().default('ap-south-1'),
    AWS_ACCESS_KEY_ID: zod_1.z.string(),
    AWS_SECRET_ACCESS_KEY: zod_1.z.string(),
    AWS_S3_BUCKET: zod_1.z.string(),
    AWS_SNS_SMS_SENDER_ID: zod_1.z.string().default('TAAR'),
    SIGNAL_SERVER_KEY_ID: zod_1.z.string(),
    SIGNAL_SERVER_PRIVATE_KEY: zod_1.z.string(),
    RATE_LIMIT_WINDOW_MS: zod_1.z.string().transform(Number).default('900000'),
    RATE_LIMIT_MAX_REQUESTS: zod_1.z.string().transform(Number).default('100'),
    OTP_EXPIRES_IN_MINUTES: zod_1.z.string().transform(Number).default('5'),
    OTP_LENGTH: zod_1.z.string().transform(Number).default('6'),
    OTP_MAX_ATTEMPTS: zod_1.z.string().transform(Number).default('3'),
    LOG_LEVEL: zod_1.z.enum(['error', 'warn', 'info', 'debug']).default('info'),
    LOG_FILE_PATH: zod_1.z.string().default('./logs'),
    ALLOWED_ORIGINS: zod_1.z.string().default('http://localhost:3000'),
    WS_PORT: zod_1.z.string().transform(Number).default('3001'),
    WS_HEARTBEAT_INTERVAL: zod_1.z.string().transform(Number).default('30000'),
    WS_CONNECTION_TIMEOUT: zod_1.z.string().transform(Number).default('60000'),
    MAX_FILE_SIZE: zod_1.z.string().transform(Number).default('104857600'),
    ALLOWED_FILE_TYPES: zod_1.z.string().default('image/jpeg,image/png,image/gif,video/mp4,audio/mpeg,application/pdf'),
    HEALTH_CHECK_INTERVAL: zod_1.z.string().transform(Number).default('30000'),
    METRICS_ENABLED: zod_1.z.string().transform(v => v === 'true').default('true')
});
const env = envSchema.parse(process.env);
exports.config = {
    server: {
        env: env.NODE_ENV,
        port: env.PORT,
        isDevelopment: env.NODE_ENV === 'development',
        isProduction: env.NODE_ENV === 'production',
        isStaging: env.NODE_ENV === 'staging'
    },
    api: {
        version: env.API_VERSION
    },
    database: {
        url: env.DATABASE_URL
    },
    redis: {
        url: env.REDIS_URL,
        password: env.REDIS_PASSWORD
    },
    jwt: {
        secret: env.JWT_SECRET,
        refreshSecret: env.JWT_REFRESH_SECRET,
        expiresIn: env.JWT_EXPIRES_IN,
        refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN
    },
    aws: {
        region: env.AWS_REGION,
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
        s3: {
            bucket: env.AWS_S3_BUCKET
        },
        sns: {
            smsSenderId: env.AWS_SNS_SMS_SENDER_ID
        }
    },
    signal: {
        serverKeyId: env.SIGNAL_SERVER_KEY_ID,
        serverPrivateKey: env.SIGNAL_SERVER_PRIVATE_KEY
    },
    rateLimit: {
        windowMs: env.RATE_LIMIT_WINDOW_MS,
        maxRequests: env.RATE_LIMIT_MAX_REQUESTS
    },
    otp: {
        expiresInMinutes: env.OTP_EXPIRES_IN_MINUTES,
        length: env.OTP_LENGTH,
        maxAttempts: env.OTP_MAX_ATTEMPTS
    },
    logging: {
        level: env.LOG_LEVEL,
        filePath: env.LOG_FILE_PATH
    },
    cors: {
        allowedOrigins: env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
    },
    websocket: {
        port: env.WS_PORT,
        heartbeatInterval: env.WS_HEARTBEAT_INTERVAL,
        connectionTimeout: env.WS_CONNECTION_TIMEOUT
    },
    upload: {
        maxFileSize: env.MAX_FILE_SIZE,
        allowedFileTypes: env.ALLOWED_FILE_TYPES.split(',').map(type => type.trim())
    },
    monitoring: {
        healthCheckInterval: env.HEALTH_CHECK_INTERVAL,
        metricsEnabled: env.METRICS_ENABLED
    }
};
//# sourceMappingURL=index.js.map